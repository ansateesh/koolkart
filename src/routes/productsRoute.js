const path = require('path');
const express = require('express');
const router = express.Router();
const catalogService = require('../services/catalogService.js');

router.get('/products', function (req, res) {
    
    console.log("Route : get products");
    
    //form search request
    var searchRequest = {};
    if (req.query.q) {
        searchRequest.keyword = unescape(req.query.q);
    }
    if (req.query.categoryId) {
        searchRequest.categoryId = req.query.categoryId;
    }
    if (req.query.brand) {
        if (req.query.brand instanceof Array) {
            searchRequest.brands = req.query.brand;
        } else {
            var brandz = [];
            brandz.push(req.query.brand);
            searchRequest.brands = brandz;
        }
    } 
    if (req.query.size) {
        if (req.query.size instanceof Array) {
            searchRequest.sizes = req.query.size;
        } else {
            var sizes = [];
            sizes.push(req.query.size);
            searchRequest.sizes = sizes;
        }
    }
    if (req.query.color) {
        if (req.query.color instanceof Array) {
            searchRequest.colors = req.query.color;
        } else {
            var colors = [];
            colors.push(req.query.color);
            searchRequest.colors = colors;
        }
    }
    if (req.query.sortItem) {
        if (req.query.sortItem instanceof Array) {
            searchRequest.sortItem = req.query.sortItem[0];
        } else {
            searchRequest.sortItem = req.query.sortItem;
        }        
    }
    if (req.query.vs) {
        searchRequest.voiceSearch=req.query.vs
    }
    
    // search catalog
    catalogService.getCatalog(searchRequest, function(error, results){
        if(error) {
            console.log(error);
            let resObj = {};
            let responseBody = [];

            resObj.code = 100;
            resObj.message = "Error while retrieving catalog";
            responseBody.push(resObj);
            res.status(500)
            console.log("get catalog : Sending error response...")
            res.send(responseBody).end();            
        } else {
            console.log("get catalog : Sending response...")
            res.send(results);            
        }
    });
});

router.get('/categories', function (req, res) {
    
    console.log("Route : get catalog hierarchy");
    
    catalogService.getCatalogHierarchy()
        .then(data => {
            console.log("get categoreis : Sending response...")
            res.send(data);
        })
        .catch(e => {
            console.log(e);
            let resObj = {};
            let responseBody = [];

            resObj.code = 100;
            resObj.message = "Error while retrieving catalog hierarchy.";
            responseBody.push(resObj);
            res.status(500)
            res.send(responseBody).end();            
        });
});

router.get('/catalog/family/:id', function (req, res) {
    console.log("Route : get catalog for family " + req.params.id);
    var request = {};
    request.family = req.params.id;
    
    catalogService.getProducts(request)
        .then(data => res.send(data))
        .catch(e => {
            console.log(e);
            let resObj = {};
            let responseBody = [];

            resObj.code = 100;
            resObj.message = "Error while retrieving products for family";
            responseBody.push(resObj);
            res.status(500)
            res.send(responseBody).end();            
        });
});

router.get('/catalog/class/:id', function (req, res) {
    console.log("Route : get catalog for class " + req.params.id);
    var request = {};
    request.class = req.params.id; 
    
    catalogService.getProducts(request)
        .then(data => res.send(data))
        .catch(e => {
            console.log(e);
            let resObj = {};
            let responseBody = [];

            resObj.code = 100;
            resObj.message = "Error while retrieving products for class";
            responseBody.push(resObj);
            res.status(500)
            res.send(responseBody).end();            
        });
});

router.get('/catalog/commodity/:id', function (req, res) {
    console.log("Route : get catalog for commodity " + req.params.id);
    var request = {};
    request.commodity = req.params.id; 
    
    catalogService.getProducts(request)
        .then(data => res.send(data))
        .catch(e => {
            console.log(e);
            let resObj = {};
            let responseBody = [];

            resObj.code = 100;
            resObj.message = "Error while retrieving products for commodity";
            responseBody.push(resObj);
            res.status(500)
            res.send(responseBody).end();            
        });
});

module.exports = router;
