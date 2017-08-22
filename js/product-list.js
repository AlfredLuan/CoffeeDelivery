function changeProductDisplayMode(productID, mode) {

    if (mode == 'display') {
        showElement(productID + "_display");
        hideElement(productID + "_edit");
    } else if (mode == 'edit') {
        hideElement(productID + "_display");
        showElement(productID + "_edit");
    }

}

function createProductTemplate(eventSource) {

    // block button
    eventSource.disabled = true;

    var name = getElementValue("new_product_name");
    var price = getElementValue("new_product_price");
    var description = getElementValue("new_product_description");

    var productInfo = {
        "shop_id": null,
        "name": name,
        "on_stock": true,
        "avatar_url": "https://2c1pzz9jg5dd.jp.kiiapps.com/api/x/s.d009f7a00022-68b8-7e11-9667-00647846", // TODO
        "monthly_sold": 0,
        "likes": 0,
        "price": Number(price),
        "options": null, // TODO
        "description": description
    };

    var currentUser = KiiUser.getCurrentUser();

    // get head shop and store product template info into head shop
    getHeadShop(currentUser, function(headShop) {

        // Save product template into head shop scope bucket
        saveProductTemplateInfo(headShop, null, productInfo,
            function() {
                // unblock button
                eventSource.disabled = false;

                // jump to dashboard
                window.location.reload(true);
            },
            function() {
                // Handle the error.
                showErrorMessage("modal_error_message", "{error-Failed-to-create-product}");
                // unblock button
                eventSource.disabled = false;
            }
        );

    }, function(){
        console.log("not in any head shop");
        // Handle the error.
        showErrorMessage("modal_error_message", "{error-Please-join-in-head-shop}");
        // unblock button
        eventSource.disabled = false;
    });
}

function updateProductTemplate(eventSource, productID) {

    // block button
    eventSource.disabled = true;

    var name = getElementValue(productID + "_product_name");
    var price = getElementValue(productID + "_product_price");
    var description = getElementValue(productID + "_product_description");

    var optionList = getOptionListForSave(productID);

    var productInfo = {
        "name": name,
        "price": Number(price),
        "description": description,
        "options": optionList
    };

    var currentUser = KiiUser.getCurrentUser();

    // get head shop and store product template info into head shop
    getHeadShop(currentUser, function(headShop) {

        // Save product template into head shop scope bucket
        saveProductTemplateInfo(headShop, productID, productInfo,
            function() {
                // unblock button
                eventSource.disabled = false;

                // jump to dashboard
                window.location.reload(true);
            },
            function() {
                // Handle the error.
                showErrorMessage("navbar_error_message", "{error-Failed-to-update-product}");
                // unblock button
                eventSource.disabled = false;
            }
        );

    });
}

function getOptionListForSave(productID) {

    var rawOptionList = HtmlElementListMap[productID + "_option_list_edit"].getElementFieldAndValueList();

    var optionList = [];
    for (var i = 0; i < rawOptionList.length; i++) {
        var rawOption = rawOptionList[i];

        var optionName = rawOption["field"];
        if(isUnavailable(optionName) || optionName.trim().length == 0) {
            continue;
        }

        var rawValueList = rawOption["value"];

        var valueList = [];
        for (var j = 0; j < rawValueList.length; j++) {
            var rawValue = rawValueList[j];

            var valueName = rawValue["field"];
            if(isUnavailable(valueName) || valueName.trim().length == 0) {
                continue;
            }

            var valueElement = rawValue["value"];
            valueElement["name"] = valueName;
            valueList.push(valueElement);
        };

        var option = {
            "name": optionName,
            "values": valueList
        };

        optionList.push(option);
    };

    console.log("getOptionListForSave", productID, optionList);

    return optionList;
}

function parseOwnedProductTemplateForDisplay(data, displayTemplate, htmlName) {

    var htmlContent = displayTemplate;

    htmlContent = htmlContent.replaceAll("{CollapsePanelID}", data.getID());

    htmlContent = htmlContent.replaceAll("{ProductID}", data.getID());

    var productDetailsLink = "/page/productdetails.html?product_id=" + data.getID();
    htmlContent = htmlContent.replaceAll("{ProductDetailsLink}", productDetailsLink);

    htmlContent = replaceTemplateContent(htmlContent, "{NameLabel}", null, htmlName);
    htmlContent = htmlContent.replaceAll("{Name}", toSafeString(data.get("name")));

    htmlContent = replaceTemplateContent(htmlContent, "{PriceLabel}", null, htmlName);
    htmlContent = htmlContent.replaceAll("{Price}", toSafeString(data.get("price")));

    htmlContent = replaceTemplateContent(htmlContent, "{DescriptionLabel}", null, htmlName);
    var description = toSafeString(data.get("description"));
    description = description.replaceAll("\r\n", "<br/>");
    description = description.replaceAll("\n", "<br/>");
    htmlContent = htmlContent.replaceAll("{Description}", description);

    htmlContent = replaceTemplateContent(htmlContent, "{Edit}", null, htmlName);
    htmlContent = replaceTemplateContent(htmlContent, "{Details}", null, htmlName);
    htmlContent = replaceTemplateContent(htmlContent, "{Save}", null, htmlName);
    htmlContent = replaceTemplateContent(htmlContent, "{Cancel}", null, htmlName);

    return htmlContent;
};


function loadOwnedProductTemplateListForDisplay() {

    var currentUser = KiiUser.getCurrentUser();

    loadListForDisplay("product_list", "/page/producttemplate.html", function(onSuccess, onFailure) {
        loadOwnedProductTemplateList(currentUser, onSuccess, onFailure);
    }, function(data, displayTemplate, htmlName) {
        return parseOwnedProductTemplateForDisplay(data, displayTemplate, htmlName);
    }, function(productList) {

        // add options of each product
        for (var i = 0; i < productList.length; i++) {
            var product = productList[i];
            var productID = product.getID();
            var options = product.get("options");

            console.log("options for product", productID, options);

            if(isUnavailable(options)) {
                options = [];
            }

            // add options of each product for display
            addOptionsForDisplay(productID, options);

            // add options of each product for edit
            addOptionsForEdit(productID, options);

        }

    });

}

function addOptionsForDisplay(productID, options) {

    var optionsData = convertArray(options, function(e) {

        var values = e["values"];
        var valuesForDisplay = "";
        if(isAvailable(values)) {
            for (var i = 0; i < values.length; i++) {
                if(i > 0) {
                    valuesForDisplay += "<br/>";
                }
                var value = values[i];
                valuesForDisplay += value["name"] + ":";
                valuesForDisplay += "&nbsp;" + value["price_modifier"]["type"];
                valuesForDisplay += "&nbsp;" + value["price_modifier"]["value"];

                if(value["selected"] == true) {
                    valuesForDisplay += "&nbsp;(default)"
                }
            }
        }

        return {
            "field" : e["name"] + "&nbsp-",
            "value" : valuesForDisplay
        };
    });


    var optionsElementList = new HtmlElementList(productID + "_option_list_display", optionsData,
    // create field element
    function(elementId, index, field) {
        var div = document.createElement("div");
        div.style = "padding:3px; width:80px; text-align:right";
        div.innerHTML = field;
        return div;
    },
    // create value element
    function(elementId, index, value) {
        var div = document.createElement("div");
        div.style = "padding:3px; width:350px; border-bottom:solid 1px #ddd;";
        div.innerHTML = value;
        return div;
    },
    // get value from field element
    function(elementId, index, fieldElement) {
        return fieldElement.innerHTML;
    },
    // get value from value element
    function(elementId, index, valueElement) {
        return valueElement.innerHTML;
    }, false);

    var parentElement = document.getElementById(productID + "_options_display");
    optionsElementList.attach(parentElement);
}

function addOptionsForEdit(productID, options) {

    var optionsData = convertArray(options, function(e) {

        var values = e["values"];
        var valuesForDisplay = "";
        if(isAvailable(values)) {
            for (var i = 0; i < values.length; i++) {
                if(i > 0) {
                    valuesForDisplay += "<br/>";
                }
                var value = values[i];
                valuesForDisplay += value["name"] + ":";
                valuesForDisplay += "&nbsp;" + value["price_modifier"]["type"];
                valuesForDisplay += "&nbsp;" + value["price_modifier"]["value"];

                if(value["selected"] == true) {
                    valuesForDisplay += "&nbsp;(default)"
                }
            }
        }

        return {
            "field" : e["name"],
            "value" : e["values"]
        };
    });

    var optionsElementId = productID + "_option_list_edit";

    var optionsElementList = new HtmlElementList(optionsElementId, optionsData,
    // create field element
    function(elementId, index, field) {

        var input = document.createElement("input");
        input.type = "text";
        input.className = "form-control";
        input.style = "margin:3px;width:80px";
        input.value = field;
        return input;
    },
    // create value element
    function(elementId, index, value) {

        var div = document.createElement("div");
        div.style = "border:solid 1px #ddd; background-color:#f5f5f5; border-radius:4px; width:340px; margin-bottom:7px";
        div.id = elementId + "_" + index + "_option";

        // add option values
        addOptionValues(div, value);

        return div;
    },
    // get value from field element
    function(elementId, index, fieldElement) {
        return fieldElement.value;
    },
    // get value from value element
    function(elementId, index, valueElement) {

        var valuesElementId = elementId + "_" + index + "_option_values";
        var valuesElementList = HtmlElementListMap[valuesElementId];

        return valuesElementList.getElementFieldAndValueList();
    }, true);

    var parentElement = document.getElementById(productID + "_options_edit");
    optionsElementList.attach(parentElement);

}

function addOptionValues(optionElement, values) {

    console.log("addOptionValues", optionElement.id, values);

    if(isUnavailable(values)) {
        values = [];
    }

    var valuesData = convertArray(values, function(e) {
        return {
            "field" : e["name"],
            "value" : e
        };
    });

    var valuesElementId = optionElement.id + "_values";

    var valuesElementList = new HtmlElementList(valuesElementId, valuesData,
    // create field element
    function(elementId, index, field) {

        var input = document.createElement("input");
        input.type = "text";
        input.className = "form-control";
        input.style = "margin:3px;width:80px";
        input.value = field;
        return input;
    },
    // create value element
    function(elementId, index, value) {

        if(isUnavailable(value)) {
            value = {
                "name": "",
                "price_modifier": {
                    "type": "add",
                    "value": 0
                }
            };
        }

        // add "type" as select
        var type = value["price_modifier"]["type"];
        var typeSelect = document.createElement("select");
        typeSelect.id = elementId + "_" + index + "_type";
        typeSelect.className = "form-control";
        typeSelect.style = "margin:3px;width:65px;float:left";

        var typeList = ["add", "minus"];
        for (var i = 0; i < typeList.length; i++) {
            var option = document.createElement("option");
            option.value = typeList[i];
            option.innerHTML = typeList[i];
            typeSelect.appendChild(option);
        }
        typeSelect.value = type;

        // add "value" as input
        var valueInput = document.createElement("input");
        valueInput.id = elementId + "_" + index + "_value";
        valueInput.type = "number";
        valueInput.className = "form-control";
        valueInput.style = "margin-left:7px;margin:3px;width:60px;float:left";
        valueInput.value = value["price_modifier"]["value"];

        // add "selected" as radio button
        var selectedRadio = document.createElement("input");
        selectedRadio.id = elementId + "_" + index + "_selected";
        selectedRadio.type = "radio";
        selectedRadio.name = elementId + "_selected";
        selectedRadio.innerHTML = "&nbsp;default";
        if(value["selected"] == true) {
            selectedRadio.setAttribute("checked", "checked");
        }
        var label = document.createElement("label");
        label.className = "radio-inline";
        label.style = "padding-top:7px;margin:3px";
        label.appendChild(selectedRadio);
        label.innerHTML += "default";

        var div = document.createElement("div");
        div.style = "width:210px;";
        div.appendChild(typeSelect);
        div.appendChild(valueInput);
        div.appendChild(label);
        div.id = elementId + "_" + index + "_option_values";
        return div;
    },
    // get value from field element
    function(elementId, index, fieldElement) {
        return fieldElement.value;
    },
    // get value from value element
    function(elementId, index, valueElement) {

        var type = getValueFromSelectElement(elementId + "_" + index + "_type");
        var value = getElementValue(elementId + "_" + index + "_value");
        var radio = document.getElementById(elementId + "_" + index + "_selected");

        var result = {
            "price_modifier" : {
                "type": type,
                "value": value
            }
        }

        if(radio.checked == true) {
            result["selected"] = true;
        }

        return result;
    }, true);

    valuesElementList.attach(optionElement);
}
