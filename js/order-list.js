
function loadOrderDisplayTemplate(onSuccess) {
    $.ajax({
        async: false,
        type: "GET",
        url:  "./ordertemplate.html",
        success: function(orderDisplayTemplate) {
            // console.log("order display template", orderDisplayTemplate);
            onSuccess(orderDisplayTemplate);
        }
    });
}

function loadOrderListForDisplay() {

    var htmlName = getHtmlName();

    var replaceContent = function(orderDisplayTemplate, key, content) {
        var temp = key;
        if(content !== undefined){
            temp = content;
        }
        // translate content
        temp = translateContent(langDict, htmlName, temp);
        // replace content
        return orderDisplayTemplate.replaceAll(key, temp);
    };

    var parseOrderForDisplay = function(order, orderDisplayTemplate) {

        var htmlContent = orderDisplayTemplate;

        htmlContent = htmlContent.replaceAll("{CollapsePanelID}", order.getID());

        htmlContent = htmlContent.replaceAll("{OrderID}", order.getID());
        htmlContent = replaceContent(htmlContent, "{OrderStatus}", "{OrderStatus-" + order.get("order_status") + "}");

        htmlContent = replaceContent(htmlContent, "{MarkReady}");

        htmlContent = replaceContent(htmlContent, "{CoffeeLabel}");
        htmlContent = htmlContent.replaceAll("{Coffee}", order.get("coffee_info"));

        htmlContent = replaceContent(htmlContent, "{ConsumerLabel}");
        var consumerInfo = order.get("consumer_info").name + "<br/>" + order.get("consumer_info").address;
        htmlContent = htmlContent.replaceAll("{Consumer}", consumerInfo);

        htmlContent = replaceContent(htmlContent, "{DriverLabel}");
        htmlContent = htmlContent.replaceAll("{Driver}", toSafeString(order.get("driver_info").name));

        htmlContent = replaceContent(htmlContent, "{DescriptionLabel}");
        var description = toSafeString(order.get("desc"));
        description = description.replaceAll("\r\n", "<br/>");
        description = description.replaceAll("\n", "<br/>");
        htmlContent = htmlContent.replaceAll("{Description}", description);

        htmlContent = replaceContent(htmlContent, "{FeedbackLabel}");
        var feedback = toSafeString(order.get("feedback"));
        feedback = feedback.replaceAll("\r\n", "<br/>");
        feedback = feedback.replaceAll("\n", "<br/>");
        htmlContent = htmlContent.replaceAll("{Feedback}", feedback);

        // check whether hide the "MarkReady" button
        if(order.get("order_status") == OrderStatus.DriverAccepted) {
            htmlContent = htmlContent.replaceAll("{display}", "block");
        } else {
            htmlContent = htmlContent.replaceAll("{display}", "none");
        }

        return "<tr>" + htmlContent + "<br/></tr>";
    };

    // load order list
    loadOrderList(function(orderList) {

        // load order display template
        loadOrderDisplayTemplate(function(orderDisplayTemplate) {

            // parse each order for display
            var htmlContent = "";

            for (var i = 0; i < orderList.length; i++) {
                htmlContent += parseOrderForDisplay(orderList[i], orderDisplayTemplate);
            };

            setInnerHtml("order_list", htmlContent, false);

        });

    });


}

function markOrderReady() {
    // TODO
}

loadCurrentUserInfo(function() {

    console.log("KiiUser.getCurrentUser()", KiiUser.getCurrentUser());

    connectMqttWS(KiiUser.getCurrentUser());
})
