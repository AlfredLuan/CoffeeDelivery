function getRedirectUrlAfterLogin(kiiUser) {

    var role = kiiUser.get("role");

    var url;
    switch (role) {
        case UserRole.CoffeeMaker:
            url = "/page/orderlist.html";
            break;
        case UserRole.Operator:
            url = "/page/drivermap.html";
            break;
        case UserRole.ProductManager:
            url = "/page/producttemplatelist.html";
            break;
        default:
            url = "/page/errorpage.html";
            break;
    }

    console.log("getRedirectUrlAfterLogin", role, url);
    return url;
}

//
function login() {

    var username = document.getElementById('login_name').value;
    var password = document.getElementById('password').value;

    // Authenticate a user.
    KiiUser.authenticate(username, password, {
        success: function(theUser) {
            console.log(theUser);

            // subscribe shop topic
            subscribeShopTopic(theUser, function() {

                theUser.refresh({
                    success: function(theUser) {
                        console.log(theUser);

                        clearErrorMessage("navbar_error_message");
                        // set login info into cookie
                        saveLoginInfo(theUser);

                        window.location.href = getRedirectUrlAfterLogin(theUser);
                    },
                    failure: function(theUser, errorString) {
                        // Handle the error.
                        showErrorMessage("navbar_error_message", "{error-Failed-to-subscribe-topic}");
                    }
                })

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

    window.location.href = "/page/index.html";

}


// register an user
function registerUser(eventSoure) {

    // block button
    eventSoure.disabled = true;

    var username = getElementValue("register_login_name");
    var password = getElementValue("register_password");
    var confirmPassword = getElementValue("register_confirm_password");
    var displayName = getElementValue("register_display_name");
    var email = getElementValue("register_mail");
    var phone = "+" + getElementValue("register_phone");

    var role = getElementValue("register_role");

    // check password input
    if(confirmPassword != password) {
        // Handle the error.
        showErrorMessage("navbar_error_message", "{error-Confirm-password-wrong}");
        // unblock button
        eventSoure.disabled = false;
        return;
    }

    // Create a user.
    var user;

    try {
        user = KiiUser.userWithCredentials(email, phone, username, password);
        user.setDisplayName(displayName);
    } catch (err) {
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

            // unblock button
            eventSoure.disabled = false;

            // redirect
            window.location.href = getRedirectUrlAfterLogin(theUser);
        },
        failure: function(theUser, errorString) {
            // Handle the error.
            showErrorMessage("navbar_error_message", "{error-Failed-to-register-user}");
            // unblock button
            eventSoure.disabled = false;
        }
    });
}
//
// function registerShopForOperator(eventSoure) {
//
//     // block button
//     eventSoure.disabled = true;
//
//     var shopName = getElementValue("register_shop_name");
//     var address = getElementValue("register_shop_address");
//
//     // Create a group.
//     var group = KiiGroup.groupWithName(shopName);
//
//     // Save the group on the server.
//     group.save({
//       success: function(theGroup) {
//         // Get the reference URI and ID of the group.
//         var groupUri = theGroup.objectURI();
//         var groupID = theGroup.getID();
//
//         // save shop info into shop info list
//         saveShopInfo(groupID, shopName, address, function(){
//
//             // unblock button
//             eventSoure.disabled = false;
//
//             // jump to dashboard
//             window.location.href="/page/dashboard.html";
//
//         });
//       },
//       failure: function(theGroup, errorString) {
//         // Handle the error.
//         showErrorMessage("navbar_error_message", "{error-Failed-to-create-shop}");
//         // unblock button
//         eventSoure.disabled = false;
//       }
//     });
// }


function onSelectShopChange() {

    var shopID = getValueFromSelectElement("register_shop_name_select");

    for (var i = 0; i < shopInfoList.length; i++) {
        if (shopInfoList[i].get("shop_id") == shopID) {
            setElementValue("register_shop_address_select", shopInfoList[i].get("address"));
        }
    };

}

function loadShopInfoListForRegister(onSuccess) {

    loadShopInfoList(function(resultSet) {

        shopInfoList = resultSet;

        var temp = "";
        for (var i = 0; i < shopInfoList.length; i++) {
            temp += "<option value='" + shopInfoList[i].get("shop_id") + "'>" + shopInfoList[i].get("shop_name") + "</option>"
        };

        document.getElementById("register_shop_name_select").innerHTML = temp;
        if (shopInfoList !== undefined && shopInfoList.length > 0) {
            setElementValue("register_shop_address_select", shopInfoList[0].get("address"));
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


/////////////////////////////////////////////////////
// login status management
/////////////////////////////////////////////////////

function saveLoginInfo(kiiUser) {

    Global.currentUser = kiiUser;
    setCookie("login_name", kiiUser.getUsername(), 1);
    setCookie("access_token", kiiUser.getAccessToken(), 1);

    console.log("save login info", kiiUser);
}

function clearLoginInfo() {
    Global.currentUser = undefined;
    clearCookie("login_name");
    clearCookie("access_token");

    console.log("clear login info");
}

function loadCurrentUserInfo(onSuccess, onFailure) {

    onSuccess = toSafeCallback(onSuccess);
    onFailure = toSafeCallback(onFailure);

    var accessToken = getCookie("access_token");

    // Authenticate a user with the access token.
    KiiUser.authenticateWithToken(accessToken, {
        success: function(theUser) {
            // call refresh to get user attribute
            theUser.refresh({
                success: function(kiiUser) {
                    saveLoginInfo(kiiUser);
                    onSuccess(kiiUser);
                },
                failure: function(kiiUser, errorString1) {
                    // Handle the error.
                    console.log(errorString1);
                    onFailure();
                }
            })
        },
        failure: function(theUser, errorString) {
            // Handle the error.
            console.log(errorString);
            onFailure();
        }
    })
}

function getAvailableLinksForUserRole(role) {

    console.log("user role", role);

    var links = [];

    switch (role) {
        case UserRole.CoffeeMaker:
            links = [
                "link_orderlist",
                "link_drivermap",
                "link_myprofile",
                "link_displayname",
                "link_logout"
            ];
            break;
        case UserRole.Operator:
            links = [
                "link_dashboard",
                "link_shoplist",
                "link_producttemplatelist",
                "link_orderlist",
                "link_drivermap",
                "link_myprofile",
                "link_displayname",
                "link_logout"
            ];
            break;
        case UserRole.ProductManager:
            links = [
                "link_dashboard",
                "link_producttemplatelist",
                "link_myprofile",
                "link_displayname",
                "link_logout"
            ];
            break;
        case UserRole.Driver:
            links = [
                "link_myprofile"
            ];
            break;
        case UserRole.Consumer:
            links = [
                "link_myprofile",
                "link_displayname",
                "link_logout"
            ];
            break;
    }

    return links;
}

// check login status
function checkLoginStatus(isBackToHomePage) {

    var d = $.Deferred();

    var loginName = getCookie("login_name");

    var elementsBeforeLogin = document.getElementsByName("before_login");
    var elementsAfterLogin = document.getElementsByName("after_login");

    if (loginName !== undefined && loginName != null && loginName != "") {

        // refresh Kii user info
        loadCurrentUserInfo(function(theUser) {

            var availableLinks = getAvailableLinksForUserRole(theUser.get("role"));

            // show login info
            for (var i = 0; i < elementsBeforeLogin.length; i++) {
                elementsBeforeLogin[i].style.display = "none";
            }

            for (var i = 0; i < elementsAfterLogin.length; i++) {

                elementsAfterLogin[i].style.display = "none";

                // only display the corresponding links for the role
                for (var j = 0; j < availableLinks.length; j++) {
                    if(availableLinks[j] == elementsAfterLogin[i].id) {
                        elementsAfterLogin[i].style.display = "block";
                        break;
                    }
                }
            }

            clearErrorMessage("navbar_error_message");

            // display login name
            document.getElementById("login_name_display").innerHTML = loginName;

            d.resolve();
        }, function(errorString) {
            d.reject();
        });

    } else {

        // hide login info
        for (var i = 0; i < elementsBeforeLogin.length; i++) {
            elementsBeforeLogin[i].style.display = "block";
        }

        for (var i = 0; i < elementsAfterLogin.length; i++) {
            elementsAfterLogin[i].style.display = "none";
        }

        clearErrorMessage("navbar_error_message");

        if (isBackToHomePage == true) {
            // go back to home page
            window.location.href = "/";
        }

        d.reject();
    }

    return d.promise();
}
