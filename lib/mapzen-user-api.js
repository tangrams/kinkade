////////////////
// Mapzen API - only works for mapzen.com hosted version
// https://github.com/mapzen/wiki/wiki/mapzen.com-Scenes-API
// Blame: Peter Richardson peter@mapzen.com

// XHR Methods

// GET
function get(path, type, callback, extradata) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            var data;
            if (type === "json") {
                data = JSON.parse(xhr.responseText);
            }
            if (type === "png") {
                data = xhr.responseText;
            }
            // optional callback
            if (typeof callback === "function") {
                if (!typeof extradata === "undefined") {
                    callback(data, extradata);
                } else {
                    callback(data);
                }
            }
        }
    };
    xhr.open("GET", path, true);
    xhr.send();
}

// POST
function post(path, body, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", path, true);
    // Send the proper header information along with the request
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            var data;
            if (!typeof xhr.responseText === "undefined" && xhr.responseText !== "") {
                try {
                    data = JSON.parse(xhr.responseText);
                } catch (e) {
                    console.log("couldn't parse response as JSON:", e);
                }
            } else {
                data = null;
            }
            // optional callback
            if (typeof callback === "function") {
                callback(data);
            }
        }
    };

    xhr.withCredentials = true;
    xhr.send(body);
}

// PUT
function put(path, body, type, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("PUT", path, true);
    // Send the proper header information along with the request
    xhr.setRequestHeader("Content-type", type);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            var data = JSON.parse(xhr.responseText);
            // optional callback
            if (typeof callback === "function") {
                callback(data);
            }
        }
    };

    xhr.withCredentials = true;
    xhr.send(body);
}

// DELETE
function deletePath(path, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("DELETE", path, true);
    // Send the proper header information along with the request
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            var data = JSON.parse(xhr.responseText);
            // optional callback
            if (!typeof callback === "undefined") {
                callback(data, path);
            }
        }
    };

    xhr.withCredentials = true;
    xhr.send(null);
}

