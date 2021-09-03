/*
 * This class is used to capture changes to new code during forward progress in
 * a playback. It uses this info to create ranges of new code to highlight. It 
 * also records line numbers where inserts and deletes have happened to 
 * highlight in the line number gutter.
 * 
 * There are objects for every line of a file up to a change. The objects hold
 * and array of characters that hold either a '\0' or the newly inserted character. 
 * A '\0' is a placeholder for an unknown but existing character. The ranges are 
 * created by looking for lines with one or more non-'\0' in a file. The object also 
 * holds whether a line has had an insert or delete in it.
 * 
 * The line changes are created to record the minimum changes necessary to make
 * the markers. For example, if this is the starting text at a pause point:
 * 1) THIS IS THE FIRST LINE
 * 2) THIS IS SOME CODE
 * 3) HERE IS ANOTHER LINE
 * 4) AND HERE IS SOME MORE
 * 5) LAST LINE
 * 
 * And then these changes are made before the next pause point (in lowercase):
 * 1) THIS IS THE FIRST LINE
 * 2) THIS IS SOME cool CODE
 * 3) HERE IS ANOTHER really awesome LINE
 * 4) AND HERE IS SOME MORE
 * 5) LAST LINE
 * 
 * This class will record the minimal changes:
 * 1) 
 * 2) .............cool
 * 3) ................really awesome
 * 
 * There is no need to record lines 4 or 5 or any text on a line after the new
 * code.
 */
class NewCodeFileMarker {
  constructor() {
    //holds changes made to every line
    this.lineChanges = [];
  }

  /*
   * Marks an insert in a file. The two types of inserts are regular 
   * characters and newlines. 
   */
  insert(row, col, insertText) {
    //inserting a newline
    if (insertText === '\n') {
      //the new row after the newline
      const nextRow = {
        characters: [],
        insertsOnLine: false,
        deletesOnLine: false
      };
      //the newline is being added amongst other existing new code
      if (this.lineChanges[row] && this.lineChanges[row].characters[col]) {
        //grab all of the new code after the newline and add it to a new row underneath
        nextRow.characters = this.lineChanges[row].characters.splice(col);
      } else { //the newline is outside of the existing new code
        //expand the rows (if necessary)
        this.expandToRowAndColumn(row, col);
      }
      //add the new row
      this.lineChanges.splice(row + 1, 0, nextRow);
    } else { //not a new line
      //expand the rows (if necessary)
      this.expandToRowAndColumn(row, col);

      //mark the position as new code and an insert on the line
      this.lineChanges[row].characters.splice(col, 0, insertText);

      //mark the newline on the current row
      this.lineChanges[row].insertsOnLine = true;
    }
  }

  /*
   * Adds line changes up to a row (only if needed). It also adds placeholders 
   * up to but not including the passed in column value (again, only if needed).
   */
  expandToRowAndColumn(row, col) {
    //if the requested row does not exist yet add rows until it does
    while (row >= this.lineChanges.length) {
      //add empty rows until it does 
      this.lineChanges.push({
        characters: [],
        insertsOnLine: false,
        deletesOnLine: false
      });
    }

    //if the columns before the new text do not exist yet
    while (col > this.lineChanges[row].characters.length) {
      //add a placeholder for code
      this.lineChanges[row].characters.push('\0');
    }
  }

  /*
   * Handles deleting from a file. The two types of deletes are characters
   * and newlines.
   */
  delete(row, col, deleteText) {
    //deleting a newline
    if (deleteText === '\n') {
      //the newline is being deleted amongst other new code
      if (row < this.lineChanges.length) {
        //if there is a row of new code underneath
        if (this.lineChanges[row + 1]) {
          //if there is some new code on the line underneath
          if (this.lineChanges[row + 1].characters.length > 0) {
            //now add the new code on the row underneath to the end of this row
            for (let i = 0; i < this.lineChanges[row + 1].characters.length; i++) {
              this.lineChanges[row].characters.push(this.lineChanges[row + 1].characters[i]);
            }
          }
          //remove the copied row
          this.lineChanges.splice((row + 1), 1);
        } // else- no new code underneath, this row has already been marked as deleted
      } else { //the newline is outside of the existing new code rows and can be ignored
        //expand the rows (if necessary)
        this.expandToRowAndColumn(row, col);
      }
    } else { //not a new line
      //the text is being deleted amongst other new code
      if (this.lineChanges[row] && this.lineChanges[row].characters[col]) {
        //remove the new code (or placeholder)
        this.lineChanges[row].characters.splice(col, 1);
      } else {//the newline is outside of the existing new code 
        //expand the rows (if necessary)
        this.expandToRowAndColumn(row, col);
      }
    }
    //mark a delete on the line
    this.lineChanges[row].deletesOnLine = true;
  }

  toDebugString() {
    let retVal = "";
    for (let row = 0; row < this.lineChanges.length; row++) {
      retVal += `${(row + 1)}. `;
      for (let col = 0; col < this.lineChanges[row].characters.length; col++) {
        if (this.lineChanges[row].characters[col] === '\0') {
          retVal += '.'
        } else if ((this.lineChanges[row].characters[col] !== '\n')) {
          retVal += this.lineChanges[row].characters[col];
        }
      }
      retVal += "\n";
    }

    return retVal;
  }

  /*
   * Creates the ranges of changes to a file so that they can be highlighted.
   */
  getAllNewCodeMarkers() {
    const allMarkers = [];
    let markerStarted = false;
    let latestMarker = {};

    //go through all of the new code
    for (let row = 0; row < this.lineChanges.length; row++) {
      //if there are any changes on this line
      if (this.lineChanges[row].characters.length > 0) {
        //go through the placeholders and inserts on the line
        for (let col = 0; col < this.lineChanges[row].characters.length; col++) {
          //if this is some new code
          if (this.lineChanges[row].characters[col] !== '\0') {
            //if a marker has been started already
            if (markerStarted) {
              latestMarker['endColumn'] = col + 1;
            } else { //no new marker yet, start a new marker
              latestMarker['startRow'] = row;
              latestMarker['startColumn'] = col;
              latestMarker['endRow'] = row;
              latestMarker['endColumn'] = col + 1

              markerStarted = true;
            }
          } else { //this is placeholder code
            //if in the middle of creating a marker
            if (markerStarted) {
              //the marker is complete, add it to the collection of all markers
              allMarkers.push(latestMarker);
              //reset for the next change
              markerStarted = false;
              latestMarker = {};
            }
          }
        }

        //after going through a changed line the marker may be unfinished
        if (markerStarted) {
          //the marker is complete, add it to the collection of all markers
          allMarkers.push(latestMarker);
          //reset for the next change
          markerStarted = false;
          latestMarker = {};
        }
      }
    }

    return allMarkers;
  }

  /*
   * Gets the line numbers with inserts.
   */
  getLinesWithInserts() {
    const retVal = [];
    //go through all of the changed lines
    for (let i = 0; i < this.lineChanges.length; i++) {
      //if there was an insert on this line
      if (this.lineChanges[i].insertsOnLine) {
        //store the line number
        retVal.push(i);
      }
    }

    return retVal;
  }

  getLinesWithDeletes() {
    const retVal = [];
    //go through all of the changed lines
    for (let i = 0; i < this.lineChanges.length; i++) {
      //if there was a delete on this line
      if (this.lineChanges[i].deletesOnLine) {
        //store the line number
        retVal.push(i);
      }
    }

    return retVal;
  }
}
