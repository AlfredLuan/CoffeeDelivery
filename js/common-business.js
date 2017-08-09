
/////////////////////////////////////////////////////
// push service
/////////////////////////////////////////////////////

function connectMqttWS(kiiUser, callbackOnMessageArrive) {

    var development = false;
    kiiUser.pushInstallation().installMqtt(development).then(
        function(response) {
            var installationID = response.installationID;
            return KiiUser.getCurrentUser().pushInstallation().getMqttEndpoint(installationID);
        }
    ).then(
        function(response) {
            var username = response.username;
            var password = response.password;
            var mqttTopic = response.mqttTopic;
            console.log("Success installation username:" + username + ", password: " + password + ", mqttTopic:" + mqttTopic);

            var endpoint = "wss://" + response.host + ":" + response.portWSS + "/mqtt";
            var clientId = mqttTopic;
            var client = new Paho.MQTT.Client(endpoint, clientId);

            client.onConnectionLost = onConnectionLost;
            client.onMessageArrived = onMessageArrived;

            client.connect({
                onSuccess: onConnect,
                userName: username,
                password: password,
            });

            function onConnect() {
                console.log("MQTT Connected");
                client.subscribe(mqttTopic);
            }

            function onConnectionLost(responseObject) {
                if (responseObject.errorCode !== 0) {
                    console.log("MQTT Connection Lost:" + responseObject.errorMessage);
                }
            }

            function onMessageArrived(message) {
                console.log("Message Arrived", message);

                // if (message.destinationName === mqttTopic) {
                    var payload = JSON.parse(message.payloadString);
                    console.log("payload Arrived", payload);

                    callbackOnMessageArrive(payload);
                // }
            }
        }
    ).catch(
        function(error) {
            var errorString = error.message;
            console("Error in Initialization: " + errorString);
        }
    );

}

function subscribeShopTopic(kiiUser, onSuccess, onFailure) {

    onSuccess = toSafeCallback(onSuccess);
    onFailure = toSafeCallback(onFailure);

    var totalTopicCount = 0;
    var subscribedTopicCount = 0;

    var checkAllTopicsSubscribed = function(done){
        if (subscribedTopicCount == totalTopicCount) {
            console.log("all topics subscribed");
            done();
        }
    }

    // load groups
    loadGroups(kiiUser, function(groupList) {

        if(groupList.length == 0) {
            onSuccess();
            return;
        }

        // load topics in each group
        for (var i = 0; i < groupList.length; i++) {
            loadGroupTopics(groupList[i], function(topicList) {

                totalTopicCount += topicList.length;

                // check here, in case of topic list length is 0
                checkAllTopicsSubscribed(onSuccess);

                // subscript each topic
                for (var j = 0; j < topicList.length; j++) {
                    subscribeTopic(kiiUser, topicList[j], function(topic) {

                        console.log("subscribed to topic", topic);

                        subscribedTopicCount++;
                        checkAllTopicsSubscribed(onSuccess);

                    }, onFailure);
                }

            }, onFailure);
        }

    }, onFailure);

}

function subscribeTopic(kiiUser, topic, onSuccess, onFailure) {

    onSuccess = toSafeCallback(onSuccess);
    onFailure = toSafeCallback(onFailure);

    var pushSubscription = kiiUser.pushSubscription();

    // check whether subscribed already
    pushSubscription.isSubscribed(topic, {
        success: function(thePushSubscription, theTopic, isSubscribed) {
            if (isSubscribed) {
                // The current user is subscribed to the topic.
                onSuccess(theTopic);
            } else {
                // The current user is not subscribed to the topic.
                pushSubscription.subscribe(topic, {
                    success: function(thePushSubscription, theTopic) {
                        // Do something.
                        console.log("success to subscribe topic", theTopic);

                        onSuccess(theTopic);
                    },
                    failure: function(thePushSubscription, errorString) {
                        // Handle the error.
                        console.log(errorString);

                        onFailure(errorString);
                    }
                });
            }
        },
        failure: function(theTopic, errorString) {
            // Handle the error.
            console.log(errorString);

            onFailure(errorString);
        }
    });

}

function loadOwnedGroups(kiiUser, onSuccess, onFailure) {

    onSuccess = toSafeCallback(onSuccess);
    onFailure = toSafeCallback(onFailure);

    // example to use callbacks directly
    kiiUser.ownerOfGroups({
        success: function(theUser, groupList) {
            console.log("load group list", groupList);

            onSuccess(groupList);
        },

        failure: function(theUser, errorString) {
            // do something with the error response
            console.log(errorString);

            onFailure(errorString)
        }
    });
}

function loadGroups(kiiUser, onSuccess, onFailure) {

    onSuccess = toSafeCallback(onSuccess);
    onFailure = toSafeCallback(onFailure);

    // example to use callbacks directly
    kiiUser.memberOfGroups({
        success: function(theUser, groupList) {
            console.log("load group list", groupList);

            onSuccess(groupList);
        },

        failure: function(theUser, errorString) {
            // do something with the error response
            console.log(errorString);

            onFailure(errorString)
        }
    });
}

function loadGroupTopics(kiiGroup, onSuccess, onFailure) {

    onSuccess = toSafeCallback(onSuccess);
    onFailure = toSafeCallback(onFailure);

    var allTopicList = [];

    var listCallbacks = {
        success: function(topicList, nextPaginationKey) {

            allTopicList = allTopicList.concat(topicList);

            if (nextPaginationKey != null) {
                // Get the next page of the topic list.
                kiiGroup.listTopics(listCallbacks, nextPaginationKey);
            } else {
                console.log("group topic list", allTopicList);

                onSuccess(allTopicList);
            }
        },
        failure: function(errorString) {
            // Handle the error.
            console.log(errorString);

            onFailure(errorString)
        }
    }

    // Get the first page of the topic list.
    kiiGroup.listTopics(listCallbacks);
}

/////////////////////////////////////////////////////
// business functions
/////////////////////////////////////////////////////

function loadAllObjects(bucket, clause, onSuccess, onFailure) {

    console.log("bucket", bucket);
    console.log("clause", clause);

    onSuccess = toSafeCallback(onSuccess);
    onFailure = toSafeCallback(onFailure);

    // Construct query
    var allQuery;

    if (clause !== undefined && clause != null) {
        allQuery = KiiQuery.queryWithClause(clause);
    } else {
        allQuery = KiiQuery.queryWithClause();
    }

    var allResultSet = [];

    // Define callback functions.
    var queryCallbacks = {
        success: function(queryPerformed, resultSet, nextQuery) {
            // Do something with the result.
            allResultSet = allResultSet.concat(resultSet);

            // If there is more data to retrieve
            if (nextQuery != null) {
                // Execute another query to get more KiiObjects.
                bucket.executeQuery(nextQuery, queryCallbacks);
            } else {
                // if there is no more data to retrieve, display in shop list
                console.log("load all objects", allResultSet);

                // callback
                onSuccess(allResultSet);
            }
        },
        failure: function(queryPerformed, errorString) {
            // Handle the error.
            onFailure(errorString);
        }
    }

    // Query KiiObjects.
    bucket.executeQuery(allQuery, queryCallbacks);
}

function loadShopInfoList(onSuccess, onFailure) {

    onSuccess = toSafeCallback(onSuccess);
    onFailure = toSafeCallback(onFailure);

    var bucket = Kii.bucketWithName(Bucket.AppScope.ShopInfoList);
    loadAllObjects(bucket, null, function(resultSet) {

        Global.shopInfoList = resultSet;

        // callback
        onSuccess(resultSet);

    }, onFailure);
}

function loadOrderList(kiiUser, orderStatusList, onSuccess, onFailure) {

    onSuccess = toSafeCallback(onSuccess);
    onFailure = toSafeCallback(onFailure);

    // load the shops which kii user is member of
    loadGroups(kiiUser, function(shopList){

        if(isUnavailable(shopList) || shopList.length == 0) {

            var emptyList = [];
            Global.orderList = emptyList;
            // callback
            onSuccess(emptyList);
            return;
        }

        var shopIDList = convertArray(shopList, function(e){
            return e.getID();
        });

        // load the orders on the shops which the user is member of
        var clause = KiiClause.inClause("shop.id", shopIDList);

        // if order status list is specified, add it to search condition
        if(isAvailable(orderStatusList) && orderStatusList.length > 0) {
            var orderStatusClause = KiiClause.inClause("order_status", orderStatusList);
            clause = KiiClause.and(clause, orderStatusClause);
        }

        var bucket = Kii.bucketWithName(Bucket.AppScope.OrderList);
        loadAllObjects(bucket, clause, function(resultSet) {

            Global.orderList = resultSet;
            // callback
            onSuccess(resultSet);

        }, onFailure);

    }, onFailure);

}

// kiiUser is expected to be operator or product manager
function getHeadShop(kiiUser, onSuccess, onFailure) {

    kiiUser.memberOfGroups({
        success: function(theUser, groupList) {
            console.log("load group list", groupList);

            // if not in any group, call onFailure
            if(groupList.length == 0) {
                onFailure();
            }

            var count = 0;

            var checkHeadShop = function(group) {
                var bucket = group.bucketWithName(Bucket.GroupScope.ShopInfo);
                var basicInfo = bucket.createObjectWithID("basic_info");

                basicInfo.refresh({
                    success: function(theObject) {
                        // only return the head shop
                        if(theObject.get("role") == ShopRole.Head) {
                            onSuccess(group);
                        } else {
                            // if all shops are checked but no head shop is found, call onFailure
                            count++;
                            if(count == groupList.length) {
                                onFailure();
                            }
                        }
                    },
                    failure: function(theObject, errorString) {
                        console.log("failed to load basic info:", basicInfo)
                        // if all shops are checked but no head shop is found, call onFailure
                        count++;
                        if(count == groupList.length) {
                            onFailure();
                        }
                    }
                })
            };

            for (var i = 0; i < groupList.length; i++) {
                checkHeadShop(groupList[i]);
            }
        },
        failure: function(theUser, errorString) {
            // do something with the error response
            console.log(errorString);

            onFailure(errorString)
        }
    });

}

// shop is expected to be group
function loadShopBasicInfo(shop, onSuccess, onFailure) {

    var bucket = shop.bucketWithName(Bucket.GroupScope.ShopInfo);
    var kiiObject = bucket.createObjectWithID("basic_info");

    kiiObject.refresh({
        success: function(theObject) {
            onSuccess(theObject);
        },
        failure: function(theObject, errorString) {
            onFailure(errorString);
        }
    });
};


// shopList is expected to be group list
function loadShopBasicInfoList(shopList, onSuccess, onFailure) {

    var basicInfoList = [];
    var count = 0;

    // load basic info from each shop
    for (var i = 0; i < shopList.length; i++) {

        loadShopBasicInfo(shopList[i],
            // on success
            function(theObject) {

                console.log("shop basic info", theObject);

                basicInfoList.push(theObject);
                count++;

                // once all shops looped, callback
                if(count == shopList.length) {
                    // callback
                    onSuccess(basicInfoList);
                }
            },
            // on failure
            function() {
                console.log("failed to load basic info:", shopList[i]);
                count++;

                // once all shops looped, callback
                if(count == shopList.length) {
                    // callback
                    onSuccess(basicInfoList);
                }
            }
        );
    }
}

function saveShopBasicInfo(shopID, shopInfo, onSuccess, onFailure) {

    var group = KiiGroup.groupWithID(shopID);
    var bucket = group.bucketWithName(Bucket.GroupScope.ShopInfo);
    var object = bucket.createObjectWithID("basic_info");

    object.set("id", shopID);

    for (var key in shopInfo) {
        object.set(key, shopInfo[key]);
    }

    object.saveAllFields({
      success: onSuccess,
      failure: onFailure
    });

}

function saveProductTemplateInfo(group, productID, productInfo, onSuccess, onFailure) {

    var bucket = group.bucketWithName(Bucket.GroupScope.ProductList);
    var object = null;
    if(isAvailable(productID)) {
        object = bucket.createObjectWithID(productID);
    } else {
        object = bucket.createObject();
    }

    for (var key in productInfo) {
        object.set(key, productInfo[key]);
    }

    if(isAvailable(productID)) {
        object.save({
          success: onSuccess,
          failure: onFailure
        });
    } else {
        object.saveAllFields({
          success: onSuccess,
          failure: onFailure
        });
    }



}
