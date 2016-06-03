/*jslint browser: true*/
/*global Tangram, gui */

map = (function () {
    'use strict';

    var map_start_location = [40.70531887544228, -74.00976419448853, 15]; // NYC

    /*** URL parsing ***/

    // leaflet-style URL hash pattern:
    // #[zoom],[lat],[lng]
    var url_hash = window.location.hash.slice(1, window.location.hash.length).split('/');

    if (url_hash.length == 3) {
        map_start_location = [url_hash[1],url_hash[2], url_hash[0]];
        // convert from strings
        map_start_location = map_start_location.map(Number);
    }

    /*** Map ***/

    var map = L.map('map',
        {"keyboardZoomOffset" : .05}
    );

    var layer = Tangram.leafletLayer({
        scene: 'scene.yaml',
        attribution: '<a href="https://mapzen.com/tangram" target="_blank">Tangram</a> | &copy; OSM contributors | <a href="https://mapzen.com/" target="_blank">Mapzen</a>'
    });

    window.layer = layer;
    var scene = layer.scene;
    window.scene = scene;

    // setView expects format ([lat, long], zoom)
    map.setView(map_start_location.slice(0, 3), map_start_location[2]);

    var hash = new L.Hash(map);

    /***** Render loop *****/

    window.addEventListener('load', function () {
        // Scene initialized
        layer.on('init', function() {
        });
        layer.addTo(map);
    });

    return map;

}());

// based on http://stackoverflow.com/a/17359298/738675
var canvas = document.getElementById('kcanvas');

canvas.onselectstart = function(){ return false; };
canvas.onselectend = function(){ console.log('done'); };
var x = 0;
var y = 0;
var lastX;
var lastY;
var color = "ffffff";
var colorRGB = {r: 100, g: 100, b: 100};
var alpha = .5;

function updateColor(val) {
    valRGB = hexToRgb(val);
    colorRGB = {r: valRGB.r, g: valRGB.g, b: valRGB.b};
    document.getElementById("picker").value = val;
}
function setColor(val) {
    document.getElementById('picker').jscolor.fromString(val);
    updateColor(val);
}
function updateWidth(val) {
    w = val;
    document.getElementById("width").value = val;
}
function updateAlpha(val) {
    alpha = val;
    document.getElementById("alpha").value = val;
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function draw(x,y,w,r,g,b,a){
        var gradient = ctx.createRadialGradient(x, y, 0, x, y, w);
        gradient.addColorStop(0, 'rgba('+r+', '+g+', '+b+', '+a+')');
        gradient.addColorStop(1, 'rgba('+r+', '+g+', '+b+', 0)');

        ctx.beginPath();
        ctx.arc(x, y, w, 0, 2 * Math.PI);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.closePath();
};

var ctx = canvas.getContext('2d');
var w = 10;
var radius = w/2;
var going = false;
function throttle(fn, threshold, scope) {
  threshold || (threshold = 250);
  var last,
      deferTimer;
  return function () {
    var context = scope || this;

    var now = +new Date,
        args = arguments;
    if (last && now < last + threshold) {
      // hold on to it
      clearTimeout(deferTimer);
      deferTimer = setTimeout(function () {
        last = now;
        fn.apply(context, args);
      }, threshold);
    } else {
      last = now;
      fn.apply(context, args);
    }
  }();
}
canvas.addEventListener("mousedown", function(e){
    going = true;
    lastX = e.offsetX;
    lastY = e.offsetY;
    draw(lastX, lastY,w,colorRGB.r,colorRGB.g,colorRGB.b, alpha);
});
canvas.addEventListener("mouseup", function(){
    going = false;
});

var canvasPromise;
function setCanvasPromise() {
    canvasPromise =
        Promise.all([scene.updateConfig()]).then(function() {
            console.log('config updated');
            return;
        });
};
function newCanvasPromise() {
    canvasPromise.then(function() {
        setCanvasPromise();
    });
}

function throttlePromise(operation) {
  var promise = null;

  return function() {
    if (!promise) {
      promise = operation.apply(this, arguments).finally(function() {
        promise = null;
      });
    }

    return promise;
  };
}

canvas.addEventListener("mousemove", function(e){
    if(going == true){
        x = e.offsetX;
        y = e.offsetY;

        // the distance the mouse has moved since last mousemove event
        var dis = Math.sqrt(Math.pow(lastX-x, 2)+Math.pow(lastY-y, 2));

        // for each pixel distance, draw a circle on the line connecting the two points
        // to get a continous line.
        for (i=0;i<dis;i+=1) {
            var s = i/dis;
            draw(lastX*s + x*(1-s), lastY*s + y*(1-s),w,colorRGB.r,colorRGB.g,colorRGB.b, alpha);
        }
        lastX = x;
        lastY = y;
        // throttle(function() {
        if (typeof canvasPromise == "undefined") {
            setCanvasPromise();
        } else {
            throttlePromise(newCanvasPromise());
        }
        // }, 250);
    };
});

updateColor(document.getElementById("picker").value);
updateWidth(document.getElementById("width").value);
updateAlpha(document.getElementById("alpha").value);
// fill canvas with white
ctx.beginPath();
ctx.rect(0, 0, 512, 512);
ctx.fillStyle = "white";
ctx.fill();
