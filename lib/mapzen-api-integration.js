/*eslint no-unused-vars: "off", no-console: "off"*/
/*eslint-env browser*/
/*global togglePane, drawImgToCanvas, updateScale, updateMap, saveCanvas, createThumbnail mzUserAPI:true, kcanvas:true, Tangram:true, scene:true, map:true*/
/*
    Kinkade Mapzen User API integration
    Works with mapzen-user-api.js
    Blame: Peter Richardson peter@mapzen.com
*/


// global variables

var user;
var scenes;
// keep track of the highest-numbered scene, to be incremented for use in a default filename
var lastID = 0;

// API functionality:

function apiIsAccessible() {
    var host = window.location.hostname;
    return (host == "dev.mapzen.com" || host == "mapzen.com");
}

// sign in, and callback
function signout() {
    mzUserAPI.post('/api/developer/sign_out', checkUser);
}

// check API to see if somebody is logged in
function checkUser() {
    mzUserAPI.get('/api/developer.json', 'json', getUser);
}

// callback from user checkUser
function getUser(data){
    // set global variable 'user'
    user = data;
    // do stuff with the sign-in data
    if (data && data.id) {
        document.getElementById("loginname").innerHTML = data.nickname;

        document.getElementById("account-actions").style.display = "block";
        document.getElementById("login").style.display = "none";
        document.getElementById("logout").style.display = "inline";

        // get scenes list and update scenes pane
        getScenes();
    } else {
        // nobody logged in
        document.getElementById("loginname").innerHTML = 'NOBODY LOGGED IN';

        document.getElementById("account-actions").style.display = "none";
        document.getElementById("login").style.display = "inline";
        document.getElementById("logout").style.display = "none";

        // update scenes pane
        receiveScenes();
    }
}

// add a spheremap to a scene
function addSpheremap(scene) {
    var url = '/api/scenes/'+user.id+'/'+scene.id+'/resources/spheremap.png';

    // capture the spheremap from the painting canvas
    // var spheremap = kcanvas.toDataURL('image/png');
    var spheremap = kcanvas.toBlob(function(blob) {
        // bloburl = URL.createObjectURL(blob);
        // add the spheremap to the scene in question, then refetch the scenes list
        mzUserAPI.put(url, blob, "image/png", getScenes);
        // no longer need to read the blob so it's revoked
        // URL.revokeObjectURL(bloburl);
    });


    // Get data URL, convert to blob
    // Strip host/mimetype/etc., convert base64 to binary without UTF-8 mangling
    // Adapted from: https://gist.github.com/unconed/4370822
    // const url = this.canvas.toDataURL('image/png');
    // const data = atob(url.slice(22));
    // const buffer = new Uint8Array(data.length);
    // for (let i = 0; i < data.length; ++i) {
    //     buffer[i] = data.charCodeAt(i);
    // }
    // const blob = new Blob([buffer], { type: 'image/png' });

    // add the spheremap to the scene in question, then refetch the scenes list
    // mzUserAPI.put(url, spheremap, "image/png", getScenes);
}

// add a scenefile to a scene
function addScenefile(scene) {
    // switch spheremap texture from element to url
    var url = '/api/scenes/'+user.id+'/'+scene.id+'/resources/spheremap.png';
    delete(window.scene.config.textures.spheremap.element);
    window.scene.config.textures.spheremap.url = url;

    // convert current scene.config to yaml
    var scenefile = YAML.stringify(window.scene.config, 16);
    var scenefileURL = '/api/scenes/'+user.id+'/'+scene.id+'/resources/scene.yaml';
    // add the spheremap to the scene in question, null callback
    mzUserAPI.put(scenefileURL, scenefile, "text/plain", checkScenefile);

    // set it back to element
    delete(window.scene.config.textures.spheremap.url);
    window.scene.config.textures.spheremap.element = '#kcanvas';
}

// add metadata to a scene
function addMetadata(scene) {
    // make some metadata
    var metadata = {
        'terrain_scale' : document.getElementById('scale').value,
        'timestamp' : Date.now(),
        'tangram_version' : Tangram.version
    }
    // make a destination url for the metadata inside resources/
    var url = '/api/scenes/'+user.id+'/'+scene.id+'/resources/kinkade-metadata.json';
    // add the metadata to the scene in question, then refetch the scenes list
    mzUserAPI.put(url, JSON.stringify(metadata), "application/json", checkMetadata);
}

// callback from addMetadata (unused for now)
function checkMetadata(result, path) {
}

// callback from addScenefile (unused for now)
function checkScenefile(result, path) {
    // var url = path.split('/').slice(0,5).join('/');
    // result is metadata, replace 
    // mzUserAPI.get(url, "text", function(result){
        // console.log('result:', result);
    // });
    // mzUserAPI.put(url, JSON.stringify(metadata), "application/json", checkMetadata);   
}

// get the logged-in user's scenes, then rebuild the scenes pane
function getScenes() {
    mzUserAPI.get('/api/scenes/'+user.id, 'json', receiveScenes);
}

// callback from getScenes – update scenes pane
function receiveScenes(data) {
    if (data) {
        // sort data by id
        data = data.sort(function(a, b){
            return a.id < b.id ? -1 : 1;
        });
    } else {
        // no response from scenes check
        data = [];
        togglePane('scenespane', false);
    }
    // set global variable 'scenes'
    scenes = data;
    // clear out scenes pane
    document.getElementById("scenes").innerHTML = "";
    // rebuild scenes pane
    for (var i = 0; i < scenes.length; i++) {
        var obj = scenes[i];
        makePlaceholder(obj);
    }

    if (scenes.length != 0) lastID = scenes[scenes.length - 1].id;
}

//  make a placeholder span in the scenes pane so the entries stay alphebetized
function makePlaceholder(obj) {
    var span = document.createElement("span");
    span.setAttribute("id", "scene-"+obj.id);
    var scenesDiv = document.getElementById("scenes");
    scenesDiv.appendChild(span);

    // test for Kinkade scene by looking for kinkade metadata
    url = "/api/scenes/"+user.id+"/"+obj.id+"/resources/kinkade-metadata.json";
    mzUserAPI.get(url, 'json', applyMetadata, {obj: obj, span: span});

}

// add the metadata properties to the scene object
function applyMetadata(result, extras) {
    var obj = extras.obj;
    var span = extras.span;
    if (!result) {
        console.log('Scene id:'+obj.id+' "'+obj.name+'" is not a Kinkade scene, skipping.');
        return false;
    }
    Object.keys(result).forEach(function(key) {
        scene[key] = result[key];
    });

    // make a scenes pane entry for the scene
    generateSpan(obj, span);
}

function generateSpan(obj, span) {
    //  generate scene link with thumbnail
    span.setAttribute("class", "scene");

    // create delete button
    var button = document.createElement('button');
    button.setAttribute('onclick', 'confirmDelete('+obj.id+', "'+obj.name+'");');
    button.innerHTML = "X";
    button.setAttribute('title', 'DELETE SCENE');
    button.setAttribute('class', 'deletescene-button');
    span.appendChild(button);

    // create link
    var link = document.createElement('a');
    link.setAttribute('onclick', 'loadScene('+ obj.id +')');
    link.innerHTML = obj.name + "<br><img class='screenshot-thumbnail' src='" + obj.thumbnail +"'>";
    
    // create a placeholder img for the spheremap
    var spheremapimg = document.createElement('img');
    spheremapimg.id = 'spheremap-'+obj.id;
    spheremapimg.setAttribute('class', 'spheremap-thumbnail');
    // add spheremap placeholder to the link
    link.appendChild(spheremapimg);

    // get the scene's spheremap dataurl and set it as the src of the placeholder img
    spheremapimg.src = "/api/scenes/"+user.id+"/"+obj.id+"/resources/spheremap.png";

    // save the scenefile as a json object on the span itself
    var url = obj.entrypoint_url;

    // add the span to the scene pane
    span.setAttribute("id", obj.id);
    span.appendChild(link);
}

// set spheremap img src after it's been retrieved
function setImageURL(result, img) {
    img.src = result;
}

// add metadata to scene after it's been retrieved
// function attachScenefile(result, scene) {
//     scene.scenefile = result;
// }

// start scene-saving process by asking for a name
function saveScene() {
    var name = prompt("Enter Scene name", user.nickname+"-"+(parseInt(lastID) + 1));
    if (name == 'null') return false;

    var entrypoint = 'scene.yaml';
    var center = map.getCenter();

    makeThumbnail().then(function(result) {
        var data = {
            name: name,        // * required *
            description: "description",
            public: true,
            thumbnail: result,
            entrypoint: entrypoint,     // * required *

            view_label: "view_label",
            view_lat: center.lat,
            view_lng: center.lng,
            view_zoom: map.getZoom(),

            versions_tangram: "0.10.5",
            versions_leaflet: "1.0"
        };
        postScene(data);
    });
}

// these match Tangram Play's specs for now (hdtv ratio)
var THUMBNAIL_WIDTH = 144;
var THUMBNAIL_HEIGHT = 81;

// make a thumbnail for the current scene, then post the scene
function makeThumbnail() {
    // take a screenshot of the map using Tangram's screenshot() method,
    // which returns a blob with the image in it
    return new Promise(function(resolve, reject) {
        scene.screenshot().then(function(screenshot) {
 
        // create thumbnail according to the Scenes API specs -
                // uses Tangram Play's thumbnail.js
            createThumbnail(screenshot.blob, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, true, false).then(function(result) {
                resolve(result);
            });
        });
    });
}

// post a scene
function postScene(data) {
    if (typeof data != 'undefined') {
        data = JSON.stringify(data);
        // post new scene and add its spheremap once afterward
        mzUserAPI.post('/api/scenes/'+user.id, data, scenePosted);
    }
}

function scenePosted(scene) {
    addSpheremap(scene);
    addScenefile(scene);
    addMetadata(scene);
}

// delete all scenes - for testing purposes
function clearScenes() {
    mzUserAPI.get('/api/scenes/'+user.id, 'json', function(scenes) {
        for (var i = 0; i< scenes.length; i++) {
            document.getElementById("scenes").removeChild(document.getElementById(scenes[i].id));
            mzUserAPI.deletePath('/api/scenes/'+user.id+'/'+scenes[i].id);
        }
    });
}

// load a scene from the user's collection
function loadScene(id) {
    var scene;
    // find the scene by id
    for (var x in scenes) {
        if (scenes[x].id == id) {
            scene = scenes[x];
            break;
        }
    }
    console.log('scene:', scene);

    // if there's a scene file available, load it
    console.log('url:', scene.entrypoint_url);
    window.scene.load(scene.entrypoint_url);
    // if (typeof scene.scenefile !== 'undefined' && scene.scenefile !== '') {
    //     window.scene.config = YAML.parse(scene.scenefile);
    // }


    // switch out the link to the image from #kcanvas to the s3 image url when we save it
    // remove the the spheremap url and replace it with 'element'
    // debugger;
    if (typeof window.scene.config.textures !== 'undefined') {
        if (typeof window.scene.config.textures.spheremap !== 'undefined') {
            delete(window.scene.config.textures.spheremap.url);
        } else {
            // there's no spheremap  - kinkade has not been here
            // define the object, set it later
            console.log('empty spheremap')
            window.scene.config.textures.spheremap = {}
            console.log('window.scene.config.textures.spheremap:', window.scene.config.textures.spheremap);
        }
    } else {
        window.scene.config.textures = {};
        window.scene.config.textures.spheremap = {};
    }
    if (typeof window.scene.config.scene === 'undefined') {
        window.scene.config.scene = {};
    }
    if (typeof window.scene.config.styles === 'undefined') {
        window.scene.config.styles = {};
    }
    window.scene.config.textures.spheremap.element = '#kcanvas';
    window.scene.updateConfig();

    // use the image already in the DOM, as shown in the scenes pane
    var img = document.getElementById('spheremap-'+id);
    if (typeof img !== 'undefined') {
        // draw it to the painting canvas
        drawImgToCanvas(img);
    }

    // update scale
    document.getElementById('scale_slider').value = scene.terrain_scale;
    updateScale(scene.terrain_scale);
    // update the map with the new settings
    updateMap();
    // add an undo step
    saveCanvas();
    // move map to the saved position and zoom
    map.flyTo({lat: scene.view_lat, lng: scene.view_lng}, parseFloat(scene.view_zoom), {duration: 1.})
}

function confirmDelete(id, name) {
    if (confirm("Delete scene \""+name+"\"?")) mzUserAPI.deletePath('/api/scenes/'+user.id+'/'+id, getScenes);
}

function logout() {
    mzUserAPI.post('/api/developer/sign_out', null, checkLogout);
}

function showLoginButton() {
    document.getElementById("loginsection").style.display = "inline";
}

function checkLogout(response) {
    console.log('user logged out.');
    getUser();
}