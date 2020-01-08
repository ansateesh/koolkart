const path = require('path');
const UTIL = require('util');
const catalogDAO = require('../dao/catalogDAO.js');
const utils = require('../utils/utils.js');
const cache = require('../utils/cache.js');
const constants = require('../constants/constants.js');

async function getCatalog(request) {
    console.log("Service : getCatalog : search request : " + JSON.stringify(request));
    
    var query = {};
    var response = {};
    
    if (request.keyword) {
        query.keyword = request.keyword;
        query.langCode = request.langCode;
        if (constants.SUPPORTED_LANGUAGES.includes(query.langCode)) {
            query.keyword = await utils.translateAll(query.keyword, query.langCode);
            console.log("Translated keyword : " + query.keyword);
        }
        
        if (!DICTIONARY || DICTIONARY.size < 1) {
            // dictionary doesn't exist in cache. Build it.
            console.log("Dictionary doesn't exist. Building it.")
            await buildDictionary();
        }
        
        // filter keyword search string against permissible dictionary words.
        query.voiceSearch = request.voiceSearch;
        query.keyword = await utils.applyFilter(query.keyword); 

        if (query.keyword != null && query.keyword.length === 0) {
            response.items = [];
            response.brands = [];
            response.sizes = [];
            response.colors = [];
            
            return new Promise(function(resolve, reject){
                resolve(response)
            });
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
    
    console.log("Service : getCatalog : Search Query :: " + JSON.stringify(query));
    query.cache_key = constants.CACHE.KEYS.PRODUCT_PREFIX;
    
    return getData(query, catalogDAO.getCatalog, query);
}

function getCatalogHierarchy() {
    return getData(constants.CACHE.KEYS.PRODUCT_HIERARCHY, catalogDAO.getCatalogHierarchy);
}

function getProducts(request) {
    return getData(request, catalogDAO.getProducts, request);
}

function getData(key, command, ...command_args) {
    var cache_key = (key instanceof String) ? key : JSON.stringify(key);
    return new Promise(async function(resolve, reject){
        await cache.get(cache_key)
            .then(async (data) => {
                if (data === null) {
                    console.log("Cache Miss : " + cache_key);
                    command(...command_args)
                        .then(async(result) => {
                            console.log("Cache : Storing data for key : " + cache_key);
                            await cache.set(cache_key, JSON.stringify(result));
                            resolve(result);
                        })
                        .catch(e => reject(e));
                } else {
                    console.log("Cache Hit : " + cache_key);
                    resolve(JSON.parse(data));
                }
            })
            .catch(e => {
                console.log("Error while getting from cache for key : " + cache_key);
                console.log(e);                
                command(...command_args)
                    .then(result => resolve(result))
                    .catch(e => reject(e));
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