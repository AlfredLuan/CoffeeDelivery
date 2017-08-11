function parseOrderForDisplay(data, displayTemplate, htmlName) {

    var htmlContent = displayTemplate;

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
    var shopInfo = toSafeString(shop["name"])
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

    return "<tr>" + htmlContent + "<br/></tr>";
};

function loadOrderListPage() {

    var kiiUser = KiiUser.getCurrentUser();

    console.log("KiiUser.getCurrentUser()", kiiUser);

    connectMqttWS(KiiUser.getCurrentUser(), function(payload) {

        if(payload["event"] = PushMessageEvent.OrderUpdated) {
            var orderID = payload["order_id"];
            var bucket = Kii.bucketWithName(Bucket.AppScope.OrderList);
            var object = bucket.createObjectWithID(orderID);

            object.refresh({
                success: function(order) {

                    // load display template
                    loadDisplayTemplate("/page/ordertemplate.html", function(displayTemplate) {

                        var htmlName = getHtmlName();
                        // parse each data for display
                        var htmlContent = parseOrderForDisplay(order, displayTemplate, htmlName);

                        var existingOrderElement = document.getElementById("element_" + orderID);

                        if(isAvailable(existingOrderElement) == true) {
                            // update order element
                            var div = document.createElement("div");
                            div.innerHTML = htmlContent;

                            for (var i = 0; i < div.childNodes.length; i++) {
                                var temp = div.childNodes[i];
                                // check whether element node type
                                if(temp.nodeType == 1) {
                                    htmlContent = temp.innerHTML;
                                    setInnerHtml("element_" + orderID, htmlContent, false);
                                    break;
                                }
                            }
                        } else {
                            // create new order element
                            htmlContent += document.getElementById("order_list").innerHTML;
                            document.getElementById("order_list").innerHTML = htmlContent;
                        }
                    });

                },
                failure: function(order, errorString) {
                    // Handle the error.
                    console.log("failed to load order", order, errorString);
                }
            });
        }

    });

    // load order list for display
    loadOrderListForDisplay();
}

function loadOrderListForDisplay() {

    var kiiUser = KiiUser.getCurrentUser();

    loadListForDisplay("order_list", "/page/ordertemplate.html", function(onSuccess, onFailure) {

        // query all the orders which are not delivered
        var targetOrderStatusList = [
            OrderStatus.OrderPlaced,
            OrderStatus.OrderAccepted,
            OrderStatus.OrderStartMaking,
            OrderStatus.OrderReady,
            OrderStatus.OrderPickUp
        ];

        loadOrderList(kiiUser, targetOrderStatusList, function(orderList){
            if(isAvailable(orderList)) {
                orderList.sort(function(a, b) {
                    return a.getCreated() < b.getCreated();
                });
            }
            onSuccess(orderList);
        }, onFailure);
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

            // update maker info
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
            // update order status
            order.set("order_status", orderStatus);
            // update order timestamp
            var timestampField = "";
            switch (orderStatus) {
                case OrderStatus.OrderStartMaking:
                    timestampField = "timestamp_order_start_making";
                    break;
                case OrderStatus.OrderReady:
                    timestampField = "timestamp_order_ready";
                    break;
            }
            order.set(timestampField, new Date().getTime());

            // save order
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
