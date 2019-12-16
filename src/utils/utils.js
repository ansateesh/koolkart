var WordPOS = require('wordpos'),
wordpos = new WordPOS();
var STOP_WORDS = ['in'];
var NEW_WORDS = ['women\'s', 'men\'s', 'women', 'men']
    
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
        await asyncForEach(formattedInput, async function(word){
            await wordpos.isNoun(word, function (result){
                if(result === true && STOP_WORDS.indexOf(word) < 0 ) {
                    output = output.concat("+").concat(word).concat(" ");
                }else{
                    output = output.concat(word).concat(" ");
                }
            });
        });
        
        // wordpos doesn't treat women as noun. Ensuring women is a mandatory
        // word while doing full text search.
        if(output){
            output = output.replace(/women/ig, "+women");
            output = output.replace(/womens/ig, "+women");
            output = output.replace(/'/g, "\\'");
        }
        
        resolve(output);
        
    });
}

function buildDictionary(text){
    return new Promise(async function (resolve, reject) {
        var sanitizedInput = text.replace(/\s\s+/g, ' ');
        var formattedInput = sanitizedInput.split(" ");
        var allNouns = await getNouns(sanitizedInput);
        if (allNouns && allNouns.length > 0){
            await asyncForEach(allNouns, function(n){
                DICTIONARY.set(n.toLowerCase(), n.toLowerCase());
            });
            NEW_WORDS.forEach(function(w) {
                DICTIONARY.set(w.toLowerCase(), w.toLowerCase());
            });
            resolve(DICTIONARY);
        } else {
            resolve(DICTIONARY);            
        }
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