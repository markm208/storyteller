class CodeDownloader {
  constructor(playbackEngine) {
    this.playbackEngine = playbackEngine;
    this.zip = new JSZip();
  }

  /*
   * Recreates a storyteller project and gives the user a zip file to download.
   */
  async zipAndDownload() {
    //first add the code at the current pause point
    //add the current dirs
    Object.keys(this.playbackEngine.editorState.allDirectories).forEach(dirId => {
      if(this.isDirectoryDeleted(dirId) === false) {
        //get the dir path
        const dir = this.playbackEngine.editorState.allDirectories[dirId];
        let dirPath = dir.directoryPath;
        //JSZip doesn't like the leading / in paths so remove it (except for the root)
        if(dirPath !== '/') {
          dirPath = dirPath .substring(1);
        }
        //add an entry for the dir (this is to preserve empty dirs)
        this.zip.folder(dirPath);
      }
    });
    //add the current files
    Object.keys(this.playbackEngine.editorState.allFiles).forEach(fileId => {
      if(this.isFileDeleted(fileId) === false) {
        const file = this.playbackEngine.editorState.allFiles[fileId];
        //get the file path and the text in the editor and add the file to the zip
        const fileContents = this.playbackEngine.editorState.getFile(fileId);
        //JSZip doesn't like the leading / in paths so remove it
        const filePath = file.filePath.substring(1);
        this.zip.file(filePath, fileContents);
      }
    });

    //add the data required to make this a storyeller project
    const eventUpToPausePoint = this.playbackEngine.playbackData.events.slice(0, this.playbackEngine.currentEventIndex + 1);
    await this.addStorytellerProjectHistoryToZip(eventUpToPausePoint);
  
    //create a blob representation of the zip
    const blobbedZip = await this.zip.generateAsync({
      type:'blob',
      compression: 'DEFLATE',
      compressionOptions: {
          level: 9
      }
    });
    return blobbedZip;
  }

  isFileDeleted(fileId) {
    let retVal = false;
    const file = this.playbackEngine.editorState.allFiles[fileId];
    //check to see if the file is deleted
    if(file.isDeleted) {
      retVal = true;
    } else { 
      //check to see if any parent dir has been deleted
      let parentDir = this.playbackEngine.editorState.allDirectories[file.parentDirectoryId];
      while(parentDir) {
        if(parentDir.isDeleted) {
          retVal = true;
          break;
        }
        //move up to the next parent dir
        parentDir = this.playbackEngine.editorState.allDirectories[parentDir.parentDirectoryId];
      }
    }
    return retVal;
  }

  isDirectoryDeleted(dirId) {
    let retVal = false;
    const dir = this.playbackEngine.editorState.allDirectories[dirId];
    //check to see if the dir is deleted
    if(dir.isDeleted) {
      retVal = true;
    } else { 
      //check to see if any parent dir has been deleted
      let parentDir = this.playbackEngine.editorState.allDirectories[dir.parentDirectoryId];
      while(parentDir) {
        if(parentDir.isDeleted) {
          retVal = true;
          break;
        }
        //move up to the next parent dir
        parentDir = this.playbackEngine.editorState.allDirectories[parentDir.parentDirectoryId];
      }
    }
    return retVal;
  }

  /*
   * Adds the required data to make this zip a true storyteller project that can 
   * added to. 
   */
  async addStorytellerProjectHistoryToZip(events) {
    //add the required directories for a storyteller project
    this.zip.folder('.storyteller');
    this.zip.folder('.storyteller/comments');
    this.zip.folder('.storyteller/comments/media');
    this.zip.folder('.storyteller/comments/media/audios');
    this.zip.folder('.storyteller/comments/media/images');
    this.zip.folder('.storyteller/comments/media/videos');
    this.zip.folder('.storyteller/devs');
    this.zip.folder('.storyteller/events');
    this.zip.folder('.storyteller/events/intermediate');
    this.zip.folder('.storyteller/fs');
    this.zip.folder('.storyteller/project');

    //data collected from the events up to the pause point
    const zipPlaybackData = {
        comments: {},
        commentImageURLs: {},
        commentVideoURLs: {},
        commentAudioURLs: {},
        devGroups: {},
        devs: {},
        latestDevGroupId: '',
        events: [],
        allFiles: {},
        textFileContents: {},
        allDirs: {},
        pathToFileIdMap: {},
        pathToDirIdMap: {},
        project: {
            title: '',
            branchId: ''
        }
    };

    //move through the events up to the pause point and collect only the data
    //that has been used so far
    this.collectDataAboutEvents(events, zipPlaybackData);

    //get the comments up to this point in the playback and store in the comments dir
    await this.createCommentsFile(zipPlaybackData);

    //get the devs up to this point in the playback and store in the devs dir
    this.createDevsFile(zipPlaybackData);
    
    //get the fs data up to this point in the playback and store in the fs dir
    this.createFSFile(zipPlaybackData);

    //get the events up to this point in the playback and store in the events dir
    this.createEventsFile(zipPlaybackData);
    
    //get the project data up to this point in the playback and store in the project dir
    this.createProjectFile(zipPlaybackData);
  }
  /*
   * March through the events from the beginning until the pause point and collect
   * information from the events. 
   */
  collectDataAboutEvents(events, zipPlaybackData) {
    //start at the beginning and move until the pause point in the playback
    for(let i = 0;i < events.length;i++) {
      //grab the next event
      const nextEvent = events[i];

      //is there a comment associated with this event
      if(this.playbackEngine.playbackData.comments[nextEvent.id]) {
        //add the comment data to the st data
        this.storeCommentData(this.playbackEngine.playbackData.comments[nextEvent.id], nextEvent.id, zipPlaybackData);
      }
      
      //if this is a new dev group add it and all the devs in the group
      if(!zipPlaybackData.devGroups[nextEvent.createdByDevGroupId]) {
        this.storeDevData(nextEvent.createdByDevGroupId, zipPlaybackData)
      }

      //update the fs 
      this.updateFileSystem(nextEvent, zipPlaybackData);

      //add the event
      zipPlaybackData.events.push(nextEvent);
    }

    //the latest event's dev group id to set the current dev group 
    zipPlaybackData.latestDevGroupId = events[events.length - 1].createdByDevGroupId;

    //store the project title and branch id
    zipPlaybackData.project.title = playbackData.playbackTitle;
    //TODO change this for every new download???
    zipPlaybackData.project.branchId = playbackData.branchId; 
  }
  /*
   * Stores info about a dev group and devs that are encountered.
   */
  storeDevData(devGroupId, zipPlaybackData) {
    //get the dev group
    const newDevGroup = this.playbackEngine.playbackData.developerGroups[devGroupId];
    //store the dev group
    zipPlaybackData.devGroups[devGroupId] = newDevGroup;

    //add the members of the new group if they are not already present
    const memberIds = newDevGroup.memberIds;
    for(let i = 0;i < memberIds.length;i++) {
      const memberId = memberIds[i];
      if(!zipPlaybackData.devs[memberId]) {
        zipPlaybackData.devs[memberId] = this.playbackEngine.playbackData.developers[memberId];
      }
    }
  }
  /*
   * Update the file system based on the event.
   */
  updateFileSystem(nextEvent, zipPlaybackData) {
    if(nextEvent.type === 'CREATE FILE') {
      //add an entry for the file
      zipPlaybackData.allFiles[nextEvent.fileId] = {
          parentDirectoryId: nextEvent.parentDirectoryId,
          currentPath: nextEvent.filePath,
          isDeleted: 'false',
          id: nextEvent.fileId,
          lastModifiedDate: nextEvent.timestamp,
          textFileInsertEvents: []
      };
      //create an entry for the path to id map
      zipPlaybackData.pathToFileIdMap[nextEvent.filePath] = nextEvent.fileId;

      //add an entry for the file contents
      zipPlaybackData.textFileContents[nextEvent.fileId] = []; 
    } else if(nextEvent.type === 'DELETE FILE') {
      //mark the file as deleted
      zipPlaybackData.allFiles[nextEvent.fileId].isDeleted = 'true';
      //remove the path to id mapping
      delete zipPlaybackData.pathToFileIdMap[nextEvent.filePath];
      //remove the file contents
      delete zipPlaybackData.textFileContents[nextEvent.fileId];
    } else if(nextEvent.type === 'RENAME FILE') {
      //update the file's path
      zipPlaybackData.allFiles[nextEvent.fileId].currentPath = nextEvent.newFilePath;
      //adjust the path to id mapping
      const fileId = zipPlaybackData.pathToFileIdMap[nextEvent.oldFilePath];
      zipPlaybackData.pathToFileIdMap[nextEvent.newFilePath] = fileId;
      delete zipPlaybackData.pathToFileIdMap[nextEvent.oldFilePath];
    } else if(nextEvent.type === 'MOVE FILE') {
      //update the file's path
      zipPlaybackData.allFiles[nextEvent.fileId].currentPath = nextEvent.newFilePath;
      zipPlaybackData.allFiles[nextEvent.fileId].parentDirectoryId = nextEvent.newParentDirectoryId;
      //adjust the path to id mapping
      const fileId = zipPlaybackData.pathToFileIdMap[nextEvent.oldFilePath];
      zipPlaybackData.pathToFileIdMap[nextEvent.newFilePath] = fileId;
      delete zipPlaybackData.pathToFileIdMap[nextEvent.oldFilePath];
    } else if(nextEvent.type === 'CREATE DIRECTORY') {
      //add an entry for the directory
      zipPlaybackData.allDirs[nextEvent.directoryId] = {
          parentDirectoryId: nextEvent.parentDirectoryId,
          currentPath: nextEvent.directoryPath,
          isDeleted: 'false',
          id: nextEvent.directoryId
      };
      //create an entry for the path to id map
      zipPlaybackData.pathToDirIdMap[nextEvent.directoryPath] = nextEvent.directoryId;
    } else if(nextEvent.type === 'DELETE DIRECTORY') {
      //mark the directory as deleted
      zipPlaybackData.allDirs[nextEvent.directoryId].isDeleted = 'true';
      //remove the path to id mapping
      delete zipPlaybackData.pathToDirIdMap[nextEvent.directoryPath];
    } else if(nextEvent.type === 'RENAME DIRECTORY') {
      //adjust the path to id mappings and the current paths of the files/dirs affected by the dir rename
      this.updateFileAndDirPaths(zipPlaybackData, nextEvent.oldDirectoryPath, nextEvent.newDirectoryPath);
    } else if(nextEvent.type === 'MOVE DIRECTORY') {
      //update the directory's parent dir id
      zipPlaybackData.allDirs[nextEvent.directoryId].parentDirectoryId = nextEvent.newParentDirectoryId;
      //adjust the path to id mappings and the current paths of the files/dirs affected by the dir move
      this.updateFileAndDirPaths(zipPlaybackData, nextEvent.oldDirectoryPath, nextEvent.newDirectoryPath);
    } else if(nextEvent.type === 'INSERT') {
      //insert the character
      this.addInsertEventByPos(zipPlaybackData.textFileContents[nextEvent.fileId], nextEvent.id, nextEvent.character, nextEvent.lineNumber - 1, nextEvent.column - 1);
    } else if(nextEvent.type === 'DELETE') {
      //remove the character
      this.removeInsertEventByPos(zipPlaybackData.textFileContents[nextEvent.fileId], nextEvent.lineNumber - 1, nextEvent.column - 1);
    }
  }
  /*
   * Updates the current paths in allFiles and allDirs and values in the path to 
   * id mapping objects when a dir is moved or renamed.
   */
  updateFileAndDirPaths(zipPlaybackData, oldDirectoryPath, newDirectoryPath) {
    //path to id mapping
    //update all of the files that have the moved/renamed dir as part of the path
    for(let filePath in zipPlaybackData.pathToFileIdMap) {
      //if the file is somewhere within the old dir
      if(filePath.startsWith(oldDirectoryPath)) {
        //create a new path with the old dir path replaced with the new one
        const newFilePath = `${newDirectoryPath}${filePath.substring(oldDirectoryPath.length)}`;
        //add a new entry and remove the old one
        const fileId = zipPlaybackData.pathToFileIdMap[filePath];
        zipPlaybackData.pathToFileIdMap[newFilePath] = fileId;
        delete zipPlaybackData.pathToFileIdMap[filePath];
      }
    }
    //update all of the subdirectories that have the moved/renamed dir as part of the path
    for(let dirPath in zipPlaybackData.pathToDirIdMap) {
      //if the dir is somewhere within the old dir
      if(dirPath.startsWith(oldDirectoryPath)) {
        //create a new path with the old dir path replaced with the new one
        const newDirPath = `${newDirectoryPath}${dirPath.substring(oldDirectoryPath.length)}`;
        //add a new entry and remove the old one
        const dirId = zipPlaybackData.pathToDirIdMap[dirPath];
        zipPlaybackData.pathToDirIdMap[newDirPath] = dirId;
        delete zipPlaybackData.pathToDirIdMap[dirPath];
      }
    }

    //all files/dirs
    //update all of the current paths
    for(let fileId in zipPlaybackData.allFiles) {
      //get the file and its current path
      const file = zipPlaybackData.allFiles[fileId];
      const filePath = file.currentPath;
      //if the file is somewhere within the old dir
      if(filePath.startsWith(oldDirectoryPath)) {
        //replace the old current path with a new one
        file.currentPath = `${newDirectoryPath}${filePath.substring(oldDirectoryPath.length)}`;
      }
    }
    //update all of the current paths
    for(let dirId in zipPlaybackData.allDirs) {
      //get the dir and its current path
      const dir = zipPlaybackData.allDirs[dirId];
      const dirPath = dir.currentPath;
      //if the dir is somewhere within the old dir
      if(dirPath.startsWith(oldDirectoryPath)) {
        //replace the old current path with a new one
        dir.currentPath = `${newDirectoryPath}${dirPath.substring(oldDirectoryPath.length)}`;
      }
    }
  }
  /*
   * Creates a minimal insert event and adds it in its correct position in 
   * the file. 
   */
  addInsertEventByPos(textFileInsertEvents, eventId, eventCharacter, row, col) {
    //create a minimal insert event from the full event
    const event = {
      id: eventId,
      character: eventCharacter
    };
        
    //if this is the first insert on a new row (underneath the current last row)
    if(row === textFileInsertEvents.length) { 
      //create a new row at the bottom with the new event
      textFileInsertEvents.push([event]);
    } else { //the insert is in an existing row
      //insert somewhere in the middle
      textFileInsertEvents[row].splice(col, 0, event);
    }
    
    //if the new character was a newline character
    if(eventCharacter === 'NEWLINE' || eventCharacter === 'CR-LF') {
      //get the rest of the line after the newline character
      const restOfLine = textFileInsertEvents[row].splice(col + 1, textFileInsertEvents[row].length - col);
      
      //add a new row that the newline created with the end of the current line
      textFileInsertEvents.splice(row + 1, 0, restOfLine); 
    }

    return event;
  }
  
  /*
   * Removes a minimal event from the 2D collection when something is 
   * deleted.
   */
  removeInsertEventByPos(textFileInsertEvents, row, col) {
    //if we are removing a newline character
    if(textFileInsertEvents[row][col].character === 'NEWLINE' || textFileInsertEvents[row][col].character === 'CR-LF') {
      //remove the newline character from its line
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
      } //else- this is the last row in the file- there is not another row after this one to copy over            
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
   * Adds the comment data.
   */
  storeCommentData(comments, eventId, zipPlaybackData) {
    //store the comment to be added to the zip
    zipPlaybackData.comments[eventId] = comments;
    //collect the media URLs from the comments
    for(let i = 0;i < comments.length;i++) {
      const comment = comments[i];
      //store the media URLs in the comments (use an object so there are no repeats)
      if(comment.imageURLs.length > 0) {
        comment.imageURLs.forEach(imageURL => zipPlaybackData.commentImageURLs[imageURL] = imageURL);
      }
      if(comment.videoURLs.length > 0) {
        comment.videoURLs.forEach(videoURL => zipPlaybackData.commentVideoURLs[videoURL] = videoURL);
      }
      if(comment.audioURLs.length > 0) {
        comment.audioURLs.forEach(audioURL => zipPlaybackData.commentAudioURLs[audioURL] = audioURL);
      }
    }
  }
  /*
   * Create the comments.json file in the zip.
   */
  async createCommentsFile(zipPlaybackData) {
    const commentsObject = {
      comments: {},
      commentAutoGeneratedId: 0
    };

    commentsObject.comments = zipPlaybackData.comments;
    commentsObject.commentAutoGeneratedId = Object.keys(zipPlaybackData.comments).reduce((acc, eventId) => acc + zipPlaybackData.comments[eventId].length, 1);
    
    //now add the comment media (images, videos, audios)
    await this.createCommentMedia(Object.keys(zipPlaybackData.commentImageURLs));
    await this.createCommentMedia(Object.keys(zipPlaybackData.commentVideoURLs));
    await this.createCommentMedia(Object.keys(zipPlaybackData.commentAudioURLs));

    this.zip.file('.storyteller/comments/comments.json', JSON.stringify(commentsObject));
  }
  /*
   * Create the devs.json file in the zip.
   */
  createDevsFile(zipPlaybackData) {
    const devsObject = {
      systemDeveloper: playbackData.developers['devId-0'],
      anonymousDeveloper: playbackData.developers['devId-1'],
      systemDeveloperGroup: playbackData.developerGroups['devGroupId-0'],
      anonymousDeveloperGroup: playbackData.developerGroups['devGroupId-1'],
      allDevelopers: playbackData.developers,
      allDeveloperGroups: playbackData.developerGroups,
      currentDeveloperGroupId: zipPlaybackData.latestDevGroupId,
      developerAutoGeneratedId: Object.keys(playbackData.developers).length,
      developerGroupAutoGeneratedId: Object.keys(playbackData.developerGroups).length
    };

    //add the dev data to the zip
    this.zip.file('.storyteller/devs/devs.json', JSON.stringify(devsObject));
  }
  /*
   * Create the fs file.
   */
  createFSFile(zipPlaybackData) {
    //add the contents of the file (minimal insert events) to the file object 
    Object.values(zipPlaybackData.allFiles).forEach(file => {
      file['textFileInsertEvents'] = zipPlaybackData.textFileContents[file.id];
    });

    //create the object
    const fsObject = {
      allFiles: zipPlaybackData.allFiles,
      allDirs: zipPlaybackData.allDirs,
      pathToFileIdMap: zipPlaybackData.pathToFileIdMap,
      pathToDirIdMap: zipPlaybackData.pathToDirIdMap,
      fileAutoGeneratedId: Object.keys(zipPlaybackData.pathToFileIdMap).length,
      directoryAutoGeneratedId: Object.keys(zipPlaybackData.pathToDirIdMap).length
    };

    //add the fs data to the zip
    this.zip.file('.storyteller/fs/filesAndDirs.json', JSON.stringify(fsObject));
  }
  /*
   * Create the events file.
   */
  createEventsFile(zipPlaybackData) {
    const eventsObject = {
      events: zipPlaybackData.events,
      eventAutoGeneratedId: zipPlaybackData.events.length 
    };

    //add the event data to the zip
    this.zip.file('.storyteller/events/events.json', JSON.stringify(eventsObject));
  }
  /*
   * Create the project file.
   */
  createProjectFile(zipPlaybackData) {
    const projectObject = {
      title: zipPlaybackData.project.title,
      branchId: zipPlaybackData.project.branchId
    };

    //add the event data to the zip
    this.zip.file('.storyteller/project/project.json', JSON.stringify(projectObject));
  }
  /*
   * Fetch each media element and store it in the zip
   */
  async createCommentMedia(commentMediaURLs) {
    try {
      //fetch the media and turn them into blobs
      const mediaResults = await Promise.all(commentMediaURLs.map(url => fetch(url)));
      const mediaBlobs = await Promise.all(mediaResults.map(mediaResult => mediaResult.blob()));

      //add the media blobs to the zip
      for(let i = 0;i < mediaBlobs.length;i++) {
        this.zip.file(`.storyteller/comments/${commentMediaURLs[i]}`, mediaBlobs[i]);
      }
    } catch (error) {
      console.log(error);
    }
  }
}