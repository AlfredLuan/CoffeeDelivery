function approveDriver(driverID, approved) {

    // Set parameters.
    var attributes = {};
    attributes[UserAttribute.Approved] = approved;

    var args = {
        "targetUserID": driverID,
        "attributes": attributes
    };

    callServerCode("updateUserAttribute", args, function(result) {

        if(result.success == true) {
            window.location.reload(true);
        } else {
            showErrorMessage("driver_list_error_message", "{error-Failed-to-approve-driver}");
        }
    }, function(result) {
        showErrorMessage("driver_list_error_message", "{error-Failed-to-approve-driver}");
    })

}

function parseDriverTemplateForDisplay(data, displayTemplate, htmlName) {

    var htmlContent = displayTemplate;

    var driverID = data.getID();
    htmlContent = htmlContent.replaceAll("{DriverID}", driverID);

    htmlContent = htmlContent.replaceAll("{DisplayName}", toSafeString(data.get("display_name")));
    htmlContent = htmlContent.replaceAll("{Phone}", toSafeString(data.get("phone")));
    htmlContent = htmlContent.replaceAll("{Mail}", toSafeString(data.get("email")));
    var online = toSafeBoolean(data.get(UserAttribute.Online));
    htmlContent = htmlContent.replaceAll("{Online}", online.format("Yes", "No"));
    var approved = toSafeBoolean(data.get(UserAttribute.Approved));
    htmlContent = htmlContent.replaceAll("{Approved}", approved.format("Yes", "No"));

    htmlContent = replaceTemplateContent(htmlContent, "{ApproveLabel}", null, htmlName);

    if(approved == true) {
        htmlContent = htmlContent.replaceAll("{DriverID_display}", "none");
    } else {
        htmlContent = htmlContent.replaceAll("{DriverID_display}", "block");
    }

    return htmlContent;
};

// kiiUser is expected to be operator
function loadDriverList(kiiUser, onSuccess, onFailure) {

    // get product template list
    var bucket = Kii.bucketWithName(Bucket.AppScope.UserList);

    var clause = KiiClause.equals(UserAttribute.Role, UserRole.Driver);

    loadAllObjects(bucket, clause, function(driverList) {

        // sort driver list
        driverList.sort(function(a, b) {
            return a.get("display_name") < b.get("display_name");
        })

        // callback
        onSuccess(driverList);

    }, onFailure);

}

function loadDriverListForDisplay() {

    var currentUser = KiiUser.getCurrentUser();

    loadListForDisplay("driver_list", "/page/drivertemplate.html", function(onSuccess, onFailure) {
        loadDriverList(currentUser, onSuccess, onFailure);
    }, function(data, displayTemplate, htmlName) {
        return parseDriverTemplateForDisplay(data, displayTemplate, htmlName);
    });

}
