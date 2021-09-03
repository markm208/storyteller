
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
   * Handles create/rename/move file.
   */
  touchFile(fileEvent) {
    //if there is not a file marker for this file
    if (!this.newCodeFileMarkers[fileEvent.fileId]) {
      //create a new file marker
      this.newCodeFileMarkers[fileEvent.fileId] = new NewCodeFileMarker();
    }
  }

  /*
   * Handles an insert into a file.
   */
  insert(insertEvent) {
    //if there is not a file marker for this file
    if (!this.newCodeFileMarkers[insertEvent.fileId]) {
      //create a new file marker
      this.newCodeFileMarkers[insertEvent.fileId] = new NewCodeFileMarker();
    }

    let insertEventCharacter = insertEvent.character;
    if (insertEvent.character === 'NEWLINE' || insertEvent.character === 'CR-LF') {
      insertEventCharacter = '\n';
    }

    //handle the insert
    this.newCodeFileMarkers[insertEvent.fileId].insert(insertEvent.lineNumber - 1, insertEvent.column - 1, insertEventCharacter);
  }

  /*
   * Handles a delete from a file.
   */
  delete(deleteEvent) {
    //if there is not a file marker for this file
    if (!this.newCodeFileMarkers[deleteEvent.fileId]) {
      //create a new file marker
      this.newCodeFileMarkers[deleteEvent.fileId] = new NewCodeFileMarker();
    }
    let deleteEventCharacter = deleteEvent.character;
    if (deleteEvent.character === 'NEWLINE' || deleteEvent.character === 'CR-LF') {
      deleteEventCharacter = '\n';
    }
    //handle the delete
    this.newCodeFileMarkers[deleteEvent.fileId].delete(deleteEvent.lineNumber - 1, deleteEvent.column - 1, deleteEventCharacter);
  }

  /*
   * Gets all of the file markers for the changed files.
   */
  getAllNewCodeMarkers() {
    //a collection of all the ranges of changed code for all files that 
    //were updated since the last pause point
    const allNewCodeMarkers = {};
    //go through the changed files
    for (let fileId in this.newCodeFileMarkers) {
      //ask the file marker to return an array of all code to be highlighted
      allNewCodeMarkers[fileId] = this.newCodeFileMarkers[fileId].getAllNewCodeMarkers();
    }

    return allNewCodeMarkers;
  }

  /*
   * Gets all of the file markers for a changed file.
   */
  getNewCodeMarkers(fileId) {
    //an array of ranges of changed code for all files that 
    //were updated since the last pause point
    let newCodeMarkers = [];
    if(this.newCodeFileMarkers[fileId]) {
      //ask the file marker to return an array of all code to be highlighted
      newCodeMarkers = this.newCodeFileMarkers[fileId].getAllNewCodeMarkers();
    }
    return newCodeMarkers;
  }

  /*
   * Returns an object with all of the line numbers where new code was added.
   */
  getAllInsertLineNumbers() {
    //a collection of all the line numbers with inserts since the last pause point
    const allInsertLineNumbers = {};
    //go through the changed files
    for (let fileId in this.newCodeFileMarkers) {
      //ask the file marker to return an array of all insert line numbers
      allInsertLineNumbers[fileId] = this.newCodeFileMarkers[fileId].getLinesWithInserts();
    }

    return allInsertLineNumbers;
  }
  /*
   * Returns an array with all of the line numbers where new code was added.
   */
  getInsertLineNumbers(fileId) {
    //a collection of all the line numbers with inserts since the last pause point
    let insertLineNumbers = [];
    if(this.newCodeFileMarkers[fileId]) {
      //ask the file marker to return an array of all insert line numbers
      insertLineNumbers = this.newCodeFileMarkers[fileId].getLinesWithInserts();
    }

    return insertLineNumbers;
  }
  /*
   * Returns an object with all of the line numbers where new code was deleted.
   */
  getAllDeleteLineNumbers() {
    //a collection of all the line numbers with deletes since the last pause point
    const allDeleteLineNumbers = {};
    //go through the changed files
    for (let fileId in this.newCodeFileMarkers) {
      //ask the file marker to return an array of all delete line numbers
      allDeleteLineNumbers[fileId] = this.newCodeFileMarkers[fileId].getLinesWithDeletes();
    }

    return allDeleteLineNumbers;
  }

  /*
   * Returns an array with all of the line numbers where new code was deleted.
   */
  getDeleteLineNumbers(fileId) {
    //a collection of all the line numbers with deletes since the last pause point
    let deleteLineNumbers = [];
    if (this.newCodeFileMarkers[fileId]) {
      //ask the file marker to return an array of all delete line numbers
      deleteLineNumbers = this.newCodeFileMarkers[fileId].getLinesWithDeletes();
    }

    return deleteLineNumbers;
  }
  /*
   * Returns all the file ids that were touched.
   */
  getAllChangedFileIds() {
    return Object.keys(this.newCodeFileMarkers);
  }

  /*
   * Returns an object with all of the relevant data.
   */
  getAllData() {
    return {
      allNewCodeMarkers: this.getAllNewCodeMarkers(),
      allInsertLineNumbers: this.getAllInsertLineNumbers(),
      allDeleteLineNumbers: this.getAllDeleteLineNumbers(),
      allChangedFileIds: this.getAllChangedFileIds()
    };
  }

  getData(fileId) {
    return {
      allNewCodeMarkers: this.getNewCodeMarkers(fileId),
      allInsertLineNumbers: this.getInsertLineNumbers(fileId),
      allDeleteLineNumbers: this.getDeleteLineNumbers(fileId),
      allChangedFileIds: this.getAllChangedFileIds()
    };
  }

  /*
   * Gets all of the file markers for the changed files.
   */
  toDebugString() {
    for (let fileId in this.newCodeFileMarkers) {
      console.log(`File id: ${fileId}`);
      console.log(this.newCodeFileMarkers[fileId].toDebugString());
      console.log("");
    }
  }
}
