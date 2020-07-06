const fs = require('fs');
const path = require('path');

//name of the hidden storyteller directory
const STORYTELLER_DIR = '.storyteller';

/*
 * This class holds data that will eventually be stored in a json file.
 * It has methods to read and write the data from the file into memory
 * and vice versa. 
 */
class FileBackedCollection {
    constructor(storytellerDirPath, dirName, fileName) {
        //store the path to the storyteller directory
        this.storytellerDirPath = storytellerDirPath;

        //store the path to the hidden .storyteller directory inside the project directory
        this.fullPathToHiddenStorytellerDir = path.join(storytellerDirPath, STORYTELLER_DIR);
        
        //store the path to the parent dir that holds the json file
        this.fullPathToParentDir = path.join(storytellerDirPath, STORYTELLER_DIR, dirName);
        
        //store the full path to the file
        this.fullPathToJSONFile = path.join(this.fullPathToParentDir, fileName);
    }

    /*
     * Uses the node fs module to determine whether the json file is present or not.
     */
    fileExists() {
        //returns whether the file exists already
        return fs.existsSync(this.fullPathToJSONFile);
    }

    /*
     * Writes a js object to the json file for this collection.
     */
    write(anObject) {
        //if the parent dir does not exist, create it
        if(fs.existsSync(this.fullPathToParentDir) === false) {
           fs.mkdirSync(this.fullPathToParentDir, {recursive: true});
        }

        //convert the object to a json string and write it to the file system
        fs.writeFileSync(this.fullPathToJSONFile, JSON.stringify(anObject));
    }

    /*
     * Reads data from a json object and converts it into a js object.
     */
    read() {
        //object version of the file contents
        let retVal = null;

        //if the file exist
        if(this.fileExists()) {
            //read the text from the file
            const fileText = fs.readFileSync(this.fullPathToJSONFile, 'utf8');
            
            //if there is some text in the file
            if(fileText.length > 0) {
                //read the file and turn the result into an object
                retVal = JSON.parse(fileText);
            } else { //file exists but it is empty 
                throw `There is no text in ${this.fullPathToJSONFile} to turn into an object`;
            }
        } else { //the file does not exist
            throw `The file ${this.fullPathToJSONFile} does not exist to be read`;
        }
        
        return retVal;
    }
}

module.exports = FileBackedCollection;