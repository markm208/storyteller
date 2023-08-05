const utilities = require('../utilities.js');
const crypto = require('crypto');

/*
 * This class is responsible for creating and managing events.
 * The events are:
 * - keystrokes (inserts and deletes) 
 * - file and directory operations (create, delete, move, and rename)
 * and are all stored in the database.
 */ 
class EventManager {
    constructor(db) {
        this.db = db;
        //the total number of events that have been created
        //used for event sequence numbers
        this.numberOfEvents = 0;
    }

    init(isNewProject) {
        return new Promise(async (resolve, reject) => {            
            try {
                if(isNewProject === false) { //existing project
                    //get the total number of events
                    this.numberOfEvents = await this.db.getNumberOfEvents();
                }
                resolve();
            } catch(ex) {
                console.error(ex);
                reject();
            }
        });
    }
    
    getAllEvents() {
        return this.db.getAllEvents();
    }

    /*
     * Creates the core part of a storyteller events.
     */
    fillCoreEvent(timestamp, createdByDevGroupId, branchId, isRelevant=true) {
        //return an object with the properties common to every event
        const retVal = {
            id: crypto.randomUUID(),
            timestamp,
            createdByDevGroupId,
            eventSequenceNumber: this.numberOfEvents,
            branchId 
        };

        //increase the total number of events
        this.numberOfEvents++;

        //if this event is not relevant to a playback
        if(isRelevant === false) {
            retVal['permanentRelevance'] = 'never relevant';
        }
        return retVal;
    }
    
    /*
     * Creates a 'CREATE FILE' event.
     */
    insertCreateFileEvent(fileObj, timestamp, createdByDevGroupId, branchId, isRelevant=true) {
        //create core event
        const createFileEvent = this.fillCoreEvent(timestamp, createdByDevGroupId, branchId, isRelevant);
        
        //add specific properties
        createFileEvent['type'] = 'CREATE FILE';
        createFileEvent['fileId'] = fileObj.id;
        createFileEvent['filePath'] = fileObj.currentPath
        createFileEvent['parentDirectoryId'] = fileObj.parentDirectoryId;

        //add the new event to the db
        return this.db.runInsertFromObject('Event', createFileEvent);
    }
    
    /*
     * Creates a 'DELETE FILE' event.
     */
    insertDeleteFileEvent(fileObj, timestamp, createdByDevGroupId, branchId) {
        //create core event
        const deleteFileEvent = this.fillCoreEvent(timestamp, createdByDevGroupId, branchId);
        
        //add specific properties
        deleteFileEvent['type'] = 'DELETE FILE';
        deleteFileEvent['fileId'] = fileObj.id;
        deleteFileEvent['filePath'] = fileObj.currentPath
        deleteFileEvent['parentDirectoryId'] = fileObj.parentDirectoryId;

        //add the new event to the db
        return this.db.runInsertFromObject('Event', deleteFileEvent);
    }
    
    /*
     * Creates a 'MOVE FILE' event.
     */
    insertMoveFileEvent(timestamp, createdByDevGroupId, branchId, fileId, newParentDirectoryId, oldParentDirectoryId, newFilePath, oldFilePath) {
        //create core event
        const moveFileEvent = this.fillCoreEvent(timestamp, createdByDevGroupId, branchId);
        
        //add specific properties
        moveFileEvent['type'] = 'MOVE FILE';
        moveFileEvent['fileId'] = fileId;
        moveFileEvent['newParentDirectoryId'] = newParentDirectoryId;
        moveFileEvent['oldParentDirectoryId'] = oldParentDirectoryId;
        moveFileEvent['newFilePath'] = newFilePath;
        moveFileEvent['oldFilePath'] = oldFilePath;

        //add the new event to the db
        return this.db.runInsertFromObject('Event', moveFileEvent);
    }
    
    /*
     * Creates a 'RENAME FILE' event.
     */
    insertRenameFileEvent(timestamp, createdByDevGroupId, branchId, fileId, parentDirectoryId, newFilePath, oldFilePath) {
        //create core event
        const renameFileEvent = this.fillCoreEvent(timestamp, createdByDevGroupId, branchId);
        
        //add specific properties
        renameFileEvent['type'] = 'RENAME FILE';
        renameFileEvent['fileId'] = fileId;
        renameFileEvent['parentDirectoryId'] = parentDirectoryId;
        renameFileEvent['newFilePath'] = newFilePath;
        renameFileEvent['oldFilePath'] = oldFilePath;
        
        //add the new event to the db
        return this.db.runInsertFromObject('Event', renameFileEvent);
    }
    
    /*
     * Creates a 'CREATE DIRECTORY' event.
     */
    insertCreateDirectoryEvent(dirObj, timestamp, createdByDevGroupId, branchId, isRelevant=true) {
        //create core event
        const createDirectoryEvent = this.fillCoreEvent(timestamp, createdByDevGroupId, branchId, isRelevant);
        
        //add specific properties
        createDirectoryEvent['type'] = 'CREATE DIRECTORY';
        createDirectoryEvent['directoryId'] = dirObj.id;
        createDirectoryEvent['directoryPath'] = dirObj.currentPath
        createDirectoryEvent['parentDirectoryId'] = dirObj.parentDirectoryId;

        //add the new event to the db
        return this.db.runInsertFromObject('Event', createDirectoryEvent);
    }
    
    /*
     * Creates a 'DELETE DIRECTORY' event.
     */
    insertDeleteDirectoryEvent(dirObj, timestamp, createdByDevGroupId, branchId) {
        //create core event
        const deleteDirectoryEvent = this.fillCoreEvent(timestamp, createdByDevGroupId, branchId);
        
        //add specific properties
        deleteDirectoryEvent['type'] = 'DELETE DIRECTORY';
        deleteDirectoryEvent['directoryId'] = dirObj.id;
        deleteDirectoryEvent['directoryPath'] = dirObj.currentPath
        deleteDirectoryEvent['parentDirectoryId'] = dirObj.parentDirectoryId;

        //add the new event to the db
        return this.db.runInsertFromObject('Event', deleteDirectoryEvent);
    }
    
    /*
     * Creates a 'MOVE DIRECTORY' event.
     */
    insertMoveDirectoryEvent(timestamp, createdByDevGroupId, branchId, dirId, newParentDirectoryId, oldParentDirectoryId, newDirectoryPath, oldDirectoryPath) {
        //create core event
        const moveDirectoryEvent = this.fillCoreEvent(timestamp, createdByDevGroupId, branchId);
        
        //add specific properties
        moveDirectoryEvent['type'] = 'MOVE DIRECTORY';
        moveDirectoryEvent['directoryId'] = dirId;
        moveDirectoryEvent['newParentDirectoryId'] = newParentDirectoryId;
        moveDirectoryEvent['oldParentDirectoryId'] = oldParentDirectoryId;
        moveDirectoryEvent['newDirectoryPath'] = newDirectoryPath;
        moveDirectoryEvent['oldDirectoryPath'] = oldDirectoryPath;

        //add the new event to the db
        return this.db.runInsertFromObject('Event', moveDirectoryEvent);
    }
    
    /*
     * Creates a 'RENAME DIRECTORY' event.
     */
    insertRenameDirectoryEvent(timestamp, createdByDevGroupId, branchId, dirId, parentDirectoryId, newDirPath, oldDirPath) {
        //create core event
        const renameDirectoryEvent = this.fillCoreEvent(timestamp, createdByDevGroupId, branchId);
        
        //add specific properties
        renameDirectoryEvent['type'] = 'RENAME DIRECTORY';
        renameDirectoryEvent['directoryId'] = dirId;
        renameDirectoryEvent['parentDirectoryId'] = parentDirectoryId;
        renameDirectoryEvent['newDirectoryPath'] = newDirPath;
        renameDirectoryEvent['oldDirectoryPath'] = oldDirPath;

        //add the new event to the db
        return this.db.runInsertFromObject('Event', renameDirectoryEvent);
    }

    /*
     * Creates one or more 'INSERT' events.
     */
    async insertTextEvents(file, timestamp, createdByDevGroupId, branchId, insertedText, row, col, pastedInsertEventIds, isRelevant=true) {
        try {
            //go through each new character being inserted
            for(let i = 0;i < insertedText.length;i++) {
                //the next character to insert
                let newText = insertedText[i];
                //if the character is a windows carriage return (CR)
                if(insertedText[i] === '\r') {
                    //look at the character next to it to see if it is a newline (LF) 
                    const nextPos = i + 1;
                    if(nextPos < insertedText.length && insertedText[nextPos] === '\n') {
                        //store both as the new text to insert
                        newText = '\r\n';
                        //handling two characters as one, \r followed by \n, 
                        //so move i forward to the the newline's position
                        i++;
                    }
                }                
                //create core event
                const insertTextEvent = this.fillCoreEvent(timestamp, createdByDevGroupId, branchId, isRelevant);

                //holds the id of the pasted event (if this is a paste)
                let pastedEventId = null;
                //if this character is pasted then store the event id of the original insert event
                if(pastedInsertEventIds.length === insertedText.length) {
                    pastedEventId = pastedInsertEventIds[i];
                }
                
                //get the previous neighbor
                const previousNeighborId = file.getPreviousNeighborId(row, col);
                
                //add specific properties
                insertTextEvent['type'] = 'INSERT';
                insertTextEvent['fileId'] = file.id;
                insertTextEvent['character'] = utilities.escapeSpecialCharacter(newText);
                insertTextEvent['previousNeighborId'] = previousNeighborId === 'none' ? null : previousNeighborId;
                insertTextEvent['lineNumber'] = row + 1;
                insertTextEvent['column'] = col + 1;
                insertTextEvent['pastedEventId'] = pastedEventId;

                //insert the character in the text file state
                file.addInsertEventByPos(insertTextEvent.id, insertTextEvent.character, row, col);

                //if this code character was a newline
                if(newText === '\n' || newText === '\r\n') {
                    //go to the next row
                    row++;

                    //set the column back to the beginning of the line
                    col = 0;
                } else { //a non-newline character
                    //move to the next column
                    col++;
                }
                //insert the event into the db
                this.db.addInsertEvent(insertTextEvent);
            }
        } catch(ex) {
            console.log(`Error on insertTextEvents`);
            console.log(`file: ${file}, timestamp: ${timestamp}, createdByDevGroupId: ${createdByDevGroupId}, branchId: ${branchId}, insertedText: ${insertedText}, row: ${row}, col: ${col}, pastedInsertEventIds: ${pastedInsertEventIds}`);
        }
    }
    
    /*
     * Creates one or more 'DELETE' events
     */
    async insertDeleteEvents(file, timestamp, createdByDevGroupId, branchId, row, col, numElementsToDelete) {
        //go through each new character being deleted
        for(let i = 0;i < numElementsToDelete;i++) {
            //create core event
            const deleteTextEvent = this.fillCoreEvent(timestamp, createdByDevGroupId, branchId);

            //get the insert event that is being deleted
            const insertEventBeingDeleted = file.getEvent(row, col);
            
            //if a windows newline is being removed
            if(insertEventBeingDeleted.character === 'CR-LF') {
                //the editor will have an extra character (it counts \r and \n 
                //as two separate characters whereas we store it in a single event)
                //remove the extra character
                numElementsToDelete--;
            }

            //add specific properties
            deleteTextEvent['type'] = 'DELETE';
            deleteTextEvent['fileId'] = file.id;
            deleteTextEvent['character'] = utilities.escapeSpecialCharacter(insertEventBeingDeleted.character);
            deleteTextEvent['previousNeighborId'] = insertEventBeingDeleted.eventId;
            deleteTextEvent['lineNumber'] = row + 1;
            deleteTextEvent['column'] = col + 1;
                        
            //remove the event in the text file state
            file.removeInsertEventByPos(row, col);

            //add the delete event to the db and update the insert to show it has been deleted
            await this.db.addDeleteEvent(deleteTextEvent);
            await this.db.updateInsertFromDelete(deleteTextEvent);
        }
    }   
}

module.exports = EventManager;