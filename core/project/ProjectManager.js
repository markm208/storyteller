const fs = require('fs');
const path = require('path');

const Project = require('./Project');
const DeveloperManager = require('../developers/DeveloperManager');
const EventManager = require('../events/EventManager');
const FileSystemManager = require('../filesAndDirs/FileSystemManager');
const CommentManager = require('../comments/CommentManager');
const HttpServer = require('./HttpServer');
const PathHelper = require('./PathHelper');
const IgnorePath = require('./IgnorePath.js');
const PerfectProgrammerHelper = require('./PerfectProgrammerHelper.js');
const DBAbstraction = require('./DBAbstraction.js');

/*
 * This class manages most aspects of the open storyteller project.
 * This includes responding to editor activity and generating events
 * for file/dir operations and text edits.
 * It creates references to the other managers (developer, file system,
 * event) and coordinates their interaction. All of the managers store
 * their data in memory. This class is responsible for persisting the
 * data to disk.
 */
class ProjectManager {
    constructor(projDirPath, stDirPath, version, openaiApiKey) {
        this.projectDirPath = projDirPath;
        this.storytellerDirPath = path.join(projDirPath, stDirPath);
        this.db = null;
        this.project = {};
        this.version = version;
        this.openaiApiKey = openaiApiKey;
        this.eventTimer = null;
        //whether playback data should be altered for the next playback
        this.playbackConstraints = null;
    }

    startStoryteller(isNewProject) {
        return new Promise(async (resolve, reject) => {
            try {                
                //used to persist playback data on the disk
                this.db = new DBAbstraction(this.storytellerDirPath);
                await this.db.openDb(isNewProject);
                
                //create the in-memory managers
                this.developerManager = new DeveloperManager();
                this.fileSystemManager = new FileSystemManager();
                this.eventManager = new EventManager();
                this.commentManager = new CommentManager();

                //for normalizing paths (going from full paths to relative paths)
                this.pathHelper = new PathHelper(this.projectDirPath);

                //read in the st-ignore file (if there is one)
                this.ignorePath = new IgnorePath(this.projectDirPath);

                //create an http server to listen for editors and playbacks
                this.httpServer = new HttpServer(this, this.openaiApiKey);
                
                if(isNewProject) {
                    //create the initial data
                    this.project = new Project('Playback', 'Playback Description', this.version);
                    this.developerManager.init();

                    //create the root dir, /
                    const newNormalizedDirPath = this.pathHelper.normalizeDirPath(this.projectDirPath);
                    const dirObj = this.fileSystemManager.addDirectory(newNormalizedDirPath);
                    
                    //add the first event (CREATE DIRECTORY) 
                    const timestamp = new Date().getTime();
                    const devGroupId = this.developerManager.getActiveDeveloperGroupId();
                    const branchId = this.project.branchId;
                    this.eventManager.insertCreateDirectoryEvent(dirObj, timestamp, devGroupId, branchId, false);
                    this.addDescriptionComment(this.eventManager.unwrittenEvents[0]);

                    //switch to the anonymous developer group
                    this.developerManager.setActiveDeveloperGroup(this.developerManager.getAnonymousDeveloperGroup());

                    //write the initial data to the db
                    this.db.writeDeveloperInfo(this.developerManager);
                    this.db.writeFSInfo(this.fileSystemManager);
                    this.db.writeEventInfo(this.eventManager.unwrittenEvents);
                    this.db.writeCommentInfo(this.commentManager);
                    this.db.writeProjectInfo(this);
                } else {
                    //use the data read from the db to load the managers with data
                    this.developerManager.load(this.db.devs);
                    this.commentManager.load(this.db.comments);
                    this.eventManager.load(this.db.events.numberOfEvents);
                    this.fileSystemManager.load(this.db.fs);
                    this.project = this.db.project;
                }

                //setup a recurring function to write events to the db
                this.eventTimer = setInterval(() => {
                    //write the events to the db
                    const hasChanges = this.db.writeEventInfo(this.eventManager.unwrittenEvents);
                    if(hasChanges) {
                        this.db.writeFSInfo(this.fileSystemManager);
                    }
                }, 5000);

                resolve();
            } catch (err) {
                console.error(err);
                reject();
            }
        });
    }

    /*
     * Writes all data to the file system.
     */
    stopStoryteller() {
        //stop the http server
        this.httpServer.close();
        
        //stop the event timer and write the events to the db
        clearInterval(this.eventTimer);

        //write the final state of the fs and any events to the db
        const hasChanges = this.db.writeEventInfo(this.eventManager.unwrittenEvents);
        if(hasChanges) {
            this.db.writeFSInfo(this.fileSystemManager);
        }
    }
    
    addDescriptionComment(lastEvent) {        
        //add the description comment
        this.addComment({
            commentText: 'Enter a playback description.',
            commentTitle: '',
            timestamp: new Date().getTime(),
            displayCommentEventId: lastEvent.id,
            displayCommentEventSequenceNumber: lastEvent.eventSequenceNumber,
            developerGroupId: this.developerManager.getActiveDeveloperGroupId(), 
            selectedCodeBlocks: [],
            imageURLs: [],
            videoURLs: [],
            audioURLs: [],
            linesAbove: 0,
            linesBelow: 0,
            currentFilePath: "",
            viewableBlogText: "",
            commentTags: [],
            questionCommentData: null
        });
    }

    updateProjectTitleDescription(title, description) {
        this.project.title = title;
        this.project.description = description;
        
        //write the changes to the db
        this.db.writeProjectInfo(this);
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
            this.db.writeFSInfo(this.fileSystemManager);

            //insert a create directory event 
            const timestamp = new Date().getTime();
            const devGroupId = this.developerManager.getActiveDeveloperGroupId();
            const branchId = this.project.branchId;
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
            //add the new file to the in-memory file state representation
            const fileObj = this.fileSystemManager.addFile(newNormalizedFilePath);
            this.db.writeFSInfo(this.fileSystemManager);

            //insert a create file event
            const timestamp = new Date().getTime();
            const devGroupId = this.developerManager.getActiveDeveloperGroupId();
            const branchId = this.project.branchId;
            this.eventManager.insertCreateFileEvent(fileObj, timestamp, devGroupId, branchId, isRelevant);
    
            //it is possible that a new file will have some text in it already
            //for example, if a file is copied into a storyteller project

            //if the new file already has some text in it then write it in one big chunk
            const fileContents = fs.readFileSync(newFilePath, 'utf8');
            if(fileContents.length > 0) {
                //store the current dev group
                const currentDevGroup = this.developerManager.getActiveDeveloperGroup();
                //assign the changes to the system dev group
                this.developerManager.setActiveDeveloperGroup(this.developerManager.getSystemDeveloperGroup());
                
                //record the new text
                this.handleInsertedText(newFilePath, fileContents, 0, 0, [], isRelevant);
                
                //set the current dev group back to the original value
                this.developerManager.setActiveDeveloperGroup(currentDevGroup);
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
    
            //insert a delete dir event
            const timestamp = new Date().getTime();
            const devGroupId = this.developerManager.getActiveDeveloperGroupId();
            const branchId = this.project.branchId;

            //delete all of the files/dirs inside the deleted dir first
            this.deleteDirectoryHelper(dirObj.id, timestamp, devGroupId, branchId);
            //generate a delete dir event
            this.eventManager.insertDeleteDirectoryEvent(dirObj, timestamp, devGroupId, branchId);

            //remove the dir in the in-memory file state representation
            this.fileSystemManager.removeDirectory(delNormalizedDirPath);
            this.db.writeFSInfo(this.fileSystemManager);
        } //else- this dir should be ignored because the user requested it in /st-ignore.json
    }
    /*
     * For creating multiple delete events on deleting a directory (not 
     * currently used- that may change in the future)
     */
    deleteDirectoryHelper(deletedDirId, timestamp, devGroupId, branchId) {
        //go through all of the tracked dirs
        for(let dirId in this.fileSystemManager.allDirs) {
            const dir = this.fileSystemManager.allDirs[dirId];

            //if a dir has been deleted because it is in a deleted dir
            if(dir.parentDirectoryId === deletedDirId) {
                //recurse through out the subdir
                this.deleteDirectoryHelper(dir.id, timestamp, devGroupId, branchId);

                //generate a delete dir event
                this.eventManager.insertDeleteDirectoryEvent(dir, timestamp, devGroupId, branchId);
            }
        }

        //go through all of the tracked files
        for(let fileId in this.fileSystemManager.allFiles) {
            const file = this.fileSystemManager.allFiles[fileId];

            //if a file has been deleted because it is in a deleted dir
            if(file.parentDirectoryId === deletedDirId) {
                //generate a delete file event
                this.eventManager.insertDeleteFileEvent(file, timestamp, devGroupId, branchId);
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
            this.db.writeFSInfo(this.fileSystemManager);

            //insert a delete file event
            const timestamp = new Date().getTime();
            const devGroupId = this.developerManager.getActiveDeveloperGroupId();
            const branchId = this.project.branchId;
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
            const devGroupId = this.developerManager.getActiveDeveloperGroupId();
            const branchId = this.project.branchId;
            this.eventManager.insertMoveDirectoryEvent(timestamp, devGroupId, branchId, oldDirObj.id, newDirParentDirectoryId, oldDirParentDirectoryId, newNormalizedDirPath, oldNormalizedDirPath);
        } //else- this dir should be ignored because the user requested it in /st-ignore.json

        this.db.writeFSInfo(this.fileSystemManager);
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
            const devGroupId = this.developerManager.getActiveDeveloperGroupId();
            const branchId = this.project.branchId;
            this.eventManager.insertMoveFileEvent(timestamp, devGroupId, branchId, oldFileObj.id, newFileParentDirectoryId, oldFileParentDirectoryId, newNormalizedFilePath, oldNormalizedFilePath);
        } //else- this file should be ignored because the user requested it in /st-ignore.json
        
        this.db.writeFSInfo(this.fileSystemManager);
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
            this.db.writeFSInfo(this.fileSystemManager);

            //insert a delete dir event
            const timestamp = new Date().getTime();
            const devGroupId = this.developerManager.getActiveDeveloperGroupId();
            const branchId = this.project.branchId;
            this.eventManager.insertRenameDirectoryEvent(timestamp, devGroupId, branchId, oldDirObj.id, oldDirObj.parentDirectoryId, newNormalizedDirPath, oldNormalizedDirPath);
        } //else- this dir should be ignored because the user requested it in /st-ignore.json

        this.db.writeFSInfo(this.fileSystemManager);
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
            const devGroupId = this.developerManager.getActiveDeveloperGroupId();
            const branchId = this.project.branchId;
            this.eventManager.insertRenameFileEvent(timestamp, devGroupId, branchId, oldFileObj.id, oldFileObj.parentDirectoryId, newNormalizedFilePath, oldNormalizedFilePath);
        } //else- this file should be ignored because the user requested it in /st-ignore.json
        
        this.db.writeFSInfo(this.fileSystemManager);
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
                    const devGroupId = this.developerManager.getActiveDeveloperGroupId();
                    const branchId = this.project.branchId;
                
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
                    const devGroupId = this.developerManager.getActiveDeveloperGroupId();
                    const branchId = this.project.branchId;
                    
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
        let playbackEvents = this.getAllEvents();
        let playbackComments = this.commentManager.comments;

        //if this playback is a preview of a 'perfect programmer' change 
        if(this.playbackConstraints) {            
            //look at the type of constraint
            if(this.playbackConstraints.type === 'betweenComments') {
                //create a helper class for editing the events
                const pph = new PerfectProgrammerHelper();

                //edit the event data to include only events that made the comment points
                const updatedEventsAndComments = pph.editBetweenComments(playbackEvents, playbackComments, this.playbackConstraints.usePerfectProgrammerStyle);
                playbackEvents = updatedEventsAndComments.updatedEvents;
                playbackComments = updatedEventsAndComments.updatedComments;

                //'perfect programmer' preview playbacks can't be edited
                makeEditable = false;
            } else if(this.playbackConstraints.type === 'selectedText') {
                //go through all of the events and mark the ones that are not relevant
                for(const event of playbackEvents) {
                    //if this event has NOT already been filtered out 
                    if(event.permanentRelevance !== 'never relevant') {
                        //if this event is not relevant
                        if(!this.playbackConstraints.relevantIds.has(event.id)) {
                            //mark the event with a temporary attribute as filtered out
                            event.relevance = 'filtered out';
                        }
                    }
                }
                //'selected text' preview playbacks can be edited
                makeEditable = true;
            }
            //future playbacks will be normal
            this.playbackConstraints = null;
        }

        //create the js function that loads the playback data
        const funcText = this.getLoadPlaybackDataFunc(playbackEvents, playbackComments, makeEditable);

        return funcText;
    }

    //-- developer related 
    getActiveDevelopers() {
        return this.developerManager.getActiveDevelopers();
    }

    getInactiveDevelopers() {
        return this.developerManager.getInactiveDevelopers();
    }

    createDeveloperAndAddToActiveGroup(userName, email) {
        const newDevAndGroup = this.developerManager.createNewDeveloper(userName, email);
        this.developerManager.addDevelopersToActiveGroup([newDevAndGroup.newDeveloper.id]);
        this.db.writeDeveloperInfo(this.developerManager);
    }

    addDevelopersToActiveGroupByUserName(userNames) {
        this.developerManager.addDevelopersToActiveGroupByUserName(userNames);
        this.db.writeDeveloperInfo(this.developerManager);
    }

    removeDevelopersFromActiveGroupByUserName(userNames) {
        this.developerManager.removeDevelopersFromActiveGroupByUserName(userNames);
        this.db.writeDeveloperInfo(this.developerManager);
    }

    replaceAnonymousDeveloperWithNewDeveloper(userName, email) {
        this.developerManager.replaceAnonymousDeveloperWithNewDeveloper(userName, email);
        this.db.writeDeveloperInfo(this.developerManager);
    }

    //--comment
    addComment(comment) {
        //make the active dev group responsible for the comment
        comment['developerGroupId'] = this.developerManager.getActiveDeveloperGroupId();
        //add the comment to the comment manager
        const newComment = this.commentManager.addComment(comment);
        //write the comment info to the db
        this.db.writeCommentInfo(this.commentManager);
        
        return newComment;
    }

    updateComment(comment) {
        //update the comment in the comment manager
        const updatedComment = this.commentManager.updateComment(comment);
        //write the comment info to the db
        this.db.writeCommentInfo(this.commentManager);

        return updatedComment;
    }

    updateCommentPosition(commentPositionData) {
        //update the comment position in the comment manager
        this.commentManager.updateCommentPosition(commentPositionData);
        //write the comment info to the db
        this.db.writeCommentInfo(this.commentManager);
    }

    deleteComment(comment) {
        //delete the comment from the comment manager
        this.commentManager.deleteComment(comment);

        //remove the media associated with the comment
        for(let i = 0;i < comment.imageURLs.length;i++) {
            const imageURL = comment.imageURLs[i];
            this.deleteMediaFile(imageURL);
        }

        for(let i = 0;i < comment.videoURLs.length;i++) {
            const videoURL = comment.videoURLs[i];
            this.deleteMediaFile(videoURL);
        }

        for(let i = 0;i < comment.audioURLs.length;i++) {
            const audioURL = comment.audioURLs[i];
            this.deleteMediaFile(audioURL);
        }

        //write the comment info to the db
        this.db.writeCommentInfo(this.commentManager);
    }

    getReadTimeEstimate() {
        //get the read time estimate from the comment manager
        return this.commentManager.getReadTimeEstimate();
    }

    //--events
    getAllEvents() {
        //write any changes to the fs
        this.db.writeFSInfo(this.fileSystemManager);

        //returns all the events 
        return this.db.readEvents(this.eventManager.unwrittenEvents);
    }

    //--media
    addMediaFile(data, pathToNewFile) {
        //builds the path to the new file in the comments/media/media_type folder
        pathToNewFile = path.join(this.storytellerDirPath, 'comments', pathToNewFile);
        //add the media file to the db
        return this.db.addMediaFile(data, pathToNewFile);
    }

    deleteMediaFile(filePath) {
        //builds the path to the new file in the comments/media/media_type folder
        filePath = path.join(this.storytellerDirPath, 'comments', filePath);
        //removes the media file from the db
        this.db.deleteMediaFile(filePath);
    }

    getMediaFile(pathToFile) {
        //builds the path to the new file in the comments/media/media_type folder
        pathToFile = path.join(this.storytellerDirPath, 'comments',  pathToFile);
        //retrieve the media file from the db
        return this.db.getMediaFile(pathToFile);
    }

    replaceEventsCommentsWithPerfectProgrammerData(usePerfectProgrammerStyle) {
        //create a helper class for editing the events
        const pph = new PerfectProgrammerHelper();
            
        //get all the events from the file
        const allEvents = this.getAllEvents();
        
        //edit the event data to include only events that made the comment points
        const updatedEventsAndComments = pph.editBetweenComments(allEvents, this.commentManager.comments, usePerfectProgrammerStyle);
        
        //get rid of old event data
        this.eventManager.unwrittenEvents = [];
        this.db.emptyEventInfo();
        //store the new number of events in the event manager
        this.eventManager.numberOfEvents = updatedEventsAndComments.updatedEvents.length;

        //replace all of the original events with the updated 'perfect programmer' events
        this.db.writeEventInfo(updatedEventsAndComments.updatedEvents);

        //replace the comments with updated ones
        this.commentManager.comments = updatedEventsAndComments.updatedComments;
        //write any changes to the comments back to the db (display event id, seq#, position)
        this.db.writeCommentInfo(this.commentManager);
    }

    getLoadPlaybackDataFunc(events, comments, makeEditable) {
        //create the text for a js function that loads the playback into a global called playbackData
        const func = 
`
function loadPlaybackData(playbackData) {
    playbackData.events = ${JSON.stringify(events)};
    playbackData.comments = ${JSON.stringify(comments)};
    playbackData.numEvents = ${events.length};
    playbackData.isEditable = ${makeEditable ? 'true' : 'false'};
    playbackData.developers = ${JSON.stringify(this.developerManager.allDevelopers)};
    playbackData.developerGroups = ${JSON.stringify(this.developerManager.allDeveloperGroups)};
    playbackData.anonymousDeveloperId = ${JSON.stringify(this.developerManager.anonymousDeveloperId)};
    playbackData.anonymousDeveloperGroupId = ${JSON.stringify(this.developerManager.anonymousDeveloperGroupId)};
    playbackData.systemDeveloperId = ${JSON.stringify(this.developerManager.systemDeveloperId)};
    playbackData.systemDeveloperGroupId = ${JSON.stringify(this.developerManager.systemDeveloperGroupId)};
    playbackData.playbackTitle = '${this.project.title.replace(/'/g, "&#39;")}';
    playbackData.branchId = '${this.project.branchId}';
    playbackData.estimatedReadTime = ${this.getReadTimeEstimate()};
}`;
        return func;
    }

    setNextPlaybackPerfectProgrammer(isPerfectProgrammer) {
        this.playbackConstraints = {
            type: 'betweenComments', 
            usePerfectProgrammerStyle: isPerfectProgrammer
        };
    }

    setNextPlaybackSelectedText(selectedEvents) {
        const relevantIds = this.filterBySelectedText(selectedEvents);
        this.playbackConstraints = {
            type: 'selectedText',
            relevantIds: relevantIds
        };
    }

    filterBySelectedText(selectedEvents) {
        //ids of all the events that will get played out
        const idsOfRelevantInsertsAndDeletes = new Set();

        //if there are any selected events
        if(selectedEvents.length > 0) {
            //add all of the ids of the selected text 
            for(let i = 0;i < selectedEvents.length;i++) {
                idsOfRelevantInsertsAndDeletes.add(selectedEvents[i].eventId);
            }
            //used to prevent previous neighbors of the last event from being added
            const lastEvent = selectedEvents[selectedEvents.length - 1];
            
            //get all of the events and find the ones that should be played back
            const allEvents = this.getAllEvents();
            for(const event of allEvents) {
                if(event.type === 'INSERT' || event.type === 'DELETE') {
                    //if this not backing up to the last event AND is an insert/delete that backs up to a relevant event
                    if(event.previousNeighborId !== lastEvent.eventId &&
                       idsOfRelevantInsertsAndDeletes.has(event.previousNeighborId)) {
                        //add this event as a relevant event
                        idsOfRelevantInsertsAndDeletes.add(event.id);
                    }
                }
            }
            //now add the last selected character
            idsOfRelevantInsertsAndDeletes.add(selectedEvents[selectedEvents.length - 1].eventId);
        }
    
        return idsOfRelevantInsertsAndDeletes;        
    }

    debugPrint(textFileInsertEvents) {
        textFileInsertEvents.forEach(line => {
            let lineString = '';
            line.forEach(event => {
                if(!event.removePerfectProgrammer) {
                    lineString += event.character + '  ';
                }
            });
            console.log(lineString);
        });
        console.log('');

        textFileInsertEvents.forEach(line => {
            let lineString = '';
            line.forEach(event => {
                if(!event.removePerfectProgrammer) {
                    lineString += event.character + '  ';
                } else {
                    lineString += '*' + event.character + ' ';
                }
            });
            console.log(lineString);
        });
        console.log('');
        console.log('');
    }
}

module.exports = ProjectManager;