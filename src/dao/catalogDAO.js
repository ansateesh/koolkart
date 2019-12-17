const path = require('path');
const utils = require('../utils/utils.js');

async function getCatalog(query, callback) {
    var formattedKeyword = "";
    
    console.log("DAO : Catalog Query");
    console.log(query);
    
    // form search query
    var baseQuery = 'select a.ITEM_NUMBER, a.DESCRIPTION, a.LONG_DESCRIPTION, a.CATALOGUE_CATEGORY, a.SKU_UNIT_OF_MEASURE, a.SKU_ATTRIBUTE1, a.SKU_ATTRIBUTE_VALUE1, a.SKU_ATTRIBUTE2, a.SKU_ATTRIBUTE_VALUE2, a.SKU_ATTRIBUTE3, a.SKU_ATTRIBUTE_VALUE3, b.LIST_PRICE, b.DISCOUNT, b.IN_STOCK, c.BRAND AS BRAND from XXIBM_PRODUCT_SKU a, XXIBM_PRODUCT_PRICING b, XXIBM_PRODUCT_STYLE c where a.ITEM_NUMBER=b.ITEM_NUMBER and c.ITEM_NUMBER=FLOOR(a.ITEM_NUMBER/1000) * 1000';
    var searchQuery = baseQuery.concat("");
    
    if (query.keyword) {
        formattedKeyword = await utils.getFormattedKeyword(query.keyword, true);
        console.log("DAO : formatted keyword - " + formattedKeyword);
        searchQuery = searchQuery.concat(" AND match(a.DESCRIPTION, a.LONG_DESCRIPTION, a.SKU_ATTRIBUTE_VALUE1, a.SKU_ATTRIBUTE_VALUE2) against('").concat(formattedKeyword).concat("' IN BOOLEAN MODE)");
    }
    if(query.categoryId) {
        searchQuery = searchQuery.concat(" AND a.CATALOGUE_CATEGORY = ").concat(query.categoryId);
    }
    if (query.brands) {DAO : Input
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
            console.log("DAO : Catalog Search Query final");
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
            //console.log("Query results...");
            
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

async function getFilters(query, callback) {
    var filterQuery = "";
    var formattedKeyword = "";
    var queryValues = [];
    
    if (query.keyword) {
        var formattedKeyword = await utils.getFormattedKeyword(query.keyword);
        formattedKeyword = "'".concat(formattedKeyword).concat("'");
        console.log(formattedKeyword);
        filterQuery = 'select ' + 
                        '(select group_concat(distinct SKU_ATTRIBUTE_VALUE1) as sizes from XXIBM_PRODUCT_SKU where match(DESCRIPTION, LONG_DESCRIPTION, SKU_ATTRIBUTE_VALUE1, SKU_ATTRIBUTE_VALUE2) against (?)) as sizes,' +
                        '(select group_concat(distinct SKU_ATTRIBUTE_VALUE2) as colors from XXIBM_PRODUCT_SKU where match(DESCRIPTION, LONG_DESCRIPTION, SKU_ATTRIBUTE_VALUE1, SKU_ATTRIBUTE_VALUE2) against (?)) as colors,' +
                        '(select group_concat(distinct b.BRAND) as brands from XXIBM_PRODUCT_SKU a, XXIBM_PRODUCT_STYLE b where b.ITEM_NUMBER=FLOOR(a.ITEM_NUMBER/1000) * 1000 and match(a.DESCRIPTION, a.LONG_DESCRIPTION, a.SKU_ATTRIBUTE_VALUE1, a.SKU_ATTRIBUTE_VALUE2) against (?)) as brands';
        queryValues.push(formattedKeyword);
        queryValues.push(formattedKeyword);
        queryValues.push(formattedKeyword);
    } else if(query.categoryId) {
        filterQuery = 'select ' + '(select group_concat(distinct SKU_ATTRIBUTE_VALUE1) from XXIBM_PRODUCT_SKU where CATALOGUE_CATEGORY in (?) and SKU_ATTRIBUTE_VALUE1 IS NOT NULL ) as sizes,' +
                                  '(select group_concat(distinct SKU_ATTRIBUTE_VALUE2) from XXIBM_PRODUCT_SKU where CATALOGUE_CATEGORY in (?) and SKU_ATTRIBUTE_VALUE2 IS NOT NULL) as colors,' +
                                  '(select group_concat(distinct BRAND) from XXIBM_PRODUCT_STYLE where CATALOGUE_CATEGORY in (?) and BRAND IS NOT NULL) as brands';
        queryValues.push(query.categoryId);
        queryValues.push(query.categoryId);
        queryValues.push(query.categoryId);
    } else {
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
            console.log("Query results...");
            //console.log(results);
            
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
                                //console.log("DAO : ROW_ALL :: " + row_all);  
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
                    return callback(null, DICTIONARY);
                }
            });
        }
    });
}

async function getProductHierarchy(callback) {
    var response = {};
    
    var getAllSegmentsQuery = "select SEGMENT, SEGMENT_NAME from XXIBM_PRODUCT_CATALOGUE order by SEGMENT";
    var getAllFamiliesQuery = "select FAMILY, FAMILY_NAME from XXIBM_PRODUCT_CATALOGUE where SEGMENT = (?) order by FAMILY";
    var getAllClassesQuery = "select CLASS, CLASS_NAME from XXIBM_PRODUCT_CATALOGUE where FAMILY = (?) order by CLASS";
    var getAllCommoditiesQuery = "select COMMODITY, COMMODITY_NAME from XXIBM_PRODUCT_CATALOGUE where CLASS = (?) order by COMMODITY";
    /*
    connectionPool.getConnection(function(err, connection) {
        if(err){
        } else {
            connection.query(getAllSegmentQuery, function(e, segments, fields){
                if(e) {
                } else {
                    if(segments && segments.length > 0) {
                        Object.keys(segments).forEach(function(sid) {
                            var row = segments[sid];
                            var params = [];
                            if (row) {
                                params.push (sid)
                                connection.query(getAllFamiliesQuery, params, function(e,  ){
                                    
                                });
                            }
                        }
                    }
                }
            });
        }
        
    });
    */
}

module.exports = { getCatalog, getFilters, getSupportedKeywords, getProductHierarchy };