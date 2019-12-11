const path = require('path');
const express = require('express');
const router = express.Router();
const catalogService = require('../services/catalogService.js');

router.get('/products', function (req, res) {
    
    // validate input request : TODO
    
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
    
    console.log("Search Query...")
    console.log(searchRequest);
    
    // search catalog
    catalogService.getCatalog(searchRequest, function(error, results){
        if(error) {
            console.log(err);
            let resObj = {};
            let responseBody = [];

            resObj.code = 100;
            resObj.message = "Error while retrieving catalog";
            responseBody.push(resObj);
            res.status(500)
            res.send(responseBody).end();            
        } else {
            res.send(results);            
        }
    });
});

module.exports = router;
