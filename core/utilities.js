const path = require('path');

//official storyteller path separator (used internally for all relative file
//and directory paths) 
const storytellerPathSeparator = path.posix.sep;

/*
 * Creates a random number of digits in the range 0-9, a-z, and A-Z. The 
 * number of requested digits is passed in the parameter.
 */
function createRandomNumberBase62(numDigits) {
    //a random number with the passed in requested number of digits, numDigits (in base 62: 0-9,a-z,A-Z)
    let randomId = '';

    //the 62 digits that are available
    const validDigits = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    //for each requested digit
    for(let i = 0;i < numDigits;i++) {
        //pick a random number between 0-61
        const randPos = Math.floor(Math.random() * 62);

        //add a random digit to the result
        randomId += validDigits[randPos];
    }

    return randomId;
}
/*
 * Used to turn invisible characters into something visible
 */
function escapeSpecialCharacter(character) {
    let retVal = character;
    
    if(character === '\n') {
        retVal = 'NEWLINE';
    } else if (character === '\r') {
        retVal = 'CARRIAGE_RETURN';
    } else if (character === '\t') {
        retVal = 'TAB';
    }

    return retVal;
}
/*
 * Used to turn converted characters back into invisible characters
 */
function unescapeSpecialCharacter(character) {
    let retVal = character;
    
    if(character === 'NEWLINE') {
        retVal = '\n';
    } else if (character === 'CARRIAGE_RETURN') {
        retVal = '\r';
    } else if (character === 'TAB') {
        retVal = '\t';
    }

    return retVal;
}
/*
 * Takes a path to a directory and adds a system specific path separator if
 * it is not already present. Returns a path string with a separator at the
 * end.
 */
function addEndingPathSeparator(dirPath) { //private
    //if the dir path does not end with a slash (path separator)
    if(dirPath.length > 0 && dirPath[dirPath.length - 1] !== storytellerPathSeparator) {
        //add the ending slash so all paths look like /path/to/dir/
        dirPath += storytellerPathSeparator;
    } //else- no need to change the passed in path 

    return dirPath;
}
/*
 * This function takes a path to a file or dir converts it into a unix path. 
 * Unix paths are used in the database and in memory for files and directories 
 * regardless of what OS is being used.
 */
function normalizeSeparators(fileOrDirPath) { //private
    //if the path separator is NOT the storyteller separator: /
    if(path.sep !== storytellerPathSeparator) {
        //split the path on the non-unix separator (most likely \ for win)
        const segments = fileOrDirPath.split(path.sep);

        //rejoin all of the segments with the unix separator
        fileOrDirPath = segments.join(storytellerPathSeparator);
    }

    return fileOrDirPath;
}

module.exports = {
    addEndingPathSeparator,
    createRandomNumberBase62,
    escapeSpecialCharacter,
    normalizeSeparators,
    storytellerPathSeparator,
    unescapeSpecialCharacter
};