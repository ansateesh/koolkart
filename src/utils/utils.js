var WordPOS = require('wordpos'),
wordpos = new WordPOS();
    
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

async function getFormattedKeyword(input) {
    var output="";
    var sanitizedInput = input.replace(/\s\s+/g, ' ');
    var formattedInput = sanitizedInput.split(" ");
    console.log(sanitizedInput);
    console.log(formattedInput);
    await asyncForEach(formattedInput, async function(word){
        await wordpos.isNoun(word, function (result){
            if(result === true) {
                output = output.concat("+").concat(word).concat(" ");
            }else{
                output = output.concat(word).concat(" ");
            }
        });
    });
    console.log("Final");
    // wordpos doesn't treat women as noun. Ensuring women is a mandatory
    // word while doing full text search.
    if(output){
        output = output.replace(/women/ig, "+women");
        output = output.replace(/'/g, "\\'");
    }
    return output;
}

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

module.exports = {flatten, getFormattedNouns, getNouns, getFormattedKeyword};