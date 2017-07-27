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
// others
/////////////////////////////////////////////////////

function showElement(elementID) {
    document.getElementById(elementID).style.display = "block";
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

function isAvailable(value) {
    return value !== undefined && value != null;
}

function isUnavailable(value) {
    return value === undefined || value == null;
}
