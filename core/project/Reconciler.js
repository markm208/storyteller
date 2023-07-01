const fs = require('fs');
const path = require('path');
const diffTool = require('diff');

const utilities = require('../utilities.js');

/*
 * This class handles the process of identifying discrepancies from what is on
 * the file system and what is stored in the storyteller database. 
 */
class Reconciler {
    constructor(projectManager) {
        //store a reference to the project manager
        this.projectManager = projectManager;
        //find all of the discrepancies in the project
        this.discrepancies = this.findDiscrepancies();
    }

    /*
     * This function identifies any discrepancies between what is on the file 
     * system and what is being stored in the storyteller. The discrepancies 
     * that might occur are:
     * - a file/dir exists on the file system but is not tracked by storyteller 
     *   (this is caused by someone adding files/dirs to a storyteller project 
     *   when storyteller is not actively tracking changes). 
     * - a file/dir exists in storyteller but cannot be found on the file system 
     *   (this is caused by someone deleting files/dirs to a storyteller project 
     *   when storyteller is not actively tracking changes).
     * - a file's contents on the file system are not the same as the code in 
     *   storyteller's (this is caused by someone editing a tracked file when 
     *   storyteller is not actively tracking changes).
     */
    findDiscrepancies() {
        //object that holds reconciliation issues in an opened project
        const retVal = {
            fullDirPathsPresentButNotTracked: [],   //full dir paths in fs but not being tracked
            fullFilePathsPresentButNotTracked: [],  //full file paths in fs but not being tracked
            missingDirectoryIds: [],                //dir ids being tracked but not in fs
            missingFileIds: [],                     //file ids being tracked but not in fs
            modifiedFileIds: []                     //file ids w/ different text in the file from the db 
        };
        
        //holds information about all of the relevant (non-ignored) files and dirs 
        //in the project dir generally from the top of the fs down
        const files = [];
        const dirs = [];

        //add the root dir
        dirs.push({
            fullPath: this.projectManager.projectDirPath,
            dirId: this.projectManager.fileSystemManager.getDirIdFromDirPath(utilities.storytellerPathSeparator)
        });
        
        //get all of the other files and dirs currently in the project on the file system
        this.getFilesAndDirsPresentOnFileSystem(this.projectManager.projectDirPath, files, dirs);

        //holds the ids of the dirs and files that are present in storyteller
        const storytellerTrackedDirIds = {};
        const storytellerTrackedFileIds = {};

        //go through all of the full paths of the directories in the project directory
        for(let i = 0;i < dirs.length;i++) {
            //if there is a full path directory that is being tracked by storyteller
            //(it will be null if it is not being tracked)
            if(dirs[i].dirId) {
                //get the storyteller dir id
                const presentDirId = dirs[i].dirId;
                //record the ids of the tracked dirs for later use
                storytellerTrackedDirIds[presentDirId] = presentDirId;
            } else { //dir is not being tracked
                //record that a dir is on the file system but not being recorded by storyteller
                retVal.fullDirPathsPresentButNotTracked.push(dirs[i].fullPath);
            }
        }

        //go through all of the full paths of the files in the project directory
        for(let i = 0;i < files.length;i++) {
            //if there is a full path file that is being tracked by storyteller
            //(it will be null if it is not being tracked)
            if(files[i].fileId) {
                //get the storyteller file id
                const presentFileId = files[i].fileId;
                //record the ids of the tracked files for later use
                storytellerTrackedFileIds[presentFileId] = presentFileId;

                //get the text from the file on the file system
                const fsFileText = fs.readFileSync(path.join(this.projectManager.projectDirPath, this.projectManager.fileSystemManager.allFiles[presentFileId].currentPath), 'utf8');
                //get the text being stored by storyteller
                const storytellerFileText = this.projectManager.fileSystemManager.allFiles[presentFileId].getText();
                
                //if the two file contents are not the same
                if(fsFileText !== storytellerFileText) {
                    //record that a file diff should be performed
                    retVal.modifiedFileIds.push(presentFileId);
                }
            } else { //file is not being tracked
                //record that a file is on the file system but not being recorded by storyteller
                retVal.fullFilePathsPresentButNotTracked.push(files[i].fullPath);
            }
        }
        
        //handle any newly deleted files/dirs outside of storyteller
        //go through all of the dirs being tracked by storyteller
        for(const dirId in this.projectManager.fileSystemManager.allDirs) {
            const dirObj = this.projectManager.fileSystemManager.allDirs[dirId];
            //if a directory is being tracked (and has not been deleted) AND
            //it is not present in storytellerTrackedDirIds AND 
            //it should not be ignored
            if(dirObj.isDeleted === 'false' && 
               !storytellerTrackedDirIds[dirObj.id] &&
               this.projectManager.ignorePath.ignoreThisFileOrDir(dirObj.currentPath) === false) {
                //record that the dir was deleted outside of storyteller
                retVal.missingDirectoryIds.push(dirObj.id);
            }
        }

        //go through all of the files being tracked by storyteller
        for(const fileId in this.projectManager.fileSystemManager.allFiles) {
            const fileObj = this.projectManager.fileSystemManager.allFiles[fileId];
            //if a file is being tracked (and has not been deleted) AND
            //it is not present in storytellerTrackedFileIds AND
            //it should not be ignored
            if(fileObj.isDeleted === 'false' && 
               !storytellerTrackedFileIds[fileObj.id] &&
               this.projectManager.ignorePath.ignoreThisFileOrDir(fileObj.currentPath) === false) {
                //record that the file was deleted outside of storyteller
                retVal.missingFileIds.push(fileObj.id);
            }
        }

        return retVal;
    }
    /* 
     * This function recursively searches through a directory looking for all of
     * the files and directories inside of it (with the exception of the files
     * and dirs excluded from the st-ignore file). It collects full system 
     * dependent file/dir paths and their associated storyteller ids if they 
     * exist.
     */
    getFilesAndDirsPresentOnFileSystem(dirPath, files, dirs) {
        //get all of the files and dirs in the passed in directory
        const allFilesAndDirs = fs.readdirSync(dirPath);

        //go through the contents of the dir
        for (let i = 0; i < allFilesAndDirs.length; i++) {
            //get the full path to the file or directory
            const fullPathToFileOrDir = path.join(dirPath, allFilesAndDirs[i]);

            //get some stats about the file/dir
            const stats = fs.statSync(fullPathToFileOrDir);

            //if this is a dir
            if(stats.isDirectory()) {
                //get a normalized path
                const normalizedDirPath = this.projectManager.pathHelper.normalizeDirPath(fullPathToFileOrDir);

                //if the directory should not be ignored 
                if(this.projectManager.ignorePath.ignoreThisFileOrDir(normalizedDirPath) === false) {
                    //store the full path and dir id if it is being tracked and null if it is not
                    dirs.push({
                        fullPath: fullPathToFileOrDir, 
                        dirId: this.projectManager.fileSystemManager.getDirIdFromDirPath(normalizedDirPath)
                    });
                    
                    //recurse in the subdirectories
                    this.getFilesAndDirsPresentOnFileSystem(fullPathToFileOrDir, files, dirs);
                } 
            } else if(stats.isFile()) {
                //get a normalized path
                const normalizedFilePath = this.projectManager.pathHelper.normalizeFilePath(fullPathToFileOrDir);
                
                //if the file should not be ignored 
                if(this.projectManager.ignorePath.ignoreThisFileOrDir(normalizedFilePath) === false) {
                    //store the full path, file id if it is being tracked and 
                    //null if it is not
                    files.push({
                        fullPath: fullPathToFileOrDir, 
                        fileId: this.projectManager.fileSystemManager.getFileIdFromFilePath(normalizedFilePath)
                    });
                }
            }
        }
    }
    /*
    * Indicates if there is at least one discrepancy during reconciliation.
    */
    areDiscrepanciesPresent() {
        //count all of the discrepancies that were found
        const numDiscrepancies = this.discrepancies.fullDirPathsPresentButNotTracked.length + 
        this.discrepancies.fullFilePathsPresentButNotTracked.length +
        this.discrepancies.missingDirectoryIds.length + 
        this.discrepancies.missingFileIds.length +
        this.discrepancies.modifiedFileIds.length; 

        //return whether there were more than one
        return (numDiscrepancies > 0);
    }

    /*
     * When a new file is created when storyteller isn't recording the user
     * has the option of adding the new file. This function resolves the 
     * issue of a new file. The action says what the user chose to do. 
     * Currently, the only option is to create the new file.
     */
    async resolveNewFile(newFilePath, action, isRelevant) {
        //add the file to the project
        if(action === 'create') {
            //attribute any reconciliation changes to the system developer
            const originalDevGroup = this.projectManager.developerManager.getActiveDeveloperGroup();
            const systemDevGroup = this.projectManager.developerManager.systemDeveloperGroup;
            await this.projectManager.developerManager.setActiveDeveloperGroup(systemDevGroup);

            //record the creating of a new file
            await this.projectManager.createFile(newFilePath, isRelevant);

            //set the original dev group back
            await this.projectManager.developerManager.setActiveDeveloperGroup(originalDevGroup);
        } else if(action === 'delete') { //remove the new file
            //delete the file
            fs.unlinkSync(newFilePath);
        }
    }
    /*
     * When a new dir is created when storyteller isn't recording the user
     * has the option of adding the new dir. This function resolves the 
     * issue of a new dir. The action says what the user chose to do. Currently,
     * the only option is to create the new dir.
     */ 
    async resolveNewDirectory(newDirectoryPath, action, isRelevant) {
        //add the dir to the project
        if(action === 'create') {
            //attribute any reconciliation changes to the system developer
            const originalDevGroup = this.projectManager.developerManager.getActiveDeveloperGroup();
            const systemDevGroup = this.projectManager.developerManager.systemDeveloperGroup;
            await this.projectManager.developerManager.setActiveDeveloperGroup(systemDevGroup);

            //record the creating of a new file
            await this.projectManager.createDirectory(newDirectoryPath, isRelevant);

            //set the original dev group back
            await this.projectManager.developerManager.setActiveDeveloperGroup(originalDevGroup);
        } else if(action === 'delete') { //delete the new directory
            //delete the file
            fs.rmdirSync(newDirectoryPath);
        }
    }
    /*
     * When a file is deleted when storyteller isn't recording the user has
     * the option of recreating the deleted file or accepting the delete.
     * This function resolves that situation.
     */
    async resolveDeletedFile(deletedFileId, action) {
        //get the normalized file path
        const deletedFilePath = this.projectManager.fileSystemManager.getFileInfo(deletedFileId).currentPath;

        //if the user wishes to recreate this file (undo the delete)
        if(action === 'recreate') {
            //create the full path
            const fullPath = path.join(this.projectManager.projectDirPath, deletedFilePath);
            
            if(fs.existsSync(fullPath) === false) {
                //get the last recorded version of the text
                const fileText = this.projectManager.fileSystemManager.allFiles[deletedFileId].getText();

                //write the text to a file to undo the delete 
                fs.writeFileSync(fullPath, fileText, 'utf8');
            }
        } else if(action === 'accept-delete') { //accept the delete
            if(this.projectManager.fileSystemManager.doesFileIdExist(deletedFileId)) {
                //attribute any reconciliation changes to the system developer
                const originalDevGroup = this.projectManager.developerManager.getActiveDeveloperGroup();
                const systemDevGroup = this.projectManager.developerManager.systemDeveloperGroup;
                await this.projectManager.developerManager.setActiveDeveloperGroup(systemDevGroup);

                //record the deletion of this file
                await this.projectManager.deleteFile(deletedFilePath);

                //set the original dev group back
                await this.projectManager.developerManager.setActiveDeveloperGroup(originalDevGroup);
            }
        }
    }
    /*
     * When a dir is deleted when storyteller isn't recording the user has
     * the option of recreating the deleted dir or accepting the delete.
     * This function resolves that situation.
     */
    async resolveDeletedDirectory(deletedDirectoryId, action) {
        //get the normalized dir path
        const deletedDirPath = this.projectManager.fileSystemManager.getDirInfo(deletedDirectoryId).currentPath;

        //if the user wishes to recreate this dir (undo the delete)
        if(action === 'recreate') {
            //create the full path
            const fullPath = path.join(this.projectManager.projectDirPath, deletedDirPath);

            //if the directory does not exist
            if(fs.existsSync(fullPath) === false) {
                //recreate the missing directory 
                fs.mkdirSync(fullPath, { recursive: true });
            }
        } else if(action === 'accept-delete') { //accept the delete
            //if the directory has not already been deleted from a recursive deleted dir
            if(this.projectManager.fileSystemManager.doesDirIdExist(deletedDirectoryId)) {     
                //attribute any reconciliation changes to the system developer
                const originalDevGroup = this.projectManager.developerManager.getActiveDeveloperGroup();
                const systemDevGroup = this.projectManager.developerManager.systemDeveloperGroup;
                await this.projectManager.developerManager.setActiveDeveloperGroup(systemDevGroup);

                //record the deletion of this dir
                await this.projectManager.deleteDirectory(deletedDirPath);

                //set the original dev group back
                await this.projectManager.developerManager.setActiveDeveloperGroup(originalDevGroup);
            }
        }
    }
    /*
     * Used during reconciliation to create files and dirs that are present in 
     * a new project directory.
     */
    async addExistingFilesDirs() {
        //create and start tracking the new directories
        for(let i = 0;i < this.discrepancies.fullDirPathsPresentButNotTracked.length;i++) {
            const newDirPath = this.discrepancies.fullDirPathsPresentButNotTracked[i];
            //create the new directory
            //indicate that the new dir events are not relevant to playback
            await this.resolveNewDirectory(newDirPath, 'create', false);
        }

        //create and start tracking the new files
        for(let i = 0;i < this.discrepancies.fullFilePathsPresentButNotTracked.length;i++) {
            const newFilePath = this.discrepancies.fullFilePathsPresentButNotTracked[i];
            //create the new file
            //indicate that the new file events are not relevant to playback
            await this.resolveNewFile(newFilePath, 'create', false);
        }
    }
    /*
     * Resolves any changes between the text in a file and the contents
     * of the file in storyteller. 
     */
    async resolveFileChanges(modifiedFileId, action) {
        //get the normalized file path
        const modifiedFilePath = this.projectManager.fileSystemManager.getFileInfo(modifiedFileId).currentPath;
        //create the full path
        const fullPath = path.join(this.projectManager.projectDirPath, modifiedFilePath);
        //get the last recorded version of the text
        const fileText = this.projectManager.fileSystemManager.allFiles[modifiedFileId].getText();

        //if the user wants to go back to the original text file state
        if(action === 'recreate') {
            //write the text to a file to undo the modifiecation 
            fs.writeFileSync(fullPath, fileText, 'utf8');
        } else if(action === 'accept-changes') { //update system to holds the changes
            const newFileText = fs.readFileSync(fullPath, 'utf8');

            //attribute any reconciliation changes to the system developer
            const originalDevGroup = this.projectManager.developerManager.getActiveDeveloperGroup();
            const systemDevGroup = this.projectManager.developerManager.systemDeveloperGroup;
            await this.projectManager.developerManager.setActiveDeveloperGroup(systemDevGroup);

            //update storyteller to hold the new state of the file
            await this.diffAndUpdateFile(fullPath, fileText, newFileText);

            //set the original dev group back
            await this.projectManager.developerManager.setActiveDeveloperGroup(originalDevGroup);
        }
    }
    /* 
     * Finds the differences in a file on the file system and the storyteller 
     * data and makes the storyteller data look like the file on the file system. 
     * The file system state is always given preference.
     */
    async diffAndUpdateFile(filePath, originalFileText, newFileText) {
        //get the diffs between what is in the file system state and storyteller state
        const changes = diffTool.diffChars(originalFileText, newFileText);

        //keep track of where the changes are taking place
        let currRow = 0;
        let currCol = 0;
        
        //go through each change (the is text broken up into groups of deletes, 
        //inserts, and exact same code between the files)
        for(let i = 0;i < changes.length;i++) {
            //store the type of change (default to none)
            let changeType = "no change";

            //if there was an addition
            if(changes[i].added) {
                changeType = "inserted";
            } else if(changes[i].removed) { //a deletion
                changeType = "deleted";
            }
            
            //holds the text in the change
            let changeText = changes[i].value;
            
            //if the change is a delete
            if(changeType === "deleted") {
                //delete the text in the change
                await this.projectManager.handleDeletedText(filePath, currRow, currCol, changeText.length);
            } else if(changeType === "no change") { //no change 
                //no change but we do need to update the current row and column 
                for(let j = 0;j < changeText.length;j++) {
                    //if the character is a newline
                    if(changeText[j] === "\n") {
                        //move down a row and set col back to 0
                        currRow++;
                        currCol = 0;
                    } else { //non-newline
                        //move column forward 
                        currCol++;
                    }
                }
            } else if(changeType === "inserted") { //change is an add
                //insert the text in the change
                await this.projectManager.handleInsertedText(filePath, changeText, currRow, currCol, []);
                
                //update the current row and column 
                for(let k = 0;k < changeText.length;k++) {
                    //if the character is a newline
                    if(changeText[k] === "\n") {
                        //move down a row and set col back to 0
                        currRow++;
                        currCol = 0;
                    } else {//non-newline
                        //move column forward
                        currCol++;
                    }
                }
            }
        }
    }
}

module.exports = Reconciler;