
const path = require('path');
const catalogDAO = require('../dao/catalogDAO.js');

function getCatalog(request, callback) {
    var query = {};
    var response = {};
    
    if (request.keyword) {
        query.keyword = request.keyword;
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
    
    console.log("Service Layer...");
    console.log(query);
    
    // search catalog
    catalogDAO.getCatalog(query, function(error, result) {
        if(error){
            return callback(error, null);
        }else{
            catalogDAO.getFilters(query, function(error, filters) {
                if(error){
                    console.log("Error retrieving filters");
                    return callback(null, result);
                }else{
                    result.brands = filters.brands;
                    result.colors = filters.colors;
                    result.sizes = filters.sizes;
                    
                    console.log(filters);
                    console.log(result);
                    return callback(null, result);
                }
            });            
        }
    });
}

module.exports = { getCatalog };