/////////////////////////////////////////////////////
// constants
/////////////////////////////////////////////////////

/*
* for unit testing
*/
// var KII_APP_ID = "dru5stobbkcu";
//
// var KII_APP_KEY = "0ae3eeee80474f0ca55781659865caf9";
//
// var KII_SITE = KiiSite.CN3;

/*
* for integration testing
*/
var KII_APP_ID = "2c1pzz9jg5dd";

var KII_APP_KEY = "5863d5a986e34b279b820fbf0cad2de8";

var KII_SITE = KiiSite.JP;

/*
* for demo env
*/
// var KII_APP_ID = "gn3224ksg9o6";
//
// var KII_APP_KEY = "f5f89328320a4dd095a76be62bd6a2b6";
//
// var KII_SITE = KiiSite.JP;

// this is the fixed current location for testing or demo purpose
// if need to use the real current location, please set it as undefined
// var FIXED_CURRENT_LOCATION = undefined;
var FIXED_CURRENT_LOCATION = {
    lat: 13.7421592,
    lng: 100.5955492
};

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
};

var OrderStatus = {
    OrderPlaced: 0, // order placed by customer
    OrderAccepted: 1, // order accepted by driver
    CoffeePreparing: 2, // start making coffee by coffee maker
    CoffeeReady: 3, // coffee ready by coffee maker
    InDelivery: 4, // coffee picked up by driver
    OrderCompleted: 5 // coffee delivered by driver
};

var UserAttribute = {
    Role: "role",
    Online: "online",
    Approved: "approved",
};

var Bucket = {
    AppScope: {
        ShopInfoList: "SHOPS",
        OrderList: "ORDERS",
        ProductList: "STOCK_ITEMS_CONSUMER",
        CouponList: "COUPONS",
        ThingStates: "_states",
        UserList: "USER_LIST",
        CommentList: "COMMENTS"
    },
    GroupScope: {
        ShopInfo: "SHOP_INFO",
        ProductList: "PRODUCTS"
    }
};

var Topic = {
    GroupScope: {
        DefaultTopic: "default_topic"
    }
};

var PushMessageEvent = {
    OrderUpdated: "order_updated",
    OrderDeleted: "order_deleted"
};

/////////////////////////////////////////////////////
// global variables
/////////////////////////////////////////////////////

var Global = {
    currentUser: null,
    // all the shops info, from AppScope.ShopInfoList
    shopInfoList: null,
    // all the orders, from AppScope.OrderList
    orderList: null
};


/////////////////////////////////////////////////////
// override
/////////////////////////////////////////////////////

String.prototype.replaceAll = function(s1, s2) {　　
    return this.replace(new RegExp(s1, "gm"), s2);
}

// 对Date的扩展，将 Date 转化为指定格式的String
// 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符，
// 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字)
// 例子：
// (new Date()).format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423
// (new Date()).format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18
Date.prototype.format = function (fmt) { //author: meizz
    var o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "h+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
    if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

Boolean.prototype.format = function(trueDisplay, falseDisplay) {
    if(this == true) {
        return trueDisplay;
    }
    return falseDisplay;
}

Array.prototype.indexOfElement = function(obj, getFieldValue) {
    if(isUnavailable(obj)) {
        return -1;
    }

    var method = function(e){
        return e;
    }
    if(isAvailable(getFieldValue)){
        method = getFieldValue;
    }

    for (var i = 0; i < this.length; i++) {
        if(method(this[i]) == method(obj)) {
            return i;
        }
    }
    return -1;
}

Array.prototype.indexOfMaxValue = function(getFieldValue, defaultMaxValue) {

    var maxValueIndex = [];
    var maxValue = isAvailable(defaultMaxValue)? defaultMaxValue : -999999;

    for (var i = 0; i < this.length; i++) {
        var value = getFieldValue(this[i]);
        if(value > maxValue) {
            maxValue = value;
            maxValueIndex = [i];
        } else if(value == maxValue) {
            maxValueIndex.push(i);
        }
    }

    return maxValueIndex;
}

Array.prototype.indexOfMinValue = function(getFieldValue, defaultMinValue) {

    var minValueIndex = [];
    var minValue = isAvailable(defaultMinValue)? defaultMinValue : 999999;

    for (var i = 0; i < this.length; i++) {
        var value = getFieldValue(this[i]);
        if(value < minValue) {
            minValue = value;
            minValueIndex = [i];
        } else if(value == minValue) {
            minValueIndex.push(i);
        }
    }

    return minValueIndex;
}

/////////////////////////////////////////////////////
// http call management
/////////////////////////////////////////////////////

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

    if(isUnavailable(element)) {
        return;
    }

    if(element.tagName.toLowerCase() == "tr") {
        element.style.display = "table-row";
    } else {
        element.style.display = "block";
    }
}

function hideElement(elementID) {
    var element = document.getElementById(elementID);

    if(isUnavailable(element)) {
        return;
    }

    element.style.display = "none";
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

/**
* primaryCheck will be used for boolean comparing in the case that null or undefined is passed
* for example,
*   if primaryCheck is true, then only boolean value true will get true, null or undefined will get false;
*   if primaryCheck is false, then only boolean value false will get false, null or undefined will get true;
*/
function toSafeBoolean(boolean, primaryCheck) {

    if(isUnavailable(primaryCheck)) {
        primaryCheck = true;
    }

    var result = null;

    if (boolean == primaryCheck) {
        result = primaryCheck;
    } else {
        result = !primaryCheck;
    }

    return result;
}

function toSafeTimestamp(date) {
    if(isUnavailable(date)) {
        return date;
    }

    var timestampe = null;

    if(isDate(date)) {
        timestampe = date.getTime();
    }
    if(isString(date)) {
        timestampe = Date.parse(date);
    }
    if(isNumber(date)) {
        timestampe = date;
    }

    console.log("date type", Object.prototype.toString.call(date), timestampe);

    return timestampe;
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

function isArray(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
}

function isDate(obj) {
    return Object.prototype.toString.call(obj) == "[object Date]";
}

function isNumber(obj) {
    return Object.prototype.toString.call(obj) == "[object Number]";
}

function isString(obj) {
    return Object.prototype.toString.call(obj) == "[object String]";
}

function convertArray(object, converter) {

    if(isUnavailable(object)) {
        return array;
    }

    var method = null;
    if(isAvailable(converter)) {
        method = converter;
    } else {
        method = function(element, key) {
            return element;
        }
    }

    var result = [];

    if(isArray(object) == true) {
        for (var i = 0; i < object.length; i++) {
            result.push(method(object[i], i));
        }
    } else {
        for (var key in object) {
            result.push(method(object[key], key));
        }
    }

    return result;
}
