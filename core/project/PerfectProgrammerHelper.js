/*
 * This class alters an array of events and comments to simulate a 'perfect programmer',
 * one that does not make any mistakes. This is used for removing embarrassing forays
 * while creating a playback. The author can select certain code to be removed from the
 * playback as if it was never written. The code can be removed in two different ways:
 * - edit between comments:
 *     It is as if a perfect programmer had written it with file/dir events being 
 *     played out first, then deletes of previously inserted events, finally any new inserts 
 *     that were not deleted will be played out. This significantly alters the order of the
 *     events compared to how the author originally wrote the code.
 * - edit between tags:
 *     The user specifies start and end tags which are associated with comments. The events 
 *     are played out in order as they were written by the programmer but any insert/create
 *     that was added and then removed between the start and end tags are removed. The events 
 *     are in the same order as the programmer wrote them.
 */
class PerfectProgrammerHelper {
    /*
     * Returns the modified events array with only events that contrbute to the
     * code at the comment points. This also may alter the passed in comments.
     */
    editBetweenComments(originalEvents, comments) {
        //holds the insert events of all the files during playback
        const allFiles = {};

        //an updated list of events with some thrown out from originalEvents
        const updatedEvents = [];

        //marks the start and end of a range of events in between two comments
        let startPos = 0;
        let endPos;

        //there's always a comment at position 0 so start at position 1
        for(let i = 1;i < originalEvents.length;i++) {
            //get the latest event
            const event = originalEvents[i];
            
            //if there is at least one comment at this event or at the end of playback
            if(comments[event.id] || i === originalEvents.length - 1) {
                //store the position in the events where the comment is
                endPos = i;

                //fill updatedEvents with the events that will be played back in a perfect programmer scenario
                this.editEventsBetweenTwoPoints(startPos, endPos, originalEvents, updatedEvents, allFiles, comments);
                
                //if the last original event did not get added to the updated events, then edit the comments
                this.updateCommentPosition(originalEvents[endPos], updatedEvents, comments);

                //the next range will start after this comment
                startPos = i + 1;
            }
        }

        //return the filtered and edited events
        return updatedEvents;
    }

    /*
     * Moves between two points in the events array and removes/modifies events
     * that are no longer needed. The events are played out in order and then the
     * state of the code is examined. It is the same as if a perfect programmer 
     * had written it with file/dir events being played out first, then deletes of 
     * previously inserted events, finally any new inserts that were not deleted
     * will be played out. 
     */
    editEventsBetweenTwoPoints(startPos, endPos, originalEvents, updatedEvents, allFiles, comments) {
        //holds all of the perfect programmer events to playback in this range by the 
        //file or dir they happen in the events are stored in this order:
        // 1. file system events
        // 2. delete events
        // 3. insert events
        //and then they are played back in the same order to simulate a 'perfect programmer'
        const eventsByFileOrDir = {};

        //holds the ids of all files/dirs created and then deleted in this range 
        //events related to these can be ignored (not added to updatedEvents)
        const ignoreFilesCreatedAndDeleted = new Set();
        const ignoreDirsCreatedAndDeleted = new Set();

        //get the fs, delete, and insert events and adds them to the eventsByFileOrDir object (keyed by file/dir id)
        this.getFileSystemEvents(startPos, endPos, originalEvents, eventsByFileOrDir, ignoreFilesCreatedAndDeleted, ignoreDirsCreatedAndDeleted);
        this.getDeleteEvents(startPos, endPos, originalEvents, eventsByFileOrDir, allFiles, ignoreFilesCreatedAndDeleted);
        this.getInsertEvents(startPos, endPos, originalEvents, eventsByFileOrDir, allFiles, ignoreFilesCreatedAndDeleted);

        //to update the event sequence number of each of event use the number of updated events stored so far 
        let newEventSequenceNumber = updatedEvents.length;

        //go through all of the new events and add them to the array updatedEvents while updating the event sequence numbers
        for(let fileOrDirId in eventsByFileOrDir) {
            //add the events for a file or dir
            for(const event of eventsByFileOrDir[fileOrDirId]) {
                //add the event to the updated events and modify any comments
                this.addToUpdatedEvents(event, updatedEvents, newEventSequenceNumber, comments);
                //get ready for the next relevant event update
                newEventSequenceNumber++;
            }
        }
    }

    /*
     * Gets all of the file system events that should stay in the playback in this range.
     */
    getFileSystemEvents(startPos, endPos, originalEvents, eventsByFileOrDir, ignoreFilesCreatedAndDeleted, ignoreDirsCreatedAndDeleted) {        
        //used to track which files and dirs are new in this range
        const createdFileIds = new Set();
        const createdDirIds = new Set();

        //go through all of the events in the range and find any files or dirs
        //created and then deleted in the range
        for(let i = startPos;i <= endPos;i++) {
            const event = originalEvents[i];

            //file system events only, not an INSERT and not a DELETE
            if(event.type !== 'INSERT' && event.type !== 'DELETE') {
                //collect file/dir ids created and deleted in the range
                if(event.type === 'CREATE FILE') {
                    //add the id of the new file
                    createdFileIds.add(event.fileId);
                } else if(event.type === 'DELETE FILE') {
                    //if this a file created and deleted in the range
                    if(createdFileIds.has(event.fileId)) {
                        //store the id of the file to ignore events below
                        ignoreFilesCreatedAndDeleted.add(event.fileId);
                    }
                } else if(event.type === 'CREATE DIRECTORY') {
                    //add the id of the new dir
                    createdDirIds.add(event.directoryId);
                } else if(event.type === 'DELETE DIRECTORY') {
                    //if this a dir created and deleted in the range
                    if(createdDirIds.has(event.directoryId)) {
                        //store the id of the dir to ignore events below
                        ignoreDirsCreatedAndDeleted.add(event.directoryId);
                    }
                }

                //collect the file/dir events
                if(event.fileId) {
                    //if this is the first event for this file
                    if(!eventsByFileOrDir[event.fileId]) {
                        //create a new array
                        eventsByFileOrDir[event.fileId] = [];
                    }
                    //store the file system event
                    eventsByFileOrDir[event.fileId].push(event);
                } else { //this is a dir event
                    //if this is the first event for this dir
                    if(!eventsByFileOrDir[event.directoryId]) {
                        //create a new array
                        eventsByFileOrDir[event.directoryId] = [];
                    }
                    //store the file system event
                    eventsByFileOrDir[event.directoryId].push(event);
                }
            }
        }

        //go through all of the file/dir events
        for(let fileOrDirId in eventsByFileOrDir) {
            //go through the file system events found above (in reverse because I will remove in the loop)
            for(let i = eventsByFileOrDir[fileOrDirId].length - 1;i >= 0;i--) {
                const fsEvent = eventsByFileOrDir[fileOrDirId][i];

                //if this is a file or directory event that should be removed 
                //because it was created and deleted in the same range, then remove it
                if((fsEvent.fileId && ignoreFilesCreatedAndDeleted.has(fsEvent.fileId)) ||
                   (fsEvent.directoryId && ignoreDirsCreatedAndDeleted.has(fsEvent.directoryId))) {
                    eventsByFileOrDir[fileOrDirId].splice(i, 1);
                }
            }
        }
    }

    /*
     * Gets all of the delete events that will be played back in this range.
     * The deletes are for events that were inserted outside of the active
     * range. The deletes will be handled from the back of the file to the
     * front so the deletes cause the least amount of movement.
     */
    getDeleteEvents(startPos, endPos, originalEvents, eventsByFileOrDir, allFiles, ignoreFilesCreatedAndDeleted) {
        //track the files with deletes in them
        const filesWithDeletesInThem = new Set();

        //holds all of the delete events that are being deleted in this range
        //key: insertEventId, value: deleteEvent
        const allDeletedInserts = {};
        
        //go through the deletes in this range
        for(let i = startPos;i <= endPos;i++) {
            const event = originalEvents[i];
            //if its a delete event and not one to be ignored
            if(event.type === 'DELETE' && !ignoreFilesCreatedAndDeleted.has(event.fileId)) {
                //store the delete event and the file where it happened
                allDeletedInserts[event.previousNeighborId] = event;
                filesWithDeletesInThem.add(event.fileId);
            }
        }

        //go through all of the files with deletes in them
        for(let fileId of filesWithDeletesInThem) {
            const editedFile = allFiles[fileId];
            if(editedFile) {
                //move through the file in reverse looking for the deletes that happen
                for(let row = editedFile.length - 1;row >= 0;row--) {
                    for(let col = editedFile[row].length - 1;col >= 0;col--) {
                        //get each insert event that is present in the files before the current range is played out
                        const insertEvent = editedFile[row][col];
                        //if this is a delete of an insert from a previous range (since no inserts in this range 
                        //have been added to the files yet)
                        if(allDeletedInserts[insertEvent.id]) {
                            //make a deep copy of the delete (the original is used later and need the original values)
                            const deleteEvent = JSON.parse(JSON.stringify(allDeletedInserts[insertEvent.id]));
                            //update where the delete is happening
                            deleteEvent.lineNumber = row + 1;
                            deleteEvent.column = col + 1;

                            //if there are no deletes for this file yet
                            if(!eventsByFileOrDir[deleteEvent.fileId]) {
                                //create an empty array
                                eventsByFileOrDir[deleteEvent.fileId] = [];
                            }
                            //add the delete event
                            eventsByFileOrDir[deleteEvent.fileId].push(deleteEvent);
                        }
                    }
                }
            }
        }
    }

    /*
     * Gets all of the insert events that will be played back in this range.
     */
    getInsertEvents(startPos, endPos, originalEvents, eventsByFileOrDir, allFiles, ignoreFilesCreatedAndDeleted) {
        //track which files have inserts in them
        const filesWithInserts = new Set();

        //go through all of the events in the range and add and remove inserts
        for(let i = startPos;i <= endPos;i++) {
            const event = originalEvents[i];
            if(event.type === 'INSERT' && !ignoreFilesCreatedAndDeleted.has(event.fileId)) {
                //mark this event as needing to be added to the group of updated events
                event.needsToBeAdded = true;
                //add it in the file
                this.addInsertEvent(event, allFiles);
                //make sure to move through the events in this file below
                filesWithInserts.add(event.fileId);
            } else if(event.type === 'DELETE' && !ignoreFilesCreatedAndDeleted.has(event.fileId)) {
                //remove the delete from the file
                this.addDeleteEvent(event, allFiles);
            } //else- not an INSERT or DELETE
        }
        //now any insert that has been added and removed will be gone

        //now go through all of the events in the file and handle the adjusted insert events
        for(const fileId of filesWithInserts) {
            //get the 2D array of events for this file
            const textFileInsertEvents = allFiles[fileId];
            for(let row = 0;row < textFileInsertEvents.length;row++) {
                for(let col = 0;col < textFileInsertEvents[row].length;col++) {
                    const latestEvent = textFileInsertEvents[row][col];

                    //if the insert event has not been handled yet (added to all insert events)
                    if(latestEvent.needsToBeAdded) {
                        //update the initial location of the insert
                        latestEvent.lineNumber = row + 1;
                        latestEvent.column = col + 1;

                        //go backwards one event to update the previous neighbor
                        //if the event is at the beginning of a row
                        if(col === 0) {
                            //if it is after the first row
                            if(row > 0) {
                                //go back a row and to the end to get the id
                                latestEvent.previousNeighborId = textFileInsertEvents[row - 1][textFileInsertEvents[row - 1].length - 1].id;
                            } else { //row 0, col 0
                                latestEvent.previousNeighborId = null;
                            }
                        } else { //not at the beginning of a row
                            //go back one column to get the id
                            latestEvent.previousNeighborId = textFileInsertEvents[row][col - 1].id;
                        }
                        
                        //if this is the first event in the file
                        if(!eventsByFileOrDir[latestEvent.fileId]) {
                            eventsByFileOrDir[latestEvent.fileId] = [];
                        }
                        //add the insert event
                        eventsByFileOrDir[latestEvent.fileId].push(latestEvent);

                        //remove the flag that this event needs to be added 
                        delete latestEvent.needsToBeAdded;
                    }
                }
            }
        }
    }

    /*
     * Adds an insert event into a 2D array of events for a file.
     */
    addInsertEvent(event, allFiles) {
        //adjusted 0-based row and column numbers
        const row = event.lineNumber - 1;
        const col = event.column - 1;

        //if this is the first insert in a new file
        if(!allFiles[event.fileId]) {
            //create an empty 2D array
            allFiles[event.fileId] = [];
        }

        //get the 2D array of events for this file
        const textFileInsertEvents = allFiles[event.fileId];

        //if this is the first insert on a new row (underneath the current last row)
        if(row === textFileInsertEvents.length) { 
            //create a new row at the bottom with the new event
            textFileInsertEvents.push([event]);
        } else { //the insert is in an existing row
            //insert somewhere in the middle
            textFileInsertEvents[row].splice(col, 0, event);
        }
        
        //if the new character was a newline character
        if(event.character === 'NEWLINE' || event.character === 'CR-LF') {
            //get the rest of the line after the newline character
            const restOfLine = textFileInsertEvents[row].splice(col + 1, textFileInsertEvents[row].length - col);
            
            //add a new row that the newline created with the end of the current line
            textFileInsertEvents.splice(row + 1, 0, restOfLine); 
        }
    }

    /*
     * Removes an insert event from a 2D array of events for a file.
     */
    addDeleteEvent(event, allFiles) {
        //adjusted 0-based row and column numbers
        const row = event.lineNumber - 1;
        const col = event.column - 1;

        //get the 2D array for this event's file and the number of events per line
        const textFileInsertEvents = allFiles[event.fileId];

        //get the insert event that is being deleted
        const insertEventBeingDeleted = textFileInsertEvents[row][col];

        //if we are removing a newline character
        if(insertEventBeingDeleted.character === 'NEWLINE' || insertEventBeingDeleted.character === 'CR-LF') {
            //remove the newline event from its line
            textFileInsertEvents[row].splice(col, 1);
            
            //if there is a 'next' row, move all the elements up to this row
            if(row + 1 < textFileInsertEvents.length) {
                //get the next row (it may be an empty row)
                const copyElements = textFileInsertEvents[row + 1].splice(0);

                //add the elements to the current row
                for(let i = 0;i < copyElements.length;i++) {
                    textFileInsertEvents[row].push(copyElements[i]);
                }
                
                //remove the row that we copied all of the elements over
                textFileInsertEvents.splice(row + 1, 1);
            }
        } else { //removing a non-newline
            //remove the id
            textFileInsertEvents[row].splice(col, 1);
        }

        //if there is nothing left on the row
        if(textFileInsertEvents[row].length === 0) {
            //remove the row
            textFileInsertEvents.splice(row, 1);
        }
    }

    /*
     * Update the comments so that if the original comment event is no longer going to be
     * played back then the new last updated event holds the comment.
     */
    updateCommentPosition(originalCommentEvent, updatedEvents, comments) {                
        //if there was a comment at the end position (it is not just the end of the playback)
        if(comments[originalCommentEvent.id]) {
            //get the last event in the updated list of events
            const lastUpdatedEvent = updatedEvents[updatedEvents.length - 1];
            
            //if the comment event is different than the new last event
            if(originalCommentEvent.id !== lastUpdatedEvent.id) {
                //if there is not already an entry for the event
                if(!comments[lastUpdatedEvent.id]) {
                    //add a new entry using the new event id
                    comments[lastUpdatedEvent.id] = [];
                }

                //copy the comments over
                for(let i = 0;i < comments[originalCommentEvent.id].length;i++) {
                    const comment = comments[originalCommentEvent.id][i];
                    //update the event associated with the comment
                    comment.displayCommentEventId = lastUpdatedEvent.id;
                    comment.displayCommentEventSequenceNumber = lastUpdatedEvent.eventSequenceNumber;
                    //get the position in the new array (non-zero if adding to an existing array of comments)
                    comment.position = comments[lastUpdatedEvent.id].length;
                    //add the new comment 
                    comments[lastUpdatedEvent.id].push(comment);
                }
                //get rid of the old array of comments
                delete comments[originalCommentEvent.id];
            }
        } //else- it is the end of a playback without a comment
    }

    /*
     * Returns a modified events array with only events that contribute to the
     * code between the start/end tag combinations. The events are played out in
     * order as they were written by the programmer but any insert/create that was
     * added and then removed between the start and end tags are removed. 
     */
    editBetweenTags(originalEvents, comments, startTag, endTag) {
        //holds the insert events of all the files during playback
        const allFiles = {};

        //an updated list of events with edits
        const updatedEvents = [];

        //hold the ids of the inserts/files/dirs that were created and deleted in the current range,
        //init to none
        let deletedInsertsFilesDirs = this.clearDeletedInsertsFilesDirs();
        
        //updated event sequence number
        let updatedEventSequenceNumber = 0;

        //go through all of the events
        for(let i = 0;i < originalEvents.length;i++) {
            const event = originalEvents[i];
            
            //see if the start tag is in a comment at this event
            if(this.isTagInComment(event, startTag, comments)) {
                //get the inserts/create file/create dirs that were deleted in this range
                deletedInsertsFilesDirs = this.collectDeletedInsertsFilesDirs(i, endTag, originalEvents, comments);
            }
    
            //check the event type
            if(event.type === 'INSERT') {
                //if this is an insert that is deleted in the range OR
                //this is an insert in a file created and deleted in the range
                if(event.id in deletedInsertsFilesDirs.deletedInsertIds || 
                   event.fileId in deletedInsertsFilesDirs.deletedFileIds) {
                    //mark the event as one that should be ignored (this event will not be added to the updated events)
                    event.ignore = true;
                    //add the insert to the file
                    this.addInsertEvent(event, allFiles);  
    
                    //if there are comments on this ignored event then move them
                    this.updateCommentPosition(event, updatedEvents, comments);
                } else { //this event will survive the filtering
                    //add the event to the updated events and modify any comments
                    this.addToUpdatedEvents(event, updatedEvents, updatedEventSequenceNumber, comments);
                    updatedEventSequenceNumber++;

                    //add the event to the file
                    this.addInsertEvent(event, allFiles);  
                    //update the insert event with the correct line number, column, and prev neighbor
                    this.updateInsertEvent(event, allFiles[event.fileId]);    
                }
            } else if(event.type === 'DELETE') {
                //if this is a delete of an insert in this range OR
                //this is a delete in a file created and deleted in the range
                if(event.id in deletedInsertsFilesDirs.deleteEventIds || 
                   event.fileId in deletedInsertsFilesDirs.deletedFileIds) {
                    //don't add the delete to the updated events

                    //if there are comments on this ignored event then move them
                    this.updateCommentPosition(event, updatedEvents, comments);
                } else { //this event will survive the filtering
                    this.addToUpdatedEvents(event, updatedEvents, updatedEventSequenceNumber, comments);
                    updatedEventSequenceNumber++;
                } 
                //remove an insert from the file
                this.addDeleteEvent(event, allFiles);
                //update the delete event with the correct line number and column
                this.updateDeleteEvent(event, allFiles[event.fileId]);    
            } else if(event.type === 'CREATE FILE') {
                //if this is a file created and deleted in the range
                if(event.fileId in deletedInsertsFilesDirs.deletedFileIds) {
                    //if there are comments on this ignored event then move them
                    this.updateCommentPosition(event, updatedEvents, comments);
                } else { //this event will survive the filtering
                    this.addToUpdatedEvents(event, updatedEvents, updatedEventSequenceNumber, comments);
                    updatedEventSequenceNumber++;
                }
            } else if(event.type === 'DELETE FILE') {
                //if this is a file delete of a file created and deleted in the range
                if(event.id in deletedInsertsFilesDirs.deleteFileEventIds) {
                    //if there are comments on this ignored event then move them
                    this.updateCommentPosition(event, updatedEvents, comments);
                } else { //this event will survive the filtering
                    this.addToUpdatedEvents(event, updatedEvents, updatedEventSequenceNumber, comments);
                    updatedEventSequenceNumber++;
                }
            } else if(event.type === 'CREATE DIRECTORY') {
                //if this is a dir created and deleted in the range
                if(event.directoryId in deletedInsertsFilesDirs.deletedDirIds) {
                    //if there are comments on this ignored event then move them
                    this.updateCommentPosition(event, updatedEvents, comments);
                } else { //this event will survive the filtering
                    this.addToUpdatedEvents(event, updatedEvents, updatedEventSequenceNumber, comments);
                    updatedEventSequenceNumber++;
                }
            } else if(event.type === 'DELETE DIRECTORY') {
                //if this is a dir delete of a dir created and deleted in the range
                if(event.id in deletedInsertsFilesDirs.deleteDirEventIds) {
                    //if there are comments on this ignored event then move them
                    this.updateCommentPosition(event, updatedEvents, comments);
                } else { //this event will survive the filtering
                    this.addToUpdatedEvents(event, updatedEvents, updatedEventSequenceNumber, comments);
                    updatedEventSequenceNumber++;
                }
            } else { //other file/dir event (RENAME FILE, RENAME DIR, etc.)
                this.addToUpdatedEvents(event, updatedEvents, updatedEventSequenceNumber, comments);
                updatedEventSequenceNumber++;
            }

            //see if the end tag is in a comment at this event
            if(this.isTagInComment(event, endTag, comments)) {
                //clear out the deleted inserts/files/dirs
                deletedInsertsFilesDirs = this.clearDeletedInsertsFilesDirs();
            }
        }

        //return the filtered and edited events
        return updatedEvents;
    }

    /*
     * Returns true if the tag is in a comment at the event.
     */
    isTagInComment(event, tag, comments) {
        let retVal = false;

        //if there is at least one comment at this event 
        if(comments[event.id]) {
            //check all of the comments at this point for a tag
            for(const comment of comments[event.id]) {
                //if this is the beginning of an edit range
                if(comment.commentTags.includes(tag)) {
                    retVal = true;
                    break;
                }
            }
        }
        return retVal;
    }

    /*
     * Returns the ids of the inserts/files/dirs that were created and deleted in the current range.
     */
    collectDeletedInsertsFilesDirs(startPos, endTag, originalEvents, comments) {
        //data about insert/delete events, files, and dirs
        const retVal = {
            deleteEventIds: {},
            deletedInsertIds: {},
            deleteFileEventIds: {},
            deletedFileIds: {},
            deleteDirEventIds: {},
            deletedDirIds: {}
        };

        //inserts, file/dir ids that were created in the range
        const newInserts = {};
        const newFileIds = {};
        const newDirIds = {};

        //move through the original events from startPos until the end tag is found
        for(let i = startPos;i < originalEvents.length;i++) {
            const event = originalEvents[i];

            if(event.type === 'INSERT') {
                newInserts[event.id] = event;
            } else if(event.type === 'DELETE') {
                //if this is a delete of an insert from a previous range (since no inserts in this range 
                //have been added to the files yet)
                if(newInserts[event.previousNeighborId]) {
                    retVal.deleteEventIds[event.id] = event.id;
                    retVal.deletedInsertIds[event.previousNeighborId] = event.previousNeighborId;
                }
            } else if(event.type === 'CREATE FILE') {
                newFileIds[event.fileId] = event.fileId;
            } else if(event.type === 'DELETE FILE') {
                //if this a file created and deleted in the range
                if(newFileIds[event.fileId]) {
                    retVal.deletedFileIds[event.fileId] = event.fileId;
                    retVal.deleteFileEventIds[event.id] = event.id;
                }
            } else if(event.type === 'CREATE DIRECTORY') {
                newDirIds[event.directoryId] = event.directoryId;
            } else if(event.type === 'DELETE DIRECTORY') {
                //if this a dir created and deleted in the range
                if(newDirIds[event.directoryId]) {
                    retVal.deletedDirIds[event.directoryId] = event.directoryId;
                    retVal.deleteDirEventIds[event.id] = event.id;
                }
            }

            //if there is at least one comment at this event 
            if(comments[event.id]) {
                for(const comment of comments[event.id]) {
                    //if this is the end tag
                    if(comment.commentTags.includes(endTag)) {
                        //return the captured data
                        return retVal;
                    }
                }
            }
        }

        //if the flow gets here then there was no end tag, return an empty object
        return this.clearDeletedInsertsFilesDirs();
    }

    /*
     * Returns an object with empty sub-objects for the deleted inserts/files/dirs.
     */
    clearDeletedInsertsFilesDirs() {
        return {
            deleteEventIds: {},
            deletedInsertIds: {},
            deleteFileEventIds: {},
            deletedFileIds: {},
            deleteDirEventIds: {},
            deletedDirIds: {}
        };
    }

    /*
     * Used for adding an original event to the array of updated events and updating 
     * the comments with the correct event sequence number.
     */
    addToUpdatedEvents(event, updatedEvents, updatedEventSequenceNumber, comments) {
        //update the event sequence number
        event.eventSequenceNumber = updatedEventSequenceNumber;
        
        //add the event to the updated events
        updatedEvents.push(event);

        //if there are comments at this event
        if(comments[event.id]) {
            //go through each comment and update its event sequence number
            for(const comment of comments[event.id]) {
                comment.displayCommentEventSequenceNumber = updatedEventSequenceNumber;
            }
        }
    }

    /*
     * Used to update an insert event with the correct line number, column, and 
     * previous neighbor id based on the fact that the inserts that were added and 
     * removed and should be ignored. This is a pretty expensive operation since it
     * searches through all of the insert events in the file until it finds it.
     */
    updateInsertEvent(insertEvent, fileData) {
        //the row, column, and prev neighbor of the event in the file as if the ignored events were not there
        let editedRow = 0;
        let editedCol = 0;
        let editedPreviousNeighborId = null;

        //go through all of the events in the file
        for(let row = 0;row < fileData.length;row++) {
            for(let col = 0;col < fileData[row].length;col++) {
                //if the insert event is found
                if(insertEvent.id === fileData[row][col].id) {
                    //update the event with the correct line number, column, and prev neighbor
                    insertEvent.lineNumber = editedRow + 1;
                    insertEvent.column = editedCol + 1;
                    insertEvent.previousNeighborId = editedPreviousNeighborId;
                    //stop looking for the event
                    return;
                } else { //not the insert that we are looking for
                    //if this is an insert event that should NOT be ignored, update the row, col, and prev neighbor
                    if(!fileData[row][col].ignore) {
                        //if this is a newline character
                        if(fileData[row][col].character === 'NEWLINE' || fileData[row][col].character === 'CR-LF') {
                            editedRow++;
                            editedCol = 0;
                        } else { //not a newline
                            editedCol++;
                        }
                        editedPreviousNeighborId = fileData[row][col].id;
                    }
                }
            }
        }
    }

    /* 
     * Used to update a delete event with the correct line number and column based 
     * on the fact that the inserts that were added and removed and should be ignored. 
     * This is a pretty expensive operation since it searches through all of the insert 
     * events in the file until it finds it.
     */
    updateDeleteEvent(event, fileData) {
        //the row and column of the event in the file as if the ignored events were not there
        let editedRow = 0;
        let editedCol = 0;

        //go through all of the events in the file
        for(let row = 0;row < fileData.length;row++) {
            for(let col = 0;col < fileData[row].length;col++) {
                //if the deleted insert event is found
                if(event.previousNeighborId === fileData[row][col].id) {
                    //update the event with the correct line number and column
                    event.lineNumber = editedRow + 1;
                    event.column = editedCol + 1;
                    //stop looking for the event
                    return;
                } else { //not the insert that we are looking for
                    //if this is an insert event that should NOT be ignored, update the row and col
                    if(!fileData[row][col].ignore) {
                        if(fileData[row][col].character === 'NEWLINE' || fileData[row][col].character === 'CR-LF') {
                            editedRow++;
                            editedCol = 0;
                        } else {
                            editedCol++;
                        }
                    }
                }
            }
        }
    }
}

module.exports = PerfectProgrammerHelper;