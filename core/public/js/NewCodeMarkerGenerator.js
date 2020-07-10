/*
 * This class is used to record the changes to a group of files during forward 
 * pogress of a playback. It creates a new code file marker for only the 
 * changed files in a playback. It manages all of the changes from one pause
 * point to another.
 */
class NewCodeMarkerGenerator {
    constructor() {
        //the new code file markers for only the changed files
        this.newCodeFileMarkers = {};
    }

    /*
     * Handles an insert into a file.
     */
    insert(insertEvent) {
        //if there is not a file marker for this file
        if(!this.newCodeFileMarkers[insertEvent.fileId]) {
            //create a new file marker
            this.newCodeFileMarkers[insertEvent.fileId] = new NewCodeFileMarker();
        }
        //handle the insert
        this.newCodeFileMarkers[insertEvent.fileId].insert(insertEvent.lineNumber - 1, insertEvent.column - 1, insertEvent.character === 'NEWLINE' ? '\n' : insertEvent.character);
    }

    /*
     * Handles a delete from a file.
     */
    delete(deleteEvent) {
        //if there is not a file marker for this file
        if(!this.newCodeFileMarkers[deleteEvent.fileId]) {
            //create a new file marker
            this.newCodeFileMarkers[deleteEvent.fileId] = new NewCodeFileMarker();
        }
        //handle the delete
        this.newCodeFileMarkers[deleteEvent.fileId].delete(deleteEvent.lineNumber - 1, deleteEvent.column - 1, deleteEvent.character === 'NEWLINE' ? '\n' : deleteEvent.character);
    }

    /*
     * Gets all of the file markers for the changed files.
     */
    getAllNewCodeMarkers() {
        //a collection of all the ranges of changed code for all files that 
        //were updated since the last pause point
        const allNewCodeMarkers = {};
        //go through the changed files
        for(let fileId in this.newCodeFileMarkers) {
            //ask the file marker to return an array of all code to be highlighted
            allNewCodeMarkers[fileId] = this.newCodeFileMarkers[fileId].getAllNewCodeMarkers();
        }

        return allNewCodeMarkers;
    }

    getAllInsertLineNumbers() {
        //a collection of all the line numbers with inserts since the last pause point
        const allInsertLineNumbers = {};
        //go through the changed files
        for(let fileId in this.newCodeFileMarkers) {
            //ask the file marker to return an array of all insert line numbers
            allInsertLineNumbers[fileId] = this.newCodeFileMarkers[fileId].getLinesWithInserts();
        }

        return allInsertLineNumbers;
    }
    
    getAllDeleteLineNumbers() {
        //a collection of all the line numbers with deletes since the last pause point
        const allDeleteLineNumbers = {};
        //go through the changed files
        for(let fileId in this.newCodeFileMarkers) {
            //ask the file marker to return an array of all delete line numbers
            allDeleteLineNumbers[fileId] = this.newCodeFileMarkers[fileId].getLinesWithDeletes();
        }

        return allDeleteLineNumbers;
    }
}