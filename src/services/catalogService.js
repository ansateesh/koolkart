const path = require('path');
const UTIL = require('util');
const catalogDAO = require('../dao/catalogDAO.js');
const utils = require('../utils/utils.js');
const cache = require('../utils/cache.js');
const constants = require('../constants/constants.js');

async function getCatalog(request, callback) {
    var query = {};
    var response = {};
    
    if (request.keyword) {
        query.keyword = request.keyword;
        
        if (!DICTIONARY || DICTIONARY.size < 1) {
            // dictionary doesn't exist in cache. Build it.
            console.log("Dictionary doesn't exist. Building it.")
            await buildDictionary();
        }
        
        // filter keyword search string against permissible dictionary words.
        console.log("Search Input - " + request.keyword);        
        query.voiceSearch = request.voiceSearch;
        query.keyword = await utils.applyFilter(query.keyword); 

        console.log("Service : Filtered Text Keword : " + query.keyword);
        
        if (query.keyword != null && query.keyword.length === 0) {
            response.items = [];
            response.brands = [];
            response.sizes = [];
            response.colors = [];
            
            return callback(null,response);
        }
    }
    if (request.brands && request.brands.length > 0){
        query.brands = request.brands;
    }
    if (request.sizes && request.sizes.length > 0){
        query.sizes = request.sizes;
    }
    if (request.colors && request.colors.length > 0){
        query.colors = request.colors;
    }    
    if (request.categoryId) {
        query.categoryId = request.categoryId;
    }
    if (request.sortItem) {
        query.sortItem = request.sortItem;
    }
    
    console.log("Service : Search Query :: " + JSON.stringify(query));
    
    catalogDAO.getCatalog(query, async function(error, result) {
        if(error){
            return callback(error, null);
        }else{
            catalogDAO.getFilters(query, async function(error, filters) {
                if(error){
                    console.log("Error retrieving filters " + DICTIONARY.size);
                    return callback(null, result);
                }else{
                    result.brands = filters.brands;
                    result.colors = filters.colors;
                    result.sizes = filters.sizes;
                    
                    return callback(null, result);
                }
            });            
        }
    });
}

function getCatalogHierarchy() {
    return getResults(constants.CACHE.KEYS.PRODUCT_HIERARCHY, catalogDAO.getCatalogHierarchy);
}

function getProducts(request) {
    return getResults(request, catalogDAO.getProducts, request);
}

function getResults(key, command, ...command_args) {
    var cache_key = (key instanceof String) ? key : JSON.stringify(key);
    return new Promise(function(resolve, reject){
        cache.get(cache_key, function(error, result){
            if(error || result === null) {
                console.log("Cache Miss : " + cache_key);
                command(...command_args)
                    .then(data => {
                        console.log(JSON.stringify(data));
                        cache.set(cache_key, JSON.stringify(data), function(err, res){
                            if(err) {
                                console.log("Failed to cache products data");
                                console.log(err);
                            } else {
                                console.log("cached products data");
                            }
                        })
                        resolve(data);
                    })
                    .catch(e => {console.log(e);reject({})});                
            } else {
                console.log("Cache Hit : " + cache_key);
                resolve(JSON.parse(result));
            }                
        });
    });
}

function buildDictionary() {
    return new Promise(function (resolve, reject) {
        catalogDAO.getSupportedKeywords(function(err, kwList){
            if (err) {
                console.log("Error building dictionary");
                console.log(err);
                reject(err);
            }else {
                if(kwList) {
                    console.log("Total Words in Dictionary - " + kwList.size);
                }
                resolve(kwList);
            }
        });        
    });
    console.log("Building Dictionary...");
}

module.exports = { getCatalog, buildDictionary, getCatalogHierarchy, getProducts };