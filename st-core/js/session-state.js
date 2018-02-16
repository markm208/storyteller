//used for all file system manipulation
var fs = require('fs'); 

//used for file path manipulation 
var path = require('path'); 

//used to request data from the editor
var editorNode = require('./event-collector');

//used to perform a diff on files (included with vs code for free)
var diffTool = require('diff');

/*
 * Check to see if there is a hidden .storyteller directory to hold information about the events and editor.
 */
function isStorytellerDataPresent(workspaceRootPath) {
    
    //path to the file that holds the playback data (if it is present)
    var pathToStorytellerDir = path.join(workspaceRootPath, ".storyteller");
    var pathToStorytellerData = path.join(workspaceRootPath, ".storyteller", "playbackData.json");
    var pathToEditorState = path.join(workspaceRootPath, ".storyteller", "editorState.json");

    //holds whether there is a storyteller dir to hold events and editor state
    var storytellerDataPresent;
    
    try {
        
        //attempt to access the playback data files inside the storyteller folder (will throw an exception if not present)
        fs.accessSync(pathToStorytellerDir, fs.F_OK);
        fs.accessSync(pathToStorytellerData, fs.F_OK);
        fs.accessSync(pathToEditorState, fs.F_OK);
        
        //console.log("The playback data exists in " + pathToStorytellerDir);
        
        //if we get here the files were found in the correct location, record that it is present
        storytellerDataPresent = true;
        
    } catch (e) { //at least one of the required files could not be found
        
        //the playback data was not found
        //console.log("The playback data DOES NOT exist in " + pathToStorytellerDir);
        
        //if we get here at least one of the files was NOT found in the correct location, record that it is absent
        storytellerDataPresent = false;
    }

    return storytellerDataPresent;
}

/*
 * Read the state data from the files.
 */
function readAllStorytellerState(workspaceRootPath) {

    //path to the files that hold the playback and editor data
    var pathToStorytellerData = path.join(workspaceRootPath, ".storyteller", "playbackData.json");
    var pathToEditorState = path.join(workspaceRootPath, ".storyteller", "editorState.json");

    //read the files with the events and the last state of the editor
    var playbackDataString = fs.readFileSync(pathToStorytellerData, "utf8");
    var editorStateString = fs.readFileSync(pathToEditorState, "utf8");
    
    //turn them into objects
    var playbackData = JSON.parse(playbackDataString);
    var editorState = JSON.parse(editorStateString);
    
    //hold the data from the files 
    var retVal = {
        playbackData: playbackData,
        editorState: editorState
    };

    return retVal;
}

/*
 * Save the state of the editor and playback data to the .storyteller directory. playbackData.json will hold event, developer,
 * and file information. editorState.json will hold information about the state of the editor.
 */
function saveAllStorytellerState(workspaceRootPath) {

    //console.log("Saving all the storyteller state data to the file system.");
    
    //write current editor session information to the disk
    var pathToStorytellerDir = path.join(workspaceRootPath, ".storyteller");
    var pathToStorytellerData = path.join(workspaceRootPath, ".storyteller", "playbackData.json");
    var pathToEditorState = path.join(workspaceRootPath, ".storyteller", "editorState.json");
            
    //get a copy of all of the playback data 
    var playbackData = editorNode.getPlaybackData();
    var editorState = editorNode.getEditorState();
        
    //convert the data into a string
    var playbackDataString = JSON.stringify(playbackData);
    var editorStateString = JSON.stringify(editorState);
    
    try {
        
        //attempt to access the storyteller dir in this project
        fs.accessSync(pathToStorytellerDir, fs.F_OK);
        
    } catch (e) { //the dir could not be found
        
        //there is no storyteller dir, we have to create one before writing data to the files
        fs.mkdirSync(pathToStorytellerDir);
    }
    
    //write the strings of data to the file system
    fs.writeFileSync(pathToStorytellerData, playbackDataString);
    fs.writeFileSync(pathToEditorState, editorStateString);
}


/*
 * Takes a full path of a file/dir and returns a path relative to the project dir. In other words, the path to the 
 * project directory is stripped from the full path.
 *  
 * For example, if the project dir is called testDir somewhere on your file system then the stripped paths will look like this:
 *   Project path c:\Users\mmahoney\Desktop\testDir stripped path \
 *   Project path c:\Users\mmahoney\Desktop\testDir\dir1 stripped path \dir1
 *   Project path c:\Users\mmahoney\Desktop\testDir\dir1\test1.txt stripped path \dir1\test1.txt
 */
function stripWorkspaceRootPath(workspaceRootPath, fullPath) {
    
    var retVal = null;
    
    //trim any whitespace that might be present
    fullPath = fullPath.trim();
    workspaceRootPath = workspaceRootPath.trim();
    
    //if the full path starts with the project dir path
    if(fullPath.indexOf(workspaceRootPath) === 0) {
        
        //extract out everything after the project dir path
        retVal = fullPath.substr(workspaceRootPath.length);
    }
    
    //if this is the root of the project dir
    if(retVal.length === 0) {
        
        //add a root char /
        //retVal = path.sep;
        retVal = "/";
    }

    return retVal;
}

/*
 * Takes a relative path of a file/dir and returns a full path to the project dir. In other words, the path to the 
 * project directory is added to the relative path.
 * 
 * If the project dir is c:\Users\mmahoney\Desktop\testDir\ then here are some examples: 
 *   Partial path \ full path c:\Users\mmahoney\Desktop\testDir\
 *   Partial path \dir1 full path c:\Users\mmahoney\Desktop\testDir\dir1
 *   Partial path \dir1\test1.txt full path c:\Users\mmahoney\Desktop\testDir\dir1\test1.txt
 */
function createFullPathFromProjectPath(workspaceRootPath, partialPath) {
        
    //take a path that is relative to the project dir and convert it to a full path to a file in
    //the project dir. 
    var retVal = null;
    
    //trim any whitespace that might be present
    partialPath = partialPath.trim();

    //add the partial path to the path of the project
    retVal = workspaceRootPath + partialPath;
    
    //console.log(`Partial path ${partialPath} full path ${retVal}`);

    return retVal;
}

/* 
 * Finds any files/dirs that have been added to the project folder outside of storyteller and adds create/insert 
 * events for them in the storyteller database.
 */
function reconcileFileSystemToStoryteller(workspaceRootPath, timestamp, messages) { 
    
    //OS independent full path (in case it hasn't already been normalized)
    workspaceRootPath = workspaceRootPath.split("\\").join("/");
    
    //for any files that are in the root of the workspace that are not being tracked by storyteller
    createEventsForDirsAndFiles(workspaceRootPath, workspaceRootPath, timestamp, messages);
}

/* 
 * Recursive helper finds files/dirs that were added outside of storyteller and adds events to the database for them. It 
 * also checks files that are present in both the storyteller database and the file system to see if they are identical.
 * If they are not identical a diff takes place and any differences from the file system are added as events in the
 * database.
 */
function createEventsForDirsAndFiles(dirPath, workspaceRootPath, timestamp, messages) {
        
    //get all of the files and dirs in the passed in path
    var allFilesAndDirs = fs.readdirSync(dirPath);
    
    //if there are other existing files/dirs in the directory
    if(allFilesAndDirs.length > 0) {
                
        //go through the contents of the dir
        for (var i = 0; i < allFilesAndDirs.length; i++) {
            
            //get the full path to the file or directory
            var fullPathToFileOrDir = path.join(dirPath, allFilesAndDirs[i]).split("\\").join("/");
            //get the relative path to the file or directory
            var relativePathToFileOrDir = stripWorkspaceRootPath(workspaceRootPath, fullPathToFileOrDir);
            //get the relative path to the parent directory
            var relativePathToParent = stripWorkspaceRootPath(workspaceRootPath, dirPath);
            
            //we ignore hidden files and dirs
            if(!isHiddenFileOrDirInPath(fullPathToFileOrDir)) {

                //get some stats about the file/dir
                var stats = fs.statSync(fullPathToFileOrDir);
                
                //if this is a dir
                if(stats.isDirectory()) {
                    
                    //get the name of the dir
                    var dirName = allFilesAndDirs[i];

                    //we will ignore the special .storyteller folder since it is not tracked
                    if(dirName.includes(".storyteller") === false) {
                        
                        //if the directory is in the file system but NOT being tracked by storyteller                    
                        if(editorNode.isFileOrDirPresent(relativePathToFileOrDir) === false) {
                            
                            //create a dir event                        
                            editorNode.createDirectory(relativePathToFileOrDir, dirName, relativePathToParent, timestamp, true);

                            //let the user know about the reconciliation
                            messages.push(`The file system has a directory that is not being tracked ${fullPathToFileOrDir}. It will now be tracked by Storyteller.`);                            
                        }
                        
                        //recurse in the subdirectories
                        createEventsForDirsAndFiles(fullPathToFileOrDir, workspaceRootPath, timestamp, messages);
                    
                    } //else- this is the .storyteller dir and should be ignored
                    
                } else if(stats.isFile()) { //this is a file
                    
                    //open the file and read the text
                    var fileText = fs.readFileSync(fullPathToFileOrDir, "utf8");

                    //get the name of the file
                    var fileName = allFilesAndDirs[i];

                    //if the file is in the file system is being tracked by storyteller                
                    if(editorNode.isFileOrDirPresent(relativePathToFileOrDir) === true) {

                        //get the text that the editor contains                    
                        var editorText = editorNode.getText(relativePathToFileOrDir);
                        
                        //if the two are not the same, make the storyteller db the same as the file system by diffing
                        if(fileText !== editorText) {
                                                
                            //TODO prompt the user to see if they want to change the database or the filesystem

                            //let the user know about the reconciliation
                            messages.push(`There are changes in the file ${fullPathToFileOrDir} that are not in the Storyteller database. These changes will be added to the database.`);

                            //get the differences between what storyteller is storing and what is on the file system and
                            //make storyteller change to reflect                          
                            diffAndUpdateFile(relativePathToFileOrDir, fileText, editorText, timestamp);                                                
                        } 
                        
                    } else { //the file is NOT being tracked by storyteller, start tracking it
                                            
                        //let the user know about the reconciliation
                        messages.push(`The file system has a file that is not being tracked ${fullPathToFileOrDir}. It will now be tracked by Storyteller.`);
                                            
                        //create file event                    
                        editorNode.createFile(relativePathToFileOrDir, fileName, relativePathToParent, timestamp, true);                                        
                        
                        //add an insert event for each character in the file                    
                        editorNode.insertText(relativePathToFileOrDir, fileText, 0, 0, false, [], timestamp, true);

                        //console.log("Adding text from a new file: " + fileName + " contents:\n" + fileText + "\n\n");
                    }
                } else {
                
                    //console.log("Not a file nor a dir!!!");
                }                
            }//else- hidden file/dir             
        }
    }
}

/* 
 * Finds the changes in the file system and the storyteller database and makes the storyteller database look like the file system.
 * The file system state is always given preference. Storyteller never changes the file system since some other tools may have made 
 * changes to the files that are necessary.
 */
function diffAndUpdateFile(filePath, fileText, editorText, timestamp) {
                            
    //do a diff and make changes to file
    
    //get the diffs to change what is in the storyteller version of the file into the file system view of the file
    var changes = diffTool.diffChars(editorText, fileText);

    //keep track of where changes take place    
    var currRow = 0;
    var currCol = 0;
    
    //go through each change (text broken up into groups of deletes, inserts, and exact same code between the files)
    for(var i = 0;i < changes.length;i++) {

        //store the type of change (default to none)
        var changeType = "no change";

        //if there was an addition
        if(changes[i].added) {

            changeType = "inserted";

        } else if(changes[i].removed) { //a deletion
            
            changeType = "deleted";
        }
        
        //holds the text in the change
        var changeText = changes[i].value;
        
        //if the change is a delete
        if(changeType === "deleted") {
            
            //console.log("Delete " + changeText.length + " characters at row: " + currRow + " col: " + currCol);
            
            //tell the editor to delete some text            
            editorNode.deleteText(filePath, currRow, currCol, changeText.length, timestamp);
                                            
        } else if(changeType === "no change") { //no change 
            
            //console.log("No change " + changeText.length + " characters at row: " + currRow + " col: " + currCol);                                                      
            
            //no change but we do need to update the current row and column 
            for(var j = 0;j < changeText.length;j++) {
                
                //if its a newline
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
            
            //console.log("Adding " + changeText.length + " characters at row: " + currRow + " col: " + currCol);                                                      
            
            //tell the editor to insert some text            
            editorNode.insertText(filePath, changeText, currRow, currCol, false, [], timestamp, true);
            
            //update the current row and column 
            for(var k = 0;k < changeText.length;k++) {
                
                //if its a newline
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

/*
 * This checks whether files/dirs that are being stored in the storyteller database but are missing from the file system
 * should be added back to the file system. The user is prompted for permission before any files/dirs are added back to
 * the file system.
 */
function reconcileStorytellerToFileSystem(workspaceRootPath, timestamp, messages) {

    //indicate that no reconciliation needs to be attempted
    var needsReconciliation = false;

    //get the paths to all of the directories that storyteller is tracking
    var allDirPaths = editorNode.getAllDirPaths();
    
    //go through all of the storyteller dir paths
    for(var i = 0;i < allDirPaths.length;i++) {
        
        //get the full path of the dir as it will be in this project folder
        var fullDirPath = createFullPathFromProjectPath(workspaceRootPath, allDirPaths[i]);
        
        try {
                        
            //attempt to access the dir on the file system (will throw an exception if not present)
            fs.accessSync(fullDirPath, fs.F_OK);
            
            //if we get here the dir is on the file system too and we don't need to do anything 
            
        } catch (e) { //a dir exists in storyteller but does not exist in the file system
            
            //some reconciliation is necessary
            needsReconciliation = true;

            //stop looking once we find at least one file/dir that have been removed from the file system
            break;
        }
    }
    
    //if all of the dirs are present, next check the files for reconciliation
    if(needsReconciliation === false) {
        
        //get the paths to all of the files that storyteller is tracking
        var allFilePaths = editorNode.getAllFilePaths();
        
        //go through all of the storyteller file paths
        for(var i = 0;i < allFilePaths.length;i++) {
            
            //get the full path of the file as it will be in this project folder
            var fullFilePath = createFullPathFromProjectPath(workspaceRootPath, allFilePaths[i]);

            try {
                        
                //attempt to access the file on the file system (will throw an exception if not present)
                fs.accessSync(fullFilePath, fs.F_OK);
                
                //if we get here the file is on the file system too and we don't need to do anything 
                
            } catch (e) { //a file exists in storyteller but does not exist in the file system
                
                //some reconciliation is necessary
                needsReconciliation = true;

                //stop looking once we find at least one file/dir that have been removed from the file system
                break;
                
            }
        }            
    }

    return needsReconciliation;
}

/*
 * Restores any files/dirs in the storyteller database that are missing from the file system.
 */
function restoreFilesDirsToFileSystem(workspaceRootPath, timestamp, newFilesDirsToIgnoreDueToReconciliation, messages) {
    
    //OS independent full path (in case it hasn't already been normalized)
    workspaceRootPath = workspaceRootPath.split("\\").join("/");

    //get the paths to all of the directories that storyteller is tracking
    var allDirPaths = editorNode.getAllDirPaths();
    
    //go through all of the storyteller dir paths
    for(var i = 0;i < allDirPaths.length;i++) {
        
        //get the full path of the dir as it will be in this project folder
        var fullDirPath = createFullPathFromProjectPath(workspaceRootPath, allDirPaths[i]);
        
        try {
                        
            //attempt to access the dir on the file system (will throw an exception if not present)
            fs.accessSync(fullDirPath, fs.F_OK);
            
            //if we get here the dir is on the file system too and we don't need to do anything 
            
        } catch (e) { //a dir exists in storyteller but does not exist in the file system
                       
            //let the user know about the reconciliation
            messages.push(`Creating a directory because it is in the Storyteller database but not the file system: ${allDirPaths[i]}.`);
            
            //record that this dir should not be handled by the file system watcher since we don't need it to be 
            //recorded as a new dir (it already exists in the storyteller system)
            newFilesDirsToIgnoreDueToReconciliation.push(fullDirPath);

            //add the dir to the file system so that it matches storyteller's view 
            fs.mkdirSync(fullDirPath);                 
        }
    }
    
    //get the paths to all of the files that storyteller is tracking
    var allFilePaths = editorNode.getAllFilePaths();
    
    //go through all of the storyteller file paths
    for(var i = 0;i < allFilePaths.length;i++) {
        
        //get the full path of the file as it will be in this project folder
        var fullFilePath = createFullPathFromProjectPath(workspaceRootPath, allFilePaths[i]);

        try {
                    
            //attempt to access the file on the file system (will throw an exception if not present)
            fs.accessSync(fullFilePath, fs.F_OK);
            
            //if we get here the file is on the file system too and we don't need to do anything 
            
        } catch (e) { //a file exists in storyteller but does not exist in the file system
            
            //let the user know about the reconciliation
            messages.push(`Creating a file because it is in the Storyteller database but not the file system: ${allFilePaths[i]}.`);
            
            //record that this file should not be handled by the file system watcher since we don't need it to be 
            //recorded as a new file (it already exists in the storyteller system)
            newFilesDirsToIgnoreDueToReconciliation.push(fullFilePath);
            
            //get the text of the file that storyteller is tracking            
            var fileText = editorNode.getText(allFilePaths[i]);
        
            //add the file to the file system so that it matches storyteller's view 
            fs.writeFileSync(fullFilePath, fileText, "utf8");
        }
    }        
}

/*
 * Checks to see if there is hidden file/dir somewhere in the path.
 */
function isHiddenFileOrDirInPath(pathToFileOrDir) {

    //all segments of a path start with a '/'
    //all hidden files or directories start with a '.'
    //if there is a '/.' somewhere in the path then there is a hidden file/dir that we should ignore
    var retVal = pathToFileOrDir.indexOf("/.") !== -1;

    //if there is a hidden file/dir on the path
    if(retVal) {

        //debug
        //console.log(`Hidden file/dir: ${pathToFileOrDir}`);
    }

    return retVal;
}

module.exports = {   
    isStorytellerDataPresent: isStorytellerDataPresent,
    readAllStorytellerState: readAllStorytellerState,
    saveAllStorytellerState: saveAllStorytellerState, 
    reconcileFileSystemToStoryteller: reconcileFileSystemToStoryteller,
    reconcileStorytellerToFileSystem: reconcileStorytellerToFileSystem,
    restoreFilesDirsToFileSystem: restoreFilesDirsToFileSystem,
    stripWorkspaceRootPath: stripWorkspaceRootPath
}
