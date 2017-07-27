//
function login() {

    var username = document.getElementById('login_name').value;
    var password = document.getElementById('password').value;

    // Authenticate a user.
    KiiUser.authenticate(username, password, {
      success: function(theUser) {
        // Do something.

        // subscribe shop topic
        subscribeShopTopic(theUser, function(){

            clearErrorMessage("navbar_error_message");
            // set login info into cookie
            saveLoginInfo(theUser);

            window.location.href="/page/orderlist.html";
        }, function() {
            // Handle the error.
            showErrorMessage("navbar_error_message", "{error-Failed-to-subscribe-topic}");
        });

      },
      failure: function(theUser, errorString) {
        // Handle the error.
        showErrorMessage("navbar_error_message", "{error-Please-check-login-name-or-password}");
      }
    })

}


function logout() {

    clearErrorMessage("navbar_error_message");
    // clear login info from cookie
    clearLoginInfo();

    window.location.href="/page/index.html";

}


// register an user
function registerUser(eventSoure) {

    // block button
    eventSoure.disabled = true;

    var username = getValueFromElement("register_login_name");
    var password = getValueFromElement("register_password");
    var email = getValueFromElement("register_mail");
    var phone = "+" + getValueFromElement("register_phone");

    var role = getValueFromElement("register_role");

    // Create a user.
    var user;

    try{
        user = KiiUser.userWithCredentials(email, phone, username, password);
    } catch(err) {
        // Handle the error.
        showErrorMessage("navbar_error_message", "{error-Failed-to-register-user}");
        // unblock button
        eventSoure.disabled = false;
        return;
    }

    user.set("role", role);

    // Register the user.
    user.register({
      success: function(theUser) {
        console.log(theUser);

        clearErrorMessage("navbar_error_message");
        saveLoginInfo(theUser);

        // load shop info list
        loadShopInfoListForRegister(function() {

            // show shop form
            if(role == Role.Operator) {
                showRegisterForm("register_shop_info_form");
            } else if(role == Role.CoffeeMaker) {
                showRegisterForm("select_shop_info_form");
            }

            // unblock button
            eventSoure.disabled = false;
        }, function() {
            // unblock button
            eventSoure.disabled = false;
        })
      },
      failure: function(theUser, errorString) {
        // Handle the error.
        showErrorMessage("navbar_error_message", "{error-Failed-to-register-user}");
        // unblock button
        eventSoure.disabled = false;
      }
    });
}

function registerShopForOperator(eventSoure) {

    // block button
    eventSoure.disabled = true;

    var shopName = getValueFromElement("register_shop_name");
    var address = getValueFromElement("register_shop_address");

    // Create a group.
    var group = KiiGroup.groupWithName(shopName);

    // Save the group on the server.
    group.save({
      success: function(theGroup) {
        // Get the reference URI and ID of the group.
        var groupUri = theGroup.objectURI();
        var groupID = theGroup.getID();

        // save shop info into shop info list
        saveShopInfo(groupID, shopName, address, function(){

            // unblock button
            eventSoure.disabled = false;

            // jump to dashboard
            window.location.href="/page/dashboard.html";

        });
      },
      failure: function(theGroup, errorString) {
        // Handle the error.
        showErrorMessage("navbar_error_message", "{error-Failed-to-create-shop}");
        // unblock button
        eventSoure.disabled = false;
      }
    });
}

function saveShopInfo(shopID, shopName, address, onSuccess) {

    var group = KiiGroup.groupWithID(shopID);
    var bucket = group.bucketWithName("shop_info");
    var object = bucket.createObjectWithID("basic_info");

    object.set("shop_id", shopID);
    object.set("shop_name", shopName);
    object.set("address", address);

    object.saveAllFields({
      success: function(theUser) {
        onSuccess();
      },
      failure: function(theUser, errorString) {
        // Handle the error.
        showErrorMessage("navbar_error_message", "{error-Failed-to-save-shop-info}");
      }
    });

}

function onSelectShopChange() {

    var shopID = getValueFromSelectElement("register_shop_name_select");

    for (var i = 0; i < shopInfoList.length; i++) {
        if(shopInfoList[i].get("shop_id") == shopID) {
            setValueInElement("register_shop_address_select", shopInfoList[i].get("address"));
        }
    };

}

function loadShopInfoListForRegister(onSuccess) {

    loadShopInfoList(function(resultSet) {

        shopInfoList = resultSet;

        var temp = "";
        for (var i = 0; i < shopInfoList.length; i++) {
            temp += "<option value='"+  shopInfoList[i].get("shop_id") +"'>" + shopInfoList[i].get("shop_name") + "</option>"
        };

        document.getElementById("register_shop_name_select").innerHTML = temp;
        if (shopInfoList !== undefined && shopInfoList.length > 0) {
            setValueInElement("register_shop_address_select", shopInfoList[0].get("address"));
        };

        // callback
        onSuccess();
    })
}


function registerShopForCoffeeMaker() {

}

function showRegisterForm(elementId) {

    var formList = ["register_user_info_form", "register_shop_info_form", "select_shop_info_form"];

    for (var i = 0; i < formList.length; i++) {
        document.getElementById(formList[i]).style.display = "none";
    };

    document.getElementById(elementId).style.display = "block";

}
