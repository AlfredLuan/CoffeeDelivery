
/////////////////////////////////////////////////////
// for product details display
/////////////////////////////////////////////////////

var productInfo = null;

function showProductDetails() {

    var productID = getQueryString("product_id");

    console.log("product id", productID);

    var kiiUser = KiiUser.getCurrentUser();

    getHeadShop(kiiUser, function(headShop){

        var bucket = headShop.bucketWithName(Bucket.GroupScope.ProductList);
        var product = bucket.createObjectWithID(productID);

        product.refresh({
            success: function(theObject) {
                productInfo = theObject;

                // display product info
                setInnerHtml("product_name", productInfo.get("name"), false);

                // load shop list
                loadSelectableShopInfoListForDisplay(kiiUser, productID);
            },
            failure: function(theObject, errorString) {
                // Handle the error.
                console.log(errorString);
                showErrorMessage("navbar_error_message", "{error-Failed-to-load-product-info}");
            }
        });

    });

}

/////////////////////////////////////////////////////
// for product and shop mapping display
/////////////////////////////////////////////////////

// list of the shops already with this product
var existingShopInfoListByProductID = null;

var selectableShopIDList = [];

function parseSelectableShopInfoForDisplay(data, displayTemplate, htmlName) {

    var htmlContent = displayTemplate;

    htmlContent = htmlContent.replaceAll("{ShopID}", data.get("shop_id"));

    htmlContent = htmlContent.replaceAll("{ShopName}", data.get("name"));

    var address = toSafeString(data.get("place")["formatted_address"]);
    address = address.replaceAll("\r\n", "<br/>");
    address = address.replaceAll("\n", "<br/>");
    htmlContent = htmlContent.replaceAll("{ShopAddress}", address);

    return htmlContent;
};

// kiiUser is expected to be product manager
function loadSelectableShopInfoList(kiiUser, onSuccess, onFailure) {

    // load all shops which current user is member of
    loadGroups(kiiUser, function(groupList) {

        selectableShopIDList = [];
        for (var i = 0; i < groupList.length; i++) {
            selectableShopIDList.push(groupList[i].getID());
        }

        // load basic info list of all groups
        loadShopBasicInfoList(groupList, function(basicInfoList){
            basicInfoList.sort(function(a, b) {
                return a.getCreated() < b.getCreated();
            })
            onSuccess(basicInfoList);
        }, onFailure);
    });

}

function loadSelectableShopInfoListForDisplay(kiiUser, productID) {

    // load all the shops that current user is member of, and display these shops
    // (the data is based on groups and the shop info bucket inside)
    loadListForDisplay("selectable_shop_list", "/page/selectableshoptemplate.html", function(onSuccess, onFailure) {
        loadSelectableShopInfoList(kiiUser, onSuccess, onFailure);
    }, function(data, displayTemplate, htmlName) {
        return parseSelectableShopInfoForDisplay(data, displayTemplate, htmlName);
    }, function() {
        // on success

        // load the shops already with this product, and set them selected in checkbox
        loadShopInfoListByProductID(productID, function(shopInfoListByProductID) {

            existingShopInfoListByProductID = shopInfoListByProductID;

            for (var i = 0; i < shopInfoListByProductID.length; i++) {
                var shopID = shopInfoListByProductID[i].get("shop_id");
                document.getElementById("select_shop_" + shopID).checked = true;
            }

        });

    });

}

// load the shops already with this product specified by productID
// (the data is based on app scope bucket)
function loadShopInfoListByProductID(productID, onSuccess, onFailure) {

    var clause = KiiClause.equals("product_id", productID);

    var bucket = Kii.bucketWithName(Bucket.AppScope.ProductList);

    loadAllObjects(bucket, clause, onSuccess, onFailure);
}


/////////////////////////////////////////////////////
// for product and shop mapping update
/////////////////////////////////////////////////////

function onAllShopsCheckBoxChange(eventSource) {
    // value is boolean
    var selectAllShops = eventSource.checked;

    for (var i = 0; i < selectableShopIDList.length; i++) {
        document.getElementById("select_shop_" + selectableShopIDList[i]).checked = selectAllShops;
    }

}

function getSelectedShopIDList() {

    var selectedShopIDList = [];

    for (var i = 0; i < selectableShopIDList.length; i++) {
        if(document.getElementById("select_shop_" + selectableShopIDList[i]).checked == true) {
            selectedShopIDList.push(selectableShopIDList[i]);
        }
    }

    return selectedShopIDList;
}

function saveProductAndShopMapping(eventSource) {

    // block button
    eventSource.disabled = true;

    var processComplete = function() {
        // unblock button
        eventSource.disabled = false;
        // jump to dashboard
        window.location.reload(true);
    };

    var selectedShopIDList = getSelectedShopIDList();
    var existingShopIDList = convertArray(existingShopInfoListByProductID, function(e){
        return e.get("shop_id");
    });

    var differ = differArray(existingShopIDList, selectedShopIDList);
    var shopIDListToRemove = differ.remove;
    var shopIDListToAdd = differ.add;

    var bucket = Kii.bucketWithName(Bucket.AppScope.ProductList);

    // store new mapping
    var countCreate = 0;
    var checkMappingCreated = function(done){
        countCreate++;
        if(countCreate == shopIDListToAdd.length) {
            done();
        }
    };

    // store new mappings
    var storeNewMapping = function() {

        if(shopIDListToAdd.length == 0) {
            processComplete();
            return;
        }

        var productID = getQueryString("product_id");

        for (var i = 0; i < shopIDListToAdd.length; i++) {

            var object = bucket.createObject();

            object.set("shop_id", shopIDListToAdd[i]);
            object.set("product_id", productID);
            copyValues(productInfo, object, [
                "name",
                "on_stock",
                "avatar_url",
                "monthly_sold",
                "likes",
                "price",
                "options",
                "description"
            ]);

            object.saveAllFields({
                success: function(theObject) {
                    checkMappingCreated(processComplete);
                },
                failure: function(theObject, errorString) {
                  // Handle the error.
                  console.log("failed to save mapping");
                  checkMappingCreated(processComplete);
                }
            });

        }

    }

    // remove the mappings
    var countRemove = 0;
    var checkMappingRemoved = function(done){
        countRemove++;
        if(countRemove == shopIDListToRemove.length) {
            done();
        }
    };

    // start to remove each existing mappings
    if(shopIDListToRemove.length == 0) {
        // if no existing mapping, start to store new mapping
        storeNewMapping();
    } else {
        // if there is existing mapping, remove the existing mapping, then start to store new mapping
        for (var i = 0; i < shopIDListToRemove.length; i++) {

            var object = null;
            for (var j = 0; j < existingShopInfoListByProductID.length; j++) {
                var element = existingShopInfoListByProductID[j];
                if(element.get("shop_id") == shopIDListToRemove[i]) {
                    object = element;
                    break;
                }
            }

            object.delete({
                success: function() {
                    checkMappingRemoved(storeNewMapping);
                },
                failure: function() {
                    console.log("failed to remove product and shop mapping with ID:" + object);
                    checkMappingRemoved(storeNewMapping);
                }
            });
        }
    }

}
