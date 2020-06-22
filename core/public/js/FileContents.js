/*
 * This class is similar to one I use on the server, File, to hold the contents 
 * of files. I thought it might be useful during playback so that you can always
 * get the text and the id of the insert events for every character in the file.
 * This class stores the contents of files as they are built up during playback.
 * 
 * The class holds a 2D array of minimal insert events (id, character, age).
 * Each row in the array matches a line of text. Each column represents info
 * about a single character. This data can be accessed quickly if you know the 
 * row and column number.
 * 
 * It can also be used to mark newly inserted text. In the old playback each
 * new character since the last pause showed up in a different color than the
 * older code. I believe Ace has a way to mark a range of text in a different
 * color. This class will remember which lines have changed and efficiently 
 * create range objects that can be used to mark new code with a highlight.
 * 
 * It also returns the line numbers where both inserts and deletes have occured
 * since the last change. This can be used to highlight line numbers so that
 * readers can see where code was added and removed.
 */
class FileContents {
    constructor() {
        //create an empty 2D array of minimal insert events
        this.textFileInsertEvents = [];

        //indicates whether a file has been changed or not
        this.fileChanged = false;
        
        //store the line numbers of changed line for easy look up
        //use this like a set (keys and vals are line numbers)
        this.insertsLineNumbers = {};
        this.deletesLineNumbers = {};
    }

    /*
     * Creates a minimal insert event and adds it in its correct position in 
     * the file. The minimal insert event holds the id of the insert event that
     * created it, the character to be displayed, and an age of the event.
     * 
     * Takes an age for the event. 'new' is the default, events can
     * be marked as 'old' after one moves past them in a playback. I suggest 
     * another age, 'never relevant', for events that were present when the 
     * file was created which are usually not animated.
     */
    addInsertEventByPos(eventId, eventCharacter, row, col, age='new') {
        //verify that the new insert is within the bounds of the file (check max column below)
        if(row >= 0 && row <= this.textFileInsertEvents.length && col >= 0 ) {
            //create a minimal insert event from the full event
            const event = {
                id: eventId,
                character: eventCharacter,
                age: age
            };
            
            //if this is the first insert on a new row (underneath the current last row)
            if(row === this.textFileInsertEvents.length) { 
                //first text on new lines at the end of the file must have a col of 0
                if(col === 0) {
                    //create a new row at the bottom with the new event
                    this.textFileInsertEvents.push([event]);
                    //indicate the file has changed
                    this.fileChanged = true;
                    this.insertsLineNumbers[row] = row;
                } else { //non-0 col on new line at bottom of file
                    //console.log(`In addInsertEventByPos(): File ${this.currentPath} Insert event cannot be added at position row: ${row} col: ${col}`);
                    throw new Error(`Insert event cannot be added at position row: ${row} col: ${col}`);
                }
            } else { //the insert is in an existing row
                //make sure the col is within the length of the row
                if(col <= this.textFileInsertEvents[row].length) {
                    //insert somewhere in the middle
                    this.textFileInsertEvents[row].splice(col, 0, event);
                    //indicate the file has changed
                    this.fileChanged = true;
                    this.insertsLineNumbers[row] = row;
                } else { //outside the bounds of where a new character can go 
                    //console.log(`In addInsertEventByPos(): File ${this.currentPath} Insert event cannot be added at position row: ${row} col: ${col}`);
                    throw new Error(`Insert event cannot be added at position row: ${row} col: ${col}`);
                }
            }
            
            //if the new character was a newline character
            if(eventCharacter === '\n') {
                //get the rest of the line after the newline character
                const restOfLine = this.textFileInsertEvents[row].splice(col + 1, this.textFileInsertEvents[row].length - col);
                
                //add a new row that the newline created with the end of the current line
                this.textFileInsertEvents.splice(row + 1, 0, restOfLine);
                //mark the next line as having a change in it also
                this.insertsLineNumbers[row + 1] = (row + 1);
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
            //indicate the file has changed
            this.fileChanged = true;

            //if we are removing a newline character
            if(this.textFileInsertEvents[row][col].character === '\n') {
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
                //if there was an insert or delete on this line remove them
                //since the line is now gone
                delete this.insertsLineNumbers[row];
                delete this.deletesLineNumbers[row];
            } else { //there is at least something left on the line
                //mark the line as being deleted
                this.deletesLineNumbers[row] = row;
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
                if(currentEvent.character === '\n') {
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
     * Get the text by position. Can be used to get highlighted text during a
     * playback.
     */
    getTextByPos(startRow, startCol, endRow, endCol) {
        //get the requested minimal events
        const minimalEvents = getInsertEventsByPos(startRow, startCol, endRow, endCol);
        //pull off the character for each one and append it to a string to return
        return minimalEvents.reduce((selectedText, event) => selectedText += event.character, '');
    }

    /*
     * Returns the entire text of the file as a single string.
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
    
    /*
     * Returns a sorted array of line numbers with new inserts on them.
     */
    getLineNumbersWithInserts() {
        lineNumbers = [];
        for(const lineNumber in insertsLineNumbers) {
            lineNumbers.push(lineNumber);
        }

        return lineNumbers.sort();
    }

    /*
     * Returns a sorted array of line numbers with new deletes in them.
     */
    getLineNumbersWithDeletes() {
        lineNumbers = [];
        for(const lineNumber in deletesLineNumbers) {
            lineNumbers.push(lineNumber);
        }

        return lineNumbers.sort();
    }

    /*
     * Returns an array of objects to mark during playback. Each object
     * in the array has a start and end line and column number that represents
     * where the text is in the file.
     * 
     * TODO off by one??? what about newlines???
     * 
     * The function takes an 'age' value so that we can mark different things
     * during playback (new code since the last comment, code that used to be
     * new, code that was never animated).
     */
    getRangesOfText(requestedAge) {
        //holds an array of range objects for text to highlight
        const retVal = [];
        //get all the line numbers that have changed since the last pause
        //that can be highlighted (deletes are gone and can't be highlighted)
        const lineNumbersWithNewInserts = getLineNumbersWithInserts();

        //holds the positions on a changed line that will make up a range
        let startOfNewRange = -1;
        let endOfNewRange = -1;

        //go through only the changed lines of text
        for(let i = 0;i < lineNumbersWithNewInserts.length;i++) {
            //get the line of events
            const lineNumber = lineNumbersWithNewInserts[i];
            const line = this.textFileInsertEvents[lineNumber];

            //go through the events of a changed line
            for(let j = 0;j < line.length;j++) {
                const event = line[j];
                //if this is a requested event
                if(event.age === requestedAge) {
                    //if the start has not been set yet
                    if(startOfNewRange === -1) {
                        //store the start of the range
                        startOfNewRange = j;
                        //default the end to just beyond the end
                        endOfNewRange = j + 1;
                    } else { //start has already been set
                        //update the end of the range
                        endOfNewRange = j + 1;
                    }
                } else { //not a requested age event
                    //check to see if we are at the end of a range of events
                    //start and end are not -1 when in a range
                    if(startOfNewRange !== -1) {
                        //this signifies the end of the continuous range (but 
                        //there may be some more ahead in the line)
                        const newRange = {
                            startRow: lineNumber,
                            startColumn: startOfNewRange,
                            endRow: lineNumber,
                            endColumn: endOfNewRange
                        };
                        retVal.push(newRange);

                        //reset these so that more ranges can be found later in the line
                        startOfNewRange = -1;
                        endOfNewRange = -1;
                    }
                }
            }
            //there might not have been an explicit end to the last range on a 
            //line, check that here at the end of the line
            if(startOfNewRange !== -1) {
                const newRange = {
                    startRow: lineNumber,
                    startColumn: startOfNewRange,
                    endRow: lineNumber,
                    endColumn: endOfNewRange
                };
                retVal.push(newRange);
            }
        }
        

        return retVal;
    }

    /*
     * This goes through all of the lines that have fresh inserts on them
     * and changes the age of the events from 'new' to a new value.
     */
    markNew(newAge) {
        //get all the line numbers that have changed since the last pause
        const lineNumbersWithNewInserts = getLineNumbersWithInserts();

        //go through only the changed lines of text
        for(let i = 0;i < lineNumbersWithNewInserts.length;i++) {
            //get the line of events
            const lineNumber = lineNumbersWithNewInserts[i];
            const line = this.textFileInsertEvents[lineNumber];

            //go through the events of a changed line
            for(let j = 0;j < line.length;j++) {
                const event = line[j];
                //if this is a new event
                if(event.age === 'new') {
                    //change it to the new age value
                    event.age = newAge;
                }
            }
        }
    }

    /*
     * Call this when moving on from a pause point during a playback to 
     * indicate that all code inserted and deleted after this starting state 
     * will be marked.
     * 
     * Playback can ask each file if it has changed and then quickly get the
     * info about changes (line numbers and ranges of inserted text).
     */
    reset() {
        //indicate the file has not changed
        this.fileChanged = false;
        //get rid of any existing changed line numbers
        this.insertsLineNumbers = {};
        this.deletesLineNumbers = {};
    }
}