const path = require('path');
const utils = require('../utils/utils.js');
const shape = require("shape-json");

const MAX_CATEGORIES_PER_FAMILY = 60;

function getCatalog(query) {
    return new Promise(function (resolve, reject) {
        console.log("DAO : getCatalog : input : " + JSON.stringify(query));
        getCatalog_internal(query, async function(error, results) {
            if (error) {
                console.log("DAO : getCatalog : error retrieving catalog");
                reject(error);
            } else {
                var filters = await getFilters(query);
                if (filters && results) {
                    results.brands = filters.brands;
                    results.colors = filters.colors;
                    results.sizes = filters.sizes;
                }
                resolve(results);
            }
        });
    });
}

function getFilters(query) {
    return new Promise(function(resolve, reject){
        console.log("DAO : getFilters : input : " + JSON.stringify(query));
        getFilters_internal(query, function(error, results){
            if(error) {
                console.log("DAO : getFilters : error retrieving filters");
                reject(error);
            }else {
                resolve(results);
            }
        });
    });
}

async function getCatalog_internal(query, callback) {
    var formattedKeyword = "";
    
    // form search query
    var baseQuery = 'select a.ITEM_NUMBER, a.DESCRIPTION, a.LONG_DESCRIPTION, a.CATALOGUE_CATEGORY, a.SKU_UNIT_OF_MEASURE, a.SKU_ATTRIBUTE1, a.SKU_ATTRIBUTE_VALUE1, a.SKU_ATTRIBUTE2, a.SKU_ATTRIBUTE_VALUE2, a.SKU_ATTRIBUTE3, a.SKU_ATTRIBUTE_VALUE3, b.LIST_PRICE, b.DISCOUNT, b.IN_STOCK, c.BRAND AS BRAND from XXIBM_PRODUCT_SKU a, XXIBM_PRODUCT_PRICING b, XXIBM_PRODUCT_STYLE c where a.ITEM_NUMBER=b.ITEM_NUMBER and c.ITEM_NUMBER=FLOOR(a.ITEM_NUMBER/1000) * 1000';
    var searchQuery = baseQuery.concat("");
    
    if (query.keyword) {
        formattedKeyword = await utils.getFormattedKeyword(query.keyword, true);
        //console.log("DAO : formatted keyword - " + formattedKeyword);
        searchQuery = searchQuery.concat(" AND match(a.DESCRIPTION, a.LONG_DESCRIPTION, a.SKU_ATTRIBUTE_VALUE1, a.SKU_ATTRIBUTE_VALUE2) against(\"").concat(formattedKeyword).concat("\" IN BOOLEAN MODE)");
    }
    if(query.categoryId) {
        searchQuery = searchQuery.concat(" AND a.CATALOGUE_CATEGORY = ").concat(query.categoryId);
    }
    if (query.brands) {
        searchQuery = searchQuery.concat(" AND c.BRAND IN (").concat(utils.flatten(query.brands)).concat(")");
    }
    if (query.sizes) {
        searchQuery = searchQuery.concat(" AND a.SKU_ATTRIBUTE_VALUE1 IN (").concat(utils.flatten(query.sizes)).concat(")");
    }  
    if (query.colors) {
        searchQuery = searchQuery.concat(" AND a.SKU_ATTRIBUTE_VALUE2 IN (").concat(utils.flatten(query.colors)).concat(")");
    }
    
    // sort result
    if (query.sortItem) {
        var priceSortBy = " ORDER BY LIST_PRICE ASC";
        if (query.sortItem === "h2l") {
            priceSortBy = " ORDER BY LIST_PRICE DESC";
        }
        searchQuery = searchQuery.concat(priceSortBy);
    }else {
        searchQuery = searchQuery.concat(" ORDER BY BRAND ASC, LIST_PRICE ASC");
    }        

    connectionPool.getConnection(function(err, connection) {
        if(err) {
            // handle error
            return callback(err, null);
        }else {
            console.log("DAO : Catalog Search Query");
            console.log(searchQuery);
            
            if(query.keyword) {
                console.log("DAO : formatted keyword - " + formattedKeyword);                
            }
            
            var response = {
                items : []
            }
            var item = {};

            connection.query(searchQuery, function (error, results, fields) {
                
            if(error){
                console.log("Got error executing query");
                console.log(error);
            }
            
            if(results) {
                Object.keys(results).forEach(function(key) {
                    var row = results[key];
                    if (row) {
                        item.category = {};
                        item.sku = row.ITEM_NUMBER;
                        item.description = row.DESCRIPTION;
                        item.long_description = row.LONG_DESCRIPTION;
                        item.price = row.LIST_PRICE;
                        item.sell_price = item.price;
                        item.discount = row.DISCOUNT;
                        item.uom = row.SKU_UNIT_OF_MEASURE;
                        item.brand = row.BRAND;
                        item.size = row.SKU_ATTRIBUTE_VALUE1;
                        item.color = row.SKU_ATTRIBUTE_VALUE2;
                        item.in_stock = row.IN_STOCK;
                        item.category.id = row.CATALOGUE_CATEGORY;
                        
                        if (item.discount > 0) {
                            // compute sell price
                            item.discount = item.discount * 100;
                            item.sell_price = (item.price - (item.price * item.discount)/100);
                            //item.sell_price = item.sell_price.toFixed(2);
                            item.sell_price = Math.round(item.sell_price);
                            //item.price = item.price.toFixed(2);
                        }    
                        
                        response.items.push(item);
                        
                        item = {};
                    }

                });
            }
            response.total = response.items.length;
            
            // release connection
            connection.release();
            
            return callback(null, response);
          });
        }            
    });
}

async function getFilters_internal(query, callback) {
    var filterQuery = "";
    var formattedKeyword = "";
    var queryValues = [];
    
    if (query.keyword) {
        console.log("DAO : getFilters : Filter Keyword : " + query.keyword);
        var formattedKeyword = await utils.getFormattedKeyword(query.keyword);
        formattedKeyword = "'".concat(formattedKeyword).concat("'");
        formattedKeyword = formattedKeyword.concat(" in boolean mode");
        console.log("Filter = " + formattedKeyword);
        filterQuery = 'select ' + 
                        '(select group_concat(distinct SKU_ATTRIBUTE_VALUE1) as sizes from XXIBM_PRODUCT_SKU where match(DESCRIPTION, LONG_DESCRIPTION, SKU_ATTRIBUTE_VALUE1, SKU_ATTRIBUTE_VALUE2) '.concat('against(').concat(formattedKeyword).concat(')) as sizes,') + 
                        '(select group_concat(distinct SKU_ATTRIBUTE_VALUE2) as colors from XXIBM_PRODUCT_SKU where match(DESCRIPTION, LONG_DESCRIPTION, SKU_ATTRIBUTE_VALUE1, SKU_ATTRIBUTE_VALUE2) '.concat('against(').concat(formattedKeyword).concat(')) as colors,') + 
                        '(select group_concat(distinct b.BRAND) as brands from XXIBM_PRODUCT_SKU a, XXIBM_PRODUCT_STYLE b where b.ITEM_NUMBER=FLOOR(a.ITEM_NUMBER/1000) * 1000 and match(a.DESCRIPTION, a.LONG_DESCRIPTION, a.SKU_ATTRIBUTE_VALUE1, a.SKU_ATTRIBUTE_VALUE2) '.concat('against(').concat(formattedKeyword).concat(')) as brands');
        /*
        queryValues.push(formattedKeyword);
        queryValues.push(formattedKeyword);
        queryValues.push(formattedKeyword);
        */
    } else if (query.family) {
        filterQuery = 'select ' + 
                            '(select group_concat(distinct a.SKU_ATTRIBUTE_VALUE1) from XXIBM_PRODUCT_SKU a where a.CATALOGUE_CATEGORY IN (select COMMODITY FROM XXIBM_PRODUCT_CATALOGUE WHERE FAMILY=?) and a.SKU_ATTRIBUTE1 IS NOT NULL ) as sizes,' +
                            '(select group_concat(distinct a.SKU_ATTRIBUTE_VALUE2) from XXIBM_PRODUCT_SKU a where a.CATALOGUE_CATEGORY IN (select COMMODITY FROM XXIBM_PRODUCT_CATALOGUE WHERE FAMILY=?) AND a.SKU_ATTRIBUTE2 IS NOT NULL ) as colors,' +
                            '(select group_concat(distinct BRAND) from XXIBM_PRODUCT_STYLE a where a.CATALOGUE_CATEGORY IN (select COMMODITY FROM XXIBM_PRODUCT_CATALOGUE WHERE FAMILY=?) AND BRAND IS NOT NULL ) as brands';
        queryValues.push(query.family);
        queryValues.push(query.family);
        queryValues.push(query.family);                            
    } else if (query.class) {
        filterQuery = 'select ' + 
                            '(select group_concat(distinct a.SKU_ATTRIBUTE_VALUE1) from XXIBM_PRODUCT_SKU a where a.CATALOGUE_CATEGORY IN (select COMMODITY FROM XXIBM_PRODUCT_CATALOGUE WHERE CLASS=?) and a.SKU_ATTRIBUTE1 IS NOT NULL ) as sizes,' +
                            '(select group_concat(distinct a.SKU_ATTRIBUTE_VALUE2) from XXIBM_PRODUCT_SKU a where a.CATALOGUE_CATEGORY IN (select COMMODITY FROM XXIBM_PRODUCT_CATALOGUE WHERE CLASS=?) AND a.SKU_ATTRIBUTE2 IS NOT NULL ) as colors,' +
                            '(select group_concat(distinct BRAND) from XXIBM_PRODUCT_STYLE a where a.CATALOGUE_CATEGORY IN (select COMMODITY FROM XXIBM_PRODUCT_CATALOGUE WHERE CLASS=?) AND BRAND IS NOT NULL ) as brands';
        queryValues.push(query.class);
        queryValues.push(query.class);
        queryValues.push(query.class);                            
    } else if (query.commodity) {
        filterQuery = 'select ' + 
                            '(select group_concat(distinct a.SKU_ATTRIBUTE_VALUE1) from XXIBM_PRODUCT_SKU a where a.CATALOGUE_CATEGORY in (?) and a.SKU_ATTRIBUTE1 IS NOT NULL ) as sizes,' +
                            '(select group_concat(distinct a.SKU_ATTRIBUTE_VALUE2) from XXIBM_PRODUCT_SKU a where a.CATALOGUE_CATEGORY in (?) AND a.SKU_ATTRIBUTE2 IS NOT NULL ) as colors,' +
                            '(select group_concat(distinct BRAND) from XXIBM_PRODUCT_STYLE a where a.CATALOGUE_CATEGORY in (?) AND BRAND IS NOT NULL ) as brands';
        queryValues.push(query.commodity);
        queryValues.push(query.commodity);
        queryValues.push(query.commodity);                            
    } else {
        console.log("FILTERS : WHY DID I COME HERE?")
        filterQuery = 'select ' + '(select group_concat(distinct SKU_ATTRIBUTE_VALUE1) from XXIBM_PRODUCT_SKU where SKU_ATTRIBUTE_VALUE1 IS NOT NULL ) as sizes,' +
                                  '(select group_concat(distinct SKU_ATTRIBUTE_VALUE2) from XXIBM_PRODUCT_SKU where SKU_ATTRIBUTE_VALUE2 IS NOT NULL) as colors,' +
                                  '(select group_concat(distinct BRAND) from XXIBM_PRODUCT_STYLE where BRAND IS NOT NULL ) as brands';
    }
    
    // get all eligible filters.
    connectionPool.getConnection(function(err, connection) {
        if(err) {
            // handle error
            return callback(err, null);
        }else {
            var response = {
                sizes : [],
                colors : [],
                brands : []
            }
            console.log(filterQuery);
            connection.query(filterQuery, queryValues, function (error, results, fields) {
                
            if(error){
                console.log("Got error executing query");
                console.log(error);
            }

            if (results && results.length > 0) {
                if (results[0].sizes) {
                    response.sizes = results[0].sizes.split(",");
                }
                
                if (results[0].colors) {
                    response.colors = results[0].colors.split(",");
                }
                if (results[0].brands) {
                    response.brands = results[0].brands.split(",");
                }
            }
            
            // release connection
            connection.release();
            
            return callback(null, response);
          });
        }            
    });
}

async function getSupportedKeywords(callback) {
    var query = "select a.ITEM_NUMBER, a.DESCRIPTION, a.LONG_DESCRIPTION, a.SKU_ATTRIBUTE1, a.SKU_ATTRIBUTE_VALUE1, a.SKU_ATTRIBUTE_VALUE2, b.BRAND AS BRAND from XXIBM_PRODUCT_SKU a, XXIBM_PRODUCT_STYLE b where b.ITEM_NUMBER=FLOOR(a.ITEM_NUMBER/1000) * 1000 ORDER BY BRAND ASC";
    var items = [];
    connectionPool.getConnection(function(err, connection) {
        if(err) {
            // handle error
            return callback(err, null);
        }else {
            connection.query(query, async function (error, results, fields) {
                if(error) {
                    connection.release();
                    return callback(error, null);
                } else {
                    var item = {};
                    if (results && results.length > 0) {
                        var resultKeys = Object.keys(results);
                        await utils.asyncForEach(resultKeys, async function (key){
                            var row = results[key];
                            if (row) {
                                item.description = row.DESCRIPTION;
                                item.long_description = row.LONG_DESCRIPTION;
                                item.brand = row.BRAND;
                                item.size = row.SKU_ATTRIBUTE_VALUE1;
                                item.color = row.SKU_ATTRIBUTE_VALUE2;
                                items.push(item);
                                var row_all = "".concat(item.long_description).concat(" ").concat(item.description)
                                    .concat(" ").concat(item.brand).concat(" ").concat(item.size)
                                    .concat(" ").concat(item.color);
                                await utils.buildDictionary(row_all);
                                
                                if (item.brand){
                                    DICTIONARY.set(item.brand.toLowerCase(), item.brand.toLowerCase());
                                }
                                if (item.color){
                                    DICTIONARY.set(item.color.toLowerCase(), item.color.toLowerCase());
                                }
                                if (item.size){
                                    DICTIONARY.set(item.size.toLowerCase(), item.size.toLowerCase());
                                }
                                row_all = "";
                                item = {};
                            }
                        })
                    }
                    connection.release();
                    return callback(null, DICTIONARY);
                }
            });
        }
    });
}

function getCatalogHierarchy() {
    console.log("DAO : get product hierarchy...")
    var baseUrl = "/api/v1/catalog";
    var family2categoryMap = new Map();
    var results = [];
    var mandatoryCategories = [];
    var query = "select SEGMENT, SEGMENT_NAME, FAMILY, FAMILY_NAME, CLASS, CLASS_NAME, COMMODITY, COMMODITY_NAME from XXIBM_PRODUCT_CATALOGUE";
    var hierarchy = {};
    var hierarchy_schema = {
        "$group[segments](segment)": {
            "id": "segment",
            "name": "segment_name",
            "url": "segment_url",
            "$group[families](family)": {
                "id": "family",
                "name": "family_name",
                "short_name": "family_name_short",
                "url": "family_url",
                "$group[classes](class)": {
                    "id": "class",
                    "name": "class_name",
                    "short_name" : "class_name_short",
                    "url": "class_url",
                    "$group[commodities](commodity)": {
                        "id": "commodity",
                        "name": "commodity_name",
                        "short_name": "commodity_name_short",
                        "url": "commodity_url"
                    }
                }
            }
        }
    };
    
    return new Promise (function(resolve, reject) {
        connectionPool.getConnection(async function(err, connection) {
            if(err) {
                console.log(err);
                reject(err);
            } else {
                // get supported categories
                var mandatoryCategories = await getSupportedCategories();
                
                connection.query(query, async function(error, output, fields) {
                    if(error) {
                        console.log(error);
                        connection.release();
                        reject(error);
                    } else {
                        connection.release();
                        if(output) {
                            var resultKeys = Object.keys(output);
                            await utils.asyncForEach(resultKeys, function (key){    
                                var row = output[key];
                                var record = {};
                                if (row) {
                                    record.segment = row.SEGMENT;
                                    record.segment_name = row.SEGMENT_NAME;
                                    record.family = row.FAMILY;
                                    record.family_name = row.FAMILY_NAME;
                                    record.family_name_short = utils.getFormattedText(record.family_name, " ", 1);
                                    record.class = row.CLASS;
                                    record.class_name = row.CLASS_NAME;
                                    record.class_name_short = utils.getFormattedText(record.class_name, " ", 1);
                                    record.commodity = row.COMMODITY;
                                    record.commodity_name = row.COMMODITY_NAME;
                                    record.commodity_name_short = utils.getFormattedText(record.commodity_name, " ", 4);
                                    record.segment_url = baseUrl.concat("/segment/").concat(row.SEGMENT);
                                    record.family_url = baseUrl.concat("/family/").concat(row.FAMILY);
                                    record.class_url = baseUrl.concat("/class/").concat(row.CLASS);
                                    record.commodity_url = baseUrl.concat("/commodity/").concat(row.COMMODITY);
                                    results.push(record);
                                }
                            });
                            
                            var final_results = [];
                            var family2categoryMap = new Map();
                            
                            await utils.asyncForEach(results, function(rec){
                                if (!family2categoryMap.has(rec.family)) {
                                    family2categoryMap.set(rec.family, []);
                                }
                                family2categoryMap.get(rec.family).push(rec);
                            });
                            
                            var families = family2categoryMap.keys();
                            for(let family of families) {
                                var mandatoryCats = mandatoryCategories.get(family);
                                var recArr = family2categoryMap.get(family);
                                var reducedCategories = [];
                                var count = (recArr.length < MAX_CATEGORIES_PER_FAMILY) ? recArr.length : MAX_CATEGORIES_PER_FAMILY; 
                                
                                reducedCategories = recArr.slice(0, count);
                                if (mandatoryCats) {
                                    mandatoryCats.forEach(function(mc){
                                        if (reducedCategories.filter(rec => rec.commodity === mc.commodity).length === 0) {
                                            reducedCategories.push(mc);
                                        }
                                    });
                                }
                                final_results = final_results.concat(reducedCategories);
                            };
                            
                            hierarchy = shape.parse(final_results, hierarchy_schema); 
                            resolve(hierarchy);
                        } else {
                            resolve(hierarchy);
                        }
                    }
                });
            }
        });
    });
}

function getSupportedCategories() {
    var baseUrl = "/api/v1/catalog";
    var results = [];
    var getSupportedCategories = "select SEGMENT, SEGMENT_NAME, FAMILY, FAMILY_NAME, CLASS, CLASS_NAME, COMMODITY, COMMODITY_NAME from XXIBM_PRODUCT_CATALOGUE where COMMODITY IN (select distinct CATALOGUE_CATEGORY from XXIBM_PRODUCT_SKU order by CATALOGUE_CATEGORY)";
    
    return new Promise (function(resolve, reject) {
        connectionPool.getConnection(function(err, connection) {
            if(err) {
                reject(err);
            } else {
                connection.query(getSupportedCategories, [], async function(error, output, fields) {
                    if(error) {
                        connection.release();
                        reject(error);
                    } else {
                        connection.release();
                        if(output) {
                            var resultKeys = Object.keys(output);
                            await utils.asyncForEach(resultKeys, function (key){ 
                                var record = {};                            
                                var row = output[key];
                                if (row) {
                                    record.segment = row.SEGMENT;
                                    record.segment_name = row.SEGMENT_NAME;
                                    record.family = row.FAMILY;
                                    record.family_name = row.FAMILY_NAME;
                                    record.family_name_short = utils.getFormattedText(record.family_name, " ", 1);
                                    record.class = row.CLASS;
                                    record.class_name = row.CLASS_NAME;
                                    record.class_name_short = utils.getFormattedText(record.class_name, " ", 1);
                                    record.commodity = row.COMMODITY;
                                    record.commodity_name = row.COMMODITY_NAME;
                                    record.commodity_name_short = utils.getFormattedText(record.commodity_name, " ", 4);
                                    record.segment_url = baseUrl.concat("/segment/").concat(row.SEGMENT);
                                    record.family_url = baseUrl.concat("/family/").concat(row.FAMILY);
                                    record.class_url = baseUrl.concat("/class/").concat(row.CLASS);
                                    record.commodity_url = baseUrl.concat("/commodity/").concat(row.COMMODITY);
                                    results.push(record);
                                }
                            });
                            
                            var family2categoryMap = new Map();
                            await utils.asyncForEach(results, function(rec){
                                if (!family2categoryMap.has(rec.family)) {
                                    family2categoryMap.set(rec.family, []);
                                }
                                family2categoryMap.get(rec.family).push(rec);
                            });
                            resolve(family2categoryMap);
                        }
                    }
                });
            }
        });
    });
}


function getProducts(query) {
    var family = query.family;
    var clazz = query.class;
    var commodity = query.commodity;
    
    var getProductsQuery = "";
    var queryParams = [];
    
    if (family) {
        queryParams.push(family);
        getProductsQuery = "select a.ITEM_NUMBER, a.DESCRIPTION, a.LONG_DESCRIPTION, a.CATALOGUE_CATEGORY, a.SKU_UNIT_OF_MEASURE, a.SKU_ATTRIBUTE1, a.SKU_ATTRIBUTE_VALUE1, a.SKU_ATTRIBUTE2, a.SKU_ATTRIBUTE_VALUE2, a.SKU_ATTRIBUTE3, a.SKU_ATTRIBUTE_VALUE3, b.LIST_PRICE, b.DISCOUNT, b.IN_STOCK, c.BRAND AS BRAND from XXIBM_PRODUCT_SKU a, XXIBM_PRODUCT_PRICING b, XXIBM_PRODUCT_STYLE c where a.ITEM_NUMBER=b.ITEM_NUMBER and c.ITEM_NUMBER=FLOOR(a.ITEM_NUMBER/1000) * 1000 and a.CATALOGUE_CATEGORY IN (select COMMODITY FROM XXIBM_PRODUCT_CATALOGUE WHERE FAMILY=?) ORDER BY a.ITEM_NUMBER, c.BRAND;"
    }
    if (clazz) {
        queryParams.push(clazz);
        getProductsQuery = "select a.ITEM_NUMBER, a.DESCRIPTION, a.LONG_DESCRIPTION, a.CATALOGUE_CATEGORY, a.SKU_UNIT_OF_MEASURE, a.SKU_ATTRIBUTE1, a.SKU_ATTRIBUTE_VALUE1, a.SKU_ATTRIBUTE2, a.SKU_ATTRIBUTE_VALUE2, a.SKU_ATTRIBUTE3, a.SKU_ATTRIBUTE_VALUE3, b.LIST_PRICE, b.DISCOUNT, b.IN_STOCK, c.BRAND AS BRAND from XXIBM_PRODUCT_SKU a, XXIBM_PRODUCT_PRICING b, XXIBM_PRODUCT_STYLE c where a.ITEM_NUMBER=b.ITEM_NUMBER and c.ITEM_NUMBER=FLOOR(a.ITEM_NUMBER/1000) * 1000 and a.CATALOGUE_CATEGORY IN (select COMMODITY FROM XXIBM_PRODUCT_CATALOGUE WHERE CLASS=?) ORDER BY a.ITEM_NUMBER, c.BRAND;"
    } 
    if (commodity) {
        queryParams.push(commodity);
        getProductsQuery = "select a.ITEM_NUMBER, a.DESCRIPTION, a.LONG_DESCRIPTION, a.CATALOGUE_CATEGORY, a.SKU_UNIT_OF_MEASURE, a.SKU_ATTRIBUTE1, a.SKU_ATTRIBUTE_VALUE1, a.SKU_ATTRIBUTE2, a.SKU_ATTRIBUTE_VALUE2, a.SKU_ATTRIBUTE3, a.SKU_ATTRIBUTE_VALUE3, b.LIST_PRICE, b.DISCOUNT, b.IN_STOCK, c.BRAND AS BRAND from XXIBM_PRODUCT_SKU a, XXIBM_PRODUCT_PRICING b, XXIBM_PRODUCT_STYLE c where a.ITEM_NUMBER=b.ITEM_NUMBER and c.ITEM_NUMBER=FLOOR(a.ITEM_NUMBER/1000) * 1000 and a.CATALOGUE_CATEGORY=? ORDER BY a.ITEM_NUMBER, c.BRAND;"
    } 
    
    return new Promise (function(resolve, reject) {
        connectionPool.getConnection(function(err, connection) {
            if(err) {
                console.log(err);
                reject(err);
            } else {
                var response = {
                    items : []
                }
                connection.query(getProductsQuery, queryParams, async function(error, output, fields) {
                    if(error) {
                        console.log(error);
                        connection.release();
                        reject(error);
                    } else {
                        connection.release();
                        if(output) {
                            var resultKeys = Object.keys(output);
                            await utils.asyncForEach(resultKeys, function (key){    
                                var row = output[key];
                                var record = {};
                                var item = {};
                                if (row) {
                                    item.category = {};
                                    item.sku = row.ITEM_NUMBER;
                                    item.description = row.DESCRIPTION;
                                    item.long_description = row.LONG_DESCRIPTION;
                                    item.price = row.LIST_PRICE;
                                    item.sell_price = item.price;
                                    item.discount = row.DISCOUNT;
                                    item.uom = row.SKU_UNIT_OF_MEASURE;
                                    item.brand = row.BRAND;
                                    item.size = row.SKU_ATTRIBUTE_VALUE1;
                                    item.color = row.SKU_ATTRIBUTE_VALUE2;
                                    item.in_stock = row.IN_STOCK;
                                    item.category.id = row.CATALOGUE_CATEGORY;
                                    
                                    if (item.discount > 0) {
                                        // compute sell price
                                        item.discount = item.discount * 100;
                                        item.sell_price = (item.price - (item.price * item.discount)/100);
                                        item.sell_price = Math.round(item.sell_price);
                                    }    
                                    response.items.push(item);
                                    item = {};
                                }
                            });
                            // retrieve applicable filters
                            getFilters(query, function(err, filters){
                                if(err) {
                                    console.log("Error retrieving filters.")
                                } else {
                                    response.brands = filters.brands;
                                    response.colors = filters.colors;
                                    response.sizes = filters.sizes;
                                }
                                resolve(response);
                            });
                        } else {
                            resolve(response);
                        }
                    }
                });
            }
        });
    });    
}

module.exports = { getCatalog, getFilters, getSupportedKeywords, getCatalogHierarchy, getProducts };