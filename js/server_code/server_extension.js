var Bucket = {
    AppScope: {
        ShopInfoList: "shops",
        OrderList: "orders",
        ProductList: "stock_items_consumer",
        CouponList: "coupons",
        ThingStates: "_states",
        UserList: "user_list"
    },
    GroupScope: {
        ShopInfo: "shop_info",
        ProductList: "product_list"
    }
};

/**
 * server code endpoint
 */
function registerShopTopic(params, context, done) {

    var adminContext = context.getAppAdminContext();
    // {"uri":"kiicloud://groups/ijhplpz1t1po81o2kk9h766he"}
    var group = adminContext.groupWithURI(params.uri);

    group.refresh({
        success: function(theGroup) {

            // Create a topic in the user scope.
            var topicName = "default_topic";
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
function updateShopInfo(params, context, done) {

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
            var objectInAppScope = bucket.createObjectWithID(theObject.get("shop_id"));
            copyValues(theObject, objectInAppScope, ["shop_id", "name", "avatar_url", "place", "stars", "monthly_sold", "comment_num", "service_time", "delivery_fee"]);
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
function deleteShopInfo(params, context, done) {

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
            var objectInAppScope = bucket.createObjectWithID(theObject.get("shop_id"));
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
function updateUserInfo(params, context, done) {

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
function deleteUserInfo(params, context, done) {

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

function copyValues(srcObject, destObject, keys) {
    for (var i = 0; i < keys.length; i++) {
        destObject.set(keys[i], srcObject.get(keys[i]));
    }
}
