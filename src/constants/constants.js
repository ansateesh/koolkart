const CACHE = {
    KEYS : {
        PRODUCT_HIERARCHY : {key : "catalog_hierarchy"}, 
        PRODUCT_PREFIX : "getProducts"
    }
}

const SUPPORTED_LANGUAGES = ['hi', 'kn', 'bn', 'ml', 'mr', 'ta', 'te'];

const CACHE_TTL_SEC = 3600; // 1 hour

module.exports = {CACHE, CACHE_TTL_SEC, SUPPORTED_LANGUAGES};