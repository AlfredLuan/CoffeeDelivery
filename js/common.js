/////////////////////////////////////////////////////
// constants
/////////////////////////////////////////////////////

var KII_APP_ID = "dru5stobbkcu";

var KII_APP_KEY = "0ae3eeee80474f0ca55781659865caf9";

var KII_SITE = KiiSite.CN3;

Kii.initializeWithSite(KII_APP_ID, KII_APP_KEY, KII_SITE);

var GOOGLE_MAP_KEY = "AIzaSyBGJuotfOlzXBw7rOyVYtrLnPfeX_VblLs";

var UserRole = {
    CoffeeMaker: "coffee_maker",
    Operator: "operator",
    ProductManager: "product_manager",
    Driver: "driver",
    Consumer: "consumer"
};

var ShopRole = {
    Head : "head",
    Branch : "branch"
}

var OrderStatus = {
    OrderPlaced: 0, // order placed by customer
    OrderAccepted: 1, // order accepted by driver
    OrderStartMaking: 2, // start making coffee by coffee maker
    OrderReady: 3, // coffee ready by coffee maker
    OrderPickUp: 4, // coffee picked up by driver
    OrderDelivered: 5 // coffee delivered by driver
};

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
// html functions
/////////////////////////////////////////////////////

function showElement(elementID) {
    var element = document.getElementById(elementID);
    if(element.tagName.toLowerCase() == "tr") {
        element.style.display = "table-row";
    } else {
        element.style.display = "block";
    }
}

function hideElement(elementID) {
    document.getElementById(elementID).style.display = "none";
}

function setInnerHtml(id, message, needTranslate) {

    var content = message;

    if (needTranslate === undefined || needTranslate == true) {
        var htmlName = getHtmlName();
        content = translateContent(langDict, htmlName, content);
    }

    document.getElementById(id).innerHTML = content;
}

function getElementValue(elementId) {
    return document.getElementById(elementId).value;
}

function setElementValue(elementId, value) {
    document.getElementById(elementId).value = toSafeString(value);
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

function reloadPage(){
    window.location.reload(true);
}

/////////////////////////////////////////////////////
// javascript functions
/////////////////////////////////////////////////////

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

function isAvailable(value) {
    return value !== undefined && value != null;
}

function isUnavailable(value) {
    return value === undefined || value == null;
}

function copyValues(srcObject, destObject, keys) {
	for (var i = 0; i < keys.length; i++) {
        destObject.set(keys[i], srcObject.get(keys[i]));
	}
}

// compare oldArray and newArray with function isSame,
// and return the differ in format {"remove": [...], "add": [...]}
function differArray(oldArray, newArray, isSame){

    var compare = null;
    if(isAvailable(isSame)) {
        compare = isSame;
    } else {
        compare = function(a, b) {
            return a==b;
        }
    };

    if(isUnavailable(oldArray)) {
        oldArray = [];
    }
    if(isUnavailable(newArray)) {
        newArray = [];
    }

    var foundNonExistingElementList = function(array1, array2) {
        var nonExistingElementList = [];

        for (var i = 0; i < array1.length; i++) {
            var element = array1[i];
            var found = false;

            for (var j = 0; j < array2.length; j++) {
                if(compare(element, array2[j]) == true) {
                    found = true;
                    break;
                }
            }

            if(found == false) {
                nonExistingElementList.push(element);
            }
        }

        return nonExistingElementList;
    };

    var result = {};
    result.remove = foundNonExistingElementList(oldArray, newArray);
    result.add = foundNonExistingElementList(newArray, oldArray);

    return result;
}

function convertArray(array, convert) {

    if(isUnavailable(array)) {
        return array;
    }

    var method = null;
    if(isAvailable(convert)) {
        method = convert;
    } else {
        method = function(element) {
            return element;
        }
    }

    var result = [];
    for (var i = 0; i < array.length; i++) {
        result.push(method(array[i]));
    }

    return result;
}
