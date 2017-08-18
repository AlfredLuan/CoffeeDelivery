function onCoffeeMakerAnalyticsPageLoad() {

    var endDate = new Date();
    var startDate = new Date(endDate.getTime());
    startDate.setDate(1);

    setElementValue("search_date_start", startDate.format("yyyy-MM-dd"));
    setElementValue("search_date_end", endDate.format("yyyy-MM-dd"));

}

function analyzeCoffeeMaker(eventSource) {

    // block the button
    eventSource.disabled = true;

    var startDate = new Date(getElementValue("search_date_start"));
    var endDate = new Date(getElementValue("search_date_end"));

    console.log("startDate", startDate);
    console.log("endDate", endDate);

    if(endDate.getTime() - startDate.getTime() > 31 * 24 * 60 * 60 * 1000) {

        showErrorMessage("coffeemaker_analytics_error_message", "{error-Please-keep-date-range-within-one-month}")

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
        var clause3 = KiiClause.greaterThanOrEqual("timestamp_order_status_0", startDate);
        var clause4 = KiiClause.lessThanOrEqual("timestamp_order_status_0", endDate);
        var clause = KiiClause.and(clause1, clause2, clause3, clause4);

        loadAllObjects(bucket, clause, function(orderList) {

            // as one order may contain multiple items (such as 1 cup of Americano, 2 cups of Latte)
            // below will flat the order list and put each item from order.items into raw data list
            // this raw data list will be used for the following aggregation
            var rawDataList = [];

            var coffeeMakerMap = {};

            for (var i = 0; i < orderList.length; i++) {
                var order = orderList[i];

                // get date info
                var dateString = new Date(order.get("timestamp_order_status_0")).format("yyyy-MM-dd");

                // get shop info
                var shop = order.get("shop");
                var shopID = "unknown";
                var shopName = "unknown";
                if(isAvailable(shop)) {
                    var shopID = shop["id"];
                    var shopName = shop["name"];
                }

                // get coffee maker info
                var coffeeMaker = order.get("coffee_maker");
                var coffeeMakerID = "unknown";
                var coffeeMakerName = "unknown";
                if(isAvailable(coffeeMaker)) {
                    coffeeMakerID = coffeeMaker["user_id"];
                    coffeeMakerName = coffeeMaker["name"];
                }

                coffeeMakerMap[coffeeMakerID] = {
                    "coffee_maker": coffeeMaker,
                    "shop": shop
                };

                // get each item info
                // "item" is the coffee that customer brought, it may contain multiple cups of the same coffee
                var items = order.get("items");
                var itemQuantitySum = 0;
                var itemSubTotalSum = 0;
                for (var j = 0; j < items.length; j++) {
                    var item = items[j];
                    itemQuantitySum += item["quantity"];
                    itemSubTotalSum += item["sub_total"];
                }

                // get working time
                var workingTime = 0;
                var timeStartPreparing = toSafeTimestamp(order.get("timestamp_order_status_" + OrderStatus.CoffeePreparing));
                var timeCoffeeReady = toSafeTimestamp(order.get("timestamp_order_status_" + OrderStatus.CoffeeReady));
                if(isAvailable(timeCoffeeReady) && isAvailable(timeStartPreparing)) {
                    workingTime = timeCoffeeReady - timeStartPreparing;
                }

                var rawData = {
                    item_quantity: itemQuantitySum,
                    item_sub_total: itemSubTotalSum,
                    working_time: workingTime,
                    shop_name: shopName,
                    shop_id: shopID,
                    coffeemaker_id: coffeeMakerID,
                    coffeemaker_name: coffeeMakerName,
                    date: dateString
                };
                rawDataList.push(rawData);
            }

            console.log("rawDataList for aggregation", rawDataList);

            // start to aggregate coffee maker performance
            aggregateCoffeeMakerPerformanceAndDisplay(rawDataList, coffeeMakerMap);

            clearErrorMessage("coffeemaker_analytics_error_message");

            // unblock the button
            eventSource.disabled = false;
        });

    });

}

// coffeeMakerMap: the map between coffee maker id and coffee maker info + shop info
function aggregateCoffeeMakerPerformanceAndDisplay(rawDataList, coffeeMakerMap) {

    if(rawDataList.length == 0) {
        return;
    }

    var getGroupID = function(e) {
        return e["coffeemaker_id"];
    };

    var aggregateFieldAndFormula = [
        ["item_quantity", "sum"],
        ["item_sub_total", "sum"],
        ["working_time", "sum"]
    ];

    // aggregate
    var aggregationResultList = aggregate(rawDataList, getGroupID, aggregateFieldAndFormula);

    // sort by item_quantity_sum desc for display
    aggregationResultList.sort(function(a, b) {
        return a["aggregationResult"]["item_quantity_sum"] < b["aggregationResult"]["item_quantity_sum"];
    });

    // calculate the avergate working time of each coffee maker
    for (var i = 0; i < aggregationResultList.length; i++) {
        var aggregationResult = aggregationResultList[i]["aggregationResult"];
        var itemQuantitySum = aggregationResult["item_quantity_sum"];
        var workingTimeSum = aggregationResult["working_time_sum"];

        // calculate the average working time in second
        var workingTimeAvg = (workingTimeSum / itemQuantitySum) / 1000;
        workingTimeAvg = Number(workingTimeAvg.toFixed(0));
        aggregationResult["working_time_avg"] = workingTimeAvg;
    }

    // convert aggregation result list for display
    var minWorkingTimeAvgIndex = aggregationResultList.indexOfMinValue(function(e) {
        return e["aggregationResult"]["working_time_avg"];
    });
    var maxItemQuantitySumIndex = aggregationResultList.indexOfMaxValue(function(e) {
        return e["aggregationResult"]["item_quantity_sum"];
    });
    var maxItemSubTotalSumIndex = aggregationResultList.indexOfMaxValue(function(e) {
        return e["aggregationResult"]["item_sub_total_sum"];
    });

    var aggregationResultForDisplay = convertAggregationResultForDisplay(aggregationResultList, function(key, value, groupID, index) {
        if(minWorkingTimeAvgIndex.indexOfElement(index) > -1 && key == "working_time_avg") {
            return "⭐️&nbsp;" + value;
        }

        if(maxItemQuantitySumIndex.indexOfElement(index) > -1 && key == "item_quantity_sum") {
            return "⭐️&nbsp;" + value;
        }

        if(maxItemSubTotalSumIndex.indexOfElement(index) > -1 && key == "item_sub_total_sum") {
            return "⭐️&nbsp;" + value;
        }

        return value;
    });

    // display aggregation result on page
    var innerHTML = "";
    for (var i = 0; i < aggregationResultForDisplay.length; i++) {
        var coffeeMakerID = aggregationResultForDisplay[i]["groupID"];
        var aggregationResult = aggregationResultForDisplay[i]["aggregationResultForDisplay"];

        innerHTML += "<tr><td>" + coffeeMakerMap[coffeeMakerID]["coffee_maker"]["name"]
                    + "</td><td>" + coffeeMakerMap[coffeeMakerID]["shop"]["name"]
                    + "</td><td style='text-align:right'>" + aggregationResult["item_quantity_sum"]
                    + "</td><td style='text-align:right'>" + aggregationResult["working_time_avg"]
                    + "</td><td style='text-align:right'>" + aggregationResult["item_sub_total_sum"]
                    + "</td></tr>";
    }

    setInnerHtml("coffeemaker_list", innerHTML);
}
