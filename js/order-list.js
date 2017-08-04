function parseOrderForDisplay(data, displayTemplate, htmlName) {

    var htmlContent = displayTemplate;

    htmlContent = htmlContent.replaceAll("{CollapsePanelID}", data.getID());

    htmlContent = htmlContent.replaceAll("{OrderID}", data.getID());
    htmlContent = replaceTemplateContent(htmlContent, "{OrderStatus}", "{OrderStatus-" + data.get("order_status") + "}", htmlName);

    htmlContent = replaceTemplateContent(htmlContent, "{MakerLabel}", null, htmlName);
    var maker = data.get("coffee_maker");
    var makerName = "";
    if(isAvailable(maker)) {
        makerName = toSafeString(maker.name);
    }
    htmlContent = htmlContent.replaceAll("{Maker}", makerName);

    htmlContent = replaceTemplateContent(htmlContent, "{CoffeeLabel}", null, htmlName);
    var items = data.get("items");
    var tempItemString = "";
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        tempItemString += "{AmountLabel}:&nbsp;" + item.quantity + "&nbsp;&nbsp;/&nbsp;&nbsp;{ProductNameLabel}:&nbsp;" + item.name;
        if(isAvailable(item.options)) {
            tempItemString += "&nbsp;&nbsp;/&nbsp;&nbsp;{OptionsLabel}:&nbsp;";
            for (var j = 0; j < item.options.length; j++) {
                var option = item.options[j];
                if(j > 0) {
                    tempItemString += ",&nbsp;";
                }
                tempItemString += option.name + "&nbsp;-&nbsp;" + option.value;
            }
        }
        if(i < items.length - 1) {
            tempItemString += "<br/>";
        }
    }
    tempItemString = replaceTemplateContent(tempItemString, "{AmountLabel}", null, htmlName);
    tempItemString = replaceTemplateContent(tempItemString, "{ProductNameLabel}", null, htmlName);
    tempItemString = replaceTemplateContent(tempItemString, "{OptionsLabel}", null, htmlName);
    htmlContent = htmlContent.replaceAll("{Coffee}", toSafeString(tempItemString));

    htmlContent = replaceTemplateContent(htmlContent, "{ConsumerLabel}", null, htmlName);
    var receiver = toSafeString(data.get("customer").recipient.receiver);
    var receiverAddress = toSafeString(data.get("customer").recipient.place.formatted_address);
    var consumerInfo = receiver + "<br/>" + receiverAddress;
    htmlContent = htmlContent.replaceAll("{Consumer}", consumerInfo);

    htmlContent = replaceTemplateContent(htmlContent, "{DriverLabel}", null, htmlName);
    htmlContent = htmlContent.replaceAll("{Driver}", toSafeString(data.get("driver").name));

    htmlContent = replaceTemplateContent(htmlContent, "{DescriptionLabel}", null, htmlName);
    var description = toSafeString(data.get("desc"));
    description = description.replaceAll("\r\n", "<br/>");
    description = description.replaceAll("\n", "<br/>");
    htmlContent = htmlContent.replaceAll("{Description}", description);

    htmlContent = replaceTemplateContent(htmlContent, "{ShopLabel}", null, htmlName);
    var shop = data.get("shop");
    var shopInfo = toSafeString(shop["shop_name"])
    if(isAvailable(shop["place"])) {
        shopInfo += "<br/>" + toSafeString(shop["place"]["formatted_address"]);
    }
    htmlContent = htmlContent.replaceAll("{Shop}", shopInfo);

    htmlContent = replaceTemplateContent(htmlContent, "{UpdateOrderStatus1}",  null, htmlName);
    htmlContent = replaceTemplateContent(htmlContent, "{UpdateOrderStatus2}",  null, htmlName);

    // check whether hide the "MarkReady" button
    if (data.get("order_status") == OrderStatus.OrderAccepted) {
        htmlContent = htmlContent.replaceAll("{display-order-status-2}", "block");
        htmlContent = htmlContent.replaceAll("{display-order-status-3}", "none");
    } else if(data.get("order_status") == OrderStatus.OrderStartMaking) {
        htmlContent = htmlContent.replaceAll("{display-order-status-2}", "none");
        htmlContent = htmlContent.replaceAll("{display-order-status-3}", "block");
    } else {
        htmlContent = htmlContent.replaceAll("{display-order-status-2}", "none");
        htmlContent = htmlContent.replaceAll("{display-order-status-3}", "none");
    }

    return "<tr>" + htmlContent + "<br/></tr>";
};

function loadOrderListForDisplay() {

    var kiiUser = KiiUser.getCurrentUser();

    loadListForDisplay("order_list", "/page/ordertemplate.html", function(onSuccess, onFailure) {
        loadOrderList(kiiUser, onSuccess, onFailure);
    }, function(data, displayTemplate, htmlName) {
        return parseOrderForDisplay(data, displayTemplate, htmlName);
    });

}

function updateOrderStatus(eventSource, orderID, orderStatus) {

    // block the button
    eventSource.disabled = true;

    var bucket = Kii.bucketWithName(Bucket.AppScope.OrderList);
    var object = bucket.createObjectWithID(orderID);

    // refresh order object
    object.refresh({
        success: function(order) {

            // update order status, maker info and save
            var user = KiiUser.getCurrentUser();
            var userID = user.getID();
            var displayName = user.getDisplayName();
            if(isUnavailable(displayName)) {
                displayName = user.getUsername();
            }
            order.set("coffee_maker", {
                user_id: userID,
                name: displayName
            });
            order.set("order_status", orderStatus);

            order.save({
                success: function() {
                    // unblock the button
                    eventSource.disabled = false;
                    // reload the page
                    window.location.reload(true);
                },
                failure: function() {
                    // Handle the error.
                    showErrorMessage("navbar_error_message", "{error-Failed-to-mark-order-ready}");
                    // unblock the button
                    eventSource.disabled = false;
                }
            })
        },
        failure: function(order, errorString) {
            // Handle the error.
            showErrorMessage("navbar_error_message", "{error-Failed-to-mark-order-ready}");
            // unblock the button
            eventSource.disabled = false;
        }
    })

}

loadCurrentUserInfo(function() {

    console.log("KiiUser.getCurrentUser()", KiiUser.getCurrentUser());

    connectMqttWS(KiiUser.getCurrentUser());
})
