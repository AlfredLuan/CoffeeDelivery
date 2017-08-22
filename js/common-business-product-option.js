
/////////////////////////////////////////////////////
// for product or stock item options' display and edit
//
// in function
//      addOptionsForDisplay(productID, options, parentElementId)
//          or
//      addOptionsForEdit(productID, options, parentElementId)
// the param productID can be stockItemID too in the case of displaying or editing stock item's options
//
// after either one of above funtions are called, an instance of HtmlElementList with key
//      productID + "_option_list_display"
//          or
//      productID + "_option_list_edit"
// can be found accordingly in global variable HtmlElementListMap,
// these 2 keys are also the top element Ids of the html elements created by above functions
//
// similarly, in function getOptionListForSave(productID),
// the param productID can be stockItemID too
/////////////////////////////////////////////////////

function addOptionsForDisplay(productID, options, parentElementId) {

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

    var parentElement = document.getElementById(parentElementId);
    optionsElementList.attach(parentElement);
}

function addOptionsForEdit(productID, options, parentElementId) {

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

    var parentElement = document.getElementById(parentElementId);
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
                "value": Number(value)
            }
        }

        if(radio.checked == true) {
            result["selected"] = true;
        }

        return result;
    }, true);

    valuesElementList.attach(optionElement);
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
