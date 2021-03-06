
"use strict";

var MAX_STARS = 200;
var stars = { x: [], y: [], z:[]};
var $window = $(window);
var $canvas;
var canvas;
var ctx;
var dt = 0.5;
var init = true;


function nextFrame() {
    // If the document is not focused, do not refresh the animation.
    // Also, only animate every other frame.
    if (!document.hasFocus() && !init) {
        window.requestAnimationFrame(nextFrame);
        return;
    }
    

    ctx.canvas.width = window.innerWidth;
    ctx.canvas.height = window.innerHeight;
    
    var width = ctx.canvas.width;
    var height = ctx.canvas.height;

    $canvas.width(width);
    $canvas.height(height);

    if (init) {
        for (var i = 0; i < MAX_STARS; i++) {
            stars.x[i] = width * Math.random();
            stars.y[i] = height * Math.random();
            stars.z[i] = (0.1 + 3 * Math.random());
        }
        init = false;
    }
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgb(150, 150, 150)';
    for (i = 0; i < MAX_STARS; i++) {
        ctx.beginPath();
        ctx.arc(stars.x[i] | 0, stars.y[i] | 0, stars.z[i]|0, 0, 2*Math.PI, false);
        ctx.fill();

        stars.x[i] += dt * stars.z[i];
        if (stars.x[i] > width) {
            stars.x[i] = -10;
            stars.y[i] = Math.random() * height;
        }
    }
    window.requestAnimationFrame(nextFrame);
}

var timer;
function setupTimer() {
    if (timer)
        window.clearTimeout(timer);
    console.log("Starting timer.");
    timer = _.delay(function() {
        window.setLocationRepeated('/screensaver/');
    }, 60000);
}


$(document).ready(function() {
    // If this function is not present, the browser is probably too old and we should not do
    // any animations...
    if (!window.requestAnimationFrame)
        return;

    
    // Store jQuery ref. to canvas and canvas context
    $canvas = $("#cover");
    canvas = $canvas[0];
    ctx = canvas.getContext('2d');
    canvas.style.width = $window.width() + "px";    
    canvas.style.height = $window.height() + "px";
    canvas.width = "500";
    canvas.height = "500";

    if (IS_KIOSK) {
        $(".app-launcher").each(function() {
            var s = $(this);
            var h = s.attr('href');

            s.on("touchstart click", function(e) {
                var href = h;
                $("#app-launching").show();
                _.delay(function() {
                    window.setLocationRepeated(href);
                }, 500);
                return false;
            });            
        });

        $(document).on("touchstart touchmove", setupTimer);
        
        $("#container").on("touchmove", false);
        setupTimer();
    }

    $("#help").on(UIUtils.clickEvent, function() {
        UIkit.modal("#kiosk-credits").show();
    });
    $("#kiosk-credits-close").on(UIUtils.clickEvent, function() {
        window.location.reload(true);
    });
    
    // Animation code
    window.requestAnimationFrame(nextFrame);
});


