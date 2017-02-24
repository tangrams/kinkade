debug = true;

function apiIsAccessible() {
	var host = window.location.hostname;
	return (host == "dev.mapzen.com" || host == "mapzen.com");
}

// check API to see if somebody is logged in
function checkUser() {
	debug && console.log('checkuser');
    get('/api/developer.json', 'json', getUser);
}

// callback from user checkUser
function getUser(data){
	debug && console.log('getUser:', data);
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

// set spheremap img src after it's been retrieved
function setImageURL(result, img) {
    img.src = result;
}

// callback from getScenes – update scenes pane
function receiveScenes(data) {
	debug&& console.log('receiveScenes');
    if (data) {
        // sort data by id
        data = data.sort(function(a, b){
            return a.id < b.id ? -1 : 1;
        });
    } else {
    	// no response from scenes check
        data = [];
        // togglePane('scenespane', false);
    }
    // set global variable 'scenes'
    scenes = data;
    // clear out gallery
    document.getElementById("gallery").innerHTML = "";

    // rebuild gallery
    for (i = 0; i < scenes.length; i++) {
        var obj = scenes[i];

        //  generate scene link with thumbnail
        var galleryDiv = document.getElementById("gallery");
        var span = document.createElement("span");
        span.setAttribute("class", "scene");
        span.setAttribute("id", "scene-"+obj.id);

        // create delete button
        button = document.createElement('button');
        button.setAttribute('onclick', 'confirmDelete('+obj.id+', "'+obj.name+'");');
        button.innerHTML = "X";
        button.setAttribute('title', 'DELETE SCENE');
        button.setAttribute('class', 'deletescene-button');
        span.appendChild(button);

        // create link
        link = document.createElement('a');
        link.setAttribute('onclick', 'loadScene('+ obj.id +')');
        // add thumbnail to the link
        link.innerHTML = obj.name + "<br><img class='screenshot-thumbnail' src='" + obj.thumbnail +"'>";
        
        // create a placeholder img for the spheremap
        spheremapimg = document.createElement('img');
        spheremapimg.id = 'spheremap-'+obj.id;
        spheremapimg.setAttribute('class', 'spheremap-thumbnail');
        // add spheremap placeholder to the link
        link.appendChild(spheremapimg);
        
        // get the scene's spheremap dataurl and set it as the src of the placeholder img
        url = "/api/scenes/"+user.id+"/"+obj.id+"/resources/spheremap"
        get(url, 'png', setImageURL, spheremapimg);

        // add the span to the scene pane
        span.setAttribute("id", obj.id);
        span.appendChild(link);
        galleryDiv.appendChild(span);
    }

    if (scenes.length != 0) lastID = scenes[scenes.length - 1].id;
};

function showLoginButton() {
    document.getElementById("loginsection").style.display = "inline";
}

// get the logged-in user's scenes, then rebuild the scenes pane
function getScenes() {
    get('/api/scenes/'+user.id, 'json', receiveScenes);
};


// load a scene from the user's collection
function loadScene(id) {
    var scene;
    // find the scene by id
    for (x in scenes) {
        if (scenes[x].id == id) {
            scene = scenes[x];
            break;
        }
    }
debug&&console.log('scene:', scene);
    document.getElementById('map').src = scene.entrypoint_url;
}

function updateMap(){
    scene.loadTextures();
}


window.onload = function () {

	// offer login button if possible
	if (apiIsAccessible()) {
	    showLoginButton();
	    checkUser();
	}

}