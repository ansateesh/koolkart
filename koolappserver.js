
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

//App Attributes Env Values
var appContextPath = '/api/v1'
var appPort = 8080

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

// MySQL connections

/*
var pool  = mysql.createPool({
  connectionLimit : 5,
  host            : 'localhost',
  user            : 'root',
  password        : 'welcome',
  database        : 'sampledb'
});
*/

/*
var pool  = mysql.createPool({
  connectionLimit : 5,
  host            : 'mysql.gamification.svc.cluster.local',
  user            : 'xxuser',
  password        : 'welcome1',
  database        : 'sampledb'
});
*/

var pool  = mysql.createPool({
  connectionLimit : 5,
  host            : 'custom-mysql.gamification.svc.cluster.local',
  user            : 'xxuser1',
  password        : 'welcome1',
  database        : 'sampledb'
});

global.connectionPool = pool;

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

module.exports = app;
