function parseOrderHistoryForDisplay(data, displayTemplate, htmlName) {

    var htmlContent = displayTemplate;

    htmlContent = replaceTemplateContent(htmlContent, "{OrderDetailsLinkLabel}", null, htmlName);
    htmlContent = replaceTemplateContent(htmlContent, "{OrderDetailsHideLinkLabel}", null, htmlName);

    htmlContent = htmlContent.replaceAll("{CollapsePanelID}", data.getID());

    htmlContent = htmlContent.replaceAll("{OrderID}", data.getID());
    var orderStatus = data.get("order_status");
    htmlContent = replaceTemplateContent(htmlContent, "{OrderStatus}", "{OrderStatus-" + orderStatus + "}", htmlName);

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

        if(item.quantity == 0) {
            continue;
        }

        tempItemString += item.quantity + "&nbsp;&nbsp;x&nbsp;&nbsp;" + item.name;
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
    var receiver = toSafeString(data.get("customer").recipient.first_name);
    receiver += "&nbsp;" + toSafeString(data.get("customer").recipient.family_name);
    var receiverAddress = toSafeString(data.get("customer").recipient.place.formatted_address);
    var consumerInfo = receiver + "<br/>" + receiverAddress;
    htmlContent = htmlContent.replaceAll("{Consumer}", consumerInfo);
    htmlContent = htmlContent.replaceAll("{ConsumerName}", receiver);

    htmlContent = replaceTemplateContent(htmlContent, "{DriverLabel}", null, htmlName);
    var driver = data.get("driver");
    var driverName = "";
    if(isAvailable(driver) == true) {
        driverName = driver.name;
    }
    htmlContent = htmlContent.replaceAll("{Driver}", toSafeString(driverName));

    htmlContent = replaceTemplateContent(htmlContent, "{DescriptionLabel}", null, htmlName);
    var description = toSafeString(data.get("desc"));
    description = description.replaceAll("\r\n", "<br/>");
    description = description.replaceAll("\n", "<br/>");
    htmlContent = htmlContent.replaceAll("{Description}", description);

    htmlContent = replaceTemplateContent(htmlContent, "{ShopLabel}", null, htmlName);
    var shop = data.get("shop");
    var shopName = toSafeString(shop["name"])
    var shopInfo = shopName;
    if(isAvailable(shop["place"])) {
        shopInfo += "<br/>" + toSafeString(shop["place"]["formatted_address"]);
    }
    htmlContent = htmlContent.replaceAll("{Shop}", shopInfo);
    htmlContent = htmlContent.replaceAll("{ShopName}", shopName);

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

    // display each timestamp
    htmlContent = replaceTemplateContent(htmlContent, "{Timestamp-Label}",  null, htmlName);

    var timestampFieldMap = {
        "0": "timestamp_order_placed",
        "1": "timestamp_order_accepted",
        "2": "timestamp_order_start_making",
        "3": "timestamp_order_ready",
        "4": "timestamp_order_pick_up",
        "5": "timestamp_order_deliveryed"
    };

    for (var status in timestampFieldMap) {
        if(orderStatus >= Number(status)) {
            // display timestamp
            htmlContent = htmlContent.replaceAll("{display-Timestamp-OrderStatus-" + status + "}", "display");
            // display the label and value
            var timestampField = timestampFieldMap[status];
            var dateTime = data.get(timestampField);
            if(isAvailable(dateTime)) {
                dateTime = new Date(dateTime).format("yyyy-MM-dd hh:mm:ss");
            }
            htmlContent = htmlContent.replaceAll("{Timestamp-OrderStatus-" + status + "}", toSafeString(dateTime));
            htmlContent = replaceTemplateContent(htmlContent, "{Timestamp-OrderStatus-" + status + "-Label}",  null, htmlName);
        } else {
            // hide timestamp
            htmlContent = htmlContent.replaceAll("{display-Timestamp-OrderStatus-" + status + "}", "none");
        }
    }

    return htmlContent;
};

function loadOrderHistoryListPage() {

    // load order history list for display
    loadOrderHistoryListForDisplay();
}

function loadOrderHistoryListForDisplay() {

    var kiiUser = KiiUser.getCurrentUser();

    loadListForDisplay("order_history_list", "/page/orderhistorytemplate.html", function(onSuccess, onFailure) {

        // query all the orders which are delivered
        loadOrderList(kiiUser, [ OrderStatus.OrderDelivered ], function(orderHistoryList){
            if(isAvailable(orderHistoryList)) {
                orderHistoryList.sort(function(a, b) {
                    return a.getCreated() < b.getCreated();
                });
            }
            onSuccess(orderHistoryList);
        }, onFailure);
    }, function(data, displayTemplate, htmlName) {
        return parseOrderHistoryForDisplay(data, displayTemplate, htmlName);
    });

}

function showOrderHistoryDetails(orderID, showDetails) {

    if(showDetails == true) {
        showElement(orderID + "_display_details");
        hideElement(orderID + "_display");
    } else {
        showElement(orderID + "_display");
        hideElement(orderID + "_display_details");
    }

}
