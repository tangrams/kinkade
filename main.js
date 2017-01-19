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
        attribution: '<a href="https://mapzen.com/tangram" target="_blank">Tangram</a> | &copy; OSM contributors | <a href="https://mapzen.com/" target="_blank">Mapzen</a>',
        preUpdate: preUpdate
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

var kinkade = document.getElementById('kinkade');
var canvas = document.getElementById('kcanvas');
var ctx = canvas.getContext('2d');
var w = 10;
var radius = w/2;
var drawing = false;
var undos = [];

var x = 0;
var y = 0;
var lastX;
var lastY;
var colorHex = "ffffff";
var color = {r: 100, g: 100, b: 100};
var alpha = .1
var blurring = false;
var rotating = false;

function updateColorHex(val) {
    resetFX();
    valRGB = hexToRgb(val);
    color = {r: valRGB.r, g: valRGB.g, b: valRGB.b};
    document.getElementById("picker").value = val;
}
function updateColorRGB(val) {
    resetFX();
    valRGB = val;
    color = val;
    setColor(RgbToHex(val))
}
function swatch(div) {
    val = getComputedStyle(div).backgroundColor.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
    val = {r: val[1], g: val[2], b: val[3]};
    updateColorRGB(val);
}
function setColor(val) {
    document.getElementById('picker').jscolor.fromString(val);
    updateColorHex(val);
}
function updateWidth(val) {
    resetFX();
    w = val;
}
function updateAlpha(val) {
    resetFX();
    alpha = val;
}
function switchBrush(which) {
    document.getElementById('brush1').className = "hitarea";
    document.getElementById('brush2').className = "hitarea";
    document.getElementById('brush3').className = "hitarea-fuzzy";
    which.className = "hitarea-selected";
}
function switchFuzzyBrush(which) {
    which.className = "hitarea-fuzzy-selected";
    document.getElementById('brush1').className = "hitarea";
    document.getElementById('brush2').className = "hitarea";
}
function updateScale(val) {
    scene.styles.hillshade.shaders.uniforms.u_scale = parseFloat(1/(Math.pow(2,val)-1));
    scene.requestRedraw();
    document.getElementById("scale").value = val;
}
function updateBlur(val) {
    if (document.getElementById('webcam').checked) {
        useWebcam(false);
    }
    if (!blurring) {
        blurring = true;
    }
    if (rotating) {
        resetRotate();
    }
    stackBlurImage( 'lastCanvas', 'kcanvas', val, false );
    scene.loadTextures();
    scene.requestRedraw();
}
function updateLines(val) {
    scene.config.global.lines = val;
    scene.updateConfig();
}
function updateLabels(val) {
    scene.config.global.labels = val;
    scene.updateConfig();
}
function updateOcean(val) {
    scene.config.global.water = val;
    scene.updateConfig();
}

function updateRotate(val) {
    if (document.getElementById('webcam').checked) useWebcam(false);
    val *= -1;
    if (!rotating) {
        rotating = true;
    }
    if (blurring) {
        saveCanvas(false, rotate, val);
        resetBlur();
    } else {
        rotate(val);
    }
}

// rotate the canvas
function rotate(val) {
    // get the last saved canvas
    lastCanvas.src = undos[undos.length - 1];
    // transform the canvas - move so the rotate point is in the center of the image
    ctx.translate(canvas.width/2, canvas.height/2); 
    // rotate
    ctx.rotate(Math.PI/180*val);
    // move back to original position
    ctx.translate(-canvas.width/2, -canvas.height/2);
    // draw the saved image on the transformed canvas
    ctx.drawImage(lastCanvas, 0, 0); 
    // freeze current transform state
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // update map
    scene.loadTextures();
    scene.requestRedraw();

}

function resetFX(which) {
    if (which != 'webcam' && document.getElementById('webcam').checked) {
        useWebcam(false);
    }
    if (rotating || blurring) {
        saveCanvas();
    }
    if (rotating) resetRotate();
    if (blurring) resetBlur();
}

function resetRotate() {
    if (rotating) {
        saveCanvas();
        rotating = false;
        ctx.restore();
        document.getElementById('rotate').value = 0;
    }
}

// scrub levels of undo
function rewind(val) {
    resetFX();
    lastCanvas.src = undos[val];
    lastCanvas.onload = function() {
        ctx.drawImage(lastCanvas, 0, 0);
        scene.loadTextures();
    };
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function componentToHex(c) {
    var hex = parseInt(c).toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function RgbToHex(val) {
    return componentToHex(val.r) + componentToHex(val.g) + componentToHex(val.b);
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

function saveCanvas(overwrite, callback) {

    // save current state to undo history
    canvas.toBlob(function(blob, overwrite) {
        lastCanvas.src = URL.createObjectURL(blob);
        if (overwrite) {
            undos[undos.length] = lastCanvas.src;
            if (typeof callback != 'undefined') callback;
            // if (typeof callback != 'undefined') callback(arguments[arguments.length -1]);
        } else {
            undos.push(lastCanvas.src);
            updateRewindSlider();
            if (typeof callback != 'undefined') {
                callback(arguments[arguments.length-1]);
            }
            // if (typeof callback != 'undefined') callback(arguments[arguments.length -1]);
        }
    });
}

function resetBlur() {
    if (blurring) {
        blurring = false;
        document.getElementById('blur').value = 0;
    }
}

function updateRewindSlider() {
    if (undos.length > 1) {
        document.getElementById('rewind').disabled = false;
        percentWidth = (100. / Math.max(undos.length - 1, 1)) * .93;
        rule = "#rewindwrapper { background-position: left; background-image: url('line.png'); background-size: "+percentWidth + "% 100%; background-position: top 0px left 10px; }";
        document.styleSheets[3].deleteRule(0);
        document.styleSheets[3].insertRule(rule, 0);

        document.getElementById('rewind').max = undos.length - 1;
        document.getElementById('rewind').value = undos.length - 1;
    }
}

function KeyPress(e) {
    var evtobj = window.event? event : e;
    // if ctrl-z, undo
    if (evtobj.which == 90 && evtobj.ctrlKey && !evtobj.shiftKey ||
        evtobj.which == 90 && evtobj.metaKey && !evtobj.shiftKey ) {
        rewindSlider.value -= 1;
        rewind(rewindSlider.value);
    // if ctrl-shift-z, redo
    } else if (evtobj.which == 90 && evtobj.ctrlKey && evtobj.shiftKey ||
        evtobj.which == 90 && evtobj.metaKey && evtobj.shiftKey ) {
        rewindSlider.value = parseInt(rewindSlider.value) + 1;
        rewind(rewindSlider.value);
    // if esc
    } else if (evtobj.which == 27) {
        hidePicker();
    // listen for "h"
    } else if (evtobj.which == 72 && document.activeElement != document.getElementsByClassName('leaflet-pelias-input')[0]) {
        // toggle UI
        var display = map._controlContainer.style.display;
        map._controlContainer.style.display = (display === "none") ? "block" : "none";
        display = kinkade.style.display;
        kinkade.style.display = (display === "none") ? "block" : "none";
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
    blurring = false;
    rotating = false;
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

// Dropzone used for drag-n-drop
var myDropzone;
Dropzone.options.canvaswrapper = {
    paramName: "file", // The name that will be used to transfer the file
    maxFilesize: 5, // MB
    accept: function(file, done) {
        return false; // prevents upload attempt
    },
    thumbnail: function(file, dataUrl) {
        // use Dropzone's thumbnail as the canvas image
        loadCanvas(dataUrl);

        var img = new Image;
        img.onload = function(){
            drawImgToCanvas(img);
        };
        img.src = dataUrl;

    },
    thumbnailWidth: 512,
    thumbnailHeight: 512,
    previewTemplate: document.getElementById('preview-template').innerHTML
};

function exportCanvas() {
    saveCanvas(false, function() {
        window.open(
          lastCanvas.src,
          '_blank' // <- This is what makes it open in a new window.
        );
    });
}

function useWebcam(start) { 
    if (start) {
        resetFX('webcam');
        Webcam.set({
            height: 256,
            width: 358
        });

        Webcam.attach( '#kvideo' );
        scene.updateConfig();
        document.getElementById("flipspan").style.color = '#000';
        document.getElementById("flipwebcam").disabled = false;
        document.getElementById("snapshot").disabled = false;
    }
    else {
        document.getElementById("webcam").checked = false;
        saveCanvas();
        Webcam.reset();
        document.getElementById("flipspan").style.color = '#aaa';
        document.getElementById("flipwebcam").disabled = true;
        document.getElementById("snapshot").disabled = true;
    }
}

function flipWebcam(active) {
    if (active) {
        canvas.style = 'transform:rotate(180deg)';
    } else {
        canvas.style = 'transform:rotate(0deg)';
    }
}

function preUpdate (will_render) {
    // Input
    if (document.getElementById('webcam').checked) {
        // video width = 358, canvas width = 256, difference = 51
        // half canvas width + difference = 179
        ctx.drawImage(document.querySelector('#kvideo > video'), -179, 0);
        if (typeof scene != 'undefined') scene.loadTextures();
    }
}

var video_capture = false;
var video_button = document.getElementById('recordvideo');
var video_blink = null;
// Take a video capture and save to file
function recordVideo() {
    if (!video_capture) {
        if (scene.startVideoCapture()) {
            video_capture = true;
            video_button.innerHTML = "STOP VIDEO";
            video_blink = setInterval(function() {
                var bgcolor = window.getComputedStyle( video_button ,null).getPropertyValue('background-color');
                // flash recording button
                video_button.style.backgroundColor = (bgcolor != "rgb(255, 192, 203)") ? "pink" : "white";
            }, 500);
        }
    }
    else {
        return scene.stopVideoCapture().then(function(video) {
            video_capture = false;
            video_button.innerHTML = "RECORD VIDEO";
            window.clearInterval(video_blink);
            video_button.style.backgroundColor = "white";
            saveAs(video.blob, 'tangram-video-' + (+new Date()) + '.webm');
        });
    }
};

if (typeof window.MediaRecorder == 'function') {    
    video_button.style.display = "inline";
};

function toggleExamples() {
    document.getElementById("examples").style.display = document.getElementById("examples").style.display != 'block' ? 'block' : 'none';
}

function toggleLocations() {
    // debugger
    document.getElementById("locations").style.display = document.getElementById("locations").style.display != 'block' ? 'block' : 'none';
}

function swapimg(div) {
    img = div.childNodes[0];
    drawImgToCanvas(img);
    updateMap();
    saveCanvas();

}

function drawImgToCanvas(img) {
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    var colorThief = new ColorThief();
    p = colorThief.getPalette(img, 8);
    swatches = document.getElementById('swatches').getElementsByClassName('swatch');
    for (var x = 0; x < p.length - 1; x++) {
        swatches[x].style.backgroundColor = 'rgb('+p[x][0]+', '+p[x][1]+', '+p[x][2]+')';
    }        
}

window.onload = function () {
    // set events
    canvas.onselectstart = function(){ return false; };
    canvas.onselectend = function(){ console.log('done'); };
    canvas.addEventListener("mousedown", function(e){
        resetFX();
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

    // drawing function
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

    updateColorHex(document.getElementById("picker").value);
    // updateWidth(document.getElementById("width").value);
    // updateAlpha(document.getElementById("alpha").value);

    // undo
    window.lastCanvas = document.getElementById("lastCanvas");
    window.prevCanvas = new Image;
    prevCanvas.id = "prevCanvas";
    window.rewindSlider = document.getElementById("rewind");

    // select fuzzy brush
    document.getElementById("brush3").click();

    // subscribe to Tangram's published view_complete event
    scene.subscribe({
        // trigger promise resolution
        view_complete: function () {
                // viewCompleteResolve();
            },
        warning: function(e) {
            }
    });
    document.onkeydown = KeyPress;
    // load dropzone
    window.myDropzone = new Dropzone("div#canvaswrapper", { url: "#"});
    // fill canvas with white
    clearCanvas();
    // init first undo
    saveCanvas();
}


//
// Mapzen API - only works for mapzen.com hosted version
// https://github.com/mapzen/wiki/wiki/mapzen.com-Scenes-API

// XHR Methods

// GET
function get(path, type, callback) {
    console.log('get path:', path, 'type:', type);
    // console.log('with callback:', callback);
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        // console.log(xhr.readyState, xhr.status);
        if (xhr.readyState === 4 && xhr.status === 200) {
            var data;
            if (type =='json') var data = JSON.parse(xhr.responseText);
            if (type == 'png') var data = xhr.responseText;
            // console.log('get data:', data)
            // optional callback
            typeof callback === 'function' && callback(data);
        }
    }
    xhr.open('GET', path, true)
    xhr.send()
}

// POST
function post(path, body, callback) {
    console.log('post path:', path);
    // console.log('posting:', body);
    var xhr = new XMLHttpRequest();
    xhr.open('POST', path, true)
    // Send the proper header information along with the request
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            var data = JSON.parse(xhr.responseText)
            // optional callback
            typeof callback === 'function' && callback(data);
        }
    }

    xhr.withCredentials = true;
    xhr.send(body)
}

// PUT
function put(path, body, type, callback) {
    console.log('put path:', path, type, callback);
    // console.log('putting:', body);
    var xhr = new XMLHttpRequest();
    xhr.open('PUT', path, true)
    // Send the proper header information along with the request
    xhr.setRequestHeader("Content-type", type);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            var data = JSON.parse(xhr.responseText);
            // console.log('callback?', callback)
            // callback(data);
            // optional callback
            if (typeof callback != undefined) callback(data, path);
        }
    }

    xhr.withCredentials = true;
    xhr.send(body);
}

// DELETE
function deleteScene(path, callback) {
    console.log('delete path:', path);
    var xhr = new XMLHttpRequest();
    xhr.open('DELETE', path, true)
    // Send the proper header information along with the request
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            var data = JSON.parse(xhr.responseText)
            callback(data);
        }
    }

    xhr.withCredentials = true;
    xhr.send(null)
}


// API functionality:

// user check - make sure somebody is logged in
var user;
get('/api/developer.json', 'json', getUser);

// callback from user check
function getUser(data){
    console.log('getUser:', data)
    user = data;

    // do stuff with the sign-in data
    if (data.id) {
        console.log('User ' + data.nickname + ' is signed in!')
        // console.log('data:', data)
        // scene check - see what scenes a user has
        getScenes();
    } else {
        console.log('No user is signed in!')
    }
}

function addSpheremap(scene) {
    // console.log('addSpheremap, starting with:', scene)
    var spheremap = scene.thumbnail;
    // var spheremap = canvas.toDataURL('image/png');
    url = '/api/scenes/'+user.id+'/'+scene.id+'/resources/spheremap';
    put(url, spheremap, "image/png", checkSpheremap);
}

// test spheremap retrieval
function checkSpheremap(data, url) {
    console.log('checking for spheremap:', url)
    // send result of get to window.open function
    get(url, 'png', window.open);
}

function getScenes() {
    get('/api/scenes/'+user.id, 'json', receiveScenes);
};

// callback from scenes check
function receiveScenes(data) {
    // do stuff with the sign-in data
    if (data) {
        console.log('receiveScenes data:', data)
    } else {
        console.log('No response from scene check!')
    }
};

// callback from scenes check
function getScene(scene) {
    get('/api/scenes/'+user.id+"/"+scene, 'json', receiveScene);
};

function receiveScene(data) {
    // do stuff with the data
    if (data) {
        console.log('receiveScene data:', data);
    } else {
        console.log('receiveScene got no data!')
    }
};

// post a test scene
function postScene(scene) {
    var data = {
        name: "my scene name",        // * required *
        description: "description",
        public: true,
        thumbnail: "<data uri>",
        entrypoint: "scene.yaml",     // * required *

        view_label: "view_label",
        view_lat: 12.12345678,
        view_lng: -123.12345678,
        view_zoom: 12.4,

        versions_tangram: "0.10.5",
        versions_leaflet: "1.0"
    }

    if (typeof scene != 'undefined') {
        data = scene;
    }

    data = JSON.stringify(data);
    // post new scene and add spheremap afterward
    post('/api/scenes/'+user.id, data, addSpheremap);

}

function getSceneID(data) {
    console.log('getSceneID:', data);
}

function testDelete(scene) {
    deleteScene('/api/scenes/'+user.id+'/'+scene, deleted);
}

// callback from testDelete
function deleted(data) {
    if (data) {
        console.log('deleted:', data)
    }
}

// post a test scene
function putScene(scene) {
    var data = {
        name: "new scene name",        // * required *
        description: "description",
        public: true,
        thumbnail: "<data uri>",
        entrypoint: "scene.yaml",     // * required *

        view_label: "view_label",
        view_lat: 12.12345678,
        view_lng: -123.12345678,
        view_zoom: 12.4,

        versions_tangram: "0.10.5",
        versions_leaflet: "1.0"
    }

    data = JSON.stringify(data);
    put('/api/scenes/'+user.id+'/'+scene, data, "application/json", getScenes);
}

const THUMBNAIL_WIDTH = 144;
const THUMBNAIL_HEIGHT = 81;

function makeThumbnail() {
    scene.screenshot().then(function(screenshot) {
 
        createThumbnail(screenshot.blob, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, true, false).then(function(result) {
            // window.open(result);

            var data = {
                name: "thumbnail scene name",        // * required *
                description: "description",
                public: true,
                //thumbnail: "<data uri>",
                thumbnail: result,
                second: result,
                entrypoint: "scene.yaml",     // * required *

                view_label: "view_label",
                view_lat: 12.12345678,
                view_lng: -123.12345678,
                view_zoom: 12.4,

                versions_tangram: "0.10.5",
                versions_leaflet: "1.0"
            };

            postScene(data);

        });
    });

    // window.open(screenshot.url);
}