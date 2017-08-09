var Bucket = {
    AppScope: {
        ShopInfoList: "SHOPS",
        OrderList: "ORDERS",
        ProductList: "STOCK_ITEMS_CONSUMER",
        CouponList: "COUPONS",
        ThingStates: "_states",
        UserList: "USER_LIST"
    },
    GroupScope: {
        ShopInfo: "SHOP_INFO",
        ProductList: "PRODUCTS"
    }
};

var Topic = {
    GroupScope: {
        DefaultTopic: "default_topic"
    }
};

var PushMessageEvent = {
    OrderUpdated: "order_updated",
    OrderDeleted: "order_deleted"
}

/**
 * server code endpoint
 */
function onGroupCreated(params, context, done) {

    var adminContext = context.getAppAdminContext();
    // {"uri":"kiicloud://groups/ijhplpz1t1po81o2kk9h766he"}
    var group = adminContext.groupWithURI(params.uri);

    group.refresh({
        success: function(theGroup) {

            // Create a topic in the group scope.
            var topicName = Topic.GroupScope.DefaultTopic;
            var topic = theGroup.topicWithName(topicName);

            // Save the topic to Kii Cloud.
            topic.save({
                success: function(theTopic) {
                    // Do something.
                    console.log("group topic created", theTopic);

                    done(theTopic);
                    return;
                },
                failure: function(errorString) {
                    // Handle the error.
                    console.log(errorString);

                    done(errorString);
                    return;
                }
            });

        },
        failure: function(theObject, errorString) {
            console.log("failed to load object:", objectUri);

            done(errorString);
            return;
        }
    });
}

/**
 * server code endpoint
 */
function onShopInfoUpdated(params, context, done) {

    var adminContext = context.getAppAdminContext();

    if (params.objectID != "basic_info") {
        done();
        return;
    }

    var objectUri = params.uri;

    // Instantiate a KiiObject.
    var object = adminContext.objectWithURI(objectUri);

    // Refresh the KiiObject to retrieve the latest data from Kii Cloud.
    object.refresh({
        success: function(theObject) {

            var bucket = adminContext.bucketWithName(Bucket.AppScope.ShopInfoList);
            var objectInAppScope = bucket.createObjectWithID(theObject.get("id"));
            copyValues(theObject, objectInAppScope, ["id", "name", "avatar_url", "place", "stars", "monthly_sold", "comment_num", "service_time", "delivery_fee"]);
            objectInAppScope.saveAllFields({
                success: function(theObject) {
                    console.log("success to save to shop_info_list", objectInAppScope);
                    done(theObject);
                    return;
                },
                failure: function(theObject, errorString) {
                    console.log("failed to save to shop_info_list", objectInAppScope);
                    done(errorString);
                    return;
                }
            });

        },
        failure: function(theObject, errorString) {
            console.log("failed to load object", objectUri);
            done(errorString);
            return;
        }
    });
}

/**
 * server code endpoint
 */
function onShopInfoDeleted(params, context, done) {

    var adminContext = context.getAppAdminContext();

    if (params.objectID != "basic_info") {
        done();
        return;
    }

    var objectUri = params.uri;

    // Instantiate a KiiObject.
    var object = adminContext.objectWithURI(objectUri);

    object.refresh({
        success: function(theObject) {

            var bucket = adminContext.bucketWithName(Bucket.AppScope.ShopInfoList);
            var objectInAppScope = bucket.createObjectWithID(theObject.get("id"));
            objectInAppScope.delete({
                success: function(theObject) {
                    console.log("success to delete object from shop_info_list", objectInAppScope);
                    done(theObject);
                    return;
                },
                failure: function(theObject, errorString) {
                    console.log("failed to delete object from shop_info_list", objectInAppScope);
                    done(errorString);
                    return;
                }
            });

        },
        failure: function(theObject, errorString) {
            console.log("failed to load object", objectUri);
            done(errorString);
            return;
        }
    });
}

/**
 * server code endpoint
 */
function onUserInfoUpdated(params, context, done) {

    var adminContext = context.getAppAdminContext();

    var userID = params.userID;

    var user = adminContext.userWithID(userID);
    user.refresh({
        success: function(kiiUser) {

            var role = kiiUser.get("role");
            var displayName = kiiUser.getDisplayName();
            var userName = kiiUser.getUsername();
            var email = kiiUser.getEmailAddress();
            var phone = kiiUser.getPhoneNumber();

            var bucket = adminContext.bucketWithName(Bucket.AppScope.UserList);
            var object = bucket.createObjectWithID(userID);

            object.set("user_id", userID);
            object.set("role", role);
            object.set("display_name", displayName);
            object.set("user_name", userName);
            object.set("email", email);
            object.set("phone", phone);

            object.saveAllFields({
                success: function(theObject) {
                    console.log("success to save to bucket users", object);
                    done(theObject);
                    return;
                },
                failure: function(theObject, errorString) {
                    console.log("failed to save to bucket users", object);
                    done(errorString);
                    return;
                }
            });

        },
        failure: function(kiiUser, errorString) {
            console.log("failed to load user:", userID, errorString);
            done(errorString);
            return;
        }
    });

}

/**
 * server code endpoint
 */
function onUserInfoDeleted(params, context, done) {

    var adminContext = context.getAppAdminContext();

    var userID = params.userID;

    var bucket = adminContext.bucketWithName(Bucket.AppScope.UserList);
    var object = bucket.createObjectWithID(userID);

    object.delete({
        success: function(theObject) {
            console.log("success to delete from bucket users", theObject);
            done(theObject);
            return;
        },
        failure: function(theObject, errorString) {
            console.log("failed to delete from bucket users", userID, errorString);
            done(errorString);
            return;
        }
    });

}

/**
 * server code endpoint
 */
function onOrderUpdated(params, context, done) {

    var adminContext = context.getAppAdminContext();

    var bucketID = params.bucketID;
    var objectID = params.objectID;

    var bucket = adminContext.bucketWithName(bucketID);
    var object = bucket.createObjectWithID(objectID);

    object.refresh({
        success: function(theObject) {

            var order = theObject;
            var shopID = order.get("shop")["id"];

            console.log("shopID", shopID);

            var shop = adminContext.groupWithID(shopID);
            var topic = shop.topicWithName(Topic.GroupScope.DefaultTopic);

            // Create a push message.
            var content = {
                "order_id": order.getID(),
                "event": PushMessageEvent.OrderUpdated
            };
            var message = new KiiPushMessageBuilder(content).build();

            // Send the push message.
            topic.sendMessage(message, {
                success: function(theTopic, theMessage) {
                    // Do something.
                    console.log("success to send message", theMessage);
                    done("OK");
                    return;
                },
                failure: function(theTopic) {
                    // Handle the error.
                    console.log("failed to send message", theTopic);
                    done(theTopic);
                    return;
                }
            });


        },
        failure: function(theObject, errorString) {
            console.log("failed to load object", theObject, errorString);
            done(errorString);
            return;
        }
    });

}

function copyValues(srcObject, destObject, keys) {
    for (var i = 0; i < keys.length; i++) {
        destObject.set(keys[i], srcObject.get(keys[i]));
    }
}
