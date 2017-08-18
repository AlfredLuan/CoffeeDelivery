function getRedirectUrlAfterLogin(kiiUser) {

    var role = kiiUser.get(UserAttribute.Role);

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
function login(eventSource) {

    // block button
    eventSource.disabled = true;

    var username = document.getElementById('login_name').value;
    var password = document.getElementById('password').value;

    // Authenticate a user.
    KiiUser.authenticate(username, password, {
        success: function(theUser) {
            console.log(theUser);

            // subscribe shop topic, to listen to new order or order change
            subscribeShopTopic(theUser, function() {
                console.log("success to subscribe order");

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
                        // unblock button
                        eventSource.disabled = false;
                    }
                });
            }, function() {
                // Handle the error.
                showErrorMessage("navbar_error_message", "{error-Failed-to-subscribe-topic}");
                // unblock button
                eventSource.disabled = false;
            });

        },
        failure: function(theUser, errorString) {
            // Handle the error.
            showErrorMessage("navbar_error_message", "{error-Please-check-login-name-or-password}");
            // unblock button
            eventSource.disabled = false;
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
function registerUser(eventSource) {

    // block button
    eventSource.disabled = true;

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
        eventSource.disabled = false;
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
        eventSource.disabled = false;
        return;
    }

    user.set(UserAttribute.Role, role);

    // Register the user.
    user.register({
        success: function(theUser) {
            console.log(theUser);

            clearErrorMessage("navbar_error_message");
            saveLoginInfo(theUser);

            // unblock button
            eventSource.disabled = false;

            // redirect
            window.location.href = getRedirectUrlAfterLogin(theUser);
        },
        failure: function(theUser, errorString) {
            // Handle the error.
            showErrorMessage("navbar_error_message", "{error-Failed-to-register-user}");
            // unblock button
            eventSource.disabled = false;
        }
    });
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
            logout();
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
                "link_shoplist",
                "link_orderlist",
                "link_orderhistorylist",
                "link_drivermap",
                "link_myprofile",
                "link_displayname",
                "link_logout"
            ];
            break;
        case UserRole.Operator:
            links = [
                "link_shoplist",
                "link_producttemplatelist",
                "link_orderlist",
                "link_orderhistorylist",
                "link_drivermap",
                "link_driverlist",
                "link_analytics",
                "link_shopanalytics",
                "link_productanalytics",
                "link_coffeemakeranalytics",
                "link_driveranalytics",
                "link_myprofile",
                "link_displayname",
                "link_logout"
            ];
            break;
        case UserRole.ProductManager:
            links = [
                "link_shoplist",
                "link_producttemplatelist",
                "link_analytics",
                "link_productanalytics",
                "link_myprofile",
                "link_displayname",
                "link_logout"
            ];
            break;
        case UserRole.Driver:
            links = [
                "link_myprofile",
                "link_displayname",
                "link_logout"
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

function loadTopNavBar(isBackToHomePage) {
    return loadTopNavBarHtml().then(function() {
        return checkLoginStatus(isBackToHomePage);
    })
}

// load top nav bar html content
function loadTopNavBarHtml() {

    console.log("loadTopNavBarHtml");

    var d = $.Deferred();

    loadDisplayTemplate("/page/topnavbar.html", function(headerHtml){

        var header = document.createElement("div");
        header.innerHTML = headerHtml;
        document.body.appendChild(header);

        // getElementsByClassName
        d.resolve();
    }, function(){
        d.reject();
    });

    return d.promise();
}

// check login status
// based on login status, change the display of top nav bar
function checkLoginStatus(isBackToHomePage) {

    console.log("checkLoginStatus");

    var d = $.Deferred();

    var loginName = getCookie("login_name");

    var elementsBeforeLogin = document.getElementsByName("before_login");
    var elementsAfterLogin = document.getElementsByName("after_login");

    if (loginName !== undefined && loginName != null && loginName != "") {

        // refresh Kii user info
        loadCurrentUserInfo(function(theUser) {

            var availableLinks = getAvailableLinksForUserRole(theUser.get(UserAttribute.Role));

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

            // mark underline for the link of current page
            var link = "link_" + getHtmlName();
            console.log("current link", link);
            var currentLink = document.getElementById(link);
            if(isAvailable(currentLink)) {
                currentLink.style += ";text-decoration:underline";

                // if it's analytics page (like "link_xxxxanalytics"), mark underline to "link_analytics" too
                if(link.lastIndexOf("analytics") > 0) {
                    document.getElementById("link_analytics").style += ";text-decoration:underline";
                }
            }

            clearErrorMessage("navbar_error_message");

            // display login name and role
            var displayName = theUser.getDisplayName();
            if(isUnavailable(displayName)) {
                displayName = loginName;
            }
            document.getElementById("navbar_display_name").innerHTML = displayName;

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
            window.location.href = "/page/index.html";
        }

        d.resolve();
    }

    return d.promise();
}
