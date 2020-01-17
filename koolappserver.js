
//Commons
var http = require('http');
var express = require('express');
var expressValidator = require('express-validator');
var path = require('path');
var bodyParser = require('body-parser');
var engines = require('consolidate');
var cors = require('cors');
var compression = require('compression');
var addRequestId = require('express-request-id')();
var app = express();
var uuid = require('uuid-random');
var httpContext = require('express-http-context');
var mysql = require('mysql');
var redis = require('redis');
var constants = require(path.resolve(".") + '/src/constants/constants.js');
var cache = require(path.resolve(".") + '/src/utils/cache.js');

//App Attributes Env Values
var appContextPath = '/api/v1'
var appPort = 8080

let KEYWORDS = new Map();
let ALLWORDS = new Map();

var catalogService = require(path.resolve(".") + '/src/services/catalogService.js');

//Server Config
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));
app.engine('html', engines.nunjucks);
app.set('view engine', 'html');
app.use(bodyParser.json());
app.use(cors({ origin: '*' }));
app.use(compression());
app.use(addRequestId);
app.use(httpContext.middleware);
app.use(express.static(__dirname+'/public'));

/*
 * EXPRESS VALIDATOR - START
 */
app.use(expressValidator({
    customValidators: {
        valueInObject: function (value, options) {
            return Object.values(options).indexOf(value) > -1;
        },
        oneOfTwoArrayParams: function (value1, value2) {
            return (value1 != undefined && value1.length > 0) || (value2 != undefined && value2.length > 0);
        }
    }
}));

/*
// MySQL connections
var pool  = mysql.createPool({
  connectionLimit : 5,
  host            : 'localhost',
  user            : 'root',
  password        : 'welcome',
  database        : 'sampledb'
});
var redisConnectionConfig = {
    port : 6379,
    host : "192.168.134.138"
}
*/

//Redis config
var redisConnectionConfig = {
    port : 6379,
    host : "redis.ahold-delhaize-team.svc.cluster.local",
    password : "mjUCewcQyDc8LDcX"
}

var pool  = mysql.createPool({
  connectionLimit : 5,
  host            : 'custom-mysql.gamification.svc.cluster.local',
  user            : 'xxuser',
  password        : 'welcome1',
  database        : 'sampledb'
});

var client = redis.createClient(redisConnectionConfig);
global.REDIS_CLIENT = null;

client.on('connect', function() {
    global.REDIS_CLIENT = client;
    console.log('Redis client connected');
    // clear older keys
    var catalog_hierarchy_key = JSON.stringify(constants.CACHE.KEYS.PRODUCT_HIERARCHY);
    client.del(catalog_hierarchy_key, function (err, result){
        if(err) {
            console.log("Error clearing product hierarchy from cache");
        } else {
            console.log("Cleared product hierarchy from cache.");
            console.log("Redis Del for " + catalog_hierarchy_key + " : ", result);
        }
    })
});

client.on('error', function (err) {
    console.log('Redis client connection went wrong ' + err);
});

global.connectionPool = pool;
global.DICTIONARY = KEYWORDS;
global.ALLWORDS = ALLWORDS;

// handle all errors
app.use((err, req, res, next) => {
	console.log(err)
    return res.status(500).send({code : 100, description : "Unknown error"});
});

//Route declaration
var productsRoute = require(path.resolve(".") + '/src/routes/productsRoute.js');

//ROUTES MAPPING
app.use(appContextPath + '/', productsRoute);

var server = app.listen(appPort, function () {
    var port = server.address().port;
    console.log('Express server listening on port %s.', port);
});

process.on("uncaughtException", function (err) {
    console.log(err.message)
    console.log(err.stack)
});

process.on("exit", function (code) {
    console.log("Node Process exiting with code..." + code);
    if (client) {
        client.end(true);
    }
});

catalogService.buildDictionary();

module.exports = app;
