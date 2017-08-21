
function onDriverAnalyticsPageLoad() {

    var endDate = new Date();
    var startDate = new Date(endDate.getTime());
    startDate.setDate(1);

    setElementValue("search_date_start", startDate.format("yyyy-MM-dd"));
    setElementValue("search_date_end", endDate.format("yyyy-MM-dd"));

}

function analyzeDriver(eventSource) {

    // block the button
    eventSource.disabled = true;

    var startDate = new Date(getElementValue("search_date_start"));
    var endDate = new Date(getElementValue("search_date_end"));

    console.log("startDate", startDate);
    console.log("endDate", endDate);

    if(endDate.getTime() - startDate.getTime() > 31 * 24 * 60 * 60 * 1000) {

        showErrorMessage("driver_analytics_error_message", "{error-Please-keep-date-range-within-one-month}")

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


    var bucket = Kii.bucketWithName(Bucket.AppScope.OrderList);

    // the targate orders must be
    // - between the time range of start time and end time
    // - in completed status
    var clause1 = KiiClause.equals("order_status", OrderStatus.OrderCompleted);
    var clause2 = KiiClause.inDateRange("timestamp_order_status_" + OrderStatus.OrderPlaced, startDate, endDate);
    var clause = KiiClause.and(clause1, clause2);

    loadAllObjects(bucket, clause, function(orderList) {

        // this raw data list will be used for the following aggregation
        var rawDataList = [];

        driverMap = {};

        for (var i = 0; i < orderList.length; i++) {
            var order = orderList[i];

            // get driver info
            var driver = order.get("driver");
            if(isUnavailable(driver)){
                console.log("driver is unavailable for order " + order.getID());
                continue;
            }
            var driverID = driver["id"];
            driverMap[driverID] = driver;

            // get items quantity
            var items = order.get("items");
            var itemQuantitySum = 0;
            for (var j = 0; j < items.length; j++) {
                itemQuantitySum += items[j]["quantity"];
            }

            // get pickup time and delivery time
            var timestampOrderAccepted = toSafeTimestamp(order.get("timestamp_order_status_" + OrderStatus.OrderAccepted));
            var timestampInDelivery = toSafeTimestamp(order.get("timestamp_order_status_" + OrderStatus.InDelivery));
            var timestampOrderCompleted = toSafeTimestamp(order.get("timestamp_order_status_" + OrderStatus.OrderCompleted));

            var pickupTime = 0;
            if(isAvailable(timestampInDelivery) && isAvailable(timestampOrderAccepted)) {
                pickupTime = timestampInDelivery - timestampOrderAccepted;
            }
            var deliveryTime = 0;
            if(isAvailable(timestampOrderCompleted) && isAvailable(timestampInDelivery)) {
                deliveryTime = timestampOrderCompleted - timestampInDelivery;
            }

            var rawData = {
                driver_id: driverID,
                order_id: order.getID(),
                item_quantity: itemQuantitySum,
                pickup_time: pickupTime,
                delivery_time: deliveryTime
            };
            rawDataList.push(rawData);
        }

        console.log("rawDataList for aggregation", rawDataList);

        // start to aggregate driver performance
        aggregateDriverPerformanceAndDisplay(rawDataList);

        clearErrorMessage("driver_analytics_error_message");

        // unblock the button
        eventSource.disabled = false;
    });

}


function aggregateDriverPerformanceAndDisplay(rawDataList) {

    if(rawDataList.length == 0) {
        // clean aggregation result in page
        setInnerHtml("driver_list", "");
        for (var i = 0; i < DriverAnalyticsSortFieldList.length; i++) {
            var sortField = DriverAnalyticsSortFieldList[i];
            setInnerHtml(sortField + "_sort_icon", "");
        }
        return;
    }

    var getGroupID = function(e) {
        return e["driver_id"];
    };

    var aggregateFieldAndFormula = [
        ["order_id", "count"],
        ["item_quantity", "sum"],
        ["pickup_time", "avg"],
        ["delivery_time", "avg"],
    ];

    // aggregate
    var aggregationResultList = aggregate(rawDataList, getGroupID, aggregateFieldAndFormula);

    // convert time unit to minute
    var convertToMinutes = function(millionSeconds) {
        return Number((millionSeconds/(1000*60)).toFixed(0));
    };
    for (var i = 0; i < aggregationResultList.length; i++) {
        var aggregationResult = aggregationResultList[i]["aggregationResult"];
        aggregationResult["pickup_time_avg"] = convertToMinutes(aggregationResult["pickup_time_avg"]);
        aggregationResult["delivery_time_avg"] = convertToMinutes(aggregationResult["delivery_time_avg"]);
    }

    // convert aggregation result list for display
    var maxOrderIdCountIndex = aggregationResultList.indexOfMaxValue(function(e) {
        return e["aggregationResult"]["order_id_count"];
    });

    var maxItemQuantitySumIndex = aggregationResultList.indexOfMaxValue(function(e) {
        return e["aggregationResult"]["item_quantity_sum"];
    });

    var minPickupTimeAvgIndex = aggregationResultList.indexOfMinValue(function(e) {
        return e["aggregationResult"]["pickup_time_avg"];
    });

    var minDeliveryTimeAvgIndex = aggregationResultList.indexOfMinValue(function(e) {
        return e["aggregationResult"]["delivery_time_avg"];
    });

    var aggregationResultForDisplay = convertAggregationResultForDisplay(aggregationResultList, function(key, value, groupID, index) {
        if(maxOrderIdCountIndex.indexOfElement(index) > -1 && key == "order_id_count") {
            return "⭐️&nbsp;" + value;
        }

        if(maxItemQuantitySumIndex.indexOfElement(index) > -1 && key == "item_quantity_sum") {
            return "⭐️&nbsp;" + value;
        }

        if(minPickupTimeAvgIndex.indexOfElement(index) > -1 && key == "pickup_time_avg") {
            return "⭐️&nbsp;" + value;
        }

        if(minDeliveryTimeAvgIndex.indexOfElement(index) > -1 && key == "delivery_time_avg") {
            return "⭐️&nbsp;" + value;
        }

        return value;
    });

    // sort aggregation result list for display
    driverAnalyticsResultForDisplay = {
        "data": aggregationResultForDisplay
    };

    sortDriverAnalyticsResultAndDisplay("order_id_count", "desc");
}

// for sort aggregation result and display in page
// in format of below
// {
//     sort: { field: "field", order : "asc|desc"},
//     data: [
//         {
//             groupID: xxx, // from raw aggregation result list
//             aggregationResult: { yyy_sum: aaa, zzz_avg: bbb, ...},  // from raw aggregation result list
//             aggregationResultForDisplay: { yyy_sum: AAA, zzz_avg: BBB, ... }  // from calculation or render
//         }
//         ...
//     ]
// }
var driverAnalyticsResultForDisplay = {};

// map between driver id and driver info
var driverMap = {};

var DriverAnalyticsSortFieldList = [
        "order_id_count",
        "item_quantity_sum",
        "pickup_time_avg",
        "delivery_time_avg"
];

function sortDriverAnalyticsResultAndDisplay(field, order) {

    // if order is not specified, decide it based on the last sorted field
    var sort = driverAnalyticsResultForDisplay["sort"];
    if(isUnavailable(order)) {
        if(field == sort["field"]) {
            // if the target sort field is the same with last sorted field,
            // set order as the reversed value of last sorted order
            order = (sort["order"] == "asc")? "desc" : "asc";
        } else {
            // if the target sort field is different from last sorted field,
            // set order "desc" by default
            order = "desc";
        }
    }

    var aggregationResultList = driverAnalyticsResultForDisplay["data"];

    // sort driver analytics result
    driverAnalyticsResultForDisplay = sortAggregationResult(aggregationResultList, field, order);

    // display driver analytics on page

    // set table header
    for (var i = 0; i < DriverAnalyticsSortFieldList.length; i++) {
        var sortField = DriverAnalyticsSortFieldList[i];
        var sortIcon = "";
        if(sortField == field){
            sortIcon = (order == "desc")? "⬆︎" : "⬇︎";
        }
        console.log("set " + sortField + " on " + field);
        setInnerHtml(sortField + "_sort_icon", sortIcon);
    }


    // set table body
    aggregationResultList = driverAnalyticsResultForDisplay["data"];

    var innerHTML = "";
    for (var i = 0; i < aggregationResultList.length; i++) {
        var driverID = aggregationResultList[i]["groupID"];
        var aggregationResultForDisplay = aggregationResultList[i]["aggregationResultForDisplay"];

        innerHTML += "<tr><td>" + driverMap[driverID]["display_name"]
                    + "</td><td style='text-align:right'>" + aggregationResultForDisplay["order_id_count"]
                    + "</td><td style='text-align:right'>" + aggregationResultForDisplay["item_quantity_sum"]
                    + "</td><td style='text-align:right'>" + aggregationResultForDisplay["pickup_time_avg"]
                    + "</td><td style='text-align:right'>" + aggregationResultForDisplay["delivery_time_avg"]
                    + "</td></tr>";
    }

    setInnerHtml("driver_list", innerHTML);
}
