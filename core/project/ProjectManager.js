const fs = require('fs');
const path = require('path');

const Project = require('./Project');
const DeveloperManager = require('../developers/DeveloperManager');
const EventManager = require('../events/EventManager');
const FileSystemManager = require('../filesAndDirs/FileSystemManager');
const CommentManager = require('../comments/CommentManager');
const HttpServer = require('./HttpServer');
const Reconciler = require('./Reconciler');
const PathHelper = require('./PathHelper');
const IgnorePath = require('./IgnorePath.js');

const FileBackedCollection = require('../FileBackedCollection.js');

/*
 * This class manages most aspects of the open storyteller project.
 * This includes responding to editor activity and generating events
 * for file/dir operations and text edits.
 * It creates references to the other managers (developer, file system,
 * event) and coordinates most of their interaction.
 */
class ProjectManager extends FileBackedCollection {
    constructor(projDirPath, useHttpServerForEditor=false) {
        //init the base class
        super(projDirPath, 'project', 'project.json');
        
        //indicate whether there is an editor that will send http requests 
        //(the vs code extension does not use this)
        this.useHttpServerForEditor = useHttpServerForEditor;

        //create the dev, file system, and event managers (opens and reads 
        //data if present, initializes data otherwise)
        this.developerManager = new DeveloperManager(this.storytellerDirPath);
        this.fileSystemManager = new FileSystemManager(this.storytellerDirPath);
        this.eventManager = new EventManager(this.storytellerDirPath);
        this.commentManager = new CommentManager(this.storytellerDirPath);

        //for normalizing paths (going from full paths to relative paths)
        this.pathHelper = new PathHelper(this.storytellerDirPath);
        
        //read in the st-ignore file (if there is one)
        this.ignorePath = new IgnorePath(this.storytellerDirPath);

        //create a reconciler to handle file/dir discrepancies
        this.reconciler = new Reconciler(this);

        //if the json file exists then this is an existing project
        if(this.fileExists()) {
            //read all of the project data from the file system
            this.read();
        } else { //no json file exists, this is a new project
            //create a Project (title, description, and initial 6 digit branch id)
            this.project = new Project();

            //write the relevant data to the file
            this.write();

            //create the root dir, /
            this.createDirectory(this.storytellerDirPath, false);

            //add the description comment
            this.commentManager.addComment({
                commentText: 'Enter a playback description',
                timestamp: new Date().getTime(),
                displayCommentEvent: this.eventManager.read()[0], /* grab the one and only event created so far */
                developerGroupId: this.developerManager.anonymousDeveloperGroup.id, 
                selectedCodeBlocks: [],
                imageURLs: [],
                videoURLs: [],
                audioURLs: [],
                linesAbove: 0,
                linesBelow: 0,
                currentFilePath: "",
                viewableBlogText: "",
                commentTags: [],
                questionCommentData: {
                    allAnswers: [], 
                    correctAnswer: "", 
                    question: ""
                }
            });

        }

        //the playback data should be altered for the next playback
        this.updateEventDataForPerfectProgrammer = false;

        //create an http server to listen for editors and playbacks
        this.httpServer = new HttpServer(this);
    }

    /*
     * Writes the project data to the json file.
     */
    write() {
        //pass in an object to be written to a json file
        super.write({
            title: this.project.title, 
            description: this.project.description, 
            branchId: this.project.branchId
        });
    }

    /*
     * Reads the project data from the file into memory.
     */
    read() {
        //read the data from the file
        const anObject = super.read();

        //store the data from the file back into this object
        this.project = anObject;
    }

    /*
     * Writes all data to the file system.
     */
    stopStoryteller() {
        //write all of the project data to the file system
        this.developerManager.write();
        this.fileSystemManager.write();
        this.eventManager.writeEventsBufferToFileSystem();
        this.eventManager.write();
        this.commentManager.write();
        this.write();

        //stop the http server
        this.httpServer.close();
    }

    /*
     * Saves any events into the intermediate file and update each File's last
     * modified date.
     */
    saveTextFileState() {
        //write any events in memory to the intermediate event file
        this.eventManager.writeEventsBufferToFileSystem(true);
    }
    
    /*
     * Creates a new directory.
     */
    createDirectory(newDirPath, isRelevant=true) {
        //get a normalized dir path
        const newNormalizedDirPath = this.pathHelper.normalizeDirPath(newDirPath);
        
        //if the directory should not be ignored
        if(this.ignorePath.ignoreThisFileOrDir(newNormalizedDirPath) === false) {
            //add the new dir to the in-memory file state representation
            const dirObj = this.fileSystemManager.addDirectory(newNormalizedDirPath);
            
            //insert a create directory event 
            const timestamp = new Date().getTime();
            const devGroupId = this.developerManager.currentDeveloperGroupId;
            const branchId = this.branchId;
            this.eventManager.insertCreateDirectoryEvent(dirObj, timestamp, devGroupId, branchId, isRelevant);
        } //else- this dir should be ignored because the user requested it in /st-ignore.json
    }
    /*
     * Creates a new file.
     */
    createFile(newFilePath, isRelevant=true) {
        //get a normalized file path
        const newNormalizedFilePath = this.pathHelper.normalizeFilePath(newFilePath);
        
        //if the file should not be ignored 
        if(this.ignorePath.ignoreThisFileOrDir(newNormalizedFilePath) === false) {
            //get the file's last modified date
            const lastModifiedDate = fs.statSync(newFilePath).mtimeMs;
            //add the new file to the in-memory file state representation
            const fileObj = this.fileSystemManager.addFile(newNormalizedFilePath, lastModifiedDate);
    
            //insert a create file event
            const timestamp = new Date().getTime();
            const devGroupId = this.developerManager.currentDeveloperGroupId;
            const branchId = this.branchId;
            this.eventManager.insertCreateFileEvent(fileObj, timestamp, devGroupId, branchId, isRelevant);
    
            //it is possible that a new file will have some text in it already
            //for example, if a file is copied into a storyteller project

            //if the new file already has some text in it then write it in one big chunk
            const fileContents = fs.readFileSync(newFilePath, 'utf8');
            if(fileContents.length > 0) {
                //store the current dev group
                const currentDevGroup = this.developerManager.getCurrentDeveloperGroup();
                //assign the changes to the system dev group
                this.developerManager.setCurrentDeveloperGroup(this.developerManager.systemDeveloperGroup);
                
                //record the new text
                this.handleInsertedText(newFilePath, fileContents, 0, 0, [], isRelevant);
                
                //set the current dev group back to the original value
                this.developerManager.setCurrentDeveloperGroup(currentDevGroup);
            }
        } //else- this file should be ignored because the user requested it in /st-ignore.json
    }
    /*
     * Deletes a file or a directory
     */
    deleteFileOrDirectory(delPath) {
        //get a normalized path
        const delNormalizedPath = this.pathHelper.normalizeDirPath(delPath);
    
        try {
            //attempt to get the dir info object (throws an exception if not present and we know it is a file)
            this.fileSystemManager.getDirInfoFromDirPath(delNormalizedPath);
    
            //if the path is to a dir there will be no exception and we'll delete the dir
            this.deleteDirectory(delPath);
        } catch(ex) {
            //the path did not represent a dir, so it must a file
            this.deleteFile(delPath);
        }
    }
    /*
     * Deletes a directory
     */
    deleteDirectory(delDirPath) {
        //get a normalized dir path
        const delNormalizedDirPath = this.pathHelper.normalizeDirPath(delDirPath);
    
        //if the directory should not be ignored (ignores /.storyteller paths and /st-ignore.json file)
        if(this.ignorePath.ignoreThisFileOrDir(delNormalizedDirPath) === false) {
            //get the dir object
            const dirObj = this.fileSystemManager.getDirInfoFromDirPath(delNormalizedDirPath);
    
            //remove the dir in the in-memory file state representation
            this.fileSystemManager.removeDirectory(delNormalizedDirPath);
            
            //insert a delete dir event
            const timestamp = new Date().getTime();
            const devGroupId = this.developerManager.currentDeveloperGroupId;
            const branchId = this.branchId;
            this.eventManager.insertDeleteDirectoryEvent(dirObj, timestamp, devGroupId, branchId);

            //currently does not create delete events for subdirs and files
            //if this is desired, uncomment the next line
            //TODO do we want multiple delete events?? Will there be too many?? Files and dirs will be marked as deleted without associated events
            //this.deleteDirectoryHelper(dirObj.id, timestamp, devGroupId, branchId);
        } //else- this dir should be ignored because the user requested it in /st-ignore.json
    }
    /*
     * For creating multiple delete events on deleting a directory (not 
     * currently used- that may change in the future)
     */
    deleteDirectoryHelper(deletedDirId, timestamp, devGroupId, branchId) {
        //go through all of the tracked files
        for(let fileId in this.fileSystemManager.allFiles) {
            const file = this.fileSystemManager.allFiles[fileId];

            //if a file has been deleted because it is in a deleted dir
            if(file.parentDirectoryId === deletedDirId) {
                //generate a delete file event
                this.eventManager.insertDeleteFileEvent(file, timestamp, devGroupId, branchId);
            }
        }

        //go through all of the tracked dirs
        for(let dirId in this.fileSystemManager.allDirs) {
            const dir = this.fileSystemManager.allDirs[dirId];

            //if a dir has been deleted because it is in a deleted dir
            if(dir.parentDirectoryId === deletedDirId) {
                //generate a delete dir event
                this.eventManager.insertDeleteDirectoryEvent(dir, timestamp, devGroupId, branchId);

                //recurse through out the subdir
                this.deleteDirectoryHelper(dir.id, timestamp, devGroupId, branchId);
            }
        }
    }
    /*
     * Deletes a file.
     */
    deleteFile(delFilePath) {
        //get a normalized file path
        const delNormalizedFilePath = this.pathHelper.normalizeFilePath(delFilePath);
    
        //if the file should not be ignored 
        if(this.ignorePath.ignoreThisFileOrDir(delNormalizedFilePath) === false) {
            //get the file object
            const fileObj = this.fileSystemManager.getFileInfoFromFilePath(delNormalizedFilePath);
            
            //remove the file in the in-memory file state representation
            this.fileSystemManager.removeFile(delNormalizedFilePath);
    
            //insert a delete file event
            const timestamp = new Date().getTime();
            const devGroupId = this.developerManager.currentDeveloperGroupId;
            const branchId = this.branchId;
            this.eventManager.insertDeleteFileEvent(fileObj, timestamp, devGroupId, branchId);
        } //else- this file should be ignored because the user requested it in /st-ignore.json
    }
    /*
     * Moves a directory.
     */
    moveDirectory(oldDirPath, newDirPath) {
        //get normalized dir paths
        const oldNormalizedDirPath = this.pathHelper.normalizeDirPath(oldDirPath);
        const newNormalizedDirPath = this.pathHelper.normalizeDirPath(newDirPath);
    
        //if the directory is moved from an ignored location to a relevant one
        if(this.ignorePath.ignoreThisFileOrDir(oldNormalizedDirPath) === true &&
           this.ignorePath.ignoreThisFileOrDir(newNormalizedDirPath) === false) {
            //create directory with new dirPath
            this.createDirectory(newDirPath);
            //recursively create the files and subdirectories inside this new one
            this.createFilesAndSubDirs(newDirPath);
        //if the directory is moved from a relevant one to an ignored one
        } else if(this.ignorePath.ignoreThisFileOrDir(oldNormalizedDirPath) === false &&
                  this.ignorePath.ignoreThisFileOrDir(newNormalizedDirPath) === true) {
            //delete the old dirPath directory
            this.deleteDirectory(oldDirPath);
        //if the directory move falls outside of the ignored paths, we need to perform a dir move
        } else if(this.ignorePath.ignoreThisFileOrDir(oldNormalizedDirPath) === false &&
                  this.ignorePath.ignoreThisFileOrDir(newNormalizedDirPath) === false) {
            //get the old dir object
            const oldDirObj = this.fileSystemManager.getDirInfoFromDirPath(oldNormalizedDirPath);
            const oldDirParentDirectoryId = oldDirObj.parentDirectoryId;
    
            //move the dir in the in-memory file state representation
            this.fileSystemManager.moveDirectory(oldNormalizedDirPath, newNormalizedDirPath);
            //get the new parent dir id (updated in the code above)
            const newDirParentDirectoryId = oldDirObj.parentDirectoryId;
    
            //insert a delete dir event 
            const timestamp = new Date().getTime();
            const devGroupId = this.developerManager.currentDeveloperGroupId;
            const branchId = this.branchId;
            this.eventManager.insertMoveDirectoryEvent(timestamp, devGroupId, branchId, oldDirObj.id, newDirParentDirectoryId, oldDirParentDirectoryId, newNormalizedDirPath, oldNormalizedDirPath);
        } //else- this dir should be ignored because the user requested it in /st-ignore.json
    }
    /*
     * Moves a file.
     */
    moveFile(oldFilePath, newFilePath) {
        //get normalized file paths
        const oldNormalizedFilePath = this.pathHelper.normalizeFilePath(oldFilePath);
        const newNormalizedFilePath = this.pathHelper.normalizeFilePath(newFilePath);
    
        //if the file is moved from an ignored location to a relevant one
        if(this.ignorePath.ignoreThisFileOrDir(oldNormalizedFilePath) === true &&
           this.ignorePath.ignoreThisFileOrDir(newNormalizedFilePath) === false) {
            //create file at the new file path
            this.createFile(newFilePath);
        //if the file is moved from a relevant one to an ignored one
        } else if(this.ignorePath.ignoreThisFileOrDir(oldNormalizedFilePath) === false &&
                  this.ignorePath.ignoreThisFileOrDir(newNormalizedFilePath) === true) {
            //delete the file at the old file path
            this.deleteFile(oldFilePath)
        //if the file move falls outside of the ignored paths
        } else if(this.ignorePath.ignoreThisFileOrDir(oldNormalizedFilePath) === false &&
                  this.ignorePath.ignoreThisFileOrDir(newNormalizedFilePath) === false) {
            //get the old file object
            const oldFileObj = this.fileSystemManager.getFileInfoFromFilePath(oldNormalizedFilePath);
            const oldFileParentDirectoryId = oldFileObj.parentDirectoryId;
    
            //move the file in the in-memory file state representation
            this.fileSystemManager.moveFile(oldNormalizedFilePath, newNormalizedFilePath);
    
            //get the new parent dir id (changed in the code above)
            const newFileParentDirectoryId = oldFileObj.parentDirectoryId;
    
            //insert a delete file event
            const timestamp = new Date().getTime();
            const devGroupId = this.developerManager.currentDeveloperGroupId;
            const branchId = this.branchId;
            this.eventManager.insertMoveFileEvent(timestamp, devGroupId, branchId, oldFileObj.id, newFileParentDirectoryId, oldFileParentDirectoryId, newNormalizedFilePath, oldNormalizedFilePath);
        } //else- this file should be ignored because the user requested it in /st-ignore.json
    }
    /*
     * Renames a directory.
     */
    renameDirectory(oldDirPath, newDirPath) {
        //get normalized dir paths
        const oldNormalizedDirPath = this.pathHelper.normalizeDirPath(oldDirPath);
        const newNormalizedDirPath = this.pathHelper.normalizeDirPath(newDirPath);
    
        //if the directory is renamed from an ignored name to a relevant one
        if(this.ignorePath.ignoreThisFileOrDir(oldNormalizedDirPath) === true &&
           this.ignorePath.ignoreThisFileOrDir(newNormalizedDirPath) === false) {
            //create directory at the new dir path
            this.createDirectory(newDirPath);
            //recursively create the files and subdirectories inside this new one
            this.createFilesAndSubDirs(newDirPath);
        //if the directory is renamed from a relevant one to an ignored one
        } else if(this.ignorePath.ignoreThisFileOrDir(oldNormalizedDirPath) === false &&
                  this.ignorePath.ignoreThisFileOrDir(newNormalizedDirPath) === true) {
            //delete the old directory path 
            this.deleteDirectory(oldDirPath);
        //if the directory rename falls outside of the ignored paths
        } else if(this.ignorePath.ignoreThisFileOrDir(oldNormalizedDirPath) === false &&
                  this.ignorePath.ignoreThisFileOrDir(newNormalizedDirPath) === false) {
            //get the old dir object
            const oldDirObj = this.fileSystemManager.getDirInfoFromDirPath(oldNormalizedDirPath);
    
            //move the dir in the in-memory file state representation
            this.fileSystemManager.renameDirectory(oldNormalizedDirPath, newNormalizedDirPath);
    
            //insert a delete dir event
            const timestamp = new Date().getTime();
            const devGroupId = this.developerManager.currentDeveloperGroupId;
            const branchId = this.branchId;
            this.eventManager.insertRenameDirectoryEvent(timestamp, devGroupId, branchId, oldDirObj.id, oldDirObj.parentDirectoryId, newNormalizedDirPath, oldNormalizedDirPath);
        } //else- this dir should be ignored because the user requested it in /st-ignore.json
    }
    /*
     * Renames a file.
     */
    renameFile(oldFilePath, newFilePath) {
        //get normalized file paths
        const oldNormalizedFilePath = this.pathHelper.normalizeFilePath(oldFilePath);
        const newNormalizedFilePath = this.pathHelper.normalizeFilePath(newFilePath);
    
        //if the file is renamed from an ignored name to a relevant one
        if(this.ignorePath.ignoreThisFileOrDir(oldNormalizedFilePath) === true &&
           this.ignorePath.ignoreThisFileOrDir(newNormalizedFilePath) === false) {
            //create file at the new path
            this.createFile(newFilePath);
        //if the file is renamed from a relevant one to an ignored one
        } else if(this.ignorePath.ignoreThisFileOrDir(oldNormalizedFilePath) === false &&
                  this.ignorePath.ignoreThisFileOrDir(newNormalizedFilePath) === true) {
            //delete the file at the old path
            this.deleteFile(oldFilePath);
        //if the file rename falls outside of the ignored paths
        } else if(this.ignorePath.ignoreThisFileOrDir(oldNormalizedFilePath) === false &&
                  this.ignorePath.ignoreThisFileOrDir(newNormalizedFilePath) === false) {
            //get the old file object
            const oldFileObj = this.fileSystemManager.getFileInfoFromFilePath(oldNormalizedFilePath);
    
            //move the file in the in-memory file state representation
            this.fileSystemManager.renameFile(oldNormalizedFilePath, newNormalizedFilePath);
    
            //insert a delete file event
            const timestamp = new Date().getTime();
            const devGroupId = this.developerManager.currentDeveloperGroupId;
            const branchId = this.branchId;
            this.eventManager.insertRenameFileEvent(timestamp, devGroupId, branchId, oldFileObj.id, oldFileObj.parentDirectoryId, newNormalizedFilePath, oldNormalizedFilePath);
        } //else- this file should be ignored because the user requested it in /st-ignore.json
    }
    /*
     * Recursively creates files and subdirectories for when directories are
     * created outside of the editor. For example, when a dir is renamed or
     * moved from an ignored dir to one that is not then that dir is created. 
     * All of the files and dirs inside that will need to be created too, that
     * is what this method does.
     */
    createFilesAndSubDirs(dirPath) {
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
                //create the subdirectory
                this.createDirectory(fullPathToFileOrDir);

                //recurse in the subdirectories
                this.createFilesAndSubDirs(fullPathToFileOrDir);
            } else if(stats.isFile()) {
                //create the file
                this.createFile(fullPathToFileOrDir);
            }
        }
    }
    /*
     * Handles some text being inserted.
     */
    handleInsertedText(filePath, insertedText, startRow, startCol, pastedInsertEventIds, isRelevant=true) {
        try {
            //get a project specific path to the file 
            const normalizedFilePath = this.pathHelper.normalizeFilePath(filePath);
        
            //only handle if the text change in the file should not be ignored
            if(this.ignorePath.ignoreThisFileOrDir(normalizedFilePath) === false) {
                //get the file id associated with the file where the change takes place
                const fileId = this.fileSystemManager.getFileIdFromFilePath(normalizedFilePath);
                const file = this.fileSystemManager.allFiles[fileId];

                //verify that the file exists
                if(file) {
                    //create a timestamp for the new event
                    const timestamp = new Date().getTime();
                    const devGroupId = this.developerManager.currentDeveloperGroupId;
                    const branchId = this.branchId;
                
                    //insert the batch new text
                    this.eventManager.insertTextEvents(file, timestamp, devGroupId, branchId, insertedText, startRow, startCol, pastedInsertEventIds, isRelevant);
                } else {
                    throw new Error(`Cannot insert text in the file ${filePath}`);
                }
            }
        } catch(ex) {
            console.log(`Error on insert text: ${ex}`);
            console.log(`filePath: ${filePath},\n insertedText: ${insertedText},\n startRow: ${startRow},\n startCol: ${startCol},\n pastedInsertEventIds: ${pastedInsertEventIds}\n`);
        }
    }
    /*
     * Handles some text being deleted.
     */
    handleDeletedText(filePath, startRow, startCol, numElementsToDelete) {
        try {
            //get a project specific path to the file 
            const normalizedFilePath = this.pathHelper.normalizeFilePath(filePath);
        
            //only handle if the text change in the file should not be ignored
            if(this.ignorePath.ignoreThisFileOrDir(normalizedFilePath) === false) {
                //get the file id associated with the file where the change takes place
                const fileId = this.fileSystemManager.getFileIdFromFilePath(normalizedFilePath);
                const file = this.fileSystemManager.allFiles[fileId];
                //verify that the file exists
                if(file) {
                    //create a timestamp for the new event
                    const timestamp = new Date().getTime();
                    const devGroupId = this.developerManager.currentDeveloperGroupId;
                    const branchId = this.branchId;
                    
                    //remove the batch of deleted text (and update the associated inserts)
                    this.eventManager.insertDeleteEvents(file, timestamp, devGroupId, branchId, startRow, startCol, numElementsToDelete);
                } else {
                    throw new Error(`Cannot delete text in the file ${filePath}`);
                }
            }
        } catch(ex) {
            console.log(`Error on delete text: ${ex}`);
        }
    }

    /*
     * This function creates the text for a js function that will be served
     * during playback. This returns a function and not just json so that 
     * playbacks can be served from the file system without requiring a
     * web server. Otherwise, we would have had a route that returns json.
     */
    getPlaybackData(makeEditable) {
        //get all the events from the file
        let events = this.eventManager.read();

        //make sure the comment urls don't have a leading slash
        const copyOfComments = Object.assign({}, this.commentManager.comments);
        for(let eventId in copyOfComments) {
            const comments = copyOfComments[eventId];
            for(let i = 0;i < comments.length;i++) {
                const comment = comments[i];
                comment.imageURLs = comment.imageURLs.map(imageURL => imageURL[0] === '/' ? imageURL.substring(1) : imageURL);
                comment.videoURLs = comment.videoURLs.map(videoURL => videoURL[0] === '/' ? videoURL.substring(1) : videoURL);
                comment.audioURLs = comment.audioURLs.map(audioURL => audioURL[0] === '/' ? audioURL.substring(1) : audioURL);
            }
        }

        if(this.updateEventDataForPerfectProgrammer) {
            //edit the event data to include only events tht made the comment points
            events = this.editEventsForPerfectProgrammer(events, copyOfComments);
            //future playbacks will be normal
            this.updateEventDataForPerfectProgrammer = false;
        }

        //create the text for a js function that loads the playback into a global called playbackData
        const func = 
`
function loadPlaybackData() {
    playbackData.events = ${JSON.stringify(events)};
    playbackData.comments = ${JSON.stringify(copyOfComments)};
    playbackData.numEvents = ${events.length};
    playbackData.isEditable = ${makeEditable ? 'true' : 'false'};
    playbackData.developers = ${JSON.stringify(this.developerManager.allDevelopers)};
    playbackData.developerGroups = ${JSON.stringify(this.developerManager.allDeveloperGroups)};
    playbackData.playbackTitle = '${this.project.title.replace(/'/g, "&#39;")}';
    playbackData.branchId = '${this.project.branchId}';
}`;
//TODO add an exports at the end
        return func;
    }

    setNextPlaybackPerfectProgrammer() {
        //set the next playback to be a preview of perfect programmer
        this.updateEventDataForPerfectProgrammer = true;
    }

    editEventsForPerfectProgrammer(originalEvents, comments) {
        //holds the insert events of all the files during playback
        const allFiles = {};
        //a new updated list of events with some thrown out
        const updatedEvents = [];

        //marks the start and end of a group of events in between two comments
        let startPos = 0;
        let endPos;
        for(let i = 1;i < originalEvents.length;i++) {
            //if there is a comment at this event or at the end of playback
            if(comments[originalEvents.id] || i === originalEvents.length - 1) {
                //don't include the event where the comment is
                endPos = i - 1;

                //remove any events added and then deleted between the comments
                this.editEventsBetweenTwoComments(startPos, endPos, originalEvents, allFiles, updatedEvents);

                //start after the comment
                startPos = i + 1;
            }
        }

        return updatedEvents;
    }

    editEventsBetweenTwoComments(startPos, endPos, originalEvents, allFiles, updatedEvents) {
        //for back to back comments
        if(startPos >= endPos) return;

        //key: id of insert event that is removed, value: id of delete that removes it
        const insertsDeletedInThisSpan = {
            //insertEventId: deleteEventId
        };
        //ids of the events to be filtered out
        const insertsToBeRemoved = new Set();
        const deletesToBeRemoved = new Set();
        
        //search backwards 
        for(let i = endPos;i >= startPos;i--) {
            const event = originalEvents[i];
            
            //check the event type
            if(event.type === 'DELETE') {
                const deletedInsertId = event.previousNeighborId;
                const deleteId = event.id;
                //use the id of the insert as a key, and the id of the delete as a val
                insertsDeletedInThisSpan[deletedInsertId] = deleteId;
            } else if(event.type === 'INSERT') {
                //if this insert was deleted in the range
                if(insertsDeletedInThisSpan[event.id]) {
                    //store the ids of the events to remove
                    insertsToBeRemoved.add(event.id);
                    deletesToBeRemoved.add(insertsDeletedInThisSpan[event.id]);
                }
            } 
        }

        //go through all of the events in the range
        for(let i = startPos;i <= endPos;i++) {
            const event = originalEvents[i];
            if(event.type === 'INSERT') {
                //if this is an insert that needs to be removed
                if(insertsToBeRemoved.has(event.id)) {
                    //add a new property to the event
                    event.removePerfectProgrammer = true;
                    //add it in the file
                    this.addInsertEvent(event, allFiles);
                } else { //no need to remove this insert event
                    //add it in the file
                    this.addInsertEvent(event, allFiles);
                    //update the sequence number and add it to the new list of events
                    event.eventSequenceNumber = updatedEvents.length;
                    updatedEvents.push(event);
                }
            } else if(event.type === 'DELETE') {
                //remove the insert from the file
                this.addDeleteEvent(event, allFiles);
                //if this delete is NOT being removed
                if(deletesToBeRemoved.has(event.id) === false) {
                    //update the sequence number and add it to the new list of events
                    event.eventSequenceNumber = updatedEvents.length;
                    updatedEvents.push(event);
                }
            } else { //non insert/delete events
                //update the sequence number and add it to the new list of events
                event.eventSequenceNumber = updatedEvents.length;
                updatedEvents.push(event);
            }
        }
    }

    addInsertEvent(event, allFiles) {
        //if this is the first insert in a new file
        if(!allFiles[event.fileId]) {
            //create an empty 2D array
            allFiles[event.fileId] = [];
        }

        //get the 2D array for this event's file
        const textFileInsertEvents = allFiles[event.fileId];

        //if this is the first insert on a new row (underneath the current last row)
        if((event.lineNumber - 1) === textFileInsertEvents.length) { 
            //create a new row at the bottom with the new event
            textFileInsertEvents.push([event]);
        } else { //the insert is in an existing row
            //insert somewhere in the middle
            textFileInsertEvents[(event.lineNumber - 1)].splice((event.column - 1), 0, event);
        }
        
        //if the new character was a newline character
        if(event.character === 'NEWLINE' || event.character === 'CR-LF') {
            //get the rest of the line after the newline character
            const restOfLine = textFileInsertEvents[(event.lineNumber - 1)].splice((event.column - 1) + 1, textFileInsertEvents[(event.lineNumber - 1)].length - (event.column - 1));
            
            //add a new row that the newline created with the end of the current line
            textFileInsertEvents.splice((event.lineNumber - 1) + 1, 0, restOfLine); 
        }

        //if this event is not being removed and it is not the first character in a file
        if(!event.removePerfectProgrammer && event.previousNeighborId) {
            //calculate the row/col of its previous neighbor
            let prevNeighborRow = (event.lineNumber - 1);
            let prevNeighborCol = (event.column - 1);

            //go back one to the event's previous neighbor
            if(prevNeighborCol === 0) {
                prevNeighborRow = prevNeighborRow - 1;
                prevNeighborCol = textFileInsertEvents[prevNeighborRow].length - 1;
            } else {
                prevNeighborCol = prevNeighborCol - 1;
            }

            //while the previous neighbor is a removed insert
            while(textFileInsertEvents[prevNeighborRow][prevNeighborCol].removePerfectProgrammer) {
                //go back another event
                if(prevNeighborCol === 0) {
                    prevNeighborRow = prevNeighborRow - 1;
                    prevNeighborCol = textFileInsertEvents[prevNeighborRow].length - 1;
                } else {
                    prevNeighborCol = prevNeighborCol - 1;
                }
            }
            //store the event's new row, col, and prev neighbor id
            event.lineNumber = prevNeighborRow + 1;
            event.column = prevNeighborCol + 2;
            event.previousNeighborId = textFileInsertEvents[prevNeighborRow][prevNeighborCol].id;
        }
    }

    addDeleteEvent(event, allFiles) {
        //get the 2D array for this event's file
        const textFileInsertEvents = allFiles[event.fileId];

        //if we are removing a newline character
        if(textFileInsertEvents[(event.lineNumber - 1)][(event.column - 1)].character === 'NEWLINE' || textFileInsertEvents[(event.lineNumber - 1)][(event.column - 1)].character === 'CR-LF') {
            //remove the newline character from its line
            textFileInsertEvents[(event.lineNumber - 1)].splice((event.column - 1), 1);

            //if there is a 'next' row, move all the elements up to this row
            if((event.lineNumber - 1) + 1 < textFileInsertEvents.length) {
                //get the next row (it may be an empty row)
                const copyElements = textFileInsertEvents[(event.lineNumber - 1) + 1].splice(0);

                //add the elements to the current row
                for(let i = 0;i < copyElements.length;i++) {
                    textFileInsertEvents[(event.lineNumber - 1)].push(copyElements[i]);                
                }
                
                //remove the row that we copied all of the elements over
                textFileInsertEvents.splice((event.lineNumber - 1) + 1, 1);
            } //else- this is the last row in the file- there is not another row after this one to copy over            
        } else { //removing a non-newline
            //remove the id
            textFileInsertEvents[(event.lineNumber - 1)].splice((event.column - 1), 1);
        }

        //if there is nothing left on the row
        if(textFileInsertEvents[(event.lineNumber - 1)].length === 0) {
            //remove the row
            textFileInsertEvents.splice((event.lineNumber - 1), 1);
        }
    }
}

module.exports = ProjectManager;