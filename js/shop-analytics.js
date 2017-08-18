function onShopAnalyticsPageLoad() {

    var endDate = new Date();
    var startDate = new Date(endDate.getTime());
    startDate.setDate(1);

    setElementValue("search_date_start", startDate.format("yyyy-MM-dd"));
    setElementValue("search_date_end", endDate.format("yyyy-MM-dd"));

}

function analyzeShop(eventSource) {

    // block the button
    eventSource.disabled = true;

    var startDate = new Date(getElementValue("search_date_start"));
    var endDate = new Date(getElementValue("search_date_end"));

    console.log("startDate", startDate);
    console.log("endDate", endDate);

    if(endDate.getTime() - startDate.getTime() > 31 * 24 * 60 * 60 * 1000) {

        showErrorMessage("shop_analytics_error_message", "{error-Please-keep-date-range-within-one-month}")

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

            for (var i = 0; i < orderList.length; i++) {
                var order = orderList[i];

                // get date info
                var dateString = new Date(order.get("timestamp_order_status_0")).format("yyyy-MM-dd");

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

            // start to aggregate coffee sold per shop
            var optionalData = {
                startDate : startDate,
                endDate : endDate
            };
            aggregateProductPerShop(rawDataList, shopList, optionalData);

            clearErrorMessage("shop_analytics_error_message");

            // unblock the button
            eventSource.disabled = false;
        });

    });

}

function aggregateProductPerShop(rawDataList, shopList, optionalData) {

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

    aggregateProductAndDisplay("product_per_shop", getCategoryID, rawDataList, expectedShopIDList, getCategoryLabel, optionalData);

}

//
// chartElementId: the element id of chart in html page
// getCategoryID: function that returns the category id of raw data, the category will be as of x axes
// rawDataList: list of raw data
// expectedCategoryIDList: list of the expected category ids,
//     in the case that certain category is missing in aggregation result, it will be padded with value 0
// getCategoryLabel: function that returns the label of category based on category ID, it will be displayed as the labels of x axes
//
function aggregateProductAndDisplay(chartElementId, getCategoryID, rawDataList, expectedCategoryIDList, getCategoryLabel, optionalData) {

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
            backgroundColor: setOpacity(color, 0.5),
            stack: "stack quantity"
        });
        dataListForDisplay.push({
            label: product + " Income",
            data: itemSubTotalList,
            backgroundColor: color,
            stack: "stack income"
        });

    }

    // the elements in dataListForDisplay must be sorted by "stack" field,
    // otherwise the grouped stack bars may mess up in UI display by chart.js
    dataListForDisplay.sort(function(a, b){
        return a["stack"] > b["stack"];
    });

    // each element in dataListForDisplay is an array of quantity or income of each category
    // sort it by income sum desc
    sortDataListForDisplayByIncomeSum(dataListForDisplay);

    console.log("dataListForDisplay", dataListForDisplay);

    var chartOptions = {
        tooltips: {
            mode: 'index',
            intersect: false
        },
        scales: {
            xAxes: [{
                stacked: true
            }],
            yAxes: [{
                stacked: true
            }]
        }
    };

    // expectedCategoryIDList is expected to be shop list here
    aggregateShopComment(optionalData["startDate"], optionalData["endDate"], expectedCategoryIDList, function(shopCommentMap) {

        var categoryLabelList = convertArray(expectedCategoryIDList, function(e){
            var label = getCategoryLabel(e);
            var starAvg = shopCommentMap[e];
            if(isAvailable(starAvg)) {
                var starAvgLabel = ""
                for (var i = 0; i < starAvg; i++) {
                    starAvgLabel += "⭐️";
                }
                if(starAvg > 0) {
                    starAvgLabel = " (Rated " + starAvgLabel + ")";
                }
                label += starAvgLabel;
            }
            return label;
        });

        showBarChart(chartElementId, categoryLabelList, dataListForDisplay, chartOptions);
    });

}

function sortDataListForDisplayByIncomeSum(dataListForDisplay) {

    console.log("before sort", dataListForDisplay);

    if(isUnavailable(dataListForDisplay) || dataListForDisplay.length == 0) {
        return dataListForDisplay;
    }

    var categoryLength = dataListForDisplay[0]["data"].length;

    var incomeSumList = [];
    var expectedCategoryIDMap = {};
    for (var i = 0; i < categoryLength; i++) {
        var incomeSum = 0;

        for (var j = 0; j < dataListForDisplay.length; j++) {
            var dataForDisplay = dataListForDisplay[j];
            if(dataForDisplay["stack"] != "stack income") {
                continue;
            }

            incomeSum += dataForDisplay["data"][i];
        }

        incomeSumList.push(incomeSum);
    }

    var exchangeElementInDataListForDisplay = function(x, y) {
        for (var i = 0; i < dataListForDisplay.length; i++) {
            var data = dataListForDisplay[i]["data"];
            var temp = data[x];
            data[x] = data[y];
            data[y] = temp;
        }
    }

    for (var i = incomeSumList.length - 1; i >= 0; i--) {
        for (var j = i - 1; j >= 0; j--) {
            var temp1 = incomeSumList[j];
            var temp2 = incomeSumList[j + 1];
            if(temp1 < temp2) {
                var temp = incomeSumList[j];
                incomeSumList[j] = incomeSumList[j + 1];
                incomeSumList[j + 1] = temp;

                // exchange the elements in dataListForDisplay
                exchangeElementInDataListForDisplay(j, j + 1);
            }
        }
    }

    console.log("after sort", dataListForDisplay);

    return dataListForDisplay;
}


function aggregateShopComment(startDate, endDate, expectedShopIDList, onCompleted) {

    console.log("startDate", startDate);
    console.log("endDate", endDate);
    console.log("expectedShopIDList", expectedShopIDList);

    var bucket = Kii.bucketWithName(Bucket.AppScope.CommentList);

    var clause1 = KiiClause.inClause("shop.id", expectedShopIDList);
    var clause2 = KiiClause.greaterThanOrEqual("_created", startDate.getTime());
    var clause3 = KiiClause.lessThanOrEqual("_created", endDate.getTime());
    var clause = KiiClause.and(clause1, clause2, clause3);

    loadAllObjects(bucket, clause, function(commentList) {

        console.log("commentList", commentList);

        // prepare raw data for aggregation
        var rawDataList = convertArray(commentList, function(e){
            var shop = e.get("shop");
            var rawData = {
                shop_id : shop["id"],
                shop_star: shop["star"]
            };
            return rawData;
        });

        var getCategoryID = function(e){
            return e["shop_id"];
        };

        var aggregateFieldAndFormula = [
            ["shop_star", "avg"]
        ];

        // aggregate
        var aggregationResult = aggregate(rawDataList, getCategoryID, aggregateFieldAndFormula);

        // format aggregation result for return
        var shopCommentMap = {};
        convertArray(aggregationResult, function(e){
            var starAvg = e["aggregationResult"]["shop_star_avg"];
            starAvg =  Number(starAvg.toFixed(0));
            shopCommentMap[e["groupID"]] = starAvg;
            return e;
        });

        console.log("shopCommentMap", shopCommentMap);

        // callback
        onCompleted(shopCommentMap);
    })

}
