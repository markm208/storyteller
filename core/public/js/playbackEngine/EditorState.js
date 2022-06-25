class EditorState {
  constructor() {
    this.allDirectories = {};
    this.allFiles = {};
    this.filesContents = {};
    this.filesEvents = {};
  }

  getFiles() {
    //map of all files (by file id) and a string with their contents
    const allFilesText = {};
    //go through each file
    Object.keys(this.filesContents).forEach(fileId => {
      //store the string of file contents
      allFilesText[fileId] = this.getFile(fileId);
    });
    return allFilesText;
  }

  getFile(fileId) {
    //build up the text inside
    let textInFile = "";
    //get a file
    const currentFile = this.filesContents[fileId];
    for (let row = 0; row < currentFile.length; row++) {
      for (let col = 0; col < currentFile[row].length; col++) {
        const latestCharacter = currentFile[row][col];
        if (latestCharacter === "NEWLINE" || latestCharacter === "CR-LF") {
          textInFile += "\n";
        } else if (latestCharacter === "TAB") {
          textInFile += "\t";
        } else {
          textInFile += latestCharacter;
        }
      }
    }
    return textInFile;
  }

  getNumLinesInFile(fileId) {
    let retVal = 0;

    //get a file representation (if it exists)
    if(this.filesContents[fileId]) {
      //get the number of rows in the 2D array
      const currentFile = this.filesContents[fileId];
      retVal = currentFile.length;
    }
    return retVal;
  }

  getFilePath(fileId) {
    let filePath = '';
    if(this.allFiles[fileId]) {
      const file = this.allFiles[fileId];
      filePath = file.filePath;
    }
    return filePath;
  }

  insert(fileId, newCharacter, eventId, row, col) {
    //if this is the first insert on a new row (underneath the current last row)
    if (row === this.filesContents[fileId].length) {
      //create a new row at the bottom with the new event
      this.filesContents[fileId].push([newCharacter]);
      this.filesEvents[fileId].push([eventId]);
    } else { //the insert is in an existing row
      //insert somewhere in the middle
      this.filesContents[fileId][row].splice(col, 0, newCharacter);
      this.filesEvents[fileId][row].splice(col, 0, eventId);
    }

    //if the new character was a newline character
    if (newCharacter === 'NEWLINE' || newCharacter === 'CR-LF') {
      //get the rest of the line after the newline character
      const restOfLineText = this.filesContents[fileId][row].splice(col + 1, this.filesContents[fileId][row].length - col);
      const restOfLineEventIds = this.filesEvents[fileId][row].splice(col + 1, this.filesEvents[fileId][row].length - col);

      //add a new row that the newline created with the end of the current line
      this.filesContents[fileId].splice(row + 1, 0, restOfLineText);
      this.filesEvents[fileId].splice(row + 1, 0, restOfLineEventIds);
    }
  }

  insertBackward(fileId, row, col) {
    this.delete(fileId, row, col);
  }

  delete(fileId, row, col) {
    //if we are removing a newline character
    if (this.filesContents[fileId][row][col] === 'NEWLINE' || this.filesContents[fileId][row][col] === 'CR-LF') {
      //remove the newline character from its line
      this.filesContents[fileId][row].splice(col, 1);
      this.filesEvents[fileId][row].splice(col, 1);

      //if there is a 'next' row, move all the elements up to this row
      if (row + 1 < this.filesContents[fileId].length) {
        //get the next row (it may be an empty row)
        const copyElementsText = this.filesContents[fileId][row + 1].splice(0);
        const copyElementsEventIds = this.filesEvents[fileId][row + 1].splice(0);

        //add the elements to the current row
        for (let i = 0; i < copyElementsText.length; i++) {
          this.filesContents[fileId][row].push(copyElementsText[i]);
          this.filesEvents[fileId][row].push(copyElementsEventIds[i]);
        }

        //remove the row that we copied all of the elements over
        this.filesContents[fileId].splice(row + 1, 1);
        this.filesEvents[fileId].splice(row + 1, 1);
      } //else- this is the last row in the file- there is not another row after this one to copy over            
    } else { //removing a non-newline
      //remove the id
      this.filesContents[fileId][row].splice(col, 1);
      this.filesEvents[fileId][row].splice(col, 1);
    }

    //if there is nothing left on the row
    if (this.filesContents[fileId][row].length === 0) {
      //remove the row
      this.filesContents[fileId].splice(row, 1);
      this.filesEvents[fileId].splice(row, 1);
    }
  }

  deleteBackward(fileId, newCharacter, eventId, row, col) {
    this.insert(fileId, newCharacter, eventId, row, col);
  }

  createFile(fileId, filePath, parentDirectoryId) {
    //info about the file
    this.allFiles[fileId] = {
      fileId,
      filePath,
      parentDirectoryId,
      isDeleted: false
    };
    //store the file id in the parent dir's collection of file ids
    this.allDirectories[parentDirectoryId].childFiles.push(fileId);
    //empty content and event ids
    this.filesContents[fileId] = [];
    this.filesEvents[fileId] = [];
  }

  createFileBackward(fileId, parentDirectoryId) {
    //remove the info about the file
    delete this.allFiles[fileId];

    //remove the file id from the parent
    const index = this.allDirectories[parentDirectoryId].childFiles.indexOf(fileId);
    this.allDirectories[parentDirectoryId].childFiles.splice(index, 1);
  }

  deleteFile(fileId, parentDirectoryId) {
    //mark a file as deleted
    this.allFiles[fileId].isDeleted = true;

    //remove the file id from the parent
    const index = this.allDirectories[parentDirectoryId].childFiles.indexOf(fileId);
    this.allDirectories[parentDirectoryId].childFiles.splice(index, 1);
  }

  deleteFileBackward(fileId, parentDirectoryId) {
    //mark a file as NOT deleted anymore
    this.allFiles[fileId].isDeleted = false;

    //store the file id in the parent dir's collection of file ids
    this.allDirectories[parentDirectoryId].childFiles.push(fileId);
  }

  renameFile(fileId, newFilePath) {
    //update path
    this.allFiles[fileId].filePath = newFilePath;
  }

  renameFileBackward(fileId, oldFilePath) {
    //update path
    this.allFiles[fileId].filePath = oldFilePath;
  }

  moveFile(fileId, newFilePath, newParentDirectoryId, oldParentDirectoryId) {
    //update parent id and path
    this.allFiles[fileId].parentDirectoryId = newParentDirectoryId;
    this.allFiles[fileId].filePath = newFilePath;
    //find and remove file from old parent
    const index = this.allDirectories[oldParentDirectoryId].childFiles.indexOf(fileId);
    this.allDirectories[oldParentDirectoryId].childFiles.splice(index, 1);
    //add to new parent
    this.allDirectories[newParentDirectoryId].childFiles.push(fileId);
  }

  moveFileBackward(fileId, oldFilePath, newParentDirectoryId, oldParentDirectoryId) {
    //update parent id and path
    this.allFiles[fileId].parentDirectoryId = oldParentDirectoryId;
    this.allFiles[fileId].filePath = oldFilePath;
    //find and remove file from new parent
    const index = this.allDirectories[newParentDirectoryId].childFiles.indexOf(fileId);
    this.allDirectories[newParentDirectoryId].childFiles.splice(index, 1);
    //add to old parent
    this.allDirectories[oldParentDirectoryId].childFiles.push(fileId);
  }

  createDirectory(directoryId, directoryPath, parentDirectoryId) {
    //info about the directory
    this.allDirectories[directoryId] = {
      directoryId,
      directoryPath,
      parentDirectoryId,
      childDirectories: [],
      childFiles: [],
      isDeleted: false
    };
    //if this is not the root dir
    if (parentDirectoryId) {
      //store the directory id in the parent dir's collection of dir ids
      this.allDirectories[parentDirectoryId].childDirectories.push(directoryId);
    }
  }

  createDirectoryBackward(directoryId, parentDirectoryId) {
    //remove the info about the directory
    delete this.allDirectories[directoryId];

    //if this is not the root dir
    if (parentDirectoryId) {
      //remove the dir id from the parent
      const index = this.allDirectories[parentDirectoryId].childDirectories.indexOf(directoryId);
      this.allDirectories[parentDirectoryId].childDirectories.splice(index, 1);
    }
  }

  deleteDirectory(directoryId, parentDirectoryId) {
    //mark a directory as deleted
    this.allDirectories[directoryId].isDeleted = true;

    //if this is not the root dir
    if (parentDirectoryId) {
      //remove the directory id from the parent
      const index = this.allDirectories[parentDirectoryId].childDirectories.indexOf(directoryId);
      this.allDirectories[parentDirectoryId].childDirectories.splice(index, 1);
    }
  }

  deleteDirectoryBackward(directoryId, parentDirectoryId) {
    //mark a directory as NOT deleted anymore
    this.allDirectories[directoryId].isDeleted = false;

    //if this is not the root dir
    if (parentDirectoryId) {
      //store the dir id in the parent dir's collection of dir ids
      this.allDirectories[parentDirectoryId].childDirectories.push(directoryId);
    }
  }

  renameDirectory(directoryId, newDirectoryPath) {
    //update path
    this.allDirectories[directoryId].directoryPath = newDirectoryPath;
  }

  renameDirectoryBackward(directoryId, oldDirectoryPath) {
    //update path
    this.allDirectories[directoryId].directoryPath = oldDirectoryPath;
  }

  moveDirectory(directoryId, newDirectoryPath, newParentDirectoryId, oldParentDirectoryId) {
    //update parent id and path
    this.allDirectories[directoryId].parentDirectoryId = newParentDirectoryId;
    this.allDirectories[directoryId].directoryPath = newDirectoryPath;

    //adjust the parent's children
    if (oldParentDirectoryId) {
      const index = this.allDirectories[oldParentDirectoryId].childDirectories.indexOf(directoryId);
      this.allDirectories[oldParentDirectoryId].childDirectories.splice(index, 1);
    }
    if (newParentDirectoryId) {
      this.allDirectories[newParentDirectoryId].childDirectories.push(directoryId);
    }
  }

  moveDirectoryBackward(directoryId, oldDirectoryPath, newParentDirectoryId, oldParentDirectoryId) {
    //update parent id and path
    this.allDirectories[directoryId].parentDirectoryId = oldParentDirectoryId;
    this.allDirectories[directoryId].directoryPath = oldDirectoryPath;

    //adjust the parent's children
    if (newParentDirectoryId) {
      const index = this.allDirectories[newParentDirectoryId].childDirectories.indexOf(directoryId);
      this.allDirectories[newParentDirectoryId].childDirectories.splice(index, 1);
    }
    if (oldParentDirectoryId) {
      this.allDirectories[oldParentDirectoryId].childDirectories.push(directoryId);
    }
  }
}
