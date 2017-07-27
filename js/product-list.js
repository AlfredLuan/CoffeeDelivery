function changeProductDisplayMode(productID, mode) {

    if(mode == 'display') {
        
    } else if(mode == 'edit') {

    }

}

function parseOwnedShopForDisplay(data, displayTemplate, htmlName) {

    var htmlContent = displayTemplate;

    htmlContent = htmlContent.replaceAll("{CollapsePanelID}", data.getID());

    htmlContent = htmlContent.replaceAll("{ShopID}", data.getID());

    htmlContent = replaceContent(htmlContent, "{NameLabel}", null, htmlName);
    htmlContent = htmlContent.replaceAll("{Name}", data.get("shop_name"));

    htmlContent = replaceContent(htmlContent, "{AddressLabel}", null, htmlName);
    var address = toSafeString(data.get("address"));
    address = description.replaceAll("\r\n", "<br/>");
    address = description.replaceAll("\n", "<br/>");
    htmlContent = htmlContent.replaceAll("{Address}", description);

    return "<tr>" + htmlContent + "<br/></tr>";
};

function loadOwnedShopList(onSuccess, onFailure) {

    // load all owned groups
    loadOwnedGroups(KiiUser.getCurrentUser(), function(groupList) {

            var ownedShopList = [];
            var count = 0;

            // load shop info from group
            var loadShopInfoFromGroup = function(group, done) {

                var bucket = group.bucketWithName(Bucket.GroupScope.ShopInfo);
                var kiiObject = bucket.createObjectWithID("basic_info");
                kiiObject.refresh({
                    success: function(theObject) {
                        ownedShopList.push(theObject);
                        count++;

                        // once all groups looped, callback
                        if(count == groupList.length) {
                            done(ownedShopList);
                        }
                    },
                    failure: function(theObject, errorString) {
                        console.log("failed to load object:", objectUri);
                        count++;

                        // once all groups looped, callback
                        if(count == groupList.length) {
                            done(ownedShopList);
                        }
                    }
                });
            };

            // load shop info from each group
            for (var i = 0; i < groupList.length; i++) {
                loadShopInfoFromGroup(onSuccess);
            }
        }
    });
}

function loadOwnedShopListForDisplay() {

    loadListForDisplay("shop_list", "/page/shoptemplate.html", function(onSuccess, onFailure) {
        loadOwnedShopList(onSuccess, onFailure);
    }, function(data, displayTemplate, htmlName) {
        parseOwnedShopForDisplay(data, displayTemplate, htmlName);
    });

}
