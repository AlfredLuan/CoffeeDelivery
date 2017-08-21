/**
* read args from command line
*/
const logLevel = readyPropertyFromArgs('log', 'INFO')
const constantsFile = readyPropertyFromArgs('constants')
const statesFile = readyPropertyFromArgs('states')

var logger = require('log4js').getLogger()
logger.setLevel(logLevel)
var Q = require('q')
var request = require('request')
var thingConfig = require('./constants.json')
Object.assign(thingConfig, require(constantsFile))
var low = require('lowdb')
var mqtt = require('mqtt')
var fs = require('fs')

const db = low(statesFile)

function readyPropertyFromArgs(key, defaultValue) {

	var keyStr = '--' + key + '='
	var value = defaultValue

	var options = process.argv;
	for (var i = 0; i < options.length; i++) {
		if(options[i].indexOf(keyStr) > -1) {
			value = options[i].substring(keyStr.length)
			break;
		}
	};

	if(value === undefined) {
		console.error('  Please input command arg --' + key)
		process.exit(1)
	}

	return value
}

function StandaloneThing(thingConfig) {
	this.vendorThingID = thingConfig.vendorThingID
	this.password = thingConfig.password
	this.site = thingConfig.site
	this.appID = thingConfig.appID
	this.appKey = thingConfig.appKey
	this.thingType = thingConfig.thingType
	this.dataGroupingInterval = thingConfig.dataGroupingInterval
	this.randomStates = thingConfig.randomStates
	this.pilotInterval = thingConfig.pilotInterval
	this.schema = thingConfig.schema
	this.ownerID = thingConfig.ownerID
	this.ownerToken = thingConfig.ownerToken
	this.accessToken = undefined
	this.thingID = undefined
}

StandaloneThing.prototype.thingOnboarding = function() {
	var thing = this
	var deferred = Q.defer()

	var options = {
		method: 'POST',
	  	url: thing.site + '/thing-if/apps/' + thing.appID + '/onboardings',
	  	headers: {
	  		'authorization': 'Bearer ' + thing.ownerToken,
	    	'content-type': 'application/vnd.kii.onboardingWithVendorThingIDByOwner+json'
	  	},
		body: JSON.stringify({
			"vendorThingID": thing.vendorThingID,
			"thingPassword": thing.password,
			"thingType": thing.thingType,
			"owner": "USER:" + thing.ownerID,
			"dataGroupingInterval": thing.dataGroupingInterval
		})
	}

	request(options, function(error, response, body) {
		if (error || response.statusCode >= 300) {
			logger.info('Thing Onboarding failed!', error, response)
			deferred.reject(error)
		} else {
			logger.info('Thing Onboarding success! thingID:' + JSON.parse(body).thingID)

			thing.thingID = JSON.parse(body).thingID
			thing.accessToken = JSON.parse(body).accessToken

			thing.mqttConnect(JSON.parse(body).mqttEndpoint).then(function() {
				deferred.resolve()
			})
		}
	})

	return deferred.promise
}

StandaloneThing.prototype.mqttConnect = function(mqttEndpoint) {
	var thing = this
	var deferred = Q.defer()

	var option = {
    "port": mqttEndpoint.portTCP,
    "clientId": mqttEndpoint.mqttTopic,
    "username": mqttEndpoint.username,
    "password": mqttEndpoint.password,
    "reconnectPeriod": 55000,
    "keepalive": 60
  }

  var client  = mqtt.connect('tcp://' + mqttEndpoint.host, option)
  client.on('connect', function(connack) {
  	if (!connack.sessionPresent) {
  		logger.info('MQTT connection success!')
  		client.subscribe(mqttEndpoint.mqttTopic, {qos: 0, retain: false}, function(err, granted) {
  			if (!err) {
  				deferred.resolve()
  				logger.info('MQTT Topic Subscription success!')
  			} else {
  				deferred.reject(err)
  				logger.error('MQTT Topic Subscription failed: ', err)
  			}
      });
  	} else {
  		logger.error('MQTT connection failed!')
  	}
  })

  client.on('error', function(error) {
  	logger.error(error)
  	deferred.reject(error)
  })

  client.on('message', function(topic, message, packet){
    var i, messageStr = '';

    for (i = 0; i < message.length; i++) {
        messageStr += '%' + ('0' + message[i].toString(16)).slice(-2);
    }
    messageStr = decodeURIComponent(messageStr);
    thing.commandReceived(JSON.parse(messageStr))
  })

  return deferred.promise

}

function getRandomDoubleInclusive(min, max) {

    var minInt = min;
    var maxInt = max;

    var decimalLength = 0;
    while(Math.ceil(minInt) != Math.floor(minInt) || Math.ceil(maxInt) != Math.floor(maxInt)) {
        minInt = minInt * 10;
        maxInt = maxInt * 10;
        decimalLength++;
    }

    var value = getRandomIntInclusive(minInt, maxInt);
    for (var i = 0; i < decimalLength; i++) {
        value = value / 10;
    }

    return value;
}

function getRandomIntInclusive(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomBoolean() {
	var result = getRandomIntInclusive(0, 1)
	return (result == 1)? true : false
}

function getRandomStatesAndWriteFile(schema) {
	var state = {}
	for (var key in schema) {
		if (schema.hasOwnProperty(key)) {
			switch(schema[key].type) {
				case "integer" :
					state[key] = getRandomIntInclusive(schema[key].min, schema[key].max)
					break;
                case "float" :
                    state[key] = getRandomDoubleInclusive(schema[key].min, schema[key].max)
                    break;
				case "boolean" :
					state[key] = getRandomBoolean();
					break;
                case "string" :
                    state[key] = schema[key].value;
                    break;
				default :
					logger.warn(schema[key] + ' has unrecoginised type ' + schema[key].type)
			}
		}

		db.set(key, state[key]).write()
	}
	logger.debug('get random states and write to file', state)
	return state
}

function readStatesFromFile(schema) {

	// can't use lowdb to read states from file
	// because when state file is modified manually, lowdb will read the old state value from cache rather than file
	var states = fs.readFileSync(statesFile, 'utf-8');
	states = JSON.parse(states);

	logger.debug('read states from file', states)
	return states
}

StandaloneThing.prototype.sendStates = function() {
	var thing = this
	var deferred = Q.defer()

	var data = readStatesFromFile(thing.schema)

	var options = {
		method: 'PUT',
		url: thing.site + '/thing-if/apps/' + thing.appID +
		'/targets/THING:' + thing.thingID + '/states',
		headers: {
			'content-type': 'application/json',
			'authorization': 'Bearer ' + thing.accessToken
		},
		body: data,
		json: true
	}
	request(options, function(error, response, body) {
		if (error || response.statusCode >= 300) {
			logger.error('Thing uploading state failed! ', error, response.statusCode)
			deferred.reject()
		} else {
			logger.info('Thing uploading state success! ', data)
			deferred.resolve()
		}
	})
	return deferred.promise
}

function executeAction(action) {

	var method = Object.keys(action)[0]
	var state = action[method]
	var field = Object.keys(state)[0]
	var value = state[field]

	db.set(field, value).write()
}

StandaloneThing.prototype.actionHandle = function(data) {

	var result = {
		commandID: data.commandID,
		actionResults: []
	}
	data.actions.forEach(function(action) {
		executeAction(action)

		var actionResult = {}
		actionResult[Object.keys(action)[0]] = {
			succeeded: true
		}
		result.actionResults.push(actionResult)
	})

	logger.info('Received And Executed Command: ', data.actions)
	return result
}

StandaloneThing.prototype.commandReceived = function(payload) {
	var thing = this
	var deferred = Q.defer()

	var result = thing.actionHandle(payload)
	thing.sendActionResult(result)
	thing.sendStates()

	deferred.resolve()
	return deferred.promise
}

StandaloneThing.prototype.sendActionResult = function(result) {
	var thing = this
	var deferred = Q.defer()
	var commandID = result.commandID
	delete result.commandID
	var options = {
		method: 'PUT',
		url: thing.site + '/thing-if/apps/' + thing.appID +
		'/targets/THING:' + thing.thingID + '/commands/' + commandID + '/action-results',
		headers: {
			'content-type': 'application/json',
			'authorization': 'Bearer ' + thing.accessToken
		},
		body: result,
		json: true
	}

	request(options, function(error, response, body) {
		if (error || response.statusCode >= 300) {
			logger.error('Sending action result failed! ', error, response.statusCode)
			deferred.reject()
		} else {
			logger.info('Command <' + commandID + '> Action Result Sent!')
			deferred.resolve()
		}
		logger.debug(body)
	})

	return deferred.promise
}

StandaloneThing.prototype.run = function() {
	var thing = this
	thing.thingOnboarding().then(function(success){

		if(thing.pilotInterval > 0) {
			setInterval(() => {
				if(thing.randomStates) {
					getRandomStatesAndWriteFile(thing.schema)
				}
				thing.sendStates()
			}, thing.pilotInterval)
		}

	}, function(error) {
		logger.error(error)
	})
}



var standaloneThing = new StandaloneThing(thingConfig)
standaloneThing.run()
