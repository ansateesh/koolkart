const constants = require('../constants/constants.js');

function set(key, value) {
    return new Promise(function(resolve, reject){
        if (!REDIS_CLIENT) {
            reject(null);
        } else {
            REDIS_CLIENT.set(key, value, function(error, result) {
                if (error) {
                    reject(error)
                } else {
                    REDIS_CLIENT.expire(key, constants.CACHE_TTL_SEC);
                    resolve(result);
                }
            });
        }
    });
}

function get(key) {
    return new Promise(function(resolve, reject){
        if (REDIS_CLIENT) {
            REDIS_CLIENT.get(key, function(err, result){
                if(err) {
                    reject(err);
                } else{
                    resolve(result);
                }
            });
        } else {
            reject(null);
        }
    });
}

module.exports = {get, set};