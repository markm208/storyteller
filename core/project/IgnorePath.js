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
            try {
                //read the file and parse the data inside it into JSON
                this.stIgnoreData = JSON.parse(fs.readFileSync(fullPathToStorytellerIgnoreFile, 'utf8'));

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

                //make sure that the directory paths are normalized
                this.stIgnoreData.ignoredDirectories = this.stIgnoreData.ignoredDirectories.map(dirPath => {
                    return utilities.addEndingPathSeparator(utilities.normalizeSeparators(dirPath));
                });
                
                //indicate that there is ignore data for this project
                this.stIgnoreFileIsPresent = true;
            } catch (ex) { 
                //st-ignore.json can't be read or is not well-formed json
                throw new Error('st-ignore file cannot be read or is malformed JSON');
            }
        }
    }
    /*
     * A relative path to a file or directory in the storyteller project is 
     * passed in and this method makes a determination whether the user 
     * wants it to be ignored or not.
     */
    ignoreThisFileOrDir(pathToFileOrDir) {
        //assume that the file or dir should NOT be ignored
        let retVal = false;
    
        //don't track anything in the /.storyteller directory
        if(pathToFileOrDir.startsWith(`${utilities.storytellerPathSeparator}.storyteller${utilities.storytellerPathSeparator}`)) { 
            retVal = true;
        //ignore changes to the file named /st-ignore.json in the project dir
        } else if(pathToFileOrDir === `${utilities.storytellerPathSeparator}st-ignore.json`) {
            retVal = true;
        } else if(pathToFileOrDir.startsWith(`${utilities.storytellerPathSeparator}.git${utilities.storytellerPathSeparator}`)) { 
            retVal = true;
        } else if(pathToFileOrDir.endsWith('.DS_Store')) {
            retVal = true;
        } else if(pathToFileOrDir.endsWith('.zip')) {
            retVal = true;
        //if there was a st-ignore file read in on startup
        } else if(this.stIgnoreFileIsPresent === true) {
            //pick apart the file/dir path
            const fileInfo = path.parse(pathToFileOrDir);

            //check to see if the file extension is on the blacklist
            if(this.stIgnoreData.ignoredFileExtensions.includes(fileInfo.ext)) {
                retVal = true;
            //check to see if the file name is on the the blacklist
            } else if(this.stIgnoreData.ignoredFiles.includes(fileInfo.base)) {
                retVal = true;
            //check the directory blacklist
            } else { 
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
        return retVal;
    }    
}

module.exports = IgnorePath;