var apiKey = 'AIzaSyBH9cpi0WJJSjHfyq2zr_PDSs0gKdXi8jU';
var options = {
  concurrentLimit: 20
};
var googleTranslate = require('google-translate')(apiKey, null);
var WordPOS = require('wordpos'),
wordpos = new WordPOS();
var STOP_WORDS = ["in", "and"];
var NEW_WORDS = [];
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

function translateAll(sentence, langCode) {
    
    return new Promise(async function(resolve, reject){
        var words = sentence.split(" ");
        var translatedWords = [];
        var transatedWord = "";
        var result;
        
        await asyncForEach(words, async function(word) {
            translatedWord = await translate(word);
            if(translatedWord !== null || translatedWord.length > 0) {
                translatedWords.push(translatedWord);
            }
        });
        
        result = translatedWords.map(function(rec){return rec}).join(" ");
        
        resolve(result);
    });
}

function translate(text, langCode) {
    return new Promise(function(resolve, reject){
        var translatedText = "";
        googleTranslate.translate(text, langCode, "en", function(err, translation){
            if(!err){
                translatedText = translation.translatedText;
                resolve(translatedText);
            } else {
                resolve(translatedText);
            }
        });
    });
    
    return translatedText;
}

function getFormattedText(text, separator, len) {
    var output = "";
    var input = text;
    var tokens = text.split(separator);
    if ( tokens.length >= len ) {
        for(i=0; i<len; i++) {
            output = output + separator + tokens[i]
        }
    } else {
        output = input;
    }
    return output.trim();
}

module.exports = {flatten, getFormattedNouns, getNouns, getFormattedKeyword, asyncForEach, buildDictionary, applyFilter, printDictionary, translate, translateAll, getFormattedText};