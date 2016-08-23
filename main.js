/*jslint browser: true*/
/*global Tangram, gui */

map = (function () {
    'use strict';

    var map_start_location = [35.3470, 138.7379, 12.175]; // SF

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

var canvas = document.getElementById('kcanvas');

canvas.onselectstart = function(){ return false; };
canvas.onselectend = function(){ console.log('done'); };
var x = 0;
var y = 0;
var lastX;
var lastY;
var colorHex = "ffffff";
var color = {r: 100, g: 100, b: 100};


function updateColor(val) {
    valRGB = hexToRgb(val);
    color = {r: valRGB.r, g: valRGB.g, b: valRGB.b};
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
function updateScale(val) {
    scene.styles.hillshade.shaders.uniforms.u_scale = parseFloat(1/(Math.pow(2,val)-1));
    scene.requestRedraw();
    document.getElementById("scale").value = val;
}
function updateBlur(val) {
    stackBlurImage( 'lastCanvas', 'kcanvas', val, false );
    scene.loadTextures();
    scene.requestRedraw();
}
function updateLines(val) {
    scene.config.global.lines = val;
    scene.config.layers.earth.draw.lines.visible = val;
    scene.config.layers.water.draw.lines.visible = val;
    scene.rebuild();
}
function updateOcean(val) {
    scene.config.global.water = val;
    scene.config.layers.water.draw.polygons.visible = val;
    scene.rebuild();
}

// scrub levels of undo
function rewind(val) {
    scene.config.global.water = val;
    scene.config.layers.water.draw.polygons.visible = val;
    scene.rebuild();
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
var drawing = false;
var undos = {}
canvas.addEventListener("mousedown", function(e){
    drawing = true;
    lastX = e.offsetX;
    lastY = e.offsetY;
    draw(lastX, lastY,w,color.r,color.g,color.b, alpha);
});
canvas.addEventListener("mouseup", function(){
    drawing = false;
    scene.loadTextures();
    saveCanvas();
});

function saveCanvas() {
    // save current state to undo history
    URL.revokeObjectURL(prevCanvas.src);
    prevCanvas.src = lastCanvas.src;
    canvas.toBlob(function(blob) {
        lastCanvas.src = URL.createObjectURL(blob);
    });
}

// based on http://stackoverflow.com/a/17359298/738675
canvas.addEventListener("mousemove", function(e){
    if(drawing == true){
        x = e.offsetX;
        y = e.offsetY;
        // the distance the mouse has moved since last mousemove event
        var dis = Math.sqrt(Math.pow(lastX-x, 2)+Math.pow(lastY-y, 2));

        // for each pixel distance, draw a circle on the line connecting the two points
        // to get a continous line.
        for (i=0;i<dis;i+=1) {
            var s = i/dis;
            draw(lastX*s + x*(1-s), lastY*s + y*(1-s),w,color.r,color.g,color.b, alpha);
        }
        lastX = x;
        lastY = y;
        scene.loadTextures();
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

// undo
// var lastCanvas = new Image;
// lastCanvas.id = "lastCanvas";
lastCanvas = document.getElementById("lastCanvas");
var prevCanvas = new Image;
prevCanvas.id = "prevCanvas";
function KeyPress(e) {
    var evtobj = window.event? event : e;
    // if ctrl-z
    if (evtobj.which == 90 && evtobj.ctrlKey ||
        evtobj.which == 90 && evtobj.metaKey ) {

        // swap canvases
        var tempurl = prevCanvas.src;
        prevCanvas.src = lastCanvas.src;
        lastCanvas.onload = function() {
            ctx.drawImage(lastCanvas, 0, 0);
            scene.loadTextures();
        };
        lastCanvas.src = tempurl;
    } else if (evtobj.which == 27) {
        hidePicker();
    }
}

// fill canvas with white
function clearCanvas() {
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.fill();
 }

 function loadCanvas(dataurl) {
    clearCanvas();
    var img = new Image;
    img.onload = function(){
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      updateMap();
      saveCanvas();
    };
    img.src = dataurl;
 }

function updateMap(){
    scene.loadTextures();
}

document.onkeydown = KeyPress;
var myDropzone;

function testDropzone(file) {
    // console.log('dropzone ahoy!', file)
}

Dropzone.options.canvaswrapper = {
    paramName: "file", // The name that will be used to transfer the file
    maxFilesize: 5, // MB
    accept: function(file, done) {
        testDropzone(file); // prevents upload attempt
    },
    thumbnail: function(file, dataUrl) {
        // use Dropzone's thumbnail as the canvas image
        loadCanvas(dataUrl);
    },
    thumbnailWidth: 512,
    thumbnailHeight: 512,
    previewTemplate: document.getElementById('preview-template').innerHTML
};

window.onload = function() {
        // subscribe to Tangram's published view_complete event
    scene.subscribe({
        // trigger promise resolution
        view_complete: function () {
                // console.log('frame1 view_complete triggered');
                // viewCompleteResolve();
            },
        warning: function(e) {
            // console.log('frame1 scene warning:', e);
            }
    });
    // load dropzone
    myDropzone = new Dropzone("div#canvaswrapper", { url: "#"});
    // fill canvas with white
    clearCanvas();
    // init first undo
    saveCanvas();
}

function exportCanvas() {
    saveCanvas();
    window.open(
      lastCanvas.src,
      '_blank' // <- This is what makes it open in a new window.
    );
}
