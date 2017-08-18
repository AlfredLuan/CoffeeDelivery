var ChartColors = {
	red: 'rgb(255, 99, 132)',
	orange: 'rgb(255, 159, 64)',
	blue: 'rgb(54, 162, 235)',
	yellow: 'rgb(255, 205, 86)',
	green: 'rgb(75, 192, 192)',
	purple: 'rgb(153, 102, 255)',
	grey: 'rgb(201, 203, 207)'
};

function setOpacity(chartColor, opacity) {
    var start = chartColor.indexOf("(");
    var end = chartColor.lastIndexOf(")");
    return "rgba(" + chartColor.substring(start + 1, end) + ", " + opacity + ")";
}

/**
// dataList is expected in format of
// [
//     { label: "subCategory1", data: "dataList1" },
//     { label: "subCategory2", data: "dataList2" },
//     ...
// ]
//
// categoryLabels will be displayed for each element of dataList
*/
function showBarChart(elementId, categoryLabels, dataList, chartOptions) {

    if(isUnavailable(dataList)) {
        return;
    }

    var colorList = convertArray(ChartColors, function(value, key) {
        return value;
    });

    var colorIndex = 0;
    var dataListForDisplay = convertArray(dataList, function(e, i) {
        var dataForDisplay = {
            label: e["label"],
            data: e["data"],
            backgroundColor: e["backgroundColor"],
            stack: e["stack"]
        };
        // set default background color
        if(isUnavailable(dataForDisplay["backgroundColor"])) {
            dataForDisplay["backgroundColor"] = colorList[(colorIndex++) % colorList.length];
        }
        return dataForDisplay;
    });

    var data = {
        labels : categoryLabels,
        datasets : dataListForDisplay
    }

    //Get the context of the canvas element we want to select
    var div = document.getElementById(elementId);
    var chartElementId = "chart_" + elementId;
    div.innerHTML = "<canvas id='" + chartElementId + "' ></canvas>";

    console.log("chart data", data);
    console.log("chart options", chartOptions);

    var ctx = document.getElementById(chartElementId).getContext("2d");
    var myLineChart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: chartOptions
    });
}
