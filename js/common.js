/////////////////////////////////////////////////////
// constants
/////////////////////////////////////////////////////

var KII_APP_ID = "dru5stobbkcu";

var KII_APP_KEY = "0ae3eeee80474f0ca55781659865caf9";

var KII_SITE = KiiSite.CN3;

Kii.initializeWithSite(KII_APP_ID, KII_APP_KEY, KII_SITE);

var GOOGLE_MAP_KEY = "AIzaSyBGJuotfOlzXBw7rOyVYtrLnPfeX_VblLs";

var Role = {
    CoffeeMaker: "coffee_maker",
    Operator: "operator",
    Driver: "driver",
    Consumer: "consumer"
};

var OrderStatus = {
    ConsumerRequested: "consumer_requested", // 客户生成订单（选定商品以及数量，可预先支付）
    DriverAccepted: "driver_accepted", // 骑手接单
    CoffeeMakerReady: "maker_ready", // 商家就绪（咖啡煮好）
    DriverPickUp: "driver_pick_up", // 骑手拿到咖啡
    DriverPickOff: "driver_pick_off", // 骑手送好咖啡
    ConsumerConfirmed: "consumer_confirmed" // 客户标注订单完成
};

var Bucket = {
    AppScope: {
        ShopInfoList: "shop_info_list",
        Order: "order",
        Coffee: "coffee",
        Coupons: "coupons"
    },
    GroupScope: {
        ShopInfo: "shop_info"
    }

};

var Topic = {
    GroupScope: {
        DefaultTopic: "default_topic"
    }
};



/////////////////////////////////////////////////////
// global variables
/////////////////////////////////////////////////////

var Global = {
    currentUser: undefined,
    shopInfoList: undefined,
    orderList: undefined
};


/////////////////////////////////////////////////////
// override
/////////////////////////////////////////////////////

String.prototype.replaceAll = function(s1, s2) {　　
    return this.replace(new RegExp(s1, "gm"), s2);
}

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


/////////////////////////////////////////////////////
// http call management
/////////////////////////////////////////////////////

Global_RemoteRequest = (function() {

    function Global_RemoteRequest(method, endpoint, headers) {


        this.path = endpoint;

        this.method = method;
        this.headers = headers;

        var _this = this;

        this.onSuccess = function(anything, textStatus, jqXHR) {
            console.log("request success");

            if ((200 <= (_ref1 = jqXHR.status) && _ref1 < 400)) {
                if (jqXHR.status == 204) {
                    return _this._success(null, textStatus);
                } else {
                    if (anything.errorCode != null) {
                        var errString = anything.errorCode + anything.message;
                        return _this._failure(errString, jqXHR.status, anything.errorCode);
                    } else {
                        return _this._success(anything, textStatus);
                    }
                }
            } else {
                var errString = xhr.status + " : " + _this._path;
                var json = decodeURIComponent(jqXHR.responseText);

                return _this._failure(errString, jqXHR.status, resp);
            }
        };

        this.onError = function(jqXHR, textStatus, errorThrown) {
            console.log("request fail:" + textStatus + " " + jqXHR.responseText);

            var errString = textStatus + " : " + _this._path;
            var resp = decodeURIComponent(jqXHR.responseText);

            return _this._failure(errString, jqXHR.status, resp);
        };

    }

    Global_RemoteRequest.prototype.executeToRemote = function(param, callback) {

        console.log("do remote post:" + JSON.stringify(param));

        if (callback["success"] != null) {
            this._success = callback["success"];
        }
        if ((callback["failure"] != null)) {
            this._failure = callback["failure"];
        }

        var ajaxParam = {};
        ajaxParam["success"] = this.onSuccess;
        ajaxParam["error"] = this.onError;

        ajaxParam["type"] = this.method;
        ajaxParam["headers"] = this.headers;

        if (this.method != "GET" && this.method != "DELETE") {
            ajaxParam["data"] = JSON.stringify(param);
        }

        console.log("header:" + JSON.stringify(this.headers));
        console.log("url:" + this.path);

        $.ajax(this.path, ajaxParam);

    }

    Global_RemoteRequest.prototype.execute = function(param, callback) {

        this.executeToRemote(param, callback);
    }


    return Global_RemoteRequest;
})();

function checkHttpCode(httpCode) {

    console.log("check http code : " + httpCode);

    // if 401, redirect to index.html
    if (httpCode == 401) {
        window.location.href = "/";
    }

}

/////////////////////////////////////////////////////
// cookie management
/////////////////////////////////////////////////////

//设置cookie
function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + "; " + expires + "; path='/'";
}

//获取cookie
function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1)
        };
        if (c.indexOf(name) != -1) {
            return c.substring(name.length, c.length)
        };
    }
    return "";
}
//清除cookie
function clearCookie(name) {
    setCookie(name, "", -1);
    console.log(document.cookie);
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
            saveLoginInfo(theUser);
            onSuccess(theUser);
        },
        failure: function(theUser, errorString) {
            // Handle the error.
            console.log(errorString);
            onFailure();
        }
    })
}

// check login status
function checkLoginStatus(isBackToHomePage) {
    
    var d = $.Deferred();

    var loginName = getCookie("login_name");

    var elementsBeforeLogin = document.getElementsByName("before_login");
    var elementsAfterLogin = document.getElementsByName("after_login");

    if (loginName !== undefined && loginName != null && loginName != "") {
        // show login info
        for (var i = 0; i < elementsBeforeLogin.length; i++) {
            elementsBeforeLogin[i].style.display = "none";
        }

        for (var i = 0; i < elementsAfterLogin.length; i++) {
            elementsAfterLogin[i].style.display = "block";
        }

        clearErrorMessage("navbar_error_message");

        // display login name
        document.getElementById("login_name_display").innerHTML = loginName;

        // refresh Kii user info
        loadCurrentUserInfo(function(theUser){
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

/////////////////////////////////////////////////////
// i8n management
/////////////////////////////////////////////////////

var langDict;

function loadDict(lang, callback) {

    $.ajax({
        async: false,
        type: "GET",
        url: "../js/i8n/" + lang + ".json",
        success: function(msg) {
            console.log("dict loaded", msg);

            langDict = msg;
            callback(langDict);
        }
    });

}

/**
 * save language into cookie, and reload page
 */
function changeLanguage() {

    var lang = getValueFromSelectElement("lang");
    setCookie("lang", lang, 365);

    window.location.reload();
}

/**
 * translate the html page in browser language
 */
function translateHtmlPageWInBrowserLang() {

    var lang = getBrowserLang();

    if (lang.indexOf("zh") > -1) {
        lang = "cn";
    } else if (lang.indexOf("ja") > -1) {
        lang = "jp";
    } else {
        lang = "en";
    }

    translateHtmlPage(lang);
}

/**
 * translate the html page
 * if lang is empty, get it from cookie
 */
function translateHtmlPage(lang, htmlName) {

    // if lang is empty, get it from cookie
    if (lang === undefined) {
        lang = getCookie("lang");
    }

    // if lang is still empty, set it as "en" by default
    if (lang === undefined || lang == "") {
        lang = "en";
    }

    // if html name is not specified, get html name from url
    if (htmlName === undefined) {
        htmlName = getHtmlName();
    }

    // load dict and translate the html page
    loadDict(lang, function(dict) {
        translateAllElements(dict, htmlName);

        // must set the value in select element after the page is translated, otherwise it wouldn't work
        setValueInSelectElement("lang", lang);
    });

}

function translateAllElements(dict, htmlName) {

    var allElements = document.getElementsByTagName("*");

    for (var i = 0; i < allElements.length; i++) {

        // console.log(allElements[i]);

        translateElement(dict, htmlName, allElements[i]);
    }

}

function translateElement(dict, htmlName, element) {

    var content = undefined;
    var tagName = element.tagName.toLowerCase();

    if (tagName == "input") {
        element.value = translateContent(dict, htmlName, element.value);
        element.placeholder = translateContent(dict, htmlName, element.placeholder);
    } else {
        element.innerHTML = translateContent(dict, htmlName, element.innerHTML);
    }

}

function translateContent(dict, htmlName, content) {

    if (content === undefined || content == null) {
        return "";
    }

    var temp = content.trim();

    // if temp in the format of '{...}'
    if (temp.charAt(0) == '{' && temp.charAt(temp.length - 1) == '}') {

        var key = temp.substring(1, temp.length - 1);
        // try to find the translation in html type
        var value = dict[htmlName][key];
        // try to find the translation in common type
        if (value === undefined) {
            value = dict["common"][key];
        }
        // if can't find the translation in above, set key as translation
        if (value === undefined) {
            value = key;
        }

        return value;
    }

    return content;
}


/////////////////////////////////////////////////////
// error message management
/////////////////////////////////////////////////////

function showErrorMessage(id, message) {

    var htmlName = getHtmlName();
    var translatedMessage = translateContent(langDict, htmlName, message);

    document.getElementById(id).style.display = "block";
    document.getElementById(id).innerHTML = translatedMessage;
}

function clearErrorMessage(id) {
    document.getElementById(id).style.display = "none";
    document.getElementById(id).innerHTML = "";
}


/////////////////////////////////////////////////////
// others
/////////////////////////////////////////////////////

function setInnerHtml(id, message, needTranslate) {

    var content = message;

    if (needTranslate === undefined || needTranslate == true) {
        var htmlName = getHtmlName();
        content = translateContent(langDict, htmlName, content);
    }

    document.getElementById(id).innerHTML = content;
}

function getValueFromElement(elementId) {
    return document.getElementById(elementId).value;
}

function setValueInElement(elementId, value) {
    document.getElementById(elementId).value = value;
}

function getValueFromSelectElement(id) {

    // var options = document.getElementById(id).options;
    // if(options === undefined || options == null) {
    //     return undefined;
    // }

    // for (var i = 0; i < options.length; i++) {
    //     if(options[i].selected) {
    //         console.log("here ", options[i])
    //         return options[i].value;
    //     }
    // };

    // return undefined;

    return document.getElementById(id).value;
}

function setValueInSelectElement(id, value) {
    // var options = document.getElementById(id).options;
    // if(options === undefined || options == null) {
    //     return;
    // }

    // for (var i = 0; i < options.length; i++) {
    //     if(options[i].value == value) {
    //         console.log("found ", options[i])
    //         options[i].selected = true;
    //         return;
    //     }
    // };

    var element = document.getElementById(id);
    if (element !== undefined && element != null) {
        element.value = value;
    }
}

function getQueryString(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
    var r = window.location.search.substr(1).match(reg);
    if (r != null) {
        return unescape(r[2]);
    }
    return null;
}

function getHtmlName() {
    var a = location.href;
    var b = a.split("/");
    var c = b.slice(b.length - 1, b.length).toString().split(".");

    var htmlName = c.slice(0, 1);

    // set default html name as "index"
    // this case could happen while accessing to "http://host:port" directly without inputting html page in url
    if (htmlName == "") {
        htmlName = "index";
    }

    return htmlName;
}

function getBrowserLang() {

    // for other browsers
    currentLang = navigator.language;

    // for IE
    if (!currentLang) {
        currentLang = navigator.browserLanguage;
    }

    console.log(currentLang);

    return currentLang;
}

function toSafeString(str) {
    if (str === undefined || str == null) {
        return "";
    }
    return str;
}

function toSafeCallback(callback) {
    if(callback === undefined || callback == null) {
        return function() {
            console.log("default callback", arguments);
        };
    }

    return callback;
}
