"use strict";

var Templates = Backbone.Model.extend({
    safeTags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],

    NEXT_LABEL: '<span class="fa fa-chevron-circle-right"></span> Next',
    NEXT_MISSION_LABEL: '<span class="fa fa-thumbs-up"></span> Next Mission',
    FULL_STAR: '<span class="icon-win-star"></span> ',
    EMPTY_STAR: '<span class="icon-win-star-o"></span> ',
    
    templates: {
        "@separator": '<div class="separator"></div>',
        "@icon-([\\w\\-]+)": '<span class="icon-$1"></span>',
        "@color-([\\w\\-]+)\\{(.+?)\\}": '<span class="color-$1">$2</span>',
        "@noninteractive": function() { app.set("interactive", false); },
        "@disable-star": function() { app.flags.disabledStar = true; },
        "@disable-planet-drag": function() { app.flags.disabledPlanetDrag = true; },
        "@disable-velocity-drag": function() { app.flags.disabledVelocityDrag = true; },
        "@disable-velocity": function() { app.flags.disabledVelocity = true; },
        "@disable-force": function() { app.flags.disabledForce = true; },
        "@refresh": function() { app.trigger("refresh"); },
        "@validateplanetpositions": function() { draw.validatePlanetPositions(); },
        "@enter-avatar": function() {
            _.delay(function() {
                $(".avatar-left").addClass("avatar-left-visible");
                $(".avatar-right").addClass("avatar-right-visible");
            }, 100);
        },
        "@stop-fly": function() { draw.cancelFly(); console.log('Cancel Fly!'); },   
        "@fly": function() { draw.fly(); console.log('Fly!'); },
        "@hide-10": function() {  _.delay(function(self) { app.messageView.hide(); }, 10000, this); },
        "@hide-5": function() {  _.delay(function(self) {  app.messageView.hide(); }, 5000, this); },
        "@hide": function() { app.messageView.hide();  },
        
        "\\*(.+?)\\*": "<strong>$1</strong>",
        "\\{(.+?)\\}": '<img src=$1>',
        "\\[(.+?)\\]\\((.+?)\\)": '<a href="$2" target="_blank">$1</a>',
        "^(#)\\s*(.+)": "<h1>$2</h1>",
        "^\s*$": "<br>",
        "@proceed-win": '<div class="help-toolbar"><button id="help-next-mission" class="btn btn-lg btn-jrs"><span class="fa fa-thumbs-up"></span>  Next mission</button></div>',
        "@proceed-hidden": '<div class="help-toolbar"><button id="help-next" style="display:none" class="btn btn-lg btn-jrs"><span class="fa fa-chevron-right"></span>  Next</button></div>',
        "@proceed": '<div class="help-toolbar"><button id="help-next" class="btn btn-lg btn-jrs"><span class="fa fa-chevron-right"></span>  Next</button></div>',
        "@close": '<div class="help-toolbar"><button id="help-close" class="btn btn-lg btn-jrs"><span class="fa fa-check"></span> OK</button></div>',
        "@practice-mode": '<div class="help-toolbar"><button class="btn btn-lg btn-jrs" onClick="app.setMission(\'sandbox\');"><span class="icon-practice"></span> Go to Practice Mode</button></div>',
        "@eccentricity": '<span id="eccentricity"></span>',
        "@name": LOGGED_USER,
        "@run": function() { app.set('state', RUNNING); },
        "@rotatable": function() { app.set('state', ROTATABLE); },
        
        "@wait-10": function() {  _.delay(function(self) { self.listener.proceed(); }, 10000, this); },
        "@wait-5": function() {  _.delay(function(self) {  self.listener.proceed(); }, 5000, this); }
    },

    /*
     Takes an object containing a "message" field, and returns the object with the translated message
     and any functions to be run when the help is shown (field "funcs").

     The "this" argument for the functions created in field "funcs" will be either this object, or the bindTo parameter if different from null. 
     */
    firstRun: true,
    template: function(help, bindTo) {
        if (this.firstRun) {
            this.templates = _.extend(this.templates, app.get('avatars'));
            this.firstRun = false;
        }
        
        var msg = help.message;
        var templates = this.templates;
        bindTo = bindTo || this;
        
        help.old_message = msg;
        
        msg = _.str.escapeHTML(msg);
        help.funcs = [];
        var transforms = 0;

        while (true) {
            var msg_new = _.reduce( _.keys(templates), function(transformed, tag) {                    
                var sub = templates[tag];
                if (_.isFunction(templates[tag]) && transformed.indexOf(tag) != -1) {
                    help.funcs.push(_.bind(templates[tag], bindTo));
                    sub = "";
                }
                return transformed.replace(new RegExp(tag, 'gm'), sub);
            }, msg);
            
            if (msg == msg_new)
                break;
            else
                msg = msg_new;
        }

        help.message = msg;
        return help;
    },
    
    starsRepr: function(stars, total) {
        var repr = "";
        total = total || 3;
        for (var i = 0; i < stars; i++)
            repr += this.FULL_STAR;
        for (i = stars; i < total; i++)
            repr += this.EMPTY_STAR;
        return repr;
    },

    initialize: function() {
        var safeTags = this.safeTags;
        var self = this;
        for (var i = 0; i < safeTags.length; i++) {
            this.templates['@' + safeTags[i]] = "<" + safeTags[i] + ">";
            this.templates['@/' + safeTags[i]] = "</" + safeTags[i] + ">";
        }

    }

});