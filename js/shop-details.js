/////////////////////////////////////////////////////
// for shop details display
/////////////////////////////////////////////////////

var shopInfo = null;

function showShopDetails() {

    var shopID = getQueryString("shop_id");

    var shop = KiiGroup.groupWithID(shopID);
    shop.refresh({
        success: function(theGroup) {
            shopInfo = theGroup;

            // display product info
            setInnerHtml("shop_name", shopInfo.getName(), false);

            var kiiUser = KiiUser.getCurrentUser();

            // load user list
            loadSelectableUserListForDisplay(kiiUser, shopID);
        },
        failure: function(theGroup, errorString) {
            // Handle the error.
            console.log(errorString);
            showErrorMessage("navbar_error_message", "{error-Failed-to-load-shop-info}");
        }
    });

}

/////////////////////////////////////////////////////
// for shop and user mapping display
/////////////////////////////////////////////////////

// list of the users already under this shop
var existingUserIDListByShopID = null;

var allUserIDList = null;

function parseSelectableUserForDisplay(data, displayTemplate, htmlName) {

    var htmlContent = displayTemplate;

    var displayName = data.get("display_name");
    if(isUnavailable(displayName)) {
        displayName = data.get("user_name");
    }

    htmlContent = htmlContent.replaceAll("{UserID}", data.get("user_id"));
    htmlContent = htmlContent.replaceAll("{UserDisplayName}", toSafeString(displayName));
    var userRole = "{UserRole-" + data.get("role") + "}";
    htmlContent = replaceTemplateContent(htmlContent, "{UserRole}", userRole, htmlName);
    htmlContent = htmlContent.replaceAll("{UserEmail}", toSafeString(data.get("email")));
    htmlContent = htmlContent.replaceAll("{UserPhone}", toSafeString(data.get("phone")));

    return htmlContent;
};

// kiiUser is expected to be operator
function loadSelectableUserList(kiiUser, onSuccess, onFailure) {

    var clause1 = KiiClause.equals("role", UserRole.CoffeeMaker);
    var clause2 = KiiClause.equals("role", UserRole.ProductManager);
    var clause = KiiClause.or(clause1, clause2);

    var bucket = Kii.bucketWithName(Bucket.AppScope.UserList);
    loadAllObjects(bucket, clause, function(userList) {
        allUserIDList = [];
        for (var i = 0; i < userList.length; i++) {
            allUserIDList.push(userList[i].get("user_id"));
        }
        onSuccess(userList);
    }, onFailure);

}

function loadSelectableUserListForDisplay(kiiUser, shopID) {

    // load all the users, and display them
    // (the data is based on all available users with role coffee maker or product manager)
    loadListForDisplay("selectable_user_list", "/page/selectableusertemplate.html", function(onSuccess, onFailure) {
        loadSelectableUserList(kiiUser, onSuccess, onFailure);
    }, function(data, displayTemplate, htmlName) {
        return parseSelectableUserForDisplay(data, displayTemplate, htmlName);
    }, function() {
        // on success

        // load the user IDs already under the shop, and set them selected in checkbox
        // the user IDs are only limited to coffee maker or product manager
        loadUserIDListByShopID(shopID, function(userIDListByShopID) {

            existingUserIDListByShopID = userIDListByShopID;

            for (var i = 0; i < existingUserIDListByShopID.length; i++) {
                var userID = existingUserIDListByShopID[i];

                var element = document.getElementById("select_user_" + userID);
                if(isAvailable(element)){
                    element.checked = true;
                }
            }

        });

    });

}

// load the user IDs already under this shop specified by shopID
// (the data is based on group members, only including role coffee maker and product manager)
function loadUserIDListByShopID(shopID, onSuccess, onFailure) {

    var group = KiiGroup.groupWithID(shopID);
    group.getMemberList({
        success: function(shop, userList) {

            console.log("userList", userList);

            var userIDList = convertArray(userList, function(e){
                return e.getID();
            });

            var clause1 = KiiClause.inClause("user_id", userIDList);
            var clause2 = KiiClause.inClause("role", [UserRole.CoffeeMaker, UserRole.ProductManager]);
            var clause = KiiClause.and(clause1, clause2);

            var bucket = Kii.bucketWithName(Bucket.AppScope.UserList);

            loadAllObjects(bucket, clause, function(resultSet) {

                userIDList = convertArray(resultSet, function(e){
                    return e.get("user_id");
                });

                onSuccess(userIDList);
            }, onFailure);
        },
        failure: onFailure
    });
}


/////////////////////////////////////////////////////
// for shop and user mapping update
/////////////////////////////////////////////////////

function onAllUsersCheckBoxChange(eventSource) {
    // value is boolean
    var selectAllUsers = eventSource.checked;

    for (var i = 0; i < allUserIDList.length; i++) {
        document.getElementById("select_user_" + allUserIDList[i]).checked = selectAllUsers;
    }

}

function getSelectedUserIDList() {

    var selectedUserIDList = [];

    for (var i = 0; i < allUserIDList.length; i++) {
        if (document.getElementById("select_user_" + allUserIDList[i]).checked == true) {
            selectedUserIDList.push(allUserIDList[i]);
        }
    }

    return selectedUserIDList;
}

function saveShopAndUserMapping(eventSource) {

    // block button
    eventSource.disabled = true;

    var processComplete = function() {
        // unblock button
        eventSource.disabled = false;
        // jump to dashboard
        window.location.reload(true);
    }

    // get user lists to be added and removed
    var selectedUserIDList = getSelectedUserIDList();

    var differ = differArray(existingUserIDListByShopID, selectedUserIDList);
    var userIDListToRemove = differ.remove;
    var userIDListToAdd = differ.add;


    var shopID = getQueryString("shop_id");
    var shop = KiiGroup.groupWithID(shopID);

    // start to remove each existing mapping
    for (var i = 0; i < userIDListToRemove.length; i++) {
        var user = KiiUser.userWithID(userIDListToRemove[i]);
        shop.removeUser(user);
    }

    // start to add each new mapping
    for (var i = 0; i < userIDListToAdd.length; i++) {
        var user = KiiUser.userWithID(userIDListToAdd[i]);
        shop.addUser(user);
    }

    // save mappings
    shop.save({
        success: function(theSavedGroup) {
            // do something with the saved group
            processComplete();
        },
        failure: function(theGroup, anErrorString, addMembersArray, removeMembersArray) {
            // do something with the error response
            console.log("failed to save users in group", anErrorString, addMembersArray, removeMembersArray);
            processComplete();
        }
    });


}
