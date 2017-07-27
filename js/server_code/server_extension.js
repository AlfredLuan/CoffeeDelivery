
function registerShopTopic(params, context, done) {

	var adminContext = context.getAppAdminContext();
	// {"uri":"kiicloud://groups/ijhplpz1t1po81o2kk9h766he"}
	var group = adminContext.groupWithURI(params.uri);

	group.refresh({
	  success: function(theGroup) {
	    
	  	// Create a topic in the user scope.
	    var topicName = "default_topic";
	    var topic = theGroup.topicWithName(topicName);

	    // Save the topic to Kii Cloud.
		topic.save({
			success: function(theTopic) {
			  // Do something.
			  console.log("group topic created", theTopic);

			  done(theTopic);
			  return;
			},
			failure: function(errorString) {
			  // Handle the error.
			  console.log(errorString);

			  done(errorString);
			  return;
			}
		});

	  },
	  failure: function(theObject, errorString) {
	    console.log("failed to load object:", objectUri)

	    done(errorString);
		return;
	  }
	});
}

function updateShopInfo(params, context, done) {

	var adminContext = context.getAppAdminContext();

	if(params.objectID != "basic_info") {
		done();
		return;
	}

	var objectUri = params.uri;

	// Instantiate a KiiObject.
	var object = adminContext.objectWithURI(objectUri);

	// Refresh the KiiObject to retrieve the latest data from Kii Cloud.
	object.refresh({
	  success: function(theObject) {
	    
	  	var bucket = adminContext.bucketWithName('shop_info_list');
		var object = bucket.createObjectWithID(theObject.get("shop_id"));
		copyValues(theObject, object, ["shop_id", "shop_name", "address"]);
		object.saveAllFields({
		  success: function(theObject) {
		  	console.log("success to save to shop_info_list", object);

		  	done(theObject);
			return;
		  },
		  failure: function(theObject, errorString) {
		    console.log("failed to load object:", objectUri)
		    done(errorString);
			return;
		  }
		});

	  },
	  failure: function(theObject, errorString) {
	    console.log("failed to load object:", objectUri)
	    done(errorString);
		return;
	  }
	});
}

function copyValues(srcObject, destObject, keys) {
	for (var i = 0; i < keys.length; i++) {
		destObject.set(keys[i], srcObject.get(keys[i]));
	}
}

