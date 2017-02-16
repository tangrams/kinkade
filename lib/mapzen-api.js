//
// Mapzen API - only works for mapzen.com hosted version
// https://github.com/mapzen/wiki/wiki/mapzen.com-Scenes-API

// global variables

var user;
var scenes;
var lastID = 0;

// XHR Methods

// GET
function get(path, type, callback, extradata) {
    // console.log('get path:', path, 'type:', type);
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
            if (typeof extradata !== 'undefined') typeof callback === 'function' && callback(data, extradata);
            else typeof callback === 'function' && callback(data);
        }
    }
    xhr.open('GET', path, true)
    xhr.send()
}

// POST
function post(path, body, callback) {
    // console.log('post path:', path);
    // console.log('posting:', body);
    var xhr = new XMLHttpRequest();
    xhr.open('POST', path, true)
    // Send the proper header information along with the request
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.onreadystatechange = function () {
        // console.log(xhr.readyState, xhr.status);
        if (xhr.readyState === 4 && xhr.status === 200) {
            if (typeof xhr.responseText != 'undefined') {
                // console.log('xhr.responseText:', xhr.responseText);
                try {
                    var data = JSON.parse(xhr.responseText);
                } catch(e) {
                    // console.log("couldn't parse response as JSON:", e)
                }
            }
            else var data = null;
            // optional callback
            typeof callback === 'function' && callback(data);
        }
    }

    xhr.withCredentials = true;
    xhr.send(body)
}

// PUT
function put(path, body, type, callback) {
    // console.log('put path:', path, type, callback);
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
    // console.log('delete path:', path);
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

function signin() {
    get(url, 'png', window.open);
}

// callback from deleteScene
function deleted(data) {
    if (data) {
        console.log('deleted:', data)
    }
}

// callback from user check
function getUser(data){
    console.log('getUser:', data)
    user = data;
    // do stuff with the sign-in data
    if (data && data.id) {
        document.getElementById("loginname").innerHTML = data.nickname;

        document.getElementById("account-actions").style.display = "block";
        document.getElementById("login").style.display = "none";
        document.getElementById("logout").style.display = "inline";

        console.log('User ' + data.nickname + ' is signed in!')
        // scene check - see what scenes a user has
        getScenes();
    } else {
        document.getElementById("loginname").innerHTML = 'NOBODY LOGGED IN';

        document.getElementById("account-actions").style.display = "none";
        document.getElementById("login").style.display = "inline";
        document.getElementById("logout").style.display = "none";

        console.log('No user is signed in!')
    }
}

function addSpheremap(scene) {
    // console.log('addSpheremap, starting with:', scene.thumbnail)
    console.log('addSpheremap');
    // var spheremap = scene.thumbnail;
    var spheremap = kcanvas.toDataURL('image/png');
    url = '/api/scenes/'+user.id+'/'+scene.id+'/resources/spheremap';
    put(url, spheremap, "image/png", checkSpheremap);
}

// test spheremap retrieval
function checkSpheremap(data, url) {
    // console.log('checking for spheremap:', url)
    // send result of get to window.open function
    // get(url, 'png', window.open);
    getScenes();
}

// test spheremap retrieval
function checkSpheremap(data, url) {
    // console.log('checking for spheremap:', url)
    // send result of get to window.open function
    // get(url, 'png', window.open);
    getScenes();
}

function getScenes() {
    // console.log('getScenes()…')
    get('/api/scenes/'+user.id, 'json', receiveScenes);
};

// callback from scenes check
function receiveScenes(data) {
    if (data) {
        // sort data by id
        data = data.sort(function(a, b){
            return a.id < b.id ? -1 : 1;
        });
        console.log('scenes:', data)
        // set global scenes var
        scenes = data;
        // console.log('receiveScenes data:', data)
        // clear out scenes pane
        document.getElementById("scenes").innerHTML = "";
        // rebuild
        for (i = 0; i < data.length; i++) {
            var obj = data[i];
            // console.log('obj:', obj.id)

            //  generate scene link with thumbnail
            var scenesDiv = document.getElementById("scenes");
            var span = document.createElement("span");
            span.setAttribute("class", "scene");
            span.setAttribute("id", "scene-"+obj.id);
            link = document.createElement('a');
            link.setAttribute('onclick', 'loadScene('+ obj.id +')');

            link.innerHTML = obj.name + "<br><img class='screenshot-thumbnail' src='" + obj.thumbnail +"'>";
            
            spheremapimg = document.createElement('img');
            spheremapimg.id = 'spheremap-'+obj.id;
            spheremapimg.setAttribute('class', 'spheremap-thumbnail');

            link.appendChild(spheremapimg);
            
            span.setAttribute("id", obj.id);
            span.appendChild(link);
            scenesDiv.appendChild(span);
// <img id='spheremap-"+obj.id+"' class='spheremap-thumbnail' src='" + result + "'>

            // get spheremap dataurl
            url = "/api/scenes/"+user.id+"/"+obj.id+"/resources/spheremap"
            get(url, 'png', setImageURL, spheremapimg);
        }
        if (scenes.length != 0) lastID = scenes[scenes.length - 1].id;
    } else {
        console.log('No response from scene check!')
    }
};

// set spheremap img src after it's been retrieved
function setImageURL(result, img) {
    img.src = result;
}

function saveScene() {
    // document.getElementById('save-dialog').style.display = 'block';
    name = prompt("Enter Scene name", user.nickname+"-"+(parseInt(lastID) + 1));
    if (name !== 'null') makeThumbnail(name);
    else return false;
}

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
function postScene(data) {
    console.log('postScene');

    if (typeof data != 'undefined') {
        data = JSON.stringify(data);
        // post new scene and add spheremap afterward
        post('/api/scenes/'+user.id, data, addSpheremap);
    }
}


// post a test scene
function putScene(scene) {
    var data = {
        name: "new scene name",        // * required *
        description: "description",
        public: true,
        thumbnail: scene.thumbnail,
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

function makeThumbnail(name) {
    scene.screenshot().then(function(screenshot) {
 
        createThumbnail(screenshot.blob, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, true, false).then(function(result) {
            var center = map.getCenter();
            var data = {
                name: name,        // * required *
                description: "description",
                public: true,
                thumbnail: result,
                entrypoint: "scene.yaml",     // * required *

                view_label: "view_label",
                view_lat: center.lat,
                view_lng: center.lng,
                view_zoom: map.getZoom(),

                versions_tangram: "0.10.5",
                versions_leaflet: "1.0"
            };

            postScene(data);

        });
    });
}

function clearScenes(scenes) {
    for (var i = 0; i< scenes.length; i++) {
        document.getElementById("scenes").removeChild(document.getElementById(scenes[i].id));
        deleteScene('/api/scenes/'+user.id+'/'+scenes[i].id, deleted);
    }
}

function loadScene(id) {
    var scene;
    for (x in scenes) {
        if (scenes[x].id == id) {
            scene = scenes[x];
            console.log(scenes[x]);
            break;
        }
    }
    var img = document.getElementById('spheremap-'+id);
    drawImgToCanvas(img);
    updateMap();
    saveCanvas();
    map.flyTo({lat: scene.view_lat, lng: scene.view_lng}, parseFloat(scene.view_zoom), {duration: 1.})
}

///////////
// Login flow straight-up ganked from tangram play sign-in-window.js

/**
 * Run Mapzen's sign-in flow in a popup window. Although it's cleaner to iframe
 * into a modal, we tried this but new users are directed to GitHub auth, which
 * cannot be iframed.
 *
 * Due to web security restrictions, sign-in flow can only work if Tangram Play
 * is hosted on the same origin as the Mapzen developer platform, e.g mapzen.com,
 * its staging server, or a local server running the platform in a separate
 * Docker container.
 */
const SIGN_IN_API_ENDPOINT = '/developers/sign_in?popup=true';
const SIGN_IN_HOSTNAME = window.location.hostname === 'localhost' ? 'http://localhost' : '';
const SIGN_IN_PORT = window.location.port === '' ? '' : ':' + window.location.port;

let signInWindow;
let pollWindowStateIntervalId;

/**
 * Opens a new window for the sign-in page and places it in the middle of the
 * app window. This was taken from a StackOverflow answer that we've repurposed
 * several times through mapzen.com but still has a problem with some browsers
 * and some multi-monitor setups.
 */
function popupCenter(url, title, w, h) {
  // Fixes dual-screen position                            Most browsers       Firefox
  const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screen.left;
  const dualScreenTop = window.screenTop !== undefined ? window.screenTop : window.screen.top;

  /* eslint-disable max-len, no-nested-ternary */
  const width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : window.screen.width;
  const height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : window.screen.height;
  /* eslint-enable max-len, no-nested-ternary */

  const left = ((width / 2) - (w / 2)) + dualScreenLeft;
  const top = ((height / 3) - (h / 3)) + dualScreenTop;

  return window.open(url, title, `scrollbars=yes, location=no, width=${w}, height=${h}, top=${top}, left=${left}`);
}

/**
 * Closes the sign-in window. This is called when we detect that the user
 * completes the sign-in flow, and if the app window is closed.
 * Closing the sign-in window should automatically clean up after itself
 * due to the `close` event handler.
 */
function closeSignInWindow() {
  if (signInWindow) {
    signInWindow.close();
  }
}

/**
 * Called when user completes the flow in the sign-in window.
 */
function signInStateReady() {
  EventEmitter.dispatch('mapzen:sign_in', {});
  closeSignInWindow();
  hideSignInOverlay();

  // Returns focus to the original parent window.
  window.focus();
}

/**
 * Cleans up event listeners from the app window to prevent memory leaks.
 */
function cleanup() {
  window.removeEventListener('unload', closeSignInWindow);
  window.clearInterval(pollWindowStateIntervalId);
}

function pollWindowState() {
  if (!signInWindow || signInWindow.closed) {
    window.clearInterval(pollWindowStateIntervalId);
    signInStateReady();
  } else {
    try {
      // If it's exactly /developers, we're probably logged in now
      if (signInWindow.location.pathname === '/developers') {
        signInStateReady();
      }
    } catch (e) {
      // Probably a security policy in the way; ignore
    }
  }
}

/**
 * Primary entry point for opening a sign-in window.
 */
function openSignInWindow() {
  // Only open if not open already; or was closed from a previous attempt.
  // If it's already open, focus on that instead.
  if (!signInWindow || signInWindow.closed === true) {
    const url = SIGN_IN_HOSTNAME + SIGN_IN_PORT + SIGN_IN_API_ENDPOINT;

    signInWindow = popupCenter(url, 'Sign in to Mapzen Developer Portal', 650, 650);
    signInWindow.addEventListener('close', cleanup);
    window.addEventListener('unload', closeSignInWindow);

    // Show an overlay in the app window.
    showSignInOverlay();

    // We can't add load or close event listeners to the new window (they
    // don't trigger) so instead we poll the window at a set interval
    // and perform actions based on what we can detect inside of it.
    pollWindowStateIntervalId = window.setInterval(pollWindowState, 100);
  }

  // This new window should grab the user's attention immediately
  // Apparently, this doesn't work in all browsers (e.g. Chrome) due to
  // security policies.
  signInWindow.focus();
}

// End login-flow
/////////////////
