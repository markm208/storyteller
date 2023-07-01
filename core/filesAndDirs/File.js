/*
 * This class represents a file being tracked in a storyteller project. 
 * It has a 2D array of minimal text events (event id and character). 
 * The 2D array of minimal events represents the state of the file at 
 * different points in time. This is used to get the complete text at 
 * a point in time and to get previous neighbor ids. 
 */
class File {
    constructor(parentDirectoryId, currentPath, textFileInsertEvents, isDeleted, id) {        
        this.id = id;
        this.parentDirectoryId = parentDirectoryId;
        this.currentPath = currentPath;
        this.textFileInsertEvents = textFileInsertEvents; //stored in db as FileEvents
        this.isDeleted = isDeleted;
        //has a file changed since being read in from the db (not stored in db)
        this.hasBeenModified = false; 
    }

    /*
     * Returns an object with the file data with the exception of the 
     * textFileInsertEvents. This is used when generating data to send to a
     * playback
     */
    getMinimalFileData() {
        //add everything but the textFileInsertEvents
        const minimalFile = {
            id: this.id,
            parentDirectoryId: this.parentDirectoryId, 
            currentPath: this.currentPath,
            isDeleted: this.isDeleted
        };

        return minimalFile;
    }
    /*
     * Creates a minimal insert event and adds it in its correct position in 
     * the file. 
     */
    addInsertEventByPos(eventId, eventCharacter, row, col) {
        //this file has been changed in the current session
        this.hasBeenModified = true;

        //verify that the new insert is within the bounds of the file (check max column below)
        if(row >= 0 && row <= this.textFileInsertEvents.length && col >= 0 ) {
            //create a minimal insert event from the full event
            const event = {
                eventId: eventId,
                character: eventCharacter 
            };
            
            //if this is the first insert on a new row (underneath the current last row)
            if(row === this.textFileInsertEvents.length) { 
                //first text on new lines at the end of the file must have a col of 0
                if(col === 0) {
                    //create a new row at the bottom with the new event
                    this.textFileInsertEvents.push([event]);
                } else { //non-0 col on new line at bottom of file
                    //console.log(`In addInsertEventByPos(): File ${this.currentPath} Insert event cannot be added at position row: ${row} col: ${col}`);
                    throw new Error(`Insert event cannot be added at position row: ${row} col: ${col}`);
                }
            } else { //the insert is in an existing row
                //make sure the col is within the length of the row
                if(col <= this.textFileInsertEvents[row].length) {
                    //insert somewhere in the middle
                    this.textFileInsertEvents[row].splice(col, 0, event);
                } else { //outside the bounds of where a new character can go 
                    //console.log(`In addInsertEventByPos(): File ${this.currentPath} Insert event cannot be added at position row: ${row} col: ${col}`);
                    throw new Error(`Insert event cannot be added at position row: ${row} col: ${col}`);
                }
            }
            
            //if the new character was a newline character
            if(eventCharacter === 'NEWLINE' || eventCharacter === 'CR-LF') {
                //get the rest of the line after the newline character
                const restOfLine = this.textFileInsertEvents[row].splice(col + 1, this.textFileInsertEvents[row].length - col);
                
                //add a new row that the newline created with the end of the current line
                this.textFileInsertEvents.splice(row + 1, 0, restOfLine); 
            }

            return event;
        } else {
            //console.log(`In addInsertEventByPos(): File ${this.currentPath} Insert event cannot be added at position row: ${row} col: ${col}`);
            throw new Error(`Insert event cannot be added at position row: ${row} col: ${col}`);
        }
    }
    
    /*
     * Removes a minimal event from the 2D collection when something is 
     * deleted.
     */
    removeInsertEventByPos(row, col) {
        //this file has been changed in the current session
        this.hasBeenModified = true;

        //make sure the request is within the bounds
        if(row >= 0 && row < this.textFileInsertEvents.length && col >= 0 && col < this.textFileInsertEvents[row].length) {
            //if we are removing a newline character
            if(this.textFileInsertEvents[row][col].character === 'NEWLINE' || this.textFileInsertEvents[row][col].character === 'CR-LF') {
                //remove the newline character from its line
                this.textFileInsertEvents[row].splice(col, 1);

                //if there is a 'next' row, move all the elements up to this row
                if(row + 1 < this.textFileInsertEvents.length) {
                    //get the next row (it may be an empty row)
                    const copyElements = this.textFileInsertEvents[row + 1].splice(0);

                    //add the elements to the current row
                    for(let i = 0;i < copyElements.length;i++) {
                        this.textFileInsertEvents[row].push(copyElements[i]);                
                    }
                    
                    //remove the row that we copied all of the elements over
                    this.textFileInsertEvents.splice(row + 1, 1);
                } //else- this is the last row in the file- there is not another row after this one to copy over            
            } else { //removing a non-newline
                //remove the id
                this.textFileInsertEvents[row].splice(col, 1);
            }
            
            //if there is nothing left on the row
            if(this.textFileInsertEvents[row].length === 0) {
                //remove the row
                this.textFileInsertEvents.splice(row, 1);
            }
        } else {
            //console.log(`In removeInsertEventByPos(): File ${this.currentPath} Cannot remove the insert event at row: ${row} col: ${col}`);
            throw new Error(`Cannot remove the insert event at row: ${row} col: ${col}`);
        }
    }

    /*
     * Returns the event before the passed in row and col
     */
    getPreviousNeighbor(row, col) {
        //the previous neighbor
        let retVal = null;
        
        //the row and col should never be negative
        if(row >= 0 && col >= 0) {    
            //if we are asking for the previous neighbor of the very first element in the document
            if(row === 0 && col === 0) {
                //there is no previous neighbor
                retVal = null;
            } else if(col === 0 && row <= this.textFileInsertEvents.length) { //previous neighbor of a first column
                //get the previous row (there will always be one)
                const previousRow = this.textFileInsertEvents[row - 1];
                
                //go to the end of the previous row and return the last insert event
                retVal = previousRow[previousRow.length - 1];
            } else if(col <= this.textFileInsertEvents[row].length) { //not in the first col
                //go back one from the col and return it
                retVal = this.textFileInsertEvents[row][col - 1];
            } 
        }

        //return the id of the previous neighbor
        return retVal;
    }

    /*
     * Returns the id of the event before the passed in row and col ('none' if
     * the request is for row zero, column zero).
     */
    getPreviousNeighborId(row, col) {
        const previousNeighborEvent = this.getPreviousNeighbor(row, col);
        return previousNeighborEvent ? previousNeighborEvent.eventId : 'none';
    }

    /*
     * Returns the minimal event at position row and col
     */
    getEvent(row, col) {
        //event to return
        let retVal = null;
        
        //make sure the request is within bounds
        if(row >= 0 && row < this.textFileInsertEvents.length && col >= 0 && col < this.textFileInsertEvents[row].length) {
            //return the id of the code
            retVal = this.textFileInsertEvents[row][col];
        }
        
        return retVal;
    }

    /*
     * Returns a group of contiguous events from a file. This is used for 
     * copy and paste situations. The minimal insert events are captured from
     * the beginning inclusively (startRow, startCol) up to the end exclusively 
     * [endRow, endCol]. In other words, all of the character from 
     * (startRow, startCol) up to but not including [endRow, endCol].
     */
    getInsertEventsByPos(startRow, startCol, endRow, endCol) {
        //a list of the minimal events in the selected range
        const events = [];

        //make sure the request is within bounds
        if(startRow >= 0 && startRow < this.textFileInsertEvents.length && 
           startCol >= 0 && startCol < this.textFileInsertEvents[startRow].length &&
           endRow >= 0 && endRow < this.textFileInsertEvents.length && 
           endCol >= 0 && endCol <= this.textFileInsertEvents[endRow].length) {
            //where the insert starts
            let row = startRow;
            let col = startCol;

            //while the current position is not equal to the end position
            while(row !== endRow || col !== endCol) {
                //get the current (minimal) event
                const currentEvent = this.textFileInsertEvents[row][col];
                
                //add it list 
                events.push(currentEvent);

                //if this code character was a newline
                if(currentEvent.character === 'NEWLINE' || currentEvent.character === 'CR-LF') {
                    //go to the next row
                    row++;

                    //set the column back to the beginning of the line
                    col = 0;
                } else { //a non-newline character
                    //move to the next column
                    col++;
                }
            }
        }

        return events;
    }

    /*
     * Returns only the text in the minimal events as a single string.
     */
    getText() {
        //text in the file
        let text = '';

        //go through the entire 2D array of events
        for(let line = 0;line < this.textFileInsertEvents.length;line++) {
            for(let column = 0;column < this.textFileInsertEvents[line].length;column++) {
                if(this.textFileInsertEvents[line][column].character === 'NEWLINE' || this.textFileInsertEvents[line][column].character === 'CR-LF') {
                    text += '\n';
                } else if(this.textFileInsertEvents[line][column].character === 'TAB') {
                    text += '\t';
                } else {
                    //append the code character to a string
                    text += this.textFileInsertEvents[line][column].character;
                }
            }
        }

        return text;
    }
}

module.exports = File;