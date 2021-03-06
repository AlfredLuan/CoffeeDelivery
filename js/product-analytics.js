function onProductAnalyticsPageLoad() {

    var endDate = new Date();
    var startDate = new Date(endDate.getTime());
    startDate.setDate(1);

    setElementValue("search_date_start", startDate.format("yyyy-MM-dd"));
    setElementValue("search_date_end", endDate.format("yyyy-MM-dd"));

}

function analyzeProduct(eventSource) {

    // block the button
    eventSource.disabled = true;

    var startDate = new Date(getElementValue("search_date_start"));
    var endDate = new Date(getElementValue("search_date_end"));

    console.log("startDate", startDate);
    console.log("endDate", endDate);

    if(endDate.getTime() - startDate.getTime() > 31 * 24 * 60 * 60 * 1000) {

        showErrorMessage("product_analytics_error_message", "{error-Please-keep-date-range-within-one-month}")

        // unblock the button
        eventSource.disabled = false;
        return;
    }

    // fill in expected dates
    var expectedDateList = [];

    var expectedDate = new Date(startDate.getTime());
    var expectedDateString = expectedDate.format("yyyy-MM-dd");
    var endDateString = endDate.format("yyyy-MM-dd");

    while(expectedDateString <= endDateString) {
        expectedDateList.push(expectedDateString);

        expectedDate.setDate(expectedDate.getDate() + 1);
        expectedDateString = expectedDate.format("yyyy-MM-dd");
    }

    var kiiUser = KiiUser.getCurrentUser();

    loadGroups(kiiUser, function(shopList) {

        var shopIDList = convertArray(shopList, function(e) {
            return e.getID();
        });

        console.log("shopIDList", shopIDList);

        var bucket = Kii.bucketWithName(Bucket.AppScope.OrderList);

        // the targate orders must be
        // - between the time range of start time and end time
        // - within the brand (the shops which current user is in)
        // - in completed status
        var clause1 = KiiClause.inClause("shop.id", shopIDList);
        var clause2 = KiiClause.equals("order_status", OrderStatus.OrderCompleted);
        var clause3 = KiiClause.inDateRange("timestamp_order_status_" + OrderStatus.OrderPlaced, startDate, endDate);
        var clause = KiiClause.and(clause1, clause2, clause3);

        loadAllObjects(bucket, clause, function(orderList) {

            // as one order may contain multiple items (such as 1 cup of Americano, 2 cups of Latte)
            // below will flat the order list and put each item from order.items into raw data list
            // this raw data list will be used for the following aggregation
            var rawDataList = [];

            for (var i = 0; i < orderList.length; i++) {
                var order = orderList[i];

                // get date info
                var dateString = new Date(order.get("timestamp_order_status_" + OrderStatus.OrderPlaced)).format("yyyy-MM-dd");

                // get shop info
                var shop = order.get("shop");
                var shopID = shop["id"];
                var shopName = shop["name"];

                // get each item info
                // "item" is the coffee that customer brought, it may contain multiple cups of the same coffee
                var items = order.get("items");
                for (var j = 0; j < items.length; j++) {
                    var item = items[j];

                    var rawData = {
                        item_quantity: item["quantity"],
                        item_price: item["price"],
                        item_name: item["name"],
                        item_sub_total: item["sub_total"],
                        item_id: item["id"],
                        shop_name: shopName,
                        shop_id: shopID,
                        date: dateString
                    };
                    rawDataList.push(rawData);
                }
            }

            console.log("rawDataList for aggregation", rawDataList);

            // start to aggregate coffee sold per day
            aggregateProductPerDay(rawDataList, expectedDateList);
            // start to aggregate coffee sold per shop
            aggregateProductPerShop(rawDataList, shopList);

            clearErrorMessage("product_analytics_error_message");

            // unblock the button
            eventSource.disabled = false;
        });

    });

}

function aggregateProductPerDay(rawDataList, expectedDateList) {

    var getCategoryID = function(e) {
        return e["date"];
    };

    // get MM-dd as category label
    var getCategoryLabel = function(e) {
        return e.substring(5);
    };

    aggregateProductAndDisplay("product_per_day", getCategoryID, rawDataList, expectedDateList, getCategoryLabel);

}

function aggregateProductPerShop(rawDataList, shopList) {

    shopList.sort(function(a, b) {
        return a.getName() > b.getName();
    });

    // get map between shop id and name, and list of shop id
    var shopMap = {};
    var expectedShopIDList = convertArray(shopList, function(e){
        shopMap[e.getID()] = e.getName();
        return e.getID();
    });

    var getCategoryID = function(e) {
        return e["shop_id"];
    };

    // get shop name as category label
    var getCategoryLabel = function(e) {
        return shopMap[e];
    };

    aggregateProductAndDisplay("product_per_shop", getCategoryID, rawDataList, expectedShopIDList, getCategoryLabel);

}

//
// chartElementId: the element id of chart in html page
// getCategoryID: function that returns the category id of raw data, the category will be as of x axes
// rawDataList: list of raw data
// expectedCategoryIDList: list of the expected category ids,
//     in the case that certain category is missing in aggregation result, it will be padded with value 0
// getCategoryLabel: function that returns the label of category based on category ID, it will be displayed as the labels of x axes
//
function aggregateProductAndDisplay(chartElementId, getCategoryID, rawDataList, expectedCategoryIDList, getCategoryLabel) {

    var groupResult =  group(rawDataList, function(e) {
        return e["item_name"];
    });

    var aggregateFieldAndFormula = [
        ["item_quantity", "sum"],
        ["item_sub_total", "sum"],
    ];

    var dataListForDisplay = [];

    // for color setting
    var colorIndex = 0;
    var colorList = convertArray(ChartColors, function(value, key) {
        return value;
    });
    console.log("colorList", colorList);

    // for raw data list of each product, aggregate the sold quantity and price by category
    for (var product in groupResult) {
        // aggregate the sold quantity and price by category
        var rawDataSubList = groupResult[product];
        var aggregationResultList = aggregate(rawDataSubList, getCategoryID, aggregateFieldAndFormula);

        console.log("aggregationResultList per product", product, aggregationResultList);

        // get the map between groupID and aggregation result (including the sold quantity and price)
        var aggregationResultMap = {};
        convertArray(aggregationResultList, function(e) {
            aggregationResultMap[e["groupID"]] = e["aggregationResult"];
        });

        // parse aggregation result into the format for display in chart
        var itemQuantityList = [];
        var itemSubTotalList = [];
        for (var i = 0; i < expectedCategoryIDList.length; i++) {
            var expectedCategoryID = expectedCategoryIDList[i];
            var aggregationResult = aggregationResultMap[expectedCategoryID];
            if(isAvailable(aggregationResult)) {
                itemQuantityList.push(aggregationResult["item_quantity_sum"]);
                itemSubTotalList.push(aggregationResult["item_sub_total_sum"] / 10);
            } else {
                // if no aggregation result on the certain category, set it 0
                itemQuantityList.push(0);
                itemSubTotalList.push(0);
            }
        }

        var color = colorList[(colorIndex++) % colorList.length];

        dataListForDisplay.push({
            label: product + " Quantity",
            data: itemQuantityList,
            backgroundColor: setOpacity(color, 0.5)
        });
        dataListForDisplay.push({
            label: product + " Income",
            data: itemSubTotalList,
            backgroundColor: color
        });

    }

    console.log("dataListForDisplay", dataListForDisplay);

    var categoryLabelList = convertArray(expectedCategoryIDList, getCategoryLabel);

    showBarChart(chartElementId, categoryLabelList, dataListForDisplay);
}
