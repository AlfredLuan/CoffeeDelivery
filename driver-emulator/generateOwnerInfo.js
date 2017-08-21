var logger = require('log4js').getLogger()
var Q = require('q')
var request = require('request')
var low = require('lowdb')
var thingConfig = require('./constants.json')

const db = low('./constants.json')

function createPseudoUser() {

	var deferred = Q.defer()
	
	var options = {
		method: 'POST',
		url: thingConfig.site + '/api/apps/' + thingConfig.appID + '/users',
		headers: {
			'content-type': 'application/vnd.kii.RegistrationAndAuthorizationRequest+json',
			'authorization': 'Basic ' + new Buffer(thingConfig.appID + ":" + thingConfig.appKey).toString('base64')
		},
		body: JSON.stringify({'displayName': 'demothingowner'})
	}

	request(options, function(error, response, body) {
		if (error || response.statusCode >= 300) {
			logger.error('Creating a pseudo user failed! ', error, response.statusCode, body)
			deferred.reject()
		} else {
			logger.info('Creating a pseudo user success!')

			var ownerID = JSON.parse(body).userID
			var ownerToken = JSON.parse(body)._accessToken
			
			db.set('ownerID', ownerID).write()
			db.set('ownerToken', ownerToken).write()

			deferred.resolve()
		}
		logger.debug(body)

		logger.info('ownerID ' + ownerID + ' and ownerToken ' + ownerToken + ' are writen into ./constants.json')
	})

	return deferred.promise
}


createPseudoUser()

