
function parseOrderForDisplay(order, displayTemplate, htmlName) {

    var htmlContent = displayTemplate;

    htmlContent = htmlContent.replaceAll("{CollapsePanelID}", data.getID());

    htmlContent = htmlContent.replaceAll("{OrderID}", data.getID());
    htmlContent = replaceContent(htmlContent, "{OrderStatus}", "{OrderStatus-" + data.get("order_status") + "}", htmlName);

    htmlContent = replaceContent(htmlContent, "{MarkReady}", null, htmlName);

    htmlContent = replaceContent(htmlContent, "{CoffeeLabel}", null, htmlName);
    htmlContent = htmlContent.replaceAll("{Coffee}", data.get("coffee_info"));

    htmlContent = replaceContent(htmlContent, "{ConsumerLabel}", null, htmlName);
    var consumerInfo = data.get("consumer_info").name + "<br/>" + data.get("consumer_info").address;
    htmlContent = htmlContent.replaceAll("{Consumer}", consumerInfo);

    htmlContent = replaceContent(htmlContent, "{DriverLabel}", null, htmlName);
    htmlContent = htmlContent.replaceAll("{Driver}", toSafeString(data.get("driver_info").name));

    htmlContent = replaceContent(htmlContent, "{DescriptionLabel}", null, htmlName);
    var description = toSafeString(data.get("desc"));
    description = description.replaceAll("\r\n", "<br/>");
    description = description.replaceAll("\n", "<br/>");
    htmlContent = htmlContent.replaceAll("{Description}", description);

    htmlContent = replaceContent(htmlContent, "{FeedbackLabel}", null, htmlName);
    var feedback = toSafeString(data.get("feedback"));
    feedback = feedback.replaceAll("\r\n", "<br/>");
    feedback = feedback.replaceAll("\n", "<br/>");
    htmlContent = htmlContent.replaceAll("{Feedback}", feedback);

    // check whether hide the "MarkReady" button
    if(data.get("order_status") == OrderStatus.DriverAccepted) {
        htmlContent = htmlContent.replaceAll("{display}", "block");
    } else {
        htmlContent = htmlContent.replaceAll("{display}", "none");
    }

    return "<tr>" + htmlContent + "<br/></tr>";
};

function loadOrderListForDisplay() {

    loadListForDisplay("order_list", "/page/ordertemplate.html", function(onSuccess, onFailure) {
        loadOrderList(onSuccess, onFailure);
    }, function(data, displayTemplate, htmlName) {
        parseOrderForDisplay(data, displayTemplate, htmlName);
    });

}

function markOrderReady() {
    // TODO
}

loadCurrentUserInfo(function() {

    console.log("KiiUser.getCurrentUser()", KiiUser.getCurrentUser());

    connectMqttWS(KiiUser.getCurrentUser());
})
