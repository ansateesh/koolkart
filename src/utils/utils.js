var WordPOS = require('wordpos'),
wordpos = new WordPOS();
var STOP_WORDS = ["in", "and"];
var NEW_WORDS = ["women's", "men's", "women", "men", "womens", "mens"]
var pluralize = require('pluralize');
    
function flatten(input, delim){
    var result = "";
    if (!delim) {
        delim= ","
    }
    if(input instanceof Array && input.length > 0) {
        result = input.map(function(rec){return "'" + rec + "'"}).join(delim)
    }
    return result;
}

async function getNouns(input){
    var nouns = [];
    var wordpos = new WordPOS();
    await wordpos.getNouns(input, function(result){nouns = result;});  
    return nouns;  
}

async function getFormattedNouns(input) {
    var result = "";
    var nouns = await getNouns(input);
    if (nouns && nouns.length > 0) {
        result = nouns.map(function(rec){return "+" + rec}).join(" ");
    }
    return result;
}

async function getFormattedKeyword(input, mandatoryKey) {
    
    return new Promise(async function(resolve, reject){
        var output="";
        var sanitizedInput = input.replace(/\s\s+/g, ' ');
        var formattedInput = sanitizedInput.split(" ");
        await asyncForEach(formattedInput, async function(word) {
            word = getFormattedKey(word);
            word = getSingular(word);
            word = removeSpecialChars(word);
            output = output.concat("+").concat(word).concat("* ");
            //output = output.replace(/'/g, "\\'");
        });
        console.log("Util : formatted key word : " + output);
        resolve(output);
    });
}

function buildDictionary(text) {
    return new Promise(async function (resolve, reject) {
        var sanitizedInput = text.replace(/\s\s+/g, ' ');
        var formattedInput = sanitizedInput.split(" ");
        
        await asyncForEach(formattedInput, function(n){
            if(STOP_WORDS.includes(n) === false) {
                n = sanitizeKey(n);
                DICTIONARY.set(n.toLowerCase(), n.toLowerCase());
            }
        });

        await asyncForEach(NEW_WORDS, function(e){
            if(STOP_WORDS.includes(e) === false) {
                e = sanitizeKey(e);
                DICTIONARY.set(e.toLowerCase(), e.toLowerCase());
            }
        });         
        
        resolve(DICTIONARY);
    });
}

async function applyFilter(input) {
    return new Promise(async function (resolve, reject) {
        var filteredInput = ""
        var sanitizedInput = "";
        var dataArray = [];
        var outputArray = [];
        var pos = -1;
        if (input && input.length > 0) {
            sanitizedInput = input.replace(/\s\s+/g, ' ');
            dataArray = sanitizedInput.split(" ");
            dataArray.forEach(function(rec){
                rec = sanitizeKey(rec);
                if(DICTIONARY.has(rec.toLowerCase()) === true) {
                    outputArray.push(rec);
                }
            });
            
            filteredInput = outputArray.map(function(elem){return elem}).join(" ");
        }
        
        resolve(filteredInput);
    });
}

function printDictionary() {
    for (const k of DICTIONARY.keys()) {
        console.log(k);
    }
}

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

function sanitizeKey(key) {
    var result = key;
    result = getFormattedKey(result);
    result = removeSpecialChars(result);
    result = getSingular(result);
    
    return result;
}

function getFormattedKey(key) {
    var result = key;
    var pos = key.indexOf("-");
    if (pos > -1 && key.length > pos) {
        result = key.substring(pos + 1);
    }
    
    return result;
}

function getSingular(word) {
    var singularWord = word;
    if (pluralize.isPlural(word) ) {
        singularWord = word.replace(/s$/i,"");
    }
    return singularWord;
}

function removeSpecialChars(word) {
    return(word.replace(/'s$/, ""));
}

module.exports = {flatten, getFormattedNouns, getNouns, getFormattedKeyword, asyncForEach, buildDictionary, applyFilter, printDictionary};