var WordPOS = require('wordpos'),
wordpos = new WordPOS();
var STOP_WORDS = ["in", "and"];
var NEW_WORDS = ["women's", "men's", "women", "men", "womens", "mens"]
    
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
            output = output.concat("+").concat(word).concat("* ");
            //output = output.replace(/'/g, "\\'");
        });
        resolve(output);
    });
}

function buildDictionary(text) {
    return new Promise(async function (resolve, reject) {
        var sanitizedInput = text.replace(/\s\s+/g, ' ');
        var formattedInput = sanitizedInput.split(" ");
        
        await asyncForEach(formattedInput, function(n){
            if(STOP_WORDS.includes(n) === false) {
                DICTIONARY.set(n.toLowerCase(), n.toLowerCase());
            }
        });

        await asyncForEach(NEW_WORDS, function(e){
            if(STOP_WORDS.includes(e) === false) {
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
        if (input && input.length > 0) {
            sanitizedInput = input.replace(/\s\s+/g, ' ');
            dataArray = sanitizedInput.split(" ");
            dataArray.forEach(function(rec){
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

module.exports = {flatten, getFormattedNouns, getNouns, getFormattedKeyword, asyncForEach, buildDictionary, applyFilter, printDictionary};