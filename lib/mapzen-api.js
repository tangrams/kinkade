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