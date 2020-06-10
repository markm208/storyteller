'use strict';

const fs = require('fs');
const path = require('path');
const utilities = require('../utilities.js');

/*
 * This class is responsible for handling files and directories that should 
 * be ignored by storyteller. The user can (optionally) include a 
 * specification of files and directories to be ignored in a /st-ignore.json 
 * file in the storyteller project directory. 
 */
class IgnorePath {
    constructor(fullPathOfWorkspace) {
        //full path to the file that holds the st-ignore.json data if it is present
        const fullPathToStorytellerIgnoreFile = path.join(fullPathOfWorkspace, 'st-ignore.json');
        
        //check to see if the st-ignore.json file exists
        if(fs.existsSync(fullPathToStorytellerIgnoreFile)) {
            //read the file and parse the data inside it into JSON
            this.stIgnoreData = JSON.parse(fs.readFileSync(fullPathToStorytellerIgnoreFile, 'utf8'));
        } else { //no file
            //create an empty object
            this.stIgnoreData = {};
        }

        //handle the case of missing properties in the json file
        if(!this.stIgnoreData.ignoredFileExtensions) {
            this.stIgnoreData.ignoredFileExtensions = [];
        }

        if(!this.stIgnoreData.ignoredFiles) {
            this.stIgnoreData.ignoredFiles = [];
        }

        if(!this.stIgnoreData.ignoredDirectories) {
            this.stIgnoreData.ignoredDirectories = [];
        }

        if(!this.stIgnoreData.ignoreAllWithExceptions) {
            this.stIgnoreData.ignoreAllWithExceptions = false;
        }

        if(!this.stIgnoreData.ignoreExceptions) {
            this.stIgnoreData.ignoreExceptions = [];
        }

        //make sure that the directory paths are normalized
        this.stIgnoreData.ignoredDirectories = this.stIgnoreData.ignoredDirectories.map(dirPath => {
            return utilities.addEndingPathSeparator(utilities.normalizeSeparators(dirPath));
        });

        //make sure that the exception file paths are normalized
        this.stIgnoreData.ignoreExceptions = this.stIgnoreData.ignoreExceptions.map(filePath => {
            return utilities.normalizeSeparators(filePath);
        });
    }
    /*
     * A relative path to a file or directory in the storyteller project is 
     * passed in and this method makes a determination whether the user 
     * wants it to be ignored or not.
     */
    ignoreThisFileOrDir(pathToFileOrDir) {
        //assume that the file or dir should NOT be ignored
        let retVal = false;

        //don't track anything in the /.storyteller/ directory
        if(pathToFileOrDir.startsWith(`${utilities.storytellerPathSeparator}.storyteller${utilities.storytellerPathSeparator}`)) { 
            retVal = true;
        } else { //not in .storyteller
            //if an exception should NOT be granted check whether to exclude it
            if(this.grantException(pathToFileOrDir) === false) { 
                //if ignoring everything with some exceptions
                if(this.stIgnoreData.ignoreAllWithExceptions) { 
                    retVal = true;
                } else if(pathToFileOrDir === `${utilities.storytellerPathSeparator}st-ignore.json`) {
                    //ignore changes to /st-ignore.json 
                    retVal = true;
                } else { //check file extensions, filenames, and directories
                    //pick apart the file/dir path
                    const fileInfo = path.parse(pathToFileOrDir);

                    //check to see if the file extension is on the ignore list
                    if(this.stIgnoreData.ignoredFileExtensions.includes(fileInfo.ext)) {
                        retVal = true;
                    } else if(this.stIgnoreData.ignoredFiles.includes(fileInfo.base)) { //check the file name
                        retVal = true;
                    } else { //check the directory 
                        //go through the ignored directories
                        for(let i = 0;i < this.stIgnoreData.ignoredDirectories.length;i++) {
                            //if the path starts with any of the ignored directories it should be ignored
                            if(pathToFileOrDir.startsWith(this.stIgnoreData.ignoredDirectories[i])) {
                                retVal = true;
                                break;
                            }
                        }
                    }
                }
            } //else- an exception was granted, default retVal of false will be returned
        }
        return retVal;
    }
    /*
     * Checks whether a file exception should be granted from the relative 
     * paths in st-ignore.json's ignoreExceptions array
     */
    grantException(pathToFileOrDir) {
        //check for an exception granted in st-ignore.json, assume there is none
        let retVal = false;

        //go through the paths of files to grant exceptions
        for(let i = 0;i < this.stIgnoreData.ignoreExceptions.length;i++) {
            //if the exception path starts with the passed in path then it 
            //is an exception file or the parent dir of an exception file
            if(this.stIgnoreData.ignoreExceptions[i].startsWith(pathToFileOrDir)) {
                retVal = true;
                break;
            }
        }
        return retVal;
    }
}

module.exports = IgnorePath;