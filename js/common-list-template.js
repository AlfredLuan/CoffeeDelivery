
function loadDisplayTemplate(templateUrl, onSuccess, onFailure) {

    onSuccess = toSafeCallback(onSuccess);
    onFailure = toSafeCallback(onFailure);

    $.ajax({
        async: false,
        type: "GET",
        url: templateUrl,
        success: function(displayTemplate) {
            onSuccess(displayTemplate);
        },
        error: onFailure
    });
}

//
// replace the key with tranlsated content in displayTemplate
// especially:
//  htmlName: when undefined or null, don't translate the content
//  content: when undefined or null, replace key with key
function replaceTemplateContent(displayTemplate, key, content, htmlName) {
    var temp = key;
    if(isAvailable(content)){
        temp = content;
    }

    // translate content
    if(isAvailable(htmlName)) {
        temp = translateContent(langDict, htmlName, temp);
    }

    // replace content
    return displayTemplate.replaceAll(key, temp);
};

//
// loadDataList: callback function, is expected to hava param onSuccess and
//  pass the loaded data list to it
//
// parseDataForDisplay: callback function, is expected to parse data for display
//  based on the displayTemplate
function loadListForDisplay(listElementID, templateUrl, loadDataList, parseDataForDisplay) {

    // load data list
    loadDataList(function(dataList) {

        // load display template
        loadDisplayTemplate(templateUrl, function(displayTemplate) {

            var htmlName = getHtmlName();

            // parse each data for display
            var htmlContent = "";

            for (var i = 0; i < dataList.length; i++) {
                htmlContent += parseDataForDisplay(dataList[i], displayTemplate, htmlName);
            };

            setInnerHtml(listElementID, htmlContent, false);

        });

    });

}
