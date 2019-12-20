const constants = require('../constants/constants.js');

function set(key, value, callback) {
    redisClient.set(key, value, function(error, result) {
        console.log("Cache : Storing for key - " + key);
        redisClient.expire(key, constants.CACHE_EXPIRY_IN_SEC);
        return callback(error, result);
    });
}

function get(key, callback) {
    redisClient.get(key, function(err, result){
        console.log("Cache : Got result for key - " + key );
        return callback(err, result);
    });
}

module.exports = {get, set};