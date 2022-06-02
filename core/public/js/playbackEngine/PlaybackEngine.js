class PlaybackEngine {
  constructor(playbackData) {
    //playback data
    this.playbackData = playbackData;
    //the state of all the files in the playback as it progresses
    this.editorState = new EditorState();
    //used to mark changes in the files
    this.newCodeMarkerGenerator = null;
    //used to move through events
    this.currentEventIndex = -1;
    this.activeDevGroupId = null;
    this.activeFileId = null;
    //info about active comment (if there is one)
    this.activeComment = {
      comment: null,
      positionInFlattenedArray: null,
      pausedOnComment: false,
    };
    //used for slider bounds (there is always at least on non-relevant event at the beginning of a playback)
    this.firstRelevantEventIndex = 1;
    this.numRelevantEvents = this.playbackData.events.length - 1;
    //info about comment locations
    this.commentIdToEventPosition = {}; //commentId->event pos: {"comment-0": 0, "comment-3": 0, "comment-1": 6, "comment-2": 12, "comment-4": 12}
    this.commentGroupEventPositions = []; //event positions where these is a comment [0, 6, 12]
    this.flattenedComments = []; //all comments in playback order [{"comment-0", ...}, {"comment-3", ...}, {"comment-1", ...}, {"comment-2", ...}, {"comment-4", ...}]
    this.commentIndexInFlattenedArray = {}; //commentId->pos in flattened array {"comment-0": 0, "comment-3": 1, "comment-1": 2, "comment-2": 3, "comment-4": 4}
    this.commentsInGroups = []; //[ [{"comment-0", ...}, {"comment-3", ...}], [{"comment-1", ...}], [{"comment-2", ...}, {"comment-4", ...}]]

    //determines whether the file system has changes and whether the active file has changed
    this.requiresUpdating = {
      fileSystem: false,
      activeFile: false
    };

    //build up data about comments and their positions
    this.recordCommentPositions();

    //count the events at the beginning that shouldn't be played back because
    //they were part of a project's initial state
    this.skipIrrelevantEvents();
  }

  recordCommentPositions() {
    //holds the event ids and positions of events where there is a comment
    const commentPositions = [];
    //go through each group of comments
    Object.keys(this.playbackData.comments).forEach(eventId => {
      //store the event id and the position in the array of events 
      //(from the first comment in the comment group's copy of the event)
      commentPositions.push({
        eventId: eventId,
        eventSequenceNumber: this.playbackData.comments[eventId][0].displayCommentEvent.eventSequenceNumber
      });
    });
    
    //sort the info by event position
    commentPositions.sort((first, second) => {
      return first.eventSequenceNumber - second.eventSequenceNumber
    });

    //go through sorted groups of comments
    commentPositions.forEach(commentPosition => {
      //store the position of the comment (for displaying pips in the slider)
      this.commentGroupEventPositions.push(commentPosition.eventSequenceNumber);
      //store the comments in groups
      this.commentsInGroups.push(this.playbackData.comments[commentPosition.eventId]);
      //get the comments in each of the groups
      const commentsInAGroup = this.playbackData.comments[commentPosition.eventId];
      //go through each comment in a group
      commentsInAGroup.forEach(comment => {
        //map the comment id to its position in the events array
        this.commentIdToEventPosition[comment.id] = commentPosition.eventSequenceNumber;
        //add the comment to a flat, ordered array of comments
        this.flattenedComments.push(comment);
        //map the comment id to its position in the flat array of comments
        this.commentIndexInFlattenedArray[comment.id] = this.flattenedComments.length - 1;
      });
    });
    
    //store the first comment as the active one
    this.activeComment.comment = this.flattenedComments[0];
    this.activeComment.positionInFlattenedArray = 0;
    this.activeComment.pausedOnComment = true;
  }

  skipIrrelevantEvents() {
    //event 0 (create project directory) is always non-relevant
    this.firstRelevantEventIndex = 1;
    this.numRelevantEvents = this.playbackData.events.length - 1;

    //find the index of the first relevant event and store it
    for (let i = 1; i < this.playbackData.events.length; i++) {
      if (this.playbackData.events[i].permanentRelevance === "never relevant") {
        //increase until a relevant event is encountered
        this.firstRelevantEventIndex++;
        //decrease the number of relevant events and move the current index
        this.numRelevantEvents--;
        this.currentEventIndex++;
      } else {
        break;
      }
    }
    //step through the non-relevant events to get ready for action
    this.stepForward(this.firstRelevantEventIndex, false);
  }

  stepForward(numberOfSteps, trackNewCodeChanges=true) {
    //if there is any room to move forward at least one event
    if (numberOfSteps > 0 && this.currentEventIndex < this.playbackData.events.length - 1) { 
      //create a new code marker generator if the user requests one
      this.newCodeMarkerGenerator = trackNewCodeChanges ? new NewCodeMarkerGenerator() : null;

      //assume there are no changes to the fs
      this.requiresUpdating.fileSystem = false;

      //step forward the requested number of steps
      for (let stepNumber = 0; stepNumber < numberOfSteps && this.currentEventIndex < this.playbackData.events.length - 1; stepNumber++) {
        //move forward before handling event
        this.currentEventIndex++;

        //playback the event
        const currentEvent = this.playbackData.events[this.currentEventIndex];
        this.handleEvent(currentEvent);

        //store the file where the latest event occurred (dir events will return null) 
        this.changeActiveFile(currentEvent.fileId);

        //store the active developer group
        this.activeDevGroupId = currentEvent.createdByDevGroupId;
      }
      //check where the action stopped to see if there is a comment to highlight
      this.checkForCommentAtCurrentIndex();
    }
  }

  stepBackward(numberOfSteps) {
    //if there is any room to move forward
    if (numberOfSteps > 0 && this.currentEventIndex >= this.firstRelevantEventIndex) {
      //never track changes moving backwards
      this.newCodeMarkerGenerator = null;

      //step backward the requested number of steps
      for (let stepNumber = 0; stepNumber < numberOfSteps && this.currentEventIndex >= this.firstRelevantEventIndex; stepNumber++) {
        //playback the event
        const currentEvent = this.playbackData.events[this.currentEventIndex];
        this.handleEventBackward(currentEvent);

        //store the file where the latest event occurred (dir events will return null) 
        this.changeActiveFile(currentEvent.fileId);
        
        //store the active developer group
        this.activeDevGroupId = currentEvent.createdByDevGroupId;

        //move backward after handling event
        this.currentEventIndex--;
      }
      //check where the action stopped to see if there is a comment to highlight
      this.checkForCommentAtCurrentIndex();
    }
  }

  stepToEventNumber(eventNumber) {
    //step to the requested event number
    const eventNumberDiff = eventNumber - this.currentEventIndex;
    
    if (eventNumberDiff > 0) {
      this.stepForward(eventNumberDiff);
    } else if (eventNumberDiff < 0) {
      this.stepBackward(-eventNumberDiff);
    } //else- it is 0 and no change is needed
  }
  
  checkForCommentAtCurrentIndex() {
    const currentEvent = this.playbackData.events[this.currentEventIndex];
    //if there is a comment at the current event index point
    if (this.playbackData.comments[currentEvent.id]) {
      const allCommentsAtCurrentEvent = this.playbackData.comments[currentEvent.id];
      const firstCommentInGroup = allCommentsAtCurrentEvent[0];
      //store info about the selected comment
      this.activeComment.comment = firstCommentInGroup;
      this.activeComment.positionInFlattenedArray = this.commentIndexInFlattenedArray[firstCommentInGroup.id];
      this.activeComment.pausedOnComment = true;
      //if there is some selected code in a comment make sure the file is being displayed
      for(let i = 0;i < allCommentsAtCurrentEvent.length;i++) {
        const comment = allCommentsAtCurrentEvent[i];
        if(comment.selectedCodeBlocks.length > 0) {
          const activeFileId = comment.selectedCodeBlocks[0].fileId;
          this.changeActiveFile(activeFileId);
          break;
        }
      }
    } else {
      this.activeComment.comment = null;
      this.activeComment.positionInFlattenedArray = null;
      this.activeComment.pausedOnComment = false;
    }
  }

  //move by clicking on an event
  stepToCommentById(commentId) {
    //step to the requested comment
    const moveToPosition = this.commentIdToEventPosition[commentId];
    this.stepToEventNumber(moveToPosition);

    //store info about the selected comment for highlighting
    this.activeComment.positionInFlattenedArray = this.commentIndexInFlattenedArray[commentId];
    this.activeComment.comment = this.flattenedComments[this.activeComment.positionInFlattenedArray];
    this.activeComment.pausedOnComment = true;
  }

  stepToNextComment() {
    if(this.activeComment.pausedOnComment) {
      //if there is at least one more comment to move to
      if (this.activeComment.positionInFlattenedArray < this.flattenedComments.length - 1) {
        const nextComment = this.flattenedComments[this.activeComment.positionInFlattenedArray + 1];
        this.stepToCommentById(nextComment.id);
      }
    } else {
      //go through all of the indexes in events where there is a comment
      for(let i = 0;i < this.commentGroupEventPositions.length;i++) {
        const commentEventPos = this.commentGroupEventPositions[i];
        //if the paused event index exceeds the comment position
        if(this.currentEventIndex < commentEventPos) {
          this.stepToEventNumber(commentEventPos);
          break;
        }
      }
    }
  }

  stepToBeginning() {
    //go back to the beginning of the playback
    this.stepToEventNumber(this.firstRelevantEventIndex);
  }

  stepToEnd() {
    //go to the end of the playback
    this.stepToEventNumber(this.playbackData.events.length - 1);
  }

  changeActiveFile(fileId) {
    if(fileId) {
      if(fileId !== this.activeFileId) {
        this.requiresUpdating.activeFile = true;
        this.activeFileId = fileId;
      }
    }
  }

  getActiveFileContents() {
    //if there is an active file get its contents
    let activeFileContents = "";
    if(this.activeFileId) {
      activeFileContents = this.editorState.getFile(this.activeFileId);
    }
    return activeFileContents;
  }

  getNewCodeMarkers() {
    //if there is an active file get the new code markers in it
    let newCodeMarkers = null;
    if(this.activeFileId && this.newCodeMarkerGenerator) {
      newCodeMarkers = this.newCodeMarkerGenerator.getData(this.activeFileId);
    }
    return newCodeMarkers;
  }

  getAllFiles() {
    return this.editorState.allFiles;
  }

  getAllDirectories() {
    return this.editorState.allDirectories;
  }

  handleEvent(currentEvent) {
    //console.log(`Handling: ${currentEvent.type} ${JSON.stringify(currentEvent, null, ' ')}`);
    if (currentEvent.type === "CREATE DIRECTORY") {
      this.editorState.createDirectory(currentEvent.directoryId, currentEvent.directoryPath, currentEvent.parentDirectoryId);
      this.requiresUpdating.fileSystem = true;
    } else if (currentEvent.type === "DELETE DIRECTORY") {
      this.editorState.deleteDirectory(currentEvent.directoryId, currentEvent.parentDirectoryId);
      this.requiresUpdating.fileSystem = true;
    } else if (currentEvent.type === "RENAME DIRECTORY") {
      this.editorState.renameDirectory(currentEvent.directoryId, currentEvent.newDirectoryPath);
      this.requiresUpdating.fileSystem = true;
    } else if (currentEvent.type === "MOVE  DIRECTORY") {
      this.editorState.moveDirectory(currentEvent.directoryId, currentEvent.newDirectoryPath, currentEvent.newParentDirectoryId, currentEvent.oldParentDirectoryId);
      this.requiresUpdating.fileSystem = true;
    } else if (currentEvent.type === "CREATE FILE") {
      this.newCodeMarkerGenerator.touchFile(currentEvent);
      this.editorState.createFile(currentEvent.fileId, currentEvent.filePath, currentEvent.parentDirectoryId);
      this.requiresUpdating.fileSystem = true;
    } else if (currentEvent.type === "DELETE FILE") {
      this.editorState.deleteFile(currentEvent.fileId, currentEvent.parentDirectoryId);
      this.newCodeMarkerGenerator.touchFile(currentEvent);
      this.requiresUpdating.fileSystem = true;
    } else if (currentEvent.type === "RENAME FILE") {
      this.editorState.renameFile(currentEvent.fileId, currentEvent.newFilePath);
      this.newCodeMarkerGenerator.touchFile(currentEvent);
      this.requiresUpdating.fileSystem = true;
    } else if (currentEvent.type === "MOVE FILE") {
      this.editorState.moveFile(currentEvent.fileId, currentEvent.newFilePath, currentEvent.newParentDirectoryId, currentEvent.oldParentDirectoryId);
      this.requiresUpdating.fileSystem = true;
    } else if (currentEvent.type === "INSERT") {
      this.newCodeMarkerGenerator.insert(currentEvent);
      this.editorState.insert(currentEvent.fileId, currentEvent.character, currentEvent.id, currentEvent.lineNumber - 1, currentEvent.column - 1);
    } else if (currentEvent.type === "DELETE") {
      this.newCodeMarkerGenerator.delete(currentEvent);
      this.editorState.delete(currentEvent.fileId, currentEvent.lineNumber - 1, currentEvent.column - 1);
    } else {
      throw Error(`Invalid event type: ${currentEvent.type}`);
    }
  }

  handleEventBackward(currentEvent) {
    //console.log(`Handling Backwards: ${currentEvent.type} ${JSON.stringify(currentEvent, null, ' ')}`);
    if (currentEvent.type === "CREATE DIRECTORY") {
      this.editorState.createDirectoryBackward(currentEvent.directoryId, currentEvent.parentDirectoryId);
      this.requiresUpdating.fileSystem = true;
    } else if (currentEvent.type === "DELETE DIRECTORY") {
      this.editorState.deleteDirectoryBackward(currentEvent.directoryId, currentEvent.parentDirectoryId);
      this.requiresUpdating.fileSystem = true;
    } else if (currentEvent.type === "RENAME DIRECTORY") {
      this.editorState.renameDirectoryBackward(currentEvent.directoryId, currentEvent.oldDirectoryPath);
      this.requiresUpdating.fileSystem = true;
    } else if (currentEvent.type === "MOVE  DIRECTORY") {
      this.editorState.moveDirectoryBackward(currentEvent.directoryId, currentEvent.oldDirectoryPath, currentEvent.newParentDirectoryId, currentEvent.oldParentDirectoryId,);
      this.requiresUpdating.fileSystem = true;
    } else if (currentEvent.type === "CREATE FILE") {
      this.editorState.createFileBackward(currentEvent.fileId, currentEvent.parentDirectoryId);
      this.requiresUpdating.fileSystem = true;
    } else if (currentEvent.type === "DELETE FILE") {
      this.editorState.deleteFileBackward(currentEvent.fileId, currentEvent.parentDirectoryId);
      this.requiresUpdating.fileSystem = true;
    } else if (currentEvent.type === "RENAME FILE") {
      this.editorState.renameFileBackward(currentEvent.fileId, currentEvent.oldFilePath);
      this.requiresUpdating.fileSystem = true;
    } else if (currentEvent.type === "MOVE FILE") {
      this.editorState.moveFileBackward(currentEvent.fileId, currentEvent.oldFilePath, currentEvent.newParentDirectoryId, currentEvent.oldParentDirectoryId);
      this.requiresUpdating.fileSystem = true;
    } else if (currentEvent.type === "INSERT") {
      this.editorState.insertBackward(currentEvent.fileId, currentEvent.lineNumber - 1, currentEvent.column - 1);
    } else if (currentEvent.type === "DELETE") {
      this.editorState.deleteBackward(currentEvent.fileId, currentEvent.character, currentEvent.id, currentEvent.lineNumber - 1, currentEvent.column - 1);
    } else {
      throw Error(`Invalid event type: ${currentEvent.type}`);
    }
  }

  performSearch(searchText){
    const relevantComments = [];
    //search all the comments text, code and tags for the matching search text
    for(let i = 0;i < this.flattenedComments.length;i++) {
      const comment = this.flattenedComments[i];

      //remove the old highlights
      comment.commentText = comment.commentText.replaceAll('<mark>','');
      comment.commentText = comment.commentText.replaceAll('</mark>','');

      let isRelevantComment = false;
      comment.selectedCodeBlocks.some(block => {
        if(block.selectedText.toLowerCase().includes(searchText.toLowerCase())) {
          isRelevantComment = true;
        }
      });    

      if(comment.commentText.toLowerCase().includes(searchText.toLowerCase())) {
        isRelevantComment = true;

        //surround the matched text in the mark tag which highlights
        comment.commentText = comment.commentText.replace(new RegExp(searchText, "gi"), (match) => `<mark>${match}</mark>`);
      }    
    
      if(comment.commentTags.some(tag => tag.toLowerCase().includes(searchText.toLowerCase()))) {
        isRelevantComment = true;
      }

      //collect the comments that have the search text
      if (isRelevantComment){
        relevantComments.push(comment);
      }
      
    }
    return relevantComments;
  }
}
