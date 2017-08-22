function saveUserInfo(eventSource, userID) {

    // block the button
    eventSource.disabled = true;

    var role = getElementValue(userID + "_Role");
    var approved = document.getElementById(userID + "_Approved").checked;

    // Set parameters.
    var attributes = {};
    attributes[UserAttribute.Role] = role;
    attributes[UserAttribute.Approved] = approved;

    var args = {
        "targetUserID": userID,
        "attributes": attributes
    };

    callServerCode("updateUserAttribute", args, function(result) {
        if(result.success == true) {
            // unblock the button
            eventSource.disabled = false;

            window.location.reload(true);
        } else {
            showErrorMessage("driver_list_error_message", "{error-Failed-to-approve-driver}");
        }
    }, function(result) {
        // unblock the button
        eventSource.disabled = false;

        showErrorMessage("driver_list_error_message", "{error-Failed-to-approve-driver}");
    })

}

function parseUserTemplateForDisplay(data, displayTemplate, htmlName) {

    var htmlContent = displayTemplate;

    var driverID = data.getID();
    htmlContent = htmlContent.replaceAll("{UserID}", driverID);

    htmlContent = htmlContent.replaceAll("{DisplayName}", toSafeString(data.get("display_name")));
    htmlContent = htmlContent.replaceAll("{Phone}", toSafeString(data.get("phone")));
    htmlContent = htmlContent.replaceAll("{Mail}", toSafeString(data.get("email")));

    var role = toSafeString(data.get(UserAttribute.Role));
    for (var key in UserRole) {
        var userRole = UserRole[key];
        if (role == userRole) {
            htmlContent = htmlContent.replaceAll("{" + userRole + "_role_selected}", "selected");
        } else {
            htmlContent = htmlContent.replaceAll("{" + userRole + "_role_selected}", "");
        }
    }

    var online = toSafeBoolean(data.get(UserAttribute.Online));
    htmlContent = htmlContent.replaceAll("{Online}", online.format("Yes", "No"));
    var approved = toSafeBoolean(data.get(UserAttribute.Approved));
    htmlContent = htmlContent.replaceAll("{Checked}", approved.format("checked", ""));

    htmlContent = replaceTemplateContent(htmlContent, "{ApprovedLabel}", null, htmlName);
    htmlContent = replaceTemplateContent(htmlContent, "{SaveLabel}", null, htmlName);

    return htmlContent;
};

// kiiUser is expected to be admin
function loadUserList(kiiUser, onSuccess, onFailure) {

    // get user list
    var bucket = Kii.bucketWithName(Bucket.AppScope.UserList);

    var clause = KiiClause.inClause(UserAttribute.Role, [
        UserRole.CoffeeMaker,
        UserRole.ProductManager,
        UserRole.Driver,
        UserRole.Consumer
    ]);

    loadAllObjects(bucket, clause, function(userList) {

        if(isUnavailable(userList) || userList.length == 0) {
            onSuccess(userList);
            return;
        }

        var groupResult = group(userList, function(e) {
            return e.get(UserAttribute.Role);
        });

        var groupResultList = convertArray(groupResult, function(value, key) {

            // sort user list of each role by display name
            value.sort(function(a, b) {
                return a.get("display_name") > b.get("display_name");
            })

            return {
                "role": key,
                "user_list": value
            };
        });

        // sort by role
        groupResultList.sort(function(a, b) {
            return a["role"] > b["role"];
        })

        var sortedUserList = [];
        for (var i = 0; i < groupResultList.length; i++) {
            sortedUserList = sortedUserList.concat(groupResultList[i]["user_list"]);
        }

        // callback
        onSuccess(sortedUserList);

    }, onFailure);

}

function loadUserListForDisplay() {

    var currentUser = KiiUser.getCurrentUser();

    loadListForDisplay("user_list", "/page/usertemplate.html", function(onSuccess, onFailure) {
        loadUserList(currentUser, onSuccess, onFailure);
    }, function(data, displayTemplate, htmlName) {
        return parseUserTemplateForDisplay(data, displayTemplate, htmlName);
    });

}
