
/////////////////////////////////////////////////////
// push service
/////////////////////////////////////////////////////

function onMqttWSMessageArrived(message) {

}

function connectMqttWS(kiiUser) {

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

                if (message.destinationName === mqttTopic) {
                    var payload = JSON.parse(message.payloadString);
                    console.log("payload Arrived", payload);

                    onMqttWSMessageArrived(payload);
                }
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

    // load groups
    loadGroups(kiiUser, function(groupList) {

        // load topics in each group
        for (var i = 0; i < groupList.length; i++) {
            loadGroupTopics(groupList[i], function(topicList) {

                totalTopicCount += topicList.length;

                // subscript each topic
                for (var j = 0; j < topicList.length; j++) {
                    subscribeTopic(kiiUser, topicList[j], function(topic) {

                        console.log("subscribed to topic", topic);

                        subscribedTopicCount++;
                        if (subscribedTopicCount == totalTopicCount) {
                            console.log("all topics subscribed");

                            onSuccess();
                        }

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
    kiiUser.memberOfOwnedGroups({
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

function loadAllObjects(bucketName, clause, onSuccess, onFailure) {

    console.log("bucket name", bucketName);
    console.log("clause", clause);

    onSuccess = toSafeCallback(onSuccess);
    onFailure = toSafeCallback(onFailure);

    // Prepare the target bucket to be queried.
    var bucket = Kii.bucketWithName(bucketName);

    // Construct query
    var allQuery;

    if(clause !== undefined && clause != null) {
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

    loadAllObjects(Bucket.AppScope.ShopInfoList, null, function(resultSet) {

        Global.shopInfoList = resultSet;

        // callback
        onSuccess(resultSet);

    }, onFailure);
}

function loadOrderList(onSuccess, onFailure) {

    onSuccess = toSafeCallback(onSuccess);
    onFailure = toSafeCallback(onFailure);

    loadAllObjects(Bucket.AppScope.Order, null, function(resultSet) {

        Global.orderList = resultSet;

        // callback
        onSuccess(resultSet);

    }, onFailure);

}
