function loadShopListPage() {
    //
    // setElementValue("new_shop_delivery_fee", 0);
    // setElementValue("new_shop_service_time_start", "09:00");
    // setElementValue("new_shop_service_time_end", "18:00");

    var kiiUser = KiiUser.getCurrentUser();
    var role = kiiUser.get(UserAttribute.Role);

    // only show new shop button to operator
    if(role == UserRole.Operator) {
        showElement("link_new_shop");
    }

    loadShopListForDisplay();
}

var shopMarker = null;
var shopAddress = null;

function showNewShopMap(map, infoWindow) {

    $('#modalNewItem').on('shown.bs.modal', function() {
        console.log("modalNewItem shown");
        google.maps.event.trigger(map, "resize");
    });

    var setShopAddress = function(googlePosition) {
        getAddress(googlePosition, function(address){
            shopAddress = address;
            setElementValue("new_shop_address", shopAddress.formatted_address);
        }, function(){
            setElementValue("new_shop_address", null);
        });
    }

    loadMap(map, infoWindow, function(myPosition) {

        // initialise shop marker
        shopMarker = new google.maps.Marker({
            map: map,
            animation: google.maps.Animation.DROP,
            draggable: true,
            icon: "/img/Retail-shop-icon.png"
        });

        // set default shop marker position and shop address
        setShopAddress(myPosition);
        shopMarker.setPosition(myPosition);

        // add listener to shop marker
        // when drag end, update shop address
        shopMarker.addListener("dragend", function() {
            setShopAddress(shopMarker.getPosition());
        });

        // add listener to map
        // when map right clicked, update shop marker position and shop address
        map.addListener("rightclick", function(event) {
            console.log("double click", event.latLng.toJSON());
            setShopAddress(event.latLng);
            shopMarker.setPosition(event.latLng);
        });

    });

}

function createShop(eventSoure) {

    // block button
    eventSoure.disabled = true;

    var shopName = getElementValue("new_shop_name");
    var deliveryFee = getElementValue("new_shop_delivery_fee");
    var serviceTimeStart = getElementValue("new_shop_service_time_start");
    var serviceTimeEnd = getElementValue("new_shop_service_time_end");
    var address = shopAddress;

    if(isUnavailable(shopName) || shopName.trim() == "") {
        // Handle the error.
        showErrorMessage("modal_error_message", "{error-Failed-to-create-shop}");
        // unblock button
        eventSoure.disabled = false;
        return;
    }

    if(isUnavailable(shopAddress)) {
        // Handle the error.
        showErrorMessage("modal_error_message", "{error-Failed-to-create-shop}");
        // unblock button
        eventSoure.disabled = false;
        return;
    }

    var shopInfo = {
        "name": shopName,
        "avatar_url": "https://2c1pzz9jg5dd.jp.kiiapps.com/api/x/s.fa00faa00022-31db-7e11-9637-05ff7df3", // TODO
        "place": address, // TODO
        "stars": 0,
        "monthly_sold": 0,
        "comment_num": 0,
        "service_time": {
            "starts_at": serviceTimeStart, // TODO
            "ends_at": serviceTimeEnd // TODO
        },
        "delivery_fee": Number(deliveryFee)
    };

    var kiiUser = KiiUser.getCurrentUser();

    // need to set the first group as head shop, so need to check whether any group existing already
    loadGroups(kiiUser, function(groupList) {

        // set shop role
        if (groupList.length == 0) {
            shopInfo["role"] = ShopRole.Head;
        } else {
            shopInfo["role"] = ShopRole.Branch;
        }

        // Create a group.
        var group = KiiGroup.groupWithName(shopName);

        // Save the group on the server.
        group.save({
            success: function(theGroup) {
                // Get the reference URI and ID of the group.
                var groupUri = theGroup.objectURI();
                var groupID = theGroup.getID();

                // save shop info into shop info list
                saveShopBasicInfo(groupID, shopInfo,
                    function() {
                        // unblock button
                        eventSoure.disabled = false;
                        // jump to dashboard
                        window.location.reload(true);
                    },
                    function() {
                        // Handle the error.
                        showErrorMessage("modal_error_message", "{error-Failed-to-save-shop-info}");
                        // unblock button
                        eventSoure.disabled = false;
                    }
                );
            },
            failure: function(theGroup, errorString) {
                // Handle the error.
                showErrorMessage("modal_error_message", "{error-Failed-to-create-shop}");
                // unblock button
                eventSoure.disabled = false;
            }
        });
    });


}

function parseShopForDisplay(data, displayTemplate, htmlName) {

    var htmlContent = displayTemplate;

    var kiiUser = KiiUser.getCurrentUser();
    var userRole = kiiUser.get(UserAttribute.Role);
    if(userRole == UserRole.Operator) {
        htmlContent = htmlContent.replaceAll("{Details_display}", "display");
        htmlContent = htmlContent.replaceAll("{ShowStockItemList_display}", "display");
    } else if(userRole == UserRole.CoffeeMaker) {
        htmlContent = htmlContent.replaceAll("{Details_display}", "none");
        htmlContent = htmlContent.replaceAll("{ShowStockItemList_display}", "display");
    } else {
        htmlContent = htmlContent.replaceAll("{Details_display}", "none");
        htmlContent = htmlContent.replaceAll("{ShowStockItemList_display}", "none");
    }

    htmlContent = htmlContent.replaceAll("{CollapsePanelID}", data.get("id"));

    htmlContent = replaceTemplateContent(htmlContent, "{NameLabel}", null, htmlName);
    htmlContent = htmlContent.replaceAll("{Name}", toSafeString(data.get("name")));

    var role = toSafeString(data.get("role"));
    if(role == ShopRole.Head) {
        role = "{ShopRole-" + role + "}";
    } else {
        role = "";
    }
    htmlContent = replaceTemplateContent(htmlContent, "{Role}", role, htmlName);

    htmlContent = replaceTemplateContent(htmlContent, "{DeliveryFeeLabel}", null, htmlName);
    htmlContent = htmlContent.replaceAll("{DeliveryFee}", toSafeString(data.get("delivery_fee")));

    var serviceTime = data.get("service_time");
    var serviceTimeStart = "";
    var serviceTimeEnd = "";
    if (isAvailable(serviceTime)) {
        serviceTimeStart = toSafeString(serviceTime["starts_at"]);
        serviceTimeEnd = toSafeString(serviceTime["ends_at"]);
    }
    htmlContent = replaceTemplateContent(htmlContent, "{ServiceTimeStartLabel}", null, htmlName);
    htmlContent = htmlContent.replaceAll("{ServiceTimeStart}", serviceTimeStart);

    htmlContent = replaceTemplateContent(htmlContent, "{ServiceTimeEndLabel}", null, htmlName);
    htmlContent = htmlContent.replaceAll("{ServiceTimeEnd}", serviceTimeEnd);

    htmlContent = replaceTemplateContent(htmlContent, "{AddressLabel}", null, htmlName);
    var address = toSafeString(data.get("place")["formatted_address"]);
    address = address.replaceAll("\r\n", "<br/>");
    address = address.replaceAll("\n", "<br/>");
    htmlContent = htmlContent.replaceAll("{Address}", address);

    var shopDetailsLink = "/page/shopdetails.html?shop_id=" + data.get("id");
    htmlContent = htmlContent.replaceAll("{ShopDetailsLink}", shopDetailsLink);
    htmlContent = replaceTemplateContent(htmlContent, "{Details}", null, htmlName);

    var stockItemListLink = "/page/stockitemlist.html?shop_id=" + data.get("id");
    htmlContent = htmlContent.replaceAll("{StockItemListLink}", stockItemListLink);
    htmlContent = replaceTemplateContent(htmlContent, "{ShowStockItemList}", null, htmlName);

    return "<tr>" + htmlContent + "<br/></tr>";
};

function loadShopList(kiiUser, onSuccess, onFailure) {

    // load all groups which current user is member of
    loadGroups(kiiUser, function(groupList) {

        // load basic info list of all groups
        loadShopBasicInfoList(groupList, function(basicInfoList) {

            // sort basic info list
            basicInfoList.sort(function(a, b) {
                return a.getCreated() < b.getCreated();
            })

            // callback
            onSuccess(basicInfoList);
        }, onFailure);
    }, onFailure);
}

function loadShopListForDisplay() {

    var currentUser = KiiUser.getCurrentUser();

    loadListForDisplay("shop_list", "/page/shoptemplate.html", function(onSuccess, onFailure) {
        loadShopList(currentUser, onSuccess, onFailure);
    }, function(data, displayTemplate, htmlName) {
        return parseShopForDisplay(data, displayTemplate, htmlName);
    });

}
