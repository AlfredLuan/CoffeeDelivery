
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
