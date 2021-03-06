
function showDriverMap(map, infoWindow) {

    // get role of current login user
    var currentUser = KiiUser.getCurrentUser();
    var role = currentUser.get(UserAttribute.Role);

    if(role == UserRole.Operator) {
        document.getElementById("driver_icon_label").style.display = "inline";
    }

    var markerMapOfDrivers = {};

    loadMap(map, infoWindow, function(myPosition) {

        showShopLocation(myPosition, map);

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

        // load the map between driver id and order list
        loadDriverOrderMap(driverIDList, function(driverOrderMap) {

            // load the map between driver id (of approved driver) and driver
            loadApprovedDriverMap(driverIDList, function(approvedDriverMap) {

                // clean up marker map
                cleanMarkerMap(markerMapOfDrivers);

                // get role of current login user
                var currentUser = KiiUser.getCurrentUser();
                var role = currentUser.get(UserAttribute.Role);

                for (var i = 0; i < driverLocationList.length; i++) {

                    var driverLocation = driverLocationList[i];
                    var driverID = driverLocation.get("state").driver_id;
                    var location = driverLocation.get("state");
                    var markerID = driverLocation.getID();
                    var driver = approvedDriverMap[driverID];
                    console.log("driver", driver);
                    // console.log("location", location);

                    // if driver is not approved, don't show it
                    // if driver is offline, mark gray, only show it for operator
                    // if driver is online and without order, mark green
                    // if driver is online and with order, mark red, only show if for operator
                    var markerIcon = null;
                    if(isUnavailable(driver)) {
                        console.log("driver " + driverID + " is not approved");
                        continue;
                    } else if (toSafeBoolean(driver.get(UserAttribute.Online)) == false) {
                        console.log("driver " + driverID + " is offline");
                        if(role != UserRole.Operator) {
                            continue;
                        }
                        markerIcon = "http://maps.google.com/mapfiles/marker_grey.png";
                    } else if (driverOrderMap[driverID].length == 0) {
                        console.log("driver " + driverID + " is without order");
                        markerIcon = "http://maps.google.com/mapfiles/ms/icons/green-dot.png";
                    } else {
                        console.log("driver " + driverID + " is with order");
                        if(role != UserRole.Operator) {
                            continue;
                        }
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

/**
* return the map between driver ID and the order list
*/
function loadDriverOrderMap(driverIDList, onSuccess, onFailure) {

    var resultSet = {};

    if (driverIDList.length == 0) {
        onSuccess(resultSet);
        return;
    }

    for (var i = 0; i < driverIDList.length; i++) {
        resultSet[driverIDList[i]] = [];
    }

    var clause1 = KiiClause.inClause("driver.id", driverIDList);
    var clause2 = KiiClause.greaterThan("order_status", 0);
    var clause3 = KiiClause.lessThan("order_status", 5);
    var clause = KiiClause.and(clause1, clause2, clause3);

    var bucket = Kii.bucketWithName(Bucket.AppScope.OrderList);
    loadAllObjects(bucket, clause, function(orderList) {

        for (var i = 0; i < orderList.length; i++) {
            var order = orderList[i];
            resultSet[order.get("driver")["id"]].push(order);
        }

        onSuccess(resultSet);
    }, onFailure);

}

/**
* return the map between driver ID and driver
*/
function loadApprovedDriverMap(driverIDList, onSuccess, onFailure) {

    var resultSet = {};

    if (driverIDList.length == 0) {
        onSuccess(resultSet);
        return;
    }

    var clause1 = KiiClause.inClause("user_id", driverIDList);
    var clause2 = KiiClause.equals("approved", true);
    var clause = KiiClause.and(clause1, clause2);

    var bucket = Kii.bucketWithName(Bucket.AppScope.UserList);
    loadAllObjects(bucket, clause, function(driverList) {

        for (var i = 0; i < driverList.length; i++) {
            var driver = driverList[i];
            resultSet[driver.getID()] = driver;
        }

        onSuccess(resultSet);
    }, onFailure);

}

function showShopLocation(myPosition, map) {

    // load shop basic info list
    loadShopLocationList(myPosition, map, function(shopBasicInfoList) {

        console.log("shopBasicInfoList", shopBasicInfoList);

        for (var i = 0; i < shopBasicInfoList.length; i++) {

            var shopBasicInfo = shopBasicInfoList[i];
            var place = shopBasicInfo.get("place");
            if(isUnavailable(place)) {
                continue;
            }

            var location = place["geometry"]["location"];

            console.log("shop location", location);

            // draw marker in google map
            var marker = new google.maps.Marker({
                position: new google.maps.LatLng(location["lat"], location["lng"]),
                map: map,
                icon: "/img/Retail-shop-icon.png"
            });
        }

    }, function() {
        console.log("failed to load shop location list, retry");

        setTimeout(function() {
            showShopLocation(myPosition, map);
        }, 3000);

    });

}


function loadShopLocationList(myPosition, map, onSuccess, onFailure) {

    var bounds = map.getBounds();
    if(isUnavailable(bounds)) {
        console.log("map bounds not available yet");
        onFailure();
        return;
    }

    var kiiUser = KiiUser.getCurrentUser();

    // load shops
    loadGroups(kiiUser, function(shopList) {

        // load basic info list of shops
        loadShopBasicInfoList(shopList, onSuccess, onFailure);

    }, onFailure);

}
