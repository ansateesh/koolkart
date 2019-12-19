const path = require('path');
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
        
        if (request.voiceSearch) {
            console.log("Voice Search Input - " + request.keyword);
            // filter keyword search string against permissible dictionary words.            
            query.voiceSearch = request.voiceSearch;
            if (query.voiceSearch === "true"){
                query.keyword = await utils.applyFilter(query.keyword);
            }
        } else {
            console.log("Text Search Input - " + request.keyword);
            query.keyword = await utils.applyFilter(query.keyword);
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
                    
                    //console.log(filters);
                    //console.log(result);
                    
                    return callback(null, result);
                }
            });            
        }
    });
}

function getCatalogHierarchy() {
    console.log("Service : get product hierarchy");
    return new Promise(function(resolve, reject){
        cache.get(constants.CACHE.KEYS.PRODUCT_HIERARCHY, function(error, result){
            if(error || result === null) {
                console.log("Cache Miss : Catalog hierarchy");
                catalogDAO.getCatalogHierarchy()
                    .then(data => {
                            console.log("Service : got product hierarchy");
                            // cache it!
                            cache.set(constants.CACHE.KEYS.PRODUCT_HIERARCHY, data, function(err, res){
                                if(err) {
                                    console.log("Failed to cache catalog hierarchy");
                                    console.lor(err);
                                } else {
                                    console.log("Cached catalog hierarchy!")
                                }
                            })
                            resolve(data);
                    })
                    .catch(e => {console.log(e);reject({})});
            } else {
                console.log("Cache Hit : Catalog hierarchy");
                resolve(result);
            }
        })
    });
}

function getProducts(request) {
    return new Promise(function(resolve, reject){
        catalogDAO.getProducts(request)
            .then(data => resolve(data))
            .catch(e => {console.log(e);reject({})});
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