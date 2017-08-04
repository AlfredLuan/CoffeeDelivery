
function showDriverMap(map, infoWindow) {

    var markerMapOfDrivers = {};

    loadMap(map, infoWindow, function(myPosition){

        // flush drivers' location by certain interval
        setInterval(function() {

            // display driver's location
            showDriverLocation(myPosition, map, markerMapOfDrivers, function() {
                console.log("location refreshed");
            });

        },5000);

    });

}

function showDriverLocation(myPosition, map, markerMapOfDrivers) {

    // clean up the map;
    var cleanMarkerMap = function(markerMap) {
        for (var key in markerMap) {
            markerMap[key].setMap(null);
            delete markerMap[key];
        }
    }

    loadDriverLocationList(myPosition, map, function(driverLocationList) {

        console.log("driverLocationList", driverLocationList);

        // clean up marker map
        cleanMarkerMap(markerMapOfDrivers);

        for (var i = 0; i < driverLocationList.length; i++) {

            var location = driverLocationList[i].get("state").location;
            var markerID = driverLocationList[i].getID();
            // console.log("location", location);

        // draw marker in google map
          var marker = new google.maps.Marker({
            position: convertKiiLocationToGoogleLocation(location),
            map: map
          });

          // add marker to marker map
          markerMapOfDrivers[markerID] = marker;
        }

    });

}

function loadDriverLocationList(myPosition, map, onSuccess, onFailure) {

    var bounds = map.getBounds();
    var northeast = bounds.getNorthEast();
    var southwest = bounds.getSouthWest();

    console.log("google map", map);
    console.log("google map bounds", bounds);

    // Why below doesn't work ???

    // Define a GeoBox clause with northeast and southwest points.
    // var ne = KiiGeoPoint.geoPoint(northeast.lat(), northeast.lng());
    // var sw = KiiGeoPoint.geoPoint(southwest.lat(), southwest.lng());
    // var ne = KiiGeoPoint.geoPoint(32, 123);
    // var sw = KiiGeoPoint.geoPoint(31, 121);
    // var clause = KiiClause.geoBox('state.location', ne, sw);

    var clause1 = KiiClause.greaterThan("state.location.lat", southwest.lat());
    var clause2 = KiiClause.greaterThan("state.location.lon", southwest.lng());
    var clause3 = KiiClause.lessThan("state.location.lat", northeast.lat());
    var clause4 = KiiClause.lessThan("state.location.lon", northeast.lng());
    var clause = KiiClause.and(clause1, clause2, clause3, clause4);

    // var clause = KiiClause.equals("state.location._type", "point");

    var bucket = Kii.bucketWithName(Bucket.AppScope.ThingStates);
    loadAllObjects(bucket, clause, onSuccess, onFailure);

}
