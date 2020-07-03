const FileSystemElement = require('./FileSystemElement.js');

/*
 * This class represents a file being tracked in a storyteller project. 
 * It extends the FileSystemElement class and adds a last modified date and 
 * a 2D array of minimal text events (event id and character). The 2D array 
 * of minimal events represents the state of the file at different points in 
 * time. This is used to get the complete text at a point in time and to get 
 * previous neighbor ids. 
 */
class File extends FileSystemElement {
    constructor(parentDirectoryId, currentPath, lastModifiedDate, textFileInsertEvents, isDeleted, id) {
        super(parentDirectoryId, currentPath);
        
        //if an id is supplied, use it
        if(id) {
            this.id = id;
        } else {
            //generate an id, store the last mod date of the file, and create an empty array of lines
            this.id = this.generateId();
        }

        this.lastModifiedDate = lastModifiedDate;
        
        //if insert events are supplied, use them
        if(textFileInsertEvents) {
            this.textFileInsertEvents = textFileInsertEvents;
        } else {
            //create an empty array
            this.textFileInsertEvents = [];
        }

        //if the isDeleted value is supplied, use it
        if(isDeleted) {
            this.isDeleted = isDeleted;
        } else {
            this.isDeleted = 'false';
        }
    }

    /*
     * Generates an id for a file.
     */
    generateId() {
        //create a new event text
        const newId = `fileId-${File.nextId}`;
        File.nextId++;

        return newId;
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
            lastModifiedDate: this.lastModifiedDate,
            isDeleted: this.isDeleted
        };

        return minimalFile;
    }
    /*
     * Creates a minimal insert event and adds it in its correct position in 
     * the file. 
     */
    addInsertEventByPos(eventId, eventCharacter, row, col) {
        //verify that the new insert is within the bounds of the file (check max column below)
        if(row >= 0 && row <= this.textFileInsertEvents.length && col >= 0 ) {
            //create a minimal insert event from the full event
            const event = {
                id: eventId,
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
            if(eventCharacter === '\n' || eventCharacter === '\r\n') {
                //get the rest of the line after the newline character
                const restOfLine = this.textFileInsertEvents[row].splice(col + 1, this.textFileInsertEvents[row].length - col);
                
                //add a new row that the newline created with the end of the current line
                this.textFileInsertEvents.splice(row + 1, 0, restOfLine); 
            }
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
        //make sure the request is within the bounds
        if(row >= 0 && row < this.textFileInsertEvents.length && col >= 0 && col < this.textFileInsertEvents[row].length) {
            //if we are removing a newline character
            if(this.textFileInsertEvents[row][col].character === '\n' || this.textFileInsertEvents[row][col].character === '\r\n') {
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
     * Returns the id of the event before the passed in row and col ('none' if
     * the request is for row zero, column zero).
     */
    getPreviousNeighborId(row, col) {
        //id of the previous neighbor
        let retVal;
        
        //the row and col should never be negative
        if(row >= 0 && col >= 0) {    
            //if we are asking for the previous neighbor of the very first element in the document
            if(row === 0 && col === 0) {
                //there is no previous neighbor
                retVal = 'none';
            } else if(col === 0 && row <= this.textFileInsertEvents.length) { //previous neighbor of a first column
                //get the previous row (there will always be one)
                const previousRow = this.textFileInsertEvents[row - 1];
                
                //go to the end of the previous row and return the last insert event
                const prevEvent = previousRow[previousRow.length - 1];

                //get the id of the previous neighbor
                retVal = prevEvent.id;
            } else if(col <= this.textFileInsertEvents[row].length) { //not in the first col
                //go back one from the col and return it
                const prevEvent = this.textFileInsertEvents[row][col - 1];

                //get the id of the previous neighbor
                retVal = prevEvent.id;
            } else {
                //console.log(`In getPreviousNeighborId(): File ${this.currentPath} Cannot get the previous neighbor for insert event at row: ${row} col: ${col}`);
                throw new Error(`Cannot get the previous neighbor for insert event at row: ${row} col: ${col}`);
            }
        } else {
            //console.log(`In getPreviousNeighborId(): File ${this.currentPath} Cannot get the previous neighbor for insert event at row: ${row} col: ${col} row and col must be non-negative`);
            throw new Error(`Cannot get the previous neighbor for insert event at row: ${row} col: ${col} row and col must be non-negative`);
        }
        //return the id of the previous neighbor
        return retVal;
    }

    /*
     * Returns the minimal event at position row and col
     */
    getEvent(row, col) {
        //event to return
        let retVal;
        
        //make sure the request is within bounds
        if(row >= 0 && row < this.textFileInsertEvents.length && col >= 0 && col < this.textFileInsertEvents[row].length) {
            //return the id of the code
            retVal = this.textFileInsertEvents[row][col];
        } else {
            //console.log(`In getEvent(): File ${this.currentPath} Cannot get the insert event at row: ${row} col: ${col}`);
            throw new Error(`Cannot get the insert event at row: ${row} col: ${col}`);
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
                if(currentEvent.character === '\n' || currentEvent.character === '\r\n') {
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
                //append the code character to a string
                text += this.textFileInsertEvents[line][column].character;
            }
        }

        return text;
    }
}
//used to autogenerate ids
File.nextId = 0;

module.exports = File;