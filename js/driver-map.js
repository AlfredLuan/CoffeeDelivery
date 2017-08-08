function showDriverMap(map, infoWindow) {

    var markerMapOfDrivers = {};

    loadMap(map, infoWindow, function(myPosition) {

        // flush drivers' location by certain interval
        setInterval(function() {

            // display driver's location
            showDriverLocation(myPosition, map, markerMapOfDrivers, function() {
                console.log("location refreshed");
            });

        }, 5000);

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

    // load driver location list
    loadDriverLocationList(myPosition, map, function(driverLocationList) {

        console.log("driverLocationList", driverLocationList);

        var driverIDList = convertArray(driverLocationList, function(e) {
            return e.get("state").driver_id;
        });

        // load driver id and order list map
        loadDriverOrderMap(driverIDList, function(driverOrderMap) {

            // clean up marker map
            cleanMarkerMap(markerMapOfDrivers);

            for (var i = 0; i < driverLocationList.length; i++) {

                var driverLocation = driverLocationList[i];
                var driverID = driverLocation.get("state").driver_id;
                var location = driverLocation.get("state");
                var markerID = driverLocation.getID();
                // console.log("location", location);

                var markerIcon = null;
                if(driverOrderMap[driverID].length == 0) {
                    markerIcon = "http://maps.google.com/mapfiles/ms/icons/green-dot.png";
                } else {
                    markerIcon = "http://maps.google.com/mapfiles/ms/icons/red-dot.png";
                }

                // draw marker in google map
                var marker = new google.maps.Marker({
                    position: convertKiiLocationToGoogleLocation(location),
                    map: map,
                    icon: markerIcon
                });

                // add marker to marker map
                markerMapOfDrivers[markerID] = marker;
            }

        });

    }, function() {
        console.log("failed to loadDriverLocationList");
    });

}

function loadDriverLocationList(myPosition, map, onSuccess, onFailure) {

    var bounds = map.getBounds();
    if(isUnavailable(bounds)) {
        console.log("map bounds not available yet");
        onFailure();
        return;
    }

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

    var clause1 = KiiClause.greaterThan("state.lat", southwest.lat());
    var clause2 = KiiClause.greaterThan("state.lon", southwest.lng());
    var clause3 = KiiClause.lessThan("state.lat", northeast.lat());
    var clause4 = KiiClause.lessThan("state.lon", northeast.lng());
    var clause = KiiClause.and(clause1, clause2, clause3, clause4);

    // var clause = KiiClause.equals("state.location._type", "point");

    var bucket = Kii.bucketWithName(Bucket.AppScope.ThingStates);
    loadAllObjects(bucket, clause, onSuccess, onFailure);

}

function loadDriverOrderMap(driverIDList, onSuccess, onFailure) {

    var resultSet = {};

    if (driverIDList.length == 0) {
        onSuccess(resultSet);
        return;
    }

    for (var i = 0; i < driverIDList.length; i++) {
        resultSet[driverIDList[i]] = [];
    }

    var clause1 = KiiClause.inClause("driver.user_id", driverIDList);
    var clause2 = KiiClause.greaterThan("order_status", 0);
    var clause3 = KiiClause.lessThan("order_status", 5);
    var clause = KiiClause.and(clause1, clause2, clause3);

    var bucket = Kii.bucketWithName(Bucket.AppScope.OrderList);
    loadAllObjects(bucket, clause, function(orderList) {

        for (var i = 0; i < orderList.length; i++) {
            var order = orderList[i];
            resultSet[order.get("driver")["user_id"]].push(order);
        }

        onSuccess(resultSet);
    }, onFailure);

}
