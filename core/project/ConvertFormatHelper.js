const fs = require('fs');
const https = require('https');
const path = require('path');

const utilities = require('../utilities.js');
const DBAbstraction = require('./DBAbstraction.js');

class ConvertFormatHelper {
    constructor(destinationDirPath, dbName, webProjectURL, playbackData) {
        this.destinationDirPath = destinationDirPath;
        this.dbName = dbName;
        this.webProjectURL = webProjectURL;
        this.playbackData = playbackData;

        //mappings from old id to new id
        this.devIdMappings = {};
        this.devGroupIdMappings = {};
        this.fileIdMappings = {};
        this.dirIdMappings = {};
        this.eventIdMappings = {};
        this.commentIdMappings = {};           
    }

    async convertToDB() { 
        try {
            //go through the process of converting the playback data to a db              
            await this.createAndOpen();
            await this.handleDevelopersAndGroups();
            await this.handleProject();
            await this.handleEventsFilesDirs();
            await this.handleComments();
        } catch (err) {
            console.error(err);
        }
    }

    createAndOpen() {
        return new Promise(async (resolve, reject) => {
            try {
                //make the hidden .storyteller directory
                fs.mkdirSync(this.destinationDirPath, { recursive: true });

                //create a database and open it
                const dbPath = path.join(this.destinationDirPath, this.dbName);
                this.db = new DBAbstraction(dbPath);
                await this.db.openDb();

                //create the tables
                await this.db.createTables();

                resolve();
            } catch (err) {
                console.error(err);
                reject();
            }
        });
    }

    handleDevelopersAndGroups() {
        return new Promise(async (resolve, reject) => {
            try {
                //developers
                //go through all of the devs from the playback data
                for(const devId in this.playbackData.developers) {
                    //store the original id
                    const originalId = devId;
                    //delete it so that the db can generate a new one
                    delete this.playbackData.developers[originalId].id;
                    //add to the db
                    await this.db.runInsertFromObject('Developer', this.playbackData.developers[originalId]);
                    //make a mapping between the old id and the new one
                    this.devIdMappings[originalId] = this.playbackData.developers[originalId].id;
                };

                //developer groups
                //use the last event's creator is the active dev group
                const activeDevGroupId = this.playbackData.events[this.playbackData.events.length - 1].createdByDevGroupId;

                //go through all of the dev groups
                for(const devGroupId in this.playbackData.developerGroups) {
                    //store the original id
                    const originalId = devGroupId;
                    //delete it so that the db can generate a new one
                    delete this.playbackData.developerGroups[originalId].id;
                    
                    //store all of the member ids to add later
                    const memberIds = this.playbackData.developerGroups[originalId].memberIds;
                    //delete the member ids since they are stored in a separate table
                    delete this.playbackData.developerGroups[originalId].memberIds;

                    //add a property if this dev group is the active one
                    this.playbackData.developerGroups[originalId].isActiveDeveloperGroup = (originalId === activeDevGroupId) ? 'true' : 'false';
                    //add to the db
                    await this.db.runInsertFromObject('DeveloperGroup', this.playbackData.developerGroups[originalId]);
                    //make a mapping between the old id and the new one
                    this.devGroupIdMappings[originalId] = this.playbackData.developerGroups[originalId].id;

                    //go through all of the members of this group
                    for(const devId of memberIds) {
                        //get the updated ids
                        const updatedDevId = this.devIdMappings[devId];
                        const updatedDevGroupId = this.devGroupIdMappings[originalId];
                        //add the link in the db
                        await this.db.linkDeveloperToDeveloperGroup({id: updatedDevId}, {id: updatedDevGroupId});
                    }
                };

                resolve();
            } catch (err) {
                console.error(err);
                reject();
            }
        });
    }

    handleProject() {
        return new Promise(async (resolve, reject) => {
            try {
                //create the project in the db
                this.db.createProject(this.playbackData.title, '', this.playbackData.branchId);
                resolve();
            } catch (err) {
                console.error(err);
                reject();
            }
        });
    }

    handleEventsFilesDirs() {
        return new Promise(async (resolve, reject) => {
            try {
                //go through all the events and update them as necessary
                for(const event of this.playbackData.events) {
                    //check the event type
                    if(event.type === 'INSERT') {
                        //update this event's id's
                        event.fileId =  this.fileIdMappings[event.fileId];
                        event.deletedByEventId = this.eventIdMappings[event.deletedByEventId];
                        event.previousNeighborId = this.eventIdMappings[event.previousNeighborId];
                    } else if(event.type === 'DELETE') {
                        //update this event's id's
                        event.fileId =  this.fileIdMappings[event.fileId];
                        event.previousNeighborId = this.eventIdMappings[event.previousNeighborId];
                    } else if(event.type === 'CREATE DIRECTORY') {
                        //handle parent dir ids that are null
                        let newDirParentDirId = this.dirIdMappings[event.parentDirectoryId];
                        if(!newDirParentDirId) {
                            //replace with the special -1
                            newDirParentDirId = -1;
                        }

                        //store the old dir id
                        const oldDirId = event.directoryId;

                        //create the dir in the db
                        const newDirPath = event.directoryPath;
                        const newDir = await this.db.createDirectory(newDirParentDirId, newDirPath);
                        
                        //store the mapping between the old id and the new one
                        this.dirIdMappings[oldDirId] = newDir.id;

                        //update this event's id's
                        event.directoryId = this.dirIdMappings[oldDirId];
                        event.parentDirectoryId = this.dirIdMappings[event.parentDirectoryId] ? this.dirIdMappings[event.parentDirectoryId] : -1;
                    } else if(event.type === 'DELETE DIRECTORY') {
                        //update the db
                        await this.db.removeDirectory({id: this.dirIdMappings[event.directoryId]});
                        
                        //update this event's id's
                        event.directoryId = this.dirIdMappings[event.directoryId];
                        event.parentDirectoryId = this.dirIdMappings[event.parentDirectoryId] ? this.dirIdMappings[event.parentDirectoryId] : -1;
                    } else if(event.type === 'MOVE DIRECTORY') {
                        //update the db
                        await this.db.moveDirectory({id: this.dirIdMappings[event.directoryId]}, event.newParentDirectoryId, event.newDirectoryPath);
                        
                        //update this event's id's
                        event.directoryId = this.dirIdMappings[event.directoryId];
                        event.newParentDirectoryId = this.dirIdMappings[event.newParentDirectoryId];
                        event.oldParentDirectoryId = this.dirIdMappings[event.oldParentDirectoryId];
                    } else if(event.type === 'RENAME DIRECTORY') {
                        //update the db
                        await this.db.renameDirectory({id: this.dirIdMappings[event.directoryId]}, event.newDirectoryPath);
                        
                        //update this event's id's
                        event.directoryId = this.dirIdMappings[event.directoryId];
                        event.parentDirectoryId = this.dirIdMappings[event.parentDirectoryId] ? this.dirIdMappings[event.parentDirectoryId] : -1;
                    } else if(event.type === 'CREATE FILE') {
                        //store the old file id
                        const oldFileId = event.fileId;

                        //create the dir in the db
                        const newFileParentDirId = this.dirIdMappings[event.parentDirectoryId];
                        const newFilePath = event.filePath;
                        const newFile = await this.db.createFile(newFileParentDirId, newFilePath);
                        
                        //store the mapping between the old id and the new one
                         this.fileIdMappings[oldFileId] = newFile.id;

                        //update this event's id's
                        event.fileId =  this.fileIdMappings[oldFileId];
                        event.parentDirectoryId = this.dirIdMappings[event.parentDirectoryId];
                    } else if(event.type === 'DELETE FILE') {
                        //update the db
                        await this.db.removeFile({id:  this.fileIdMappings[event.fileId]});
                        
                        //update this event's id's
                        event.fileId =  this.fileIdMappings[event.fileId];
                        event.parentDirectoryId = this.dirIdMappings[event.parentDirectoryId];
                    } else if(event.type === 'MOVE FILE') {
                        //update the db
                        await this.db.moveFile({id:  this.fileIdMappings[event.fileId]}, event.newParentDirectoryId, event.newFilePath);
                        
                        //update this event's id's
                        event.fileId =  this.fileIdMappings[event.fileId];
                        event.newParentDirectoryId = this.dirIdMappings[event.newParentDirectoryId];
                        event.oldParentDirectoryId = this.dirIdMappings[event.oldParentDirectoryId];
                    } else if(event.type === 'RENAME FILE') {
                        //update the db
                        await this.db.renameFile({id:  this.fileIdMappings[event.fileId]}, event.newFilePath);
                        
                        //update this event's id's
                        event.fileId =  this.fileIdMappings[event.fileId];
                        event.parentDirectoryId = this.dirIdMappings[event.parentDirectoryId];
                    }
                    //update the event's dev group id
                    event.createdByDevGroupId = this.devGroupIdMappings[event.createdByDevGroupId];
                    
                    //update the event id
                    const oldEventId = event.id;
                    delete event.id;
                    await this.db.runInsertFromObject('Event', event);
                    
                    //store the mapping between the old event id and the new one
                    this.eventIdMappings[oldEventId] = event.id;
                }
                resolve();
            } catch (err) {
                console.error(err);
                reject();
            }
        });
    }

    handleComments() {
        return new Promise(async (resolve, reject) => {
            try {
                //to download and store all of the large media files
                const mediaDownloadPromises = [];

                //go through each group of comment at a pause point
                for(const eventId in this.playbackData.comments) {
                    //get the whole array of comments
                    const commentArray = this.playbackData.comments[eventId];
                    //stores the position of a comment in the array
                    let position = 0;
                    //go through all of the comments at this pause point
                    for(const comment of commentArray) {
                        //store the old comment id
                        const oldCommentId = comment.id;

                        //add the new properties
                        comment.displayCommentEventId = this.eventIdMappings[comment.displayCommentEvent.id];
                        comment.displayCommentEventSequenceNumber = comment.displayCommentEvent.eventSequenceNumber;
                        comment.position = position;
                        
                        //update existing properties
                        comment.developerGroupId = this.devGroupIdMappings[comment.developerGroupId];
                        for(const selectedCodeBlock of comment.selectedCodeBlocks) {
                            selectedCodeBlock.fileId =  this.fileIdMappings[selectedCodeBlock.fileId];
                        }

                        //delete the outdated properties
                        delete comment.id;
                        delete comment.displayCommentEvent;

                        //add any media files
                        const mediaURLs = [];
                        for(let i = 0;i < comment.imageURLs.length;i++) {
                            mediaURLs.push(comment.imageURLs[i]);
                            comment.imageURLs[i] = utilities.replaceSpacesWithDashes(comment.imageURLs[i]);
                        }
                        for(let i = 0;i < comment.videoURLs.length;i++) {
                            mediaURLs.push(comment.videoURLs[i]);
                            comment.videoURLs[i] = utilities.replaceSpacesWithDashes(comment.videoURLs[i]);
                        }
                        for(let i = 0;i < comment.audioURLs.length;i++) {
                            mediaURLs.push(comment.audioURLs[i]);
                            comment.audioURLs[i] = utilities.replaceSpacesWithDashes(comment.audioURLs[i]);
                        }
                        
                        for(const mediaURL of mediaURLs) {
                            const url = `${this.webProjectURL}/${mediaURL}`;                            
                            mediaDownloadPromises.push(this.downloadMediaFile(url, mediaURL, this.db));
                        }

                        //create the comment in the db
                        const newComment = await this.db.createComment(comment);
                        
                        //store the mapping between the old id and the new one
                        this.commentIdMappings[oldCommentId] = newComment.id;

                        position++;
                    }
                }
                //wait for all of the media files to download and be added to the db
                await Promise.all(mediaDownloadPromises);

                resolve();
            } catch (err) {
                console.error(err);
                reject();
            }
        });
    }

    downloadMediaFile(url, mediaPath, db) {
        return new Promise((resolve, reject) => {
            try {
                //file data
                const data = [];  
                
                //mime types of acceptable files
                const mimeTypes = {
                    '.bmp': 'image/bmp',
                    '.gif': 'image/gif',
                    '.jpg': 'image/jpg',
                    '.jpeg': 'image/jpeg',
                    '.png': 'image/png',
                    '.svg': 'image/image/svg+xml',
                    '.aac': 'audio/aac',
                    '.mp3': 'audio/mpeg',
                    '.wav': 'audio/wav',
                    '.weba': 'audio/webm',
                    '.mpeg': 'video/mpeg',
                    '.mp4': 'video/mp4',
                    '.webm': 'video/webm'
                };
                
                //use https to get an image and store it in the db
                https.get(url, (res) => {
                    res.on('data', (d) => {
                        //add the new chunk of data to the array
                        data.push(d);
                    });

                    //when the file is done downloading
                    res.on('end', async function() {
                        //turn the data into one big blob
                        const mediaBuffer = Buffer.concat(data);
                        
                        //add the file to the db
                        const ext = path.extname(mediaPath);
                        const mimeType = mimeTypes[ext];
                        if(mimeType) {
                            await db.addMediaFile(mediaBuffer, mimeType, utilities.replaceSpacesWithDashes(mediaPath));
                            resolve();
                        } else {
                            console.log('invalid mime type');
                            reject();
                        }
                    });
                    res.on('error', (e) => {
                        console.error(e);
                        reject();
                    });
                }).on('error', (e) => {
                    console.error(e);
                    reject();
                });        
            } catch (err) {
                console.error(err);
                reject();
            }                     
        });
    }
}

module.exports = ConvertFormatHelper;