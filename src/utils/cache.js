
function set(key, value, callback) {
    redisClient.set(JSON.stringify(key), value, function(error, result) {
        console.log("Cache : Storing for key - " + JSON.stringify(key));
        return callback(error, result);
    });
}

function get(key, callback) {
    redisClient.get(JSON.stringify(key), function(err, result){
        console.log("Cache : Got result for key - " + JSON.stringify(key) );
        return callback(err, result);
    });
}

module.exports = {get, set};