
/*
* reference:
*   https://developers.google.com/maps/documentation/javascript/geolocation
*/
function loadMap(map, infoWindow, onSuccess, onFailure) {

    onSuccess = toSafeCallback(onSuccess);
    onFailure = toSafeCallback(onFailure);

    // this will help to locate to the position where the map was closed last time
    map.addListener("center_changed", function(){
        var center = map.getCenter();
        saveCurrentLocationToLocal(center.lat(), center.lng());
    });

    // add my location button
    addMyLocationButton(map);

    // display my location
    showMyLocation(map, infoWindow, onSuccess, onFailure);
}

/**
* reference:
*   https://stackoverflow.com/questions/24952593/how-to-add-my-location-button-in-google-maps
*/
function addMyLocationButton(map, myMarker) {

    var marker = myMarker;

    if(isUnavailable(marker)) {
        marker = new google.maps.Marker({
            map: map,
            animation: google.maps.Animation.DROP,
            icon: "https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png"
        });
    };

    var controlDiv = document.createElement('div');

    var firstChild = document.createElement('button');
    firstChild.style.backgroundColor = '#fff';
    firstChild.style.border = 'none';
    firstChild.style.outline = 'none';
    firstChild.style.width = '28px';
    firstChild.style.height = '28px';
    firstChild.style.borderRadius = '2px';
    firstChild.style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)';
    firstChild.style.cursor = 'pointer';
    firstChild.style.marginRight = '10px';
    firstChild.style.padding = '0px';
    firstChild.title = 'Your Location';
    controlDiv.appendChild(firstChild);

    var secondChild = document.createElement('div');
    secondChild.style.margin = '5px';
    secondChild.style.width = '18px';
    secondChild.style.height = '18px';
    secondChild.style.backgroundImage = 'url(https://maps.gstatic.com/tactile/mylocation/mylocation-sprite-1x.png)';
    secondChild.style.backgroundSize = '180px 18px';
    secondChild.style.backgroundPosition = '0px 0px';
    secondChild.style.backgroundRepeat = 'no-repeat';
    secondChild.id = 'you_location_img';
    firstChild.appendChild(secondChild);

    google.maps.event.addListener(map, 'dragend', function() {
        $('#you_location_img').css('background-position', '0px 0px');
    });

    firstChild.addEventListener('click', function() {
        var imgX = '0';
        var animationInterval = setInterval(function(){
            if(imgX == '-18') imgX = '0';
            else imgX = '-18';
            $('#you_location_img').css('background-position', imgX+'px 0px');
        }, 500);
        if(navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                var latlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                marker.setPosition(latlng);
                map.setCenter(latlng);
                clearInterval(animationInterval);
                $('#you_location_img').css('background-position', '-144px 0px');
            });
        }
        else{
            clearInterval(animationInterval);
            $('#you_location_img').css('background-position', '0px 0px');
        }
    });

    controlDiv.index = 1;
    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(controlDiv);
}


// Note: This example requires that you consent to location sharing when
// prompted by your browser. If you see the error "The Geolocation service
// failed.", it means you probably did not give permission for the browser to
// locate you.
function showMyLocation(map, infoWindow, onSuccess, onFailure) {

    onSuccess = toSafeCallback(onSuccess);
    onFailure = toSafeCallback(onFailure);

    var onLocationAvailable = function(location) {
        console.log("my location", location);

        map.setCenter(location);

        onSuccess(location);
    };

    // get current location and display
    var currentLocation = getCurrentLocationFromLocal();

    if(isAvailable(currentLocation)) {

        onLocationAvailable(currentLocation);

    } else if (navigator.geolocation) {
        // Try HTML5 geolocation.
        navigator.geolocation.getCurrentPosition(function(position) {
            var pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            // showInfoWindow(infoWindow, map, 'Location found.');
            onLocationAvailable(pos);

        }, function() {
            // showInfoWindow(infoWindow, map, "Error: The Geolocation service failed.");
            console.log(arguments);
            onFailure();
        });
    } else {
        // Browser doesn't support Geolocation
        // showInfoWindow(infoWindow, map, "Error: Your browser doesn\'t support geolocation.");
        onFailure();
    }
}

function showInfoWindow(infoWindow, map, content) {
    infoWindow.setPosition(map.getCenter());
    infoWindow.setContent(content);
    infoWindow.open(map);
}

function getAddress(googleLocation, onSuccess, onFailure) {

    var geocoder = new google.maps.Geocoder;

    geocoder.geocode({
        'location': googleLocation
    }, function(results, status) {
        console.log("geocode", results);
        if (status === 'OK') {
            if (results.length > 0) {
                onSuccess(results[0]);
            } else {
                onFailure();
            }
        } else {
            console.log('Geocoder failed due to: ' + status);
            onFailure();
        }
    });
}

function convertGoogleLocationToKiiLocation(googleLocation) {
    if(googleLocation === undefined || googleLocation == null) {
        return null;
    }

    return {lat: googleLocation.lat(), lon: googleLocation.lng()}
}

function convertKiiLocationToGoogleLocation(kiiLocation) {
    if(kiiLocation === undefined || kiiLocation == null) {
        return null;
    }

    return new google.maps.LatLng(kiiLocation.lat, kiiLocation.lon);
}

function saveCurrentLocationToLocal(lat, lng) {
    setCookie("lat", lat);
    setCookie("lng", lng);
}

function getCurrentLocationFromLocal() {

    var lat = getCookie("lat");
    var lng = getCookie("lng");

    console.log("location from cookie", lat, lng);

    if(isNaN(lat) || isNaN(lng)) {
        return null;
    }

    var currentLocation = {
        lat: Number(lat),
        lng: Number(lng)
    };

    return currentLocation;
}
