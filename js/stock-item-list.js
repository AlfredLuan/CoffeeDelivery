
/////////////////////////////////////////////////////////////
// below are for page load
/////////////////////////////////////////////////////////////

function loadStockItemListPage() {

    var shopID = getQueryString("shop_id");

    var shop = KiiGroup.groupWithID(shopID);
    shop.refresh({
        success: function(theGroup) {
            shopInfo = theGroup;

            // display shop name
            setInnerHtml("shop_name", shopInfo.getName(), false);

            var kiiUser = KiiUser.getCurrentUser();

            // load stock item list
            loadStockItemListForDisplay(shopID);
        },
        failure: function(theGroup, errorString) {
            // Handle the error.
            console.log(errorString);
            showErrorMessage("navbar_error_message", "{error-Failed-to-load-shop-info}");
        }
    });

}

function parseStockItemForDisplay(data, displayTemplate, htmlName) {

    var htmlContent = displayTemplate;

    htmlContent = htmlContent.replaceAll("{CollapsePanelID}", data.getID());

    htmlContent = htmlContent.replaceAll("{StockItemID}", data.getID());

    htmlContent = htmlContent.replaceAll("{Name}", toSafeString(data.get("name")));

    htmlContent = htmlContent.replaceAll("{Price}", toSafeString(data.get("price")));

    var description = toSafeString(data.get("description"));
    description = description.replaceAll("\r\n", "<br/>");
    description = description.replaceAll("\n", "<br/>");
    htmlContent = htmlContent.replaceAll("{Description}", description);

    var onStock = toSafeBoolean(data.get("on_stock"));
    htmlContent = htmlContent.replaceAll("{OnStock}", onStock.format("Yes", "No"));
    htmlContent = htmlContent.replaceAll("{OnStockNew}", onStock.format("false", "true"));
    htmlContent = replaceTemplateContent(htmlContent, "{ChangeOnStock}", onStock.format("{StockOff}", "{StockOn}"), htmlName);

    htmlContent = replaceTemplateContent(htmlContent, "{Edit}", null, htmlName);
    htmlContent = replaceTemplateContent(htmlContent, "{Save}", null, htmlName);
    htmlContent = replaceTemplateContent(htmlContent, "{Cancel}", null, htmlName);

    return htmlContent;
};


function loadStockItemListForDisplay(shopID) {

    loadListForDisplay("stock_item_list", "/page/stockitemtemplate.html", function(onSuccess, onFailure) {
        loadStockItemList(shopID, onSuccess, onFailure);
    }, function(data, displayTemplate, htmlName) {
        return parseStockItemForDisplay(data, displayTemplate, htmlName);
    }, function(stockItemList) {

        // add options of each stock item
        for (var i = 0; i < stockItemList.length; i++) {
            var stockItem = stockItemList[i];
            var stockItemID = stockItem.getID();
            var options = stockItem.get("options");

            console.log("options for stock item", stockItemID, options);

            if(isUnavailable(options)) {
                options = [];
            }

            // add options of each stock item for display
            addOptionsForDisplay(stockItemID, options, stockItemID + "_options_display");

            // add options of each stock item for edit
            addOptionsForEdit(stockItemID, options, stockItemID + "_options_edit");

        }

    });

}

function loadStockItemList(shopID, onSuccess, onFailure) {

    console.log("shopID", shopID);

    var bucket = Kii.bucketWithName(Bucket.AppScope.ProductList);

    var clause = KiiClause.equals("shop_id", shopID);

    loadAllObjects(bucket, clause, function(stockItemList) {

        if(isAvailable(stockItemList)) {
            stockItemList.sort(function(a, b){
                return a.get("name") > b.get("name");
            })
        }

        onSuccess(stockItemList)
    }, onFailure);

}

/////////////////////////////////////////////////////////////
// below are for update operation
/////////////////////////////////////////////////////////////

function changeStockItemDisplayMode(stockItemID, mode) {

    if (mode == 'display') {
        showElement(stockItemID + "_display");
        hideElement(stockItemID + "_edit");
    } else if (mode == 'edit') {
        hideElement(stockItemID + "_display");
        showElement(stockItemID + "_edit");
    }

}

function updateStockItem(eventSource, stockItemID) {

    // block button
    eventSource.disabled = true;

    var name = getElementValue(stockItemID + "_name");
    var price = getElementValue(stockItemID + "_price");
    var description = getElementValue(stockItemID + "_description");

    var optionList = getOptionListForSave(stockItemID);

    var stockItemInfo = {
        "name": name,
        "price": Number(price),
        "description": description,
        "options": optionList
    };

    var currentUser = KiiUser.getCurrentUser();

    // Save stock item info
    saveStockItemInfo(stockItemID, stockItemInfo,
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
}

function changeOnStockStatus(eventSource, stockItemID, onStockNew) {

    // block button
    eventSource.disabled = true;

    console.log("changeOnStockStatus", stockItemID, onStockNew);

    var stockItemInfo = {
        "on_stock": onStockNew
    };

    var currentUser = KiiUser.getCurrentUser();

    // Save stock item info
    saveStockItemInfo(stockItemID, stockItemInfo,
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

}
