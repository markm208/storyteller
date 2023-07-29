const fs = require('fs');
const path = require('path');

const utilities = require('../utilities.js');
const DeveloperManager = require('../developers/DeveloperManager');
const EventManager = require('../events/EventManager');
const FileSystemManager = require('../filesAndDirs/FileSystemManager');
const CommentManager = require('../comments/CommentManager');
const HttpServer = require('./HttpServer');
const PathHelper = require('./PathHelper');
const IgnorePath = require('./IgnorePath.js');
const PerfectProgrammerHelper = require('./PerfectProgrammerHelper.js');
const DBAbstraction = require('./DBAbstraction.js');

//file name of the sqlite database
const STORYTELLER_DB_NAME = 'st.db';

/*
 * This class manages most aspects of the open storyteller project.
 * This includes responding to editor activity and generating events
 * for file/dir operations and text edits.
 * It creates references to the other managers (developer, file system,
 * event) and coordinates most of their interaction.
 */
class ProjectManager {
    constructor(projDirPath, stDirPath) {
        this.projectDirPath = projDirPath;
        this.storytellerDirPath = stDirPath;
        
        //the playback data should be altered for the next playback
        this.playbackConstraints = null;
    }

    init(isNewProject) {
        return new Promise(async (resolve, reject) => {
            try {                
                //create an unopened database then open it
                const dbPath = path.join(this.projectDirPath, this.storytellerDirPath, STORYTELLER_DB_NAME);
                this.db = new DBAbstraction(dbPath);
                await this.db.openDb();
                
                //create the dev, file system, and event managers (opens and reads 
                //data if present, initializes data otherwise)
                this.developerManager = new DeveloperManager(this.db);
                this.fileSystemManager = new FileSystemManager(this.db);
                this.eventManager = new EventManager(this.db);
                this.commentManager = new CommentManager(this.db);
                
                //init all of the managers
                await Promise.all([
                    this.developerManager.init(isNewProject),
                    this.fileSystemManager.init(isNewProject),
                    this.eventManager.init(isNewProject),
                    this.commentManager.init(isNewProject)
                ]);

                //for normalizing paths (going from full paths to relative paths)
                this.pathHelper = new PathHelper(this.projectDirPath);
                
                //read in the st-ignore file (if there is one)
                this.ignorePath = new IgnorePath(this.projectDirPath);

                //create an http server to listen for editors and playbacks
                this.httpServer = new HttpServer(this);
                
                if(isNewProject) {
                    //create a Project (title, description, and initial 6 digit branch id)
                    this.project = await this.db.createProject('Playback', 'Playback Description', utilities.createRandomNumberBase62(8));
                    
                    //create the root dir, /
                    //get a normalized dir path
                    const newNormalizedDirPath = this.pathHelper.normalizeDirPath(this.projectDirPath);
        
                    //add the new dir to the file state representation
                    const dirObj = await this.fileSystemManager.addDirectory(newNormalizedDirPath);
                    
                    //insert a create directory event 
                    const timestamp = new Date().getTime();
                    const devGroupId = this.developerManager.getActiveDeveloperGroupId();
                    const branchId = this.project.branchId;
                    await this.eventManager.insertCreateDirectoryEvent(dirObj, timestamp, devGroupId, branchId, false);
                    await this.addDescriptionComment();
                } else {
                    //read project from db
                    this.project = await this.db.getProject();
                }

                resolve();
            } catch (err) {
                console.error(err);
                reject();
            }
        });
    }

    async updateProjectTitleDescription(title, description) {
        this.project.title = title;
        this.project.description = description;
        await this.db.updateProject(this.project);
    }

    async addDescriptionComment() {
        //get all the events (new projects only have 1)
        const allEvents = await this.eventManager.getAllEvents();
        
        //get the last event
        const lastEvent = allEvents[allEvents.length - 1];
        
        //add the description comment
        await this.commentManager.addComment({
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
    /*
     * Writes all data to the file system.
     */
    async stopStoryteller() {
        //stop the http server
        this.httpServer.close();

        //cleanup (if these don't execute the data will be fine)
        await Promise.all([
            this.commentManager.removeUnusedTags(),
            this.commentManager.removeUnusedMediaFiles()
        ]);
    }
    
    /*
     * Creates a new directory.
     */
    async createDirectory(newDirPath, isRelevant=true) {
        //get a normalized dir path
        const newNormalizedDirPath = this.pathHelper.normalizeDirPath(newDirPath);
        
        //if the directory should not be ignored
        if(this.ignorePath.ignoreThisFileOrDir(newNormalizedDirPath) === false) {
            //add the new dir to the in-memory file state representation
            const dirObj = await this.fileSystemManager.addDirectory(newNormalizedDirPath);
            
            //insert a create directory event 
            const timestamp = new Date().getTime();
            const devGroupId = this.developerManager.getActiveDeveloperGroupId();
            const branchId = this.project.branchId;
            return await this.eventManager.insertCreateDirectoryEvent(dirObj, timestamp, devGroupId, branchId, isRelevant);
        } //else- this dir should be ignored because the user requested it in /st-ignore.json
    }
    /*
     * Creates a new file.
     */
    async createFile(newFilePath, isRelevant=true) {
        //get a normalized file path
        const newNormalizedFilePath = this.pathHelper.normalizeFilePath(newFilePath);
        
        //if the file should not be ignored 
        if(this.ignorePath.ignoreThisFileOrDir(newNormalizedFilePath) === false) {
            //add the new file to the in-memory file state representation
            const fileObj = await this.fileSystemManager.addFile(newNormalizedFilePath);
    
            //insert a create file event
            const timestamp = new Date().getTime();
            const devGroupId = this.developerManager.getActiveDeveloperGroupId();
            const branchId = this.project.branchId;
            await this.eventManager.insertCreateFileEvent(fileObj, timestamp, devGroupId, branchId, isRelevant);
    
            //it is possible that a new file will have some text in it already
            //for example, if a file is copied into a storyteller project

            //if the new file already has some text in it then write it in one big chunk
            const fileContents = fs.readFileSync(newFilePath, 'utf8');
            if(fileContents.length > 0) {
                //store the current dev group
                const currentDevGroup = this.developerManager.getActiveDeveloperGroup();
                //assign the changes to the system dev group
                await this.developerManager.setActiveDeveloperGroup(this.developerManager.systemDeveloperGroup);
                
                //record the new text
                this.handleInsertedText(newFilePath, fileContents, 0, 0, [], isRelevant);
                
                //set the current dev group back to the original value
                await this.developerManager.setActiveDeveloperGroup(currentDevGroup);
            }
        } //else- this file should be ignored because the user requested it in /st-ignore.json
    }
    /*
     * Deletes a file or a directory
     */
    async deleteFileOrDirectory(delPath) {
        //get a normalized path
        const delNormalizedPath = this.pathHelper.normalizeDirPath(delPath);
    
        try {
            //attempt to get the dir info object (throws an exception if not present and we know it is a file)
            this.fileSystemManager.getDirInfoFromDirPath(delNormalizedPath);
    
            //if the path is to a dir there will be no exception and we'll delete the dir
            await this.deleteDirectory(delPath);
        } catch(ex) {
            //the path did not represent a dir, so it must a file
            await this.deleteFile(delPath);
        }
    }
    /*
     * Deletes a directory
     */
    async deleteDirectory(delDirPath) {
        //get a normalized dir path
        const delNormalizedDirPath = this.pathHelper.normalizeDirPath(delDirPath);
    
        //if the directory should not be ignored (ignores /.storyteller paths and /st-ignore.json file)
        if(this.ignorePath.ignoreThisFileOrDir(delNormalizedDirPath) === false) {
            //get the dir object
            const dirObj = this.fileSystemManager.getDirInfoFromDirPath(delNormalizedDirPath);
    
            //remove the dir in the in-memory file state representation
            await this.fileSystemManager.removeDirectory(delNormalizedDirPath);
            
            //insert a delete dir event
            const timestamp = new Date().getTime();
            const devGroupId = this.developerManager.getActiveDeveloperGroupId();
            const branchId = this.project.branchId;
            await this.eventManager.insertDeleteDirectoryEvent(dirObj, timestamp, devGroupId, branchId);

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
    async deleteDirectoryHelper(deletedDirId, timestamp, devGroupId, branchId) {
        //go through all of the tracked files
        for(let fileId in this.fileSystemManager.allFiles) {
            const file = this.fileSystemManager.allFiles[fileId];

            //if a file has been deleted because it is in a deleted dir
            if(file.parentDirectoryId === deletedDirId) {
                //generate a delete file event
                await this.eventManager.insertDeleteFileEvent(file, timestamp, devGroupId, branchId);
            }
        }

        //go through all of the tracked dirs
        for(let dirId in this.fileSystemManager.allDirs) {
            const dir = this.fileSystemManager.allDirs[dirId];

            //if a dir has been deleted because it is in a deleted dir
            if(dir.parentDirectoryId === deletedDirId) {
                //generate a delete dir event
                await this.eventManager.insertDeleteDirectoryEvent(dir, timestamp, devGroupId, branchId);

                //recurse through out the subdir
                this.deleteDirectoryHelper(dir.id, timestamp, devGroupId, branchId);
            }
        }
    }
    /*
     * Deletes a file.
     */
    async deleteFile(delFilePath) {
        //get a normalized file path
        const delNormalizedFilePath = this.pathHelper.normalizeFilePath(delFilePath);
    
        //if the file should not be ignored 
        if(this.ignorePath.ignoreThisFileOrDir(delNormalizedFilePath) === false) {
            //get the file object
            const fileObj = this.fileSystemManager.getFileInfoFromFilePath(delNormalizedFilePath);
            
            //remove the file in the in-memory file state representation
            await this.fileSystemManager.removeFile(delNormalizedFilePath);
    
            //insert a delete file event
            const timestamp = new Date().getTime();
            const devGroupId = this.developerManager.getActiveDeveloperGroupId();
            const branchId = this.project.branchId;
            await this.eventManager.insertDeleteFileEvent(fileObj, timestamp, devGroupId, branchId);
        } //else- this file should be ignored because the user requested it in /st-ignore.json
    }
    /*
     * Moves a directory.
     */
    async moveDirectory(oldDirPath, newDirPath) {
        //get normalized dir paths
        const oldNormalizedDirPath = this.pathHelper.normalizeDirPath(oldDirPath);
        const newNormalizedDirPath = this.pathHelper.normalizeDirPath(newDirPath);
    
        //if the directory is moved from an ignored location to a relevant one
        if(this.ignorePath.ignoreThisFileOrDir(oldNormalizedDirPath) === true &&
           this.ignorePath.ignoreThisFileOrDir(newNormalizedDirPath) === false) {
            //create directory with new dirPath
            await this.createDirectory(newDirPath);
            //recursively create the files and subdirectories inside this new one
            await this.createFilesAndSubDirs(newDirPath);
        //if the directory is moved from a relevant one to an ignored one
        } else if(this.ignorePath.ignoreThisFileOrDir(oldNormalizedDirPath) === false &&
                  this.ignorePath.ignoreThisFileOrDir(newNormalizedDirPath) === true) {
            //delete the old dirPath directory
            await this.deleteDirectory(oldDirPath);
        //if the directory move falls outside of the ignored paths, we need to perform a dir move
        } else if(this.ignorePath.ignoreThisFileOrDir(oldNormalizedDirPath) === false &&
                  this.ignorePath.ignoreThisFileOrDir(newNormalizedDirPath) === false) {
            //get the old dir object
            const oldDirObj = this.fileSystemManager.getDirInfoFromDirPath(oldNormalizedDirPath);
            const oldDirParentDirectoryId = oldDirObj.parentDirectoryId;
    
            //move the dir in the in-memory file state representation
            await this.fileSystemManager.moveDirectory(oldNormalizedDirPath, newNormalizedDirPath);
            //get the new parent dir id (updated in the code above)
            const newDirParentDirectoryId = oldDirObj.parentDirectoryId;
    
            //insert a delete dir event 
            const timestamp = new Date().getTime();
            const devGroupId = this.developerManager.getActiveDeveloperGroupId();
            const branchId = this.project.branchId;
            await this.eventManager.insertMoveDirectoryEvent(timestamp, devGroupId, branchId, oldDirObj.id, newDirParentDirectoryId, oldDirParentDirectoryId, newNormalizedDirPath, oldNormalizedDirPath);
        } //else- this dir should be ignored because the user requested it in /st-ignore.json
    }
    /*
     * Moves a file.
     */
    async moveFile(oldFilePath, newFilePath) {
        //get normalized file paths
        const oldNormalizedFilePath = this.pathHelper.normalizeFilePath(oldFilePath);
        const newNormalizedFilePath = this.pathHelper.normalizeFilePath(newFilePath);
    
        //if the file is moved from an ignored location to a relevant one
        if(this.ignorePath.ignoreThisFileOrDir(oldNormalizedFilePath) === true &&
           this.ignorePath.ignoreThisFileOrDir(newNormalizedFilePath) === false) {
            //create file at the new file path
            await this.createFile(newFilePath);
        //if the file is moved from a relevant one to an ignored one
        } else if(this.ignorePath.ignoreThisFileOrDir(oldNormalizedFilePath) === false &&
                  this.ignorePath.ignoreThisFileOrDir(newNormalizedFilePath) === true) {
            //delete the file at the old file path
            await this.deleteFile(oldFilePath)
        //if the file move falls outside of the ignored paths
        } else if(this.ignorePath.ignoreThisFileOrDir(oldNormalizedFilePath) === false &&
                  this.ignorePath.ignoreThisFileOrDir(newNormalizedFilePath) === false) {
            //get the old file object
            const oldFileObj = this.fileSystemManager.getFileInfoFromFilePath(oldNormalizedFilePath);
            const oldFileParentDirectoryId = oldFileObj.parentDirectoryId;
    
            //move the file in the in-memory file state representation
            await this.fileSystemManager.moveFile(oldNormalizedFilePath, newNormalizedFilePath);
    
            //get the new parent dir id (changed in the code above)
            const newFileParentDirectoryId = oldFileObj.parentDirectoryId;
    
            //insert a delete file event
            const timestamp = new Date().getTime();
            const devGroupId = this.developerManager.getActiveDeveloperGroupId();
            const branchId = this.project.branchId;
            await this.eventManager.insertMoveFileEvent(timestamp, devGroupId, branchId, oldFileObj.id, newFileParentDirectoryId, oldFileParentDirectoryId, newNormalizedFilePath, oldNormalizedFilePath);
        } //else- this file should be ignored because the user requested it in /st-ignore.json
    }
    /*
     * Renames a directory.
     */
    async renameDirectory(oldDirPath, newDirPath) {
        //get normalized dir paths
        const oldNormalizedDirPath = this.pathHelper.normalizeDirPath(oldDirPath);
        const newNormalizedDirPath = this.pathHelper.normalizeDirPath(newDirPath);
    
        //if the directory is renamed from an ignored name to a relevant one
        if(this.ignorePath.ignoreThisFileOrDir(oldNormalizedDirPath) === true &&
           this.ignorePath.ignoreThisFileOrDir(newNormalizedDirPath) === false) {
            //create directory at the new dir path
            await this.createDirectory(newDirPath);
            //recursively create the files and subdirectories inside this new one
            await this.createFilesAndSubDirs(newDirPath);
        //if the directory is renamed from a relevant one to an ignored one
        } else if(this.ignorePath.ignoreThisFileOrDir(oldNormalizedDirPath) === false &&
                  this.ignorePath.ignoreThisFileOrDir(newNormalizedDirPath) === true) {
            //delete the old directory path 
            await this.deleteDirectory(oldDirPath);
        //if the directory rename falls outside of the ignored paths
        } else if(this.ignorePath.ignoreThisFileOrDir(oldNormalizedDirPath) === false &&
                  this.ignorePath.ignoreThisFileOrDir(newNormalizedDirPath) === false) {
            //get the old dir object
            const oldDirObj = this.fileSystemManager.getDirInfoFromDirPath(oldNormalizedDirPath);
    
            //move the dir in the in-memory file state representation
            await this.fileSystemManager.renameDirectory(oldNormalizedDirPath, newNormalizedDirPath);
    
            //insert a delete dir event
            const timestamp = new Date().getTime();
            const devGroupId = this.developerManager.getActiveDeveloperGroupId();
            const branchId = this.project.branchId;
            await this.eventManager.insertRenameDirectoryEvent(timestamp, devGroupId, branchId, oldDirObj.id, oldDirObj.parentDirectoryId, newNormalizedDirPath, oldNormalizedDirPath);
        } //else- this dir should be ignored because the user requested it in /st-ignore.json
    }
    /*
     * Renames a file.
     */
    async renameFile(oldFilePath, newFilePath) {
        //get normalized file paths
        const oldNormalizedFilePath = this.pathHelper.normalizeFilePath(oldFilePath);
        const newNormalizedFilePath = this.pathHelper.normalizeFilePath(newFilePath);
    
        //if the file is renamed from an ignored name to a relevant one
        if(this.ignorePath.ignoreThisFileOrDir(oldNormalizedFilePath) === true &&
           this.ignorePath.ignoreThisFileOrDir(newNormalizedFilePath) === false) {
            //create file at the new path
            await this.createFile(newFilePath);
        //if the file is renamed from a relevant one to an ignored one
        } else if(this.ignorePath.ignoreThisFileOrDir(oldNormalizedFilePath) === false &&
                  this.ignorePath.ignoreThisFileOrDir(newNormalizedFilePath) === true) {
            //delete the file at the old path
            await this.deleteFile(oldFilePath);
        //if the file rename falls outside of the ignored paths
        } else if(this.ignorePath.ignoreThisFileOrDir(oldNormalizedFilePath) === false &&
                  this.ignorePath.ignoreThisFileOrDir(newNormalizedFilePath) === false) {
            //get the old file object
            const oldFileObj = this.fileSystemManager.getFileInfoFromFilePath(oldNormalizedFilePath);
    
            //move the file in the in-memory file state representation
            await this.fileSystemManager.renameFile(oldNormalizedFilePath, newNormalizedFilePath);
    
            //insert a delete file event
            const timestamp = new Date().getTime();
            const devGroupId = this.developerManager.getActiveDeveloperGroupId();
            const branchId = this.project.branchId;
            await this.eventManager.insertRenameFileEvent(timestamp, devGroupId, branchId, oldFileObj.id, oldFileObj.parentDirectoryId, newNormalizedFilePath, oldNormalizedFilePath);
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
    async handleInsertedText(filePath, insertedText, startRow, startCol, pastedInsertEventIds, isRelevant=true) {
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
                    await this.eventManager.insertTextEvents(file, timestamp, devGroupId, branchId, insertedText, startRow, startCol, pastedInsertEventIds, isRelevant);
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
    async handleDeletedText(filePath, startRow, startCol, numElementsToDelete) {
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
                    await this.eventManager.insertDeleteEvents(file, timestamp, devGroupId, branchId, startRow, startCol, numElementsToDelete);
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
    async getPlaybackData(makeEditable) {
        //get all the events from the file
        let events = await this.eventManager.getAllEvents();

        //make a deep copy of the comments
        const copyOfComments = {};
        for(let eventId in this.commentManager.comments) {
            //copy of all of the comments at an event
            const copyCommentsAtPosition = [];
            //copy all of the comments
            for(let i = 0;i < this.commentManager.comments[eventId].length;i++) {
                //make a deep copy of the comment
                const copyComment = JSON.parse(JSON.stringify(this.commentManager.comments[eventId][i]));
                //for paths in the browser, make sure the comment urls don't have a leading slash
                copyComment.imageURLs = copyComment.imageURLs.map(imageURL => imageURL[0] === '/' ? imageURL.substring(1) : imageURL);
                copyComment.videoURLs = copyComment.videoURLs.map(videoURL => videoURL[0] === '/' ? videoURL.substring(1) : videoURL);
                copyComment.audioURLs = copyComment.audioURLs.map(audioURL => audioURL[0] === '/' ? audioURL.substring(1) : audioURL);

                copyCommentsAtPosition.push(copyComment);
            }
            copyOfComments[eventId] = copyCommentsAtPosition;
        }
        //if this playback is a preview of a 'perfect programmer' change 
        if(this.playbackConstraints) {
            //create a helper class for editing the events
            const pph = new PerfectProgrammerHelper();
            
            //look at the type of constraint
            if(this.playbackConstraints.type === 'betweenComments') {
                //edit the event data to include only events that made the comment points
                events = pph.editBetweenComments(events, copyOfComments);
            } else if(this.playbackConstraints.type === 'betweenTags') {
                //edit the event data to include only events made between two tags
                events = pph.editBetweenTags(events, copyOfComments, this.playbackConstraints.startTag, this.playbackConstraints.endTag);
            }
            //future playbacks will be normal
            this.playbackConstraints = null;
            //'perfect programmer' preview playbacks can't be edited
            makeEditable = false;
        }

        return this.getLoadPlaybackDataFunc(events, copyOfComments, makeEditable);
    }

    async replaceEventsCommentsWithPerfectProgrammerData(startTag, endTag) {
        //create a helper class for editing the events
        const pph = new PerfectProgrammerHelper();
            
        //get all the events from the file
        const events = await this.eventManager.getAllEvents();
        
        //edit the event data to include only events that made the comment points
        const updatedEvents = pph.editBetweenTags(events, this.commentManager.comments, startTag, endTag);
        
        //store the new number of events in the event manager
        this.eventManager.numberOfEvents = updatedEvents.length;

        //replace all of the original events with the updated 'perfect programmer' events
        await this.db.replaceEvents(updatedEvents);

        //write any changes to the comments back to the db (display event id, seq#, position)
        await this.db.updateCommentsForPerfectProgrammer(this.commentManager.comments);
    }

    getLoadPlaybackDataFunc(events, comments, makeEditable) {
        //create the text for a js function that loads the playback into a global called playbackData
        const func = 
`
function loadPlaybackData() {
    playbackData.events = ${JSON.stringify(events)};
    playbackData.comments = ${JSON.stringify(comments)};
    playbackData.numEvents = ${events.length};
    playbackData.isEditable = ${makeEditable ? 'true' : 'false'};
    playbackData.developers = ${JSON.stringify(this.developerManager.allDevelopers)};
    playbackData.developerGroups = ${JSON.stringify(this.developerManager.allDeveloperGroups)};
    playbackData.playbackTitle = '${this.project.title.replace(/'/g, "&#39;")}';
    playbackData.branchId = '${this.project.branchId}';
    playbackData.estimatedReadTime = ${this.commentManager.getReadTimeEstimate()};
}`;
        return func;
    }

    setNextPlaybackPerfectProgrammer(constraints) {
        //set the next playback to be a preview of perfect programmer
        this.playbackConstraints = constraints;
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