/* Kinkade Mapzen User API integration
	Works with mapzen-user-api.js

*/


// global variables

var user;
var scenes;
var lastID = 0;

// API functionality:

function signin() {
    get(url, 'png', window.open);
}

function signout() {
    post('/api/developer/sign_out', checkUser);
}

// callback from deleteScene
function deleted(data) {
    if (data) {
        console.log('deleted:', data)
    }
}

function checkUser() {
    // check API to see if somebody is logged in
    get('/api/developer.json', 'json', getUser);
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
        getScenes();
    } else {
        document.getElementById("loginname").innerHTML = 'NOBODY LOGGED IN';

        document.getElementById("account-actions").style.display = "none";
        document.getElementById("login").style.display = "inline";
        document.getElementById("logout").style.display = "none";

        console.log('No user is signed in!')
        receiveScenes();
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
    } else {
        data = [];
        console.log('No response from scene check!')
        togglePane('scenespane', false);
    }
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