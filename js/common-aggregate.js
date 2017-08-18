
/////////////////////////////////////////////////////
// aggregation
/////////////////////////////////////////////////////

function count(arr, fieldName) {
    if (arr === undefined || arr == null) {
        return 0;
    }
    return arr.length;
}

function sum(arr, fieldName) {
    if (arr === undefined || arr == null) {
        return undefined;
    }
    var length = arr.length;
    var sumValue = 0;
    for (var i = 0; i < length; i++) {
        if (arr[i][fieldName] !== undefined && arr[i][fieldName] != null) {
            sumValue += Number(arr[i][fieldName]);
        }
    };
    return Number(sumValue.toFixed(2));
}

function avg(arr, fieldName) {
    if (arr === undefined || arr == null || arr.length == 0) {
        return undefined;
    }
    var length = arr.length;
    var sumValue = 0;
    for (var i = 0; i < length; i++) {
        if (arr[i][fieldName] !== undefined && arr[i][fieldName] != null) {
            sumValue += Number(arr[i][fieldName]);
        }
    };
    return Number((sumValue / length).toFixed(2));
}

/**
 * group recordSet by the specified method "getGroupID"
 *
 * for example,
 *  var getGroupID = function(object) {
 *    return object["app id"];
 *  };
 *
 * var arr = [{"app id":"BBB", "score":333, "number" : 333},
 *            {"app id":"AAA", "score":111, "number" : 111},
 *            {"app id":"AAA"},
 *            {"app id":"CCC", "score":999, "number" : 999},
 *            {"app id":"AAA", "score":222, "number" : 222}
 *            ];
 *
 * var result = group(arr, getGroupID);
 *
 * the output will be :
 *  {
 *     "BBB" : [{"app id":"BBB", "score":333, "number" : 333}],
 *     "AAA" : [{"app id":"AAA", "score":111, "number" : 111},
 *              {"app id":"AAA"},
 *              {"app id":"AAA", "score":222, "number" : 222}],
 *     "CCC" : [{"app id":"CCC", "score":999, "number" : 999}]
 *  }
 *
 */
function group(recordSet, getGroupID) {
    var groupResult = {};
    var length = recordSet.length;
    for (var i = 0; i < length; i++) {
        // get group id
        var groupID = getGroupID(recordSet[i]);
        // add recordSet[i] to the corresponding group result
        if (groupResult[groupID] === undefined) {
            groupResult[groupID] = [];
        }
        groupResult[groupID].push(recordSet[i]);
    };
    return groupResult;
}

/**
 * group recordSet by the specified method "getGroupID", and aggregate based on "aggregateFieldAndFormula"
 *
 * aggregateFieldAndFormula: the array of field and formula to be aggregated, in the format of
 *   [
 *     [field1, formula1],
 *     [field2, formula2],
 *     ...
 *   ]
 *
 * the output will be in the format of
 *   [
 *     {
 *       groupID: id1,
 *       aggregationResult: { field1_formula1 : value1, field2_formula2 : value2, ... }
 *     }, {
 *       groupID: id2,
 *       aggregationResult: { field1_formula1 : value1, field2_formula2 : value2, ... }
 *     },
 *      ...
 *   ]
 *
 * for example,
 *  var getGroupID = function(object) {
 *    return object["app id"];
 *  };
 *
 * var recordSet = [
 *            {"app id":"BBB", "score":333, "number" : 333},
 *            {"app id":"AAA", "score":111, "number" : 111},
 *            {"app id":"AAA"},
 *            {"app id":"CCC", "score":999, "number" : 999},
 *            {"app id":"AAA", "score":222, "number" : 222}
 *          ];
 *
 * var aggregateFieldAndFormula = [
 *            ["score", "sum"],
 *            ["number","avg"],
 *          ];
 *
 * var result = aggregate(recordSet, getGroupID, aggregateFieldAndFormula);
 *
 * the output will be :
 *   [
 *     {
 *       groupID: "BBB",
 *       aggregationResult: { "score_sum" : 333, "number_avg" : 333 }
 *     }, {
 *       groupID: "AAA",
 *       aggregationResult: { "score_sum" : 333, "number_avg" : 111 }
 *     }, {
 *       groupID: "CCC",
 *       aggregationResult: { "score_sum" : 999, "number_avg" : 999 }
 *     },
 *   ]
 *
 */
function aggregate(recordSet, getGroupID, aggregateFieldAndFormula) {

    var supportedFormula = {
        "sum": sum,
        "avg": avg,
        "count": count
    };

    /**
     * aggregate the value of each field
     *
     * the output will be in the format of
     *   {
     *     field1_formula1 : value1,
 *     field2_formula2 : value2,
     *     ...
     *   }
     * objectArr: the object array with the same group id
     * aggregateFieldAndFormula: the array of field and formula to be aggregated, in the format of
     *   [
     *     [field1,formula1],
     *     [field2,formula2],
     *     ...
     *   ]
     **/
    var aggregateForSingleGroup = function(objectArr, aggregateFieldAndFormula) {
        var aggregateResult = {};
        for (var i = 0; i < aggregateFieldAndFormula.length; i++) {
            // get field to be aggregated
            var field = aggregateFieldAndFormula[i][0];
            // get formula
            var formulaName = aggregateFieldAndFormula[i][1];
            var formula = supportedFormula[formulaName];
            // calculate value by the formula
            var value = formula(objectArr, field);
            aggregateResult[field + "_" + formulaName] = value;
        };
        return aggregateResult;
    };
    // result array
    var resultArr = [];
    // group recordSet by the method "getGroupID"
    var groupResult = group(recordSet, getGroupID);
    // calculate the value of each group
    var groupIDs = Object.keys(groupResult);
    for (var i = 0; i < groupIDs.length; i++) {
        var temp = {};
        // set the groupByField
        temp["groupID"] = groupIDs[i];
        // aggregate the value of each field
        var objectArr = groupResult[groupIDs[i]];
        temp["aggregationResult"] = aggregateForSingleGroup(objectArr, aggregateFieldAndFormula);
        resultArr.push(temp);
    };

    console.log("aggregation result", resultArr);

    return resultArr;
}


function convertAggregationResultForDisplay(aggregationResult, convertor) {
    if(isUnavailable(aggregationResult)) {
        return aggregationResult;
    }

    var method = function(key, value, groupID, indexInAggregationResult) {
        return value;
    };
    if(isAvailable(convertor)) {
        method = convertor;
    }

    var toArrayConvertor = function(e, i) {

        var resultForDisplay = {};

        var groupID = e["groupID"];
        var result = e["aggregationResult"];

        for (var key in result) {
            var value = result[key];
            resultForDisplay[key] = method(key, value, groupID, i);
        }

        e["aggregationResultForDisplay"] = resultForDisplay;
        return e;
    }

    var result = convertArray(aggregationResult, toArrayConvertor);

    console.log("aggregation result for display", result);

    return result;
}

// order: asc|desc
// field: sort on which field in aggregation result
// the response will be in format of below
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
function sortAggregationResult(aggregationResult, field, order) {

    if(isUnavailable(aggregationResult) || isUnavailable(field) || isUnavailable(order)) {
        return { "data" : aggregationResult };
    }

    if(order != "asc" && order != "desc") {
        return { "data" : aggregationResult };
    }

    var data = aggregationResult.sort(function(a, b) {
        var fieldValueA = a["aggregationResult"][field];
        var fieldValueB = b["aggregationResult"][field];

        if(order == "asc") {
            return fieldValueA >= fieldValueB;
        } else {
            return fieldValueA < fieldValueB;
        }
    });

    var result = {
        "sort": {
            field: field,
            order: order
        },
        "data": data
    };

    console.log("sort aggregation result", result);

    return result;
}
