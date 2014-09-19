/*
 * This file contains the Gravity application code, both the model singleton ("app") and
 * the main view. The drawing code is contained in draw.js.
 *
 * The application uses (loosely) the Backbone.js paradigms of model and view. The model
 * encapsulates the state of the application (e.g. position and velocity of the bodies,
 * current time, current mission, etc.), while several views subscribe to events fired by
 * the model in order to be notified whenever any property of the model is changed.
 */

"use strict";

/* Read-only computed properties. */
Backbone.ROComputedModel = Backbone.Model.extend({
    /*
     * Enable computed, read-only properties
     */
    get: function(attr) {
        if (this.attributes[attr] !== undefined)
            return this.attributes[attr];
        else if (_.isFunction(this[attr]))
            return this[attr]();
        else 
            return this[attr];
    }    
});


/*
 * Templates.
 */

var Templates = {
    fullStar: '<span class="icon-win-star"></span> ',
    emptyStar: '<span class="icon-win-star-o"></span> '  
};


/*
 * The mission model. 
 */
var Mission = Backbone.ROComputedModel.extend({
    defaults: {
        completed: false,
        elapsed: -1,
        elements: null,
        stars: 0,
        lastPlayed: null
    },

    starsRepr: function() {
        var repr = "";
        var stars = this.get('stars');
        for (var i = 0; i < stars; i++)
            repr += Templates.fullStar;
        for (i = stars; i < 3; i++)
            repr += Templates.emptyStar;
        return repr;
    },

    toJSON: function() {
        return _.pick(this.attributes, _.keys(this.defaults));
    }
});

/*
 * A collection of missions. This object takes care of synchronizing with the server.
 */
var MissionCollection = Backbone.Collection.extend({
    model: Mission    
});

/*
 * The app state model. The properties of the model defined in defaults are augmented
 * by the properties in app.yaml, and inserted into the APP_CFG dictionary by the backend.
 *
 */
var App = Backbone.ROComputedModel.extend({
    defaults: function() {
        return {
            // start with the first mission
            currentMission: 0,
            // start off in a PAUSED state (can either be PAUSED, RUNNING or MENU); when PAUSED,
            // the user can add planets, drag them, and change their velocity vector.
            // When RUNNING, time is flowing and the planet orbits the central star.
            state:PAUSED,
            // show orbit?
            showOrbit:false,
            // start time, used to calculate elapsed time
            userStartTime:new Date(),
            userEndTime:null,
            // start with no planets
            nplanets: 0,
            // start at t = 0 days
            time:0,
            // each frame corresponds to these many days
            deltat: 1.5,
            // maximum number of planets for the current mission
            maxPlanets: 1,
            // initial position of the star (AU/day). The vector contains the 3
            // coordinates for each body, (x^0, y^0, z^0, x^1, y^1, z^1, ...),
            // so that the are 3*nplanets components.
            position: [0, 0, 0],
            // initial velocity of the star (AU/day). The vector contains the 3
            // velocity components for each body, (v_x^0, v_y^0, v_z^0, v_x^1, v_y^1, v_z^1, ...),
            // so that the are 3*nplanets components.
            velocity: [0, 0, 0],
            // initial mass of the star (MSUN). The vector contains the masses of
            // all the bodies in the system.
            masses: [1],
            // mission collection
            missions: null,
            // interactive?
            interactive: true,
            // invalid?
            invalid:false,
            // has a collision happened?
            collided:false,
            // number of stars gained so far
            starsEarned:[],
            
            minAU: 0.3,
            maxAU: 1.5
        };
    },

    
    /*
     * Toggles the state of the application between RUNNING and PAUSED.
     */
    toggleState: function() {
        var state = this.get('state');
        if (state == RUNNING)
            this.set('state', PAUSED);
        else if (state == PAUSED)
            this.set('state', RUNNING);
        else
            console.warn("app.toggleState() was used when state is ", state);
    },

    /*
     * Syncs the state of the model with the server. Not implemented.
     */     
    sync: function(method, model, options) {
        throw new Error("TODO: Sync method for App model.");        
    },

    /*
     * Adds a new planet at the specified position, in AU.
     * The initial speed is sqrt(K2) in internal units (~30 km/s),
     * while the initial mass is 0.
     */
    addPlanet: function(x) {
        // Return if there are already more planets than allowed.
        if (this.get('nplanets') == this.get('maxPlanets'))
            return;

        // Append position and default velocity & mass to the
        // respective arrays, then fire the change events.
        var position = this.get('position');
        var velocity = this.get('velocity');
        var masses = this.get('masses');
        
        position.push(x[0], x[1], 0);

        
        var v = Math.sqrt(K2);
        velocity.push(v, 0, 0);
        masses.push(0);
        this.ctx.elements = null;
        this.set('nplanets', this.get('nplanets')+1);
        this.trigger("change:position change:velocity change:masses");
    },

    /*
     * Sets the position for the i-th body (the first planet is the 0-th body).
     */
    setPositionForBody: function(i, x) {
        var position = this.get('position');
        position[(i+1)*NPHYS+X] = x[0];
        position[(i+1)*NPHYS+Y] = x[1];
        position[(i+1)*NPHYS+Z] = x[2];
        this.trigger("change:position");
    },

    /*
     * Sets the velocity for the i-th body.
     */
    setVelocityForBody: function(i, v) {
        var velocity = this.get('velocity');
        velocity[(i+1)*NPHYS+X] = v[0];
        velocity[(i+1)*NPHYS+Y] = v[1];
        velocity[(i+1)*NPHYS+Z] = v[2];
        this.trigger("change:velocity");        
    },
    
    /*
     * Makes the system advance by deltat, updating the position and velocities
     * of all bodies.
     */
    tick: function() {
        if (this.get('invalid'))
            return;
        
        var t = this.get('time');
        var deltat = this.get('deltat');
        this.ctx.t = t;
        this.ctx.x = this.get('position');
        this.ctx.v = this.get('velocity');
        this.ctx.M = this.get('masses');
        
        Physics.leapfrog(t+deltat, this.ctx);
        
        this.set('time', t+deltat);
        this.trigger("change:position");
        this.trigger("change:velocity");

        
        if (Math.sqrt(this.ctx.x[NPHYS+X] * this.ctx.x[NPHYS+X] +
                      this.ctx.x[NPHYS+Y] * this.ctx.x[NPHYS+Y]) < this.get('minAU')) {
            this.trigger('collision', { x: this.ctx.x[NPHYS+X],
                                        y: this.ctx.x[NPHYS+Y]});
            this.set('collided', true);
            this.set('invalid', true);
        }

        this.trigger("tick");
        
    },

    /*
     * Returns a list of orbital elements for each planet.
     */
    elements: function(update) {
        if (this.ctx.elements && !update) {
            return this.ctx.elements;
        }
        
        var x = this.get('position');
        var v = this.get('velocity');
        var M = this.get('masses');
        var np = this.get('nplanets');
        
        this.ctx.Mstar = M[0];
        this.ctx.twoD = true;

        if (! this.ctx.elements || this.ctx.elements.length != np)
            this.ctx.elements = [];
        
        for (var i = 1; i <= np; i++) {
            var dx = x[i*NPHYS+X]-x[X];
            var dy = x[i*NPHYS+Y]-x[Y];
            var dz = x[i*NPHYS+Z]-x[Z];
            var du = v[i*NPHYS+X]-v[X];
            var dv = v[i*NPHYS+Y]-v[Y];
            var dw = v[i*NPHYS+Z]-v[Z];
            this.ctx.elements[i-1] = Physics.x2el(this.ctx, 0, M[i], dx, dy, dz, du, dv, dw, this.ctx.elements[i-1]);
        }

        this.trigger('change:elements');
        return this.ctx.elements;
    },

    /*
     * Win the current mission.
     */
    win: function() {
        this.set('userEndTime', new Date());
        var mission = this.get('missions').at(this.get('currentMission'));
        mission.set('completed', true);
        
        mission.set('elapsed', this.elapsedTime(true));
        mission.set('stars', Math.max(mission.get('stars'), this.stars()));
        mission.set('elements', this.elements());
        mission.set('lastPlayed', new Date());
        app.saveMissionData();
        this.trigger('win');        
    },

    /*
     * Lose the current mission.
     */
    lose: function() {
        this.set('userEndTime', new Date());
        this.trigger('lose');
    },

    /*
     * Move to next mission
     */
    setMission: function(mission) {
        if (mission === undefined)
            mission = this.get('currentMission')+1;
        
        this.reset();
        this.set({ currentMission: mission });
        this.trigger('start');
    },

    /*
     * Change the current state to MENU. This should trigger an update in the view, where
     * the app-menu div is brought to the forefront and UI elements are hidden.
     */
    menu: function() {
        this.set('state', MENU);
    },

    /*
     * Calculates elapsed time as a human-readable string.
     */
    elapsedTime: function(secondsOnly) {        
        var endTime = this.get('userEndTime') || new Date();
        var seconds = Math.round((endTime.getTime() - this.get('userStartTime').getTime()) / 1000);

        if (secondsOnly)
            return seconds;
        
        var minutes = Math.floor(seconds/60);
        seconds = seconds % 60;
        return minutes + ":" + (seconds < 10 ? "0" + seconds : seconds);
    },

    /*
     * Calculate stars for the current mission.
     */
    stars: function() {
        var seconds = this.elapsedTime(true);
        
        if (seconds < 60)
            return 3;
        else if (seconds < 120)
            return 2;
        else
            return 1;
    },

    /*
     * Returns a *fractional* star value -- useful, for instance, to show a partially filled
     * star.
     */
    fractionalStars: function() {
        var seconds = this.elapsedTime(true);
        if (seconds > 120)
            return 1;
        else
            return (3 - 2*seconds/120);
    },

    /*
     * The total number of stars earned.
     */
    starsEarnedTotal: function() {
        return app.get('missions').reduce(function(memo, mission) {
            return memo + mission.get('stars');
        }, 0);
    },
    
    /*
     * Reset the state.
     */
    reset: function() {
        var defaults = this.defaults();
        this.set({
            masses: defaults.masses,
            position: defaults.position,
            velocity: defaults.velocity,
            nplanets: defaults.nplanets,
            time: defaults.time,
            state: defaults.state,
            currentHelp: defaults.currentHelp,
            userStartTime: new Date(),
            userEndTime: null,
            invalid: defaults.invalid,
            collided: defaults.collided
        });
        this.ctx.elements = null;
        this.trigger('reset');
    },


    /*
     * Read in properties from app.yaml.
     */
    loadConfig: function(dict) {
        var missions = dict.missions;
        var coll = new MissionCollection();
        
        _.each(missions, function(mission) {
            var m = new Mission(mission);
            coll.add(m);
        });

        delete dict.missions;
        this.set(dict);
        this.set('missions', coll);
    },

    /*
     * Read data from server.
     */
    loadMissionData: function() {
        app.trigger('loading');
        _.delay(function() {
            $.get('php/gamedata.php?action=load')
            .done(function(data) {
                if (data.trim() != "") {
                    data = JSON.parse(data);
                    var missions = app.get('missions');
                    for (var i = 0; i < data.length; i++)
                        missions.at(i).set(data[i]);
                    app.menu();
                }
                app.trigger('load');
            });
        }, 1000);
    },

    /*
     * Save data to server.
     */
    saveMissionData: function() {
        var data = JSON.stringify(app.get('missions'));
        var earned_stars = app.starsEarnedTotal();
        app.trigger('saving');
        $.post('php/gamedata.php?action=save', {
            data:data,
            earned_stars:earned_stars
        }).done(function(data) {
            app.trigger('saved', data);
        });
    },

    /*
     * Reset user's mission data.
     */
    resetMissionData: function() {
        var self = this;
        $.post('php/gamedata.php?action=reset').done(function() {
            location.reload();
        });
    },
    
    /*
     * Initializes the model, by creating a "context" object. The context
     * object is used by the leapfrog function.
     */
    initialize: function() {
        this.ctx = {M:this.get('masses'), x: this.get('position'), v:this.get('velocity'), dt: 0.25 };
        this.listenTo(this, "planet:drag planet:dragvelocity", function() { this.elements(true); });
    }
});

// Creates the global singleton object that contains the application state.
var app = new App();

/*
 * The top-level view object. It manages updates to the interface due to model events,
 * and binds to events within the #app div element (e.g. button clicks).
 */
var AppView = Backbone.View.extend({
    // Top-level container
    el: $("#app"),

    // Events table mapping button to UI updates.
    events: {
        "click #menu": function() { $("#sidebar").toggleClass("expanded"); },
        "click #help": function() { this.renderMission(); },
        "click #reset": function() { app.reset(); },
        "click #missions": function() { app.menu(); },
        "click #dashboard": function() { location.href='../dashboard'; }
    },

    // Binds functions to change events in the model.
    initialize: function() {
        var self = this;

        // Update information when planetary parameters change
        self.listenTo(self.model, 'change:nplanets change:time change:position change:velocity change:elements', _.throttle(self.renderInfo, 500));
        
        self.listenTo(self.model, 'start change:missions reset', self.renderMission);
        self.listenTo(self.model, 'change:state', self.setVisibility);
        self.listenTo(self.model, 'win', self.renderWin);
        self.listenTo(self.model, 'lose', self.renderLose);
        
        // Renders the information table on the top-right corner.
        self.renderInfo();

        // A timer that checks whether a mission has been completed, by running the
        // validate function.
        self.listenTo(self.model, 'start change:missions reset', function() {
            if (self.validateTimer)
                clearInterval(self.validateTimer);
            
            self.validateTimer = setInterval(_.bind(self.validate, self), 1000);

            if (self.elapsedTimer)
                 clearInterval(self.elapsedTimer);

            self.elapsedTimer = setInterval(_.bind(self.renderStars, self), 1000);            
        });
    },

    /*
     * Renders the mission list in the left sidebar. There are three states for the missions:
     * "MISSION" (a mission that has not been completed yet), "MISSION_ACTIVE" (the current mission),
     * and "MISSION_COMPLETED" (a completed mission).
     *
     * Each one corresponds to a different CSS class. The #missions div is filled with the titles
     * and icons of the missions.
     */

    
    missionTemplate: _.template('<div class="title"><span class="fa fa-rocket"></span> <%= title %></div><div class="subtitle"><%= subtitle %></div>'),
    missionDelay: 6000,
    
    renderMission: function() {
        // Check if the top banner is already expanded; if it is, hide it
        // temporarily and show it again.
        var current = this.model.get('currentMission');
        var mission = this.model.get('missions').at(current);
        
        $("#text-top").html(this.missionTemplate(mission.attributes));
        $("#text-top").addClass("expanded");
        $("#text-top").removeClass("in-front");
        
        _.delay(function() {
            $("#text-top").removeClass("expanded");
            $("#text-top").removeClass("in-front");
        
        }, this.missionDelay);
    },


    els: {},
    lastStars: 3,
    
    /*
     * Render the current number of stars in the top left corner.
     */
    renderStars: function() {
        var stars = app.stars();
        var frac = app.fractionalStars();
        frac -= Math.floor(frac);
        if (frac == 0.) frac = 1;
        
        var str = "";
        var i;
        
        for (i = 0; i < stars - 1; i++)
            str += Templates.fullStar;

        str += '<span style="opacity:' + frac.toFixed(2) +  '">' + Templates.fullStar + "</span>";
        
        for (i = stars; i < 3; i++)
            str += Templates.emptyStar;

        $("#stars").html(str);
        if (this.lastStars > stars) {
            $("#stars").removeClass("flash-red");
            $("#stars").addClass("flash-red");            
        }
        this.lastStars = stars;
    },

    
    /*
     * Fills the table on the top-right hand side with the relevant information. renderInfo is
     * throttled so it is only updated once per second (or so).
     *
     * For now, it displays time (in days), the distance from the central star (in 10^8 km),
     * and the speed (in km/s).
     */    
    renderInfo: function() {
        
        if (app.get('nplanets') > 0) {
            $("#time").text(this.model.get('time') + " days");

            var els = app.elements();
            var position = app.get('position');
            var velocity = app.get('velocity');
            var masses = app.get('masses');
            
            var r = Math.sqrt((position[X]-position[NPHYS+X])*(position[X]-position[NPHYS+X]) +
                              (position[Y]-position[NPHYS+Y])*(position[Y]-position[NPHYS+Y]) +
                              (position[Z]-position[NPHYS+Z])*(position[Z]-position[NPHYS+Z]));

            var v = Math.sqrt((velocity[X]-velocity[NPHYS+X])*(velocity[X]-velocity[NPHYS+X]) +
                              (velocity[Y]-velocity[NPHYS+Y])*(velocity[Y]-velocity[NPHYS+Y]) +
                              (velocity[Z]-velocity[NPHYS+Z])*(velocity[Z]-velocity[NPHYS+Z]));
            
            $("#distance").html((r * Units.RUNIT / (1e11)).toFixed(2) + " x 10<sup>6</sup> km");
            $("#speed").text((v * Units.RUNIT / Units.TUNIT / (1e5)).toFixed(2) + " km/s");
           
            $("#eccentricity").text(els[0].eccentricity.toFixed(2));
            
        } else {
            $("#distance").text("");
            $("#speed").text("");
            $("#eccentricity").text("");
            $("#time").text("");
        }
    },

    /*
     * When the user is shown the mission menu, fade away all the UI elements that could be distracting.
     */
    setVisibility: function() {
        var state = app.get('state');

        if (state == MENU) {
            $("#sidebar").hide();
            $("#help-text").removeClass("expanded");
            $("#info-top").hide();
            $("#text-top").removeClass("expanded");
        } else {
            $("#sidebar").show();
            $("#info-top").show();
        }        
    },

    /*
     * Event forwarded from draw.js when the user clicks or taps on the canvas. If the current state is RUNNING,
     * then tapping anywhere will pause the app. Otherwise, add a new planet.
     */
    canvasMouseDown: function(e) {
        if (app.get('state') == PAUSED) {
            app.addPlanet(e.position);
        }
    },

    /*
     * Checks whether the mission's objective has been accomplished. The mission's objective is written into a
     * table of functions called RULES_FN, which is generated by the backend according to the "rules" sections in app.yaml.
     *
     * FIXME: Since teachers are supposed to be able to override the defaults & create their own activities/rules,
     * we *need* to make sure that rules are sanitized and cannot be used to run arbitrary JavaScript.
     */
    validate: function() {
        if (app.get('state') != RUNNING)
            return;

        var f = RULES_FN[app.get('currentMission')]();
        if (f) {
            this.model.win();
            clearInterval(this.validateTimer);
        } else {
            this.model.lose();
        }
    },

    /*
     * Render win.
     */

    winTemplate: _.template('<div class="subtitle">Mission completed.</div><div class="font-l"><%= win %></div>'),
    winDelayMax: 10000,
    approxFrameRate: 1/60.,
    
    renderWin: function() {
        var mission = app.get('missions').at(app.get('currentMission'));
        var els = app.get('elements');
        var winDelay = 0;
        if (els.length > 0 && !isNaN(els[0].period))
            winDelay = Math.min(this.winDelayMax, els[0].period / app.get('deltat') * this.approxFrameRate * 1000);
        
        winDelay = Math.max(4000, winDelay);
        
        $("#text-top").html(this.winTemplate(mission.attributes));
        $("#text-top").addClass("expanded");
        $("#text-top").removeClass("in-front");
        console.log(winDelay);
        
        _.delay(function() {
            console.log('Hiding.');
            $("#text-top").removeClass("expanded");
            $("#text-top").removeClass("in-front");
        
            app.menu();
        }, winDelay);
    },

    loseTemplate: _.template('<div class="subtitle"><%= lose %></div><div><button class="btn-jrs font-m" onClick="app.reset(); app.mainView.renderMission(); "><span class="icon-thumbs-up"></span> No worries! Retry mission</button></div>'),
    
    renderLose: function() {
        var mission = app.get('missions').at(app.get('currentMission'));
        
        $("#text-top").html(this.loseTemplate(mission.attributes));
        $("#text-top").addClass("expanded");
        $("#text-top").addClass("in-front");
    }

});

var MissionHelpModel = Backbone.Model.extend({
    defaults: {
        model:app,
        currentHelp: 0
    },
                    
    proceed: function() {
        this.set('currentHelp', this.get('currentHelp') + 1);
        this.trigger('proceed');
    },

    destroy: function() {
        this.stopListening();
    },
    
    setup: function() {
        
        var model = this.get('model');
        var currentMission = model.get('currentMission');
        
        var mission = model.get('missions').at(currentMission);
        if (!mission.get('help')) {
            this.trigger('help', null);
            return;
        }

        this.listenTo(model, 'win', function() {
            this.destroy();
        });
        
        var h = mission.get('help');
        var self = this;
        var shown = [];
        
        for (var i = 0; i < h.length; i++) {
            var on = h[i].on;
            if (! on) {
                continue;
            }

            if (on == 'proceed') {
                this.listenTo(this, on, (function(j) {
                    return function() {
                        if (self.get('currentHelp') == j)
                            self.trigger('help', h[j].message);
                    };
                })(i));
            } else {
                this.listenTo(model, on, (function(j) {
                    return function() {
                        if (! shown[j]) {
                            self.trigger('help', h[j].message);
                            shown[j] = true;
                        }
                    };
                })(i));
            }
        }

        this.trigger('help', mission.get('help')[0].message);
    },
    
    initialize: function() {
    }
});

var MissionHelpView = Backbone.View.extend({
    el: $("#help-body"),
    safeTags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br', 'b', 'i', 'u'],

    NEXT_LABEL: '<span class="fa fa-chevron-circle-right"></span> Next',
    NEXT_MISSION_LABEL: '<span class="fa fa-thumbs-up"></span> Next Mission',
    
    templater: {
        "@separator": '<div class="separator"></div>',
        "@icon-tap": '<span class="icon-tap"></span>',
        "@icon-drag": '<span class="icon-drag"></span>',
        "@icon-star": '<span class="icon-star"></span>',
        "@icon-rocket": '<span class="fa fa-rocket"></span>',
        "@icon-win": '<span class="icon-win"></span>',
        "@icon-menu": '<span class="icon-menu"></span>',
        "@icon-help": '<span class="icon-help"></span>',
        "@noninteractive": '<script> app.set("interactive", false); </script>',
        "\\*(.+?)\\*": "<strong>$1</strong>",
        "^(#)\\s*(.+)": "<h1>$2</h1>",
        "^\s*$": "<br>",
        "@proceed-win": '<div class="help-toolbar"><button id="help-next-mission" class="btn btn-lg btn-jrs"><span class="fa fa-thumbs-up"></span>  Next mission</button></div>',
        "@proceed": '<div class="help-toolbar"><button id="help-next" class="btn btn-lg btn-jrs"><span class="fa fa-chevron-right"></span>  Next</button></div>',
        "@eccentricity": '<span id="eccentricity"></span>',
        "@name": LOGGED_USER,
        "@wait-1": '<script> _.delay(function() { app.trigger("proceed()");  }, 1000); </script>',
        "@wait-5": '<script> _.delay(function() { app.trigger("proceed()");  }, 5000); </script>',
        "@wait-30": '<script> _.delay(function() { app.trigger("proceed()");  }, 30000); </script>'
    },
    
    
    initialize: function() {
        var safeTags = this.safeTags;

        for (var i = 0; i < safeTags.length; i++) {
            this.templater['@' + safeTags[i]] = "<" + safeTags[i] + ">";
            this.templater['@/' + safeTags[i]] = "</" + safeTags[i] + ">";
        }
        
        this.listenToOnce(this.model, "change:missions", function() {
            this.setupTemplates();
            this.setupMessages();
        });
        this.listenTo(this.model, "start", this.setupMessages);
        this.listenTo(this.model, "win lose", function() { self.render(null); });
        
        var self = this;
        $("#help-next").on("click", function() { self.model.proceed(); });
    },

    setupTemplates: function() {
        var missions = this.model.get('missions');
        var templater = this.templater;

        for (var i = 0; i < missions.length; i++) {
            var m = missions.at(i);
            var help = m.get('help');
            if (!help)
                continue;
            
                       
            for (var j = 0; j < help.length; j++) {
                help[j].message = _.escapeHTML(help[j].message);
                
                help[j].message = _.reduce( _.keys(templater), function(transformed, tag) {
                    return transformed.replace(new RegExp(tag, 'gm'), templater[tag]);
                }, help[j].message);
                
            };
            m.set('help', help);
            
        }
    },

    setupMessages: function() {
        if (this.listener) {
            this.stopListening(this.listener);
            this.listener.destroy();
        }
        
        this.listener = new MissionHelpModel({ model:this.model });
        this.listenTo(this.listener, 'help', this.render);
        this.listener.setup();
    },

    render: function(helpText) {
        var self = this;
        if (helpText && self.lastHelp == helpText) {            
            return;
        }
        self.lastHelp = helpText;
        app.set('interactive', true);
        $("#help-text").removeClass("expanded");
        
        if (!helpText) {
            $("#help-body").html("");

            return;
        }
        
        _.delay(function() {
            self.$el.html(helpText);
            $("#help-next").on("click", function() { self.listener.proceed(); } );
            $("#help-next-mission").on("click", function() { self.model.nextMission(); } );
            
            $("#help-text").addClass("expanded");
            app.mainView.renderInfo();
        }, 500);
    }
});

var AppMenuView = Backbone.View.extend({
    // Top-level container
    el: $("#app-menu"),
    
    star: '<span class="icon-win-star"></span>',
    star_o: '<span class="icon-win-star-o"></span>',

    initialize: function() {
        this.listenTo(this.model, "change:state", this.render);
    },

    render: function() {
        var state = this.model.get('state');
        var $el = this.$el;
        
        if (state === MENU) {
            $el.addClass("expanded");
            this.renderMissionMenu();
        } else {
            $el.removeClass("expanded");
        }
    },

    missionContainer: '<div class="mission"></div>',
    clear: '<div class="clear"></div>',
    missionThumb: '<div class="mission-thumb"></div>',

    missionThumbIcon: _.template('<div class="<%= containerClass %>"></div>'),

    defaultIconNext: 'icon-mission-next',
    defaultIconLocked: 'icon-mission-locked',
    defaultIconCompleted: 'icon-mission-completed',
    
    missionTitleTemplate: _.template('<div class="mission-stars"><%= stars %></div><div class="mission-title"><%= title %></div><div class="mission-subtitle"><%= subtitle %></div>'),
    missionTotalsTemplate: _.template('<%= starsEarned %> / <%= starsBounty %> stars earned.'),
    $missions: $("#app-menu-missions"),
    
    renderMissionMenu: function() {
        this.$missions.empty();
        var missions = app.get('missions');
        var currentMission = app.get('currentMission');
        
        for (var i = 0; i < missions.length; i++) {
            var mission = missions.at(i);
            var icon = mission.get('icon');
            
            var $div = $(this.missionContainer);

            var $thumb = $(this.missionThumb);

            if (mission.get('completed')) {
                $thumb.addClass("mission-thumb-completed");
                if (icon)
                    $thumb.addClass(icon+"-b");
                
                $thumb.on("click", _.partial(function(i) {
                    app.setMission(i);
                }, i));
            } else if ((i > 0 && missions.at(i-1).get('completed')) || (i == 0 && !missions.at(0).get('completed'))) {
                $thumb.addClass("mission-thumb-next");

                $thumb.addClass(icon ? icon + "-b" : this.defaultIconNext);
                $thumb.append(this.missionThumbNext);
                $thumb.on("click", _.partial(function(i) {
                    app.setMission(i);
                }, i));
            } else {
                $thumb.addClass(this.defaultIconLocked);
            }
                        
            $div.append($thumb);
            $div.append(this.missionTitleTemplate({
                stars: mission.get('starsRepr'),
                title: mission.get('title'),
                subtitle: mission.get('subtitle')
            }));
            
            this.$missions.append($div);
        }

        this.$missions.append(this.clear);

        var stars = missions.at(currentMission).get('stars');
        var text = "";
        for (i = 0; i < stars; i++)
            text += Templates.fullStar;
        for (i = stars; i < 3; i++)
            text += Templates.emptyStar;
        
        $("#app-menu-stars").html(text);

        var starsEarned = app.get('starsEarnedTotal');
        var starsBounty = app.get('starsBounty');
        $("#app-menu-totals").html(this.missionTotalsTemplate({ starsEarned: starsEarned, starsBounty: starsBounty  }));        
    },

    renderOrbit: function(ctx) {
    }
});


var AppModalView = Backbone.View.extend({
    // Top-level container
    el: $("#app-modal"),
    
    initialize: function() {
        this.listenTo(this.model, "loading", this.renderLoading);
        this.listenTo(this.model, "load", this.renderLoad);
    },

    loadingMessage: 'Loading data...<br><i class="fa fa-circle-o-notch fa-spin"></i>',
    
    renderLoading:function() {
        $("#app-modal").html(this.loadingMessage);
        $("#app").hide();
        this.$el.show();
    },

    renderLoad: function() {
        $("#app").show();
        this.$el.hide();
    }
});

$(document).ready(function() {
    app.mainView = new AppView({ model: app });
    app.helpView = new MissionHelpView({ model: app });
    app.menuView = new AppMenuView({model: app});
    app.modalView = new AppModalView({model:app});
    
    // APP_CFG is an object created statically by the backend and inserted in
    // a top-level <script> tag. This is done so that the model does not have to
    // fetch it asynchronously from a .json file.
    // APP_CFG replicates the configuration options contained in app.yaml: e.g.,
    // mission text and objectives.
    app.loadConfig(APP_CFG);
    app.loadMissionData();
    APP_CFG = null;
});

