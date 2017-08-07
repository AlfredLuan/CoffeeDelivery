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
        "avatar_url": null, // TODO
        "monthly_sold": 0,
        "likes": 0,
        "price": price,
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
                showErrorMessage("navbar_error_message", "{error-Failed-to-create-product}");
                // unblock button
                eventSource.disabled = false;
            }
        );

    }, function(){
        console.log("not in any head shop");
        // Handle the error.
        showErrorMessage("navbar_error_message", "{error-Please-join-in-head-shop}");
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

    var productInfo = {
        "name": name,
        "price": price,
        "description": description
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

// kiiUser is expected to be operator or product manager
function loadOwnedProductTemplateList(kiiUser, onSuccess, onFailure) {

    // get head shop
    getHeadShop(kiiUser, function(headShop) {

        // get product template list
        var bucket = headShop.bucketWithName(Bucket.GroupScope.ProductList);

        loadAllObjects(bucket, null, function(productList) {

            // sort basic info list
            productList.sort(function(a, b) {
                return a.getCreated() < b.getCreated();
            })

            // callback
            onSuccess(productList);

        }, onFailure);
    }, onFailure);
}

function loadOwnedProductTemplateListForDisplay() {

    var currentUser = KiiUser.getCurrentUser();

    loadListForDisplay("product_list", "/page/producttemplate.html", function(onSuccess, onFailure) {
        loadOwnedProductTemplateList(currentUser, onSuccess, onFailure);
    }, function(data, displayTemplate, htmlName) {
        return parseOwnedProductTemplateForDisplay(data, displayTemplate, htmlName);
    });

}
