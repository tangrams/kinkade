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
            if (typeof extradata !== 'undefined') typeof callback === 'function' && callback(data, extradata);
            else typeof callback === 'function' && callback(data);
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
    if (data.id) {
        document.getElementById("loginname").innerHTML = data.nickname;
        document.getElementById("account-actions").style.display = "block";
        console.log('User ' + data.nickname + ' is signed in!')
        // scene check - see what scenes a user has
        getScenes();
    } else {
        console.log('No user is signed in!')
    }
}

function addSpheremap(scene) {
    // console.log('addSpheremap, starting with:', scene.thumbnail)
    console.log('addSpheremap');
    // var spheremap = scene.thumbnail;
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
            console.log('obj:', obj.id)
            // get spheremap dataurl
            url = "/api/scenes/"+user.id+"/"+obj.id+"/resources/spheremap"
            get(url, 'png', makeSceneEntry, obj);
        }
        if (scenes.length != 0) lastID = scenes[scenes.length - 1].id;
    } else {
        console.log('No response from scene check!')
    }
};

function makeSceneEntry(result, obj) {
    //  generate scene link with thumbnail
    var scenesDiv = document.getElementById("scenes");
    var span = document.createElement("span");
    span.setAttribute("class", "scene");
    span.setAttribute("id", "scene-"+obj.id);
    span.innerHTML = "<a onclick='loadScene("+ obj.id +")'>" + obj.name + "<br><img class='screenshot-thumbnail' src='" + obj.thumbnail + "'><img id='spheremap-"+obj.id+"' class='spheremap-thumbnail' src='" + result + "'></a>";
    span.setAttribute("id", obj.id);
    scenesDiv.appendChild(span);
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