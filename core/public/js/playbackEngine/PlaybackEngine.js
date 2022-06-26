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

    //active dev group and file
    this.activeDevGroupId = null;
    this.activeFileId = null;
    //info about active comment (if there is one)
    this.activeComment = null;
    
    //used for slider bounds (there is always at least on non-relevant event at the beginning of a playback)
    this.firstRelevantEventIndex = 1;
    this.numRelevantEvents = this.playbackData.events.length - 1;

    //determines whether the file system has changes and whether the active file has changed
    this.requiresUpdating = {
      fileSystem: false,
      activeFile: false
    };

    //count the events at the beginning that shouldn't be played back because
    //they were part of a project's initial state
    this.skipIrrelevantEvents();
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

  //counts the total number of comments
  getTotalNumberOfComments() {
    let totalNum = 0;
    //go through each group of comments and sum their lengths 
    for(let eventId in this.playbackData.comments) {
      const commentsAtEvent = this.playbackData.comments[eventId];
      totalNum += commentsAtEvent.length;
    }
    return totalNum;
  }

  //breaks the comments into sorted groups as they will show up in a playback
  getCommentsInGroups() {
    //all groups of comments in the order they show up in a playback (2D array of comments)
    const commentGroups = [];
    //holds the groups for sorting
    const commentPositions = [];
    
    //go through all of the comments
    Object.keys(this.playbackData.comments).forEach(eventId => {
      //store the comments at each event and where the event is in the sequence of all events
      commentPositions.push({
        comments: this.playbackData.comments[eventId], 
        eventSequenceNumber: this.playbackData.comments[eventId][0].displayCommentEvent.eventSequenceNumber
      });
    });
    
    //sort the info by event position
    commentPositions.sort((first, second) => {
      return first.eventSequenceNumber - second.eventSequenceNumber
    });

    //add the arrays of comments to the 2D array
    commentPositions.map(commentPosition => {
      commentGroups.push(commentPosition.comments);
    });

    return commentGroups;
  }

  getCommentGroupEventPosisitons() {
    //holds all the event sequence numbers where a comment occurs
    const commentEventPosisitons = [];

    //get all of the comment groups in order
    const orderedCommentGroups = this.getCommentsInGroups();
    
    //add each event sequence number to the array
    orderedCommentGroups.forEach(commentGroup => {
      //use the first comment's event to get the seq num
      commentEventPosisitons.push(commentGroup[0].displayCommentEvent.eventSequenceNumber)
    });

    return commentEventPosisitons;
  }

  getFlattenedComments() {
    //holds all the comments in order that they appear in a playback
    const flattenedComments = [];

    //get all of the comment groups in order
    const orderedCommentGroups = this.getCommentsInGroups();
    
    //go through each group
    orderedCommentGroups.forEach(commentGroup => {
      //go through each comment in each group
      commentGroup.forEach(comment => {
        flattenedComments.push(comment);
      });
    });

    return flattenedComments;
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
    //get the most recently played event
    const currentEvent = this.playbackData.events[this.currentEventIndex];

    //if there is a comment at the current event index point
    if (this.playbackData.comments[currentEvent.id]) {
      //get all of the comments at this event
      const allCommentsAtCurrentEvent = this.playbackData.comments[currentEvent.id];
      //get the first in the group
      const firstCommentInGroup = allCommentsAtCurrentEvent[0];
      
      //store the selected comment
      this.activeComment = firstCommentInGroup;

      //find the active file to display for this comment
      //default to the file where the event took place (if its a file event, undefined otherwise) 
      let activeFileId = this.activeComment.displayCommentEvent.fileId;
      //if there is some selected code in any comment in the group then make sure the file is being displayed
      for(let i = 0;i < allCommentsAtCurrentEvent.length;i++) {
        const comment = allCommentsAtCurrentEvent[i];
        if(comment.selectedCodeBlocks.length > 0) {
          //get the file id where there is some selected text
          activeFileId = comment.selectedCodeBlocks[0].fileId;
          break;
        }
      }
      //update the active file (if there is one)
      this.changeActiveFile(activeFileId);

    } else { //no comment at the current event
      //clear the active comment info
      this.activeComment = null;
    }
  }

  //linear search through all of the comments
  findCommentById(commentId) {
    //the comment with the passed in id
    let retVal = null;

    //go through all of the comment groups
    for(let eventId in this.playbackData.comments) {
      //get all of the comments in the group
      const commentsAtEvent = this.playbackData.comments[eventId];
      
      //search for the comment by id
      for(let i = 0;i < commentsAtEvent.length;i++) {
        if(commentsAtEvent[i].id === commentId) {
          retVal = commentsAtEvent[i];
          break;
        }
      }
    }
    return retVal;
  }

  //finds the position of the event of the next comment
  findNextCommentPosition(startingEventPos) {
    //the position of the next comment
    let retVal = -1;

    //starting just beyond the passed in position look through the event until the end
    for(let i = startingEventPos + 1;i < this.playbackData.events.length;i++) {
      const event = this.playbackData.events[i];
      //if there is a comment at this event
      if(this.playbackData.comments[event.id]) {
        //store the position in the array of events
        retVal = event.eventSequenceNumber;
        break;
      }
    }
    return retVal;
  }

  //finds the position of the event of the previous comment
  findPreviousCommentPosition(startingEventPos) {
    //the position of the previous comment
    let retVal = -1;
    
    //starting just before the passed in position look through the event until the beginning
    for(let i = startingEventPos - 1;i >= 1;i--) {
      const event = this.playbackData.events[i];
      //if there is a comment at this event
      if(this.playbackData.comments[event.id]) {
        //store the position in the array of events
        retVal = event.eventSequenceNumber;
        break;
      }
    }
    return retVal;
  }

  //move by clicking on an event
  stepToCommentById(commentId) {
    //find the comment 
    const comment = this.findCommentById(commentId);
    if(comment) {
      //step to the requested comment
      const moveToPosition = comment.displayCommentEvent.eventSequenceNumber;
      this.stepToEventNumber(moveToPosition);

      //if there is some selected code in the comment
      if(comment.selectedCodeBlocks.length > 0) {
        //mark the active file where the first highlighted code is
        this.changeActiveFile(comment.selectedCodeBlocks[0].fileId);
      }

      //record the active comment
      this.activeComment = comment;
    }
  }

  stepToNextComment() {
    //if there is a current active comment
    if(this.activeComment) {
      //holds the comment after the current active on (if there is one)
      let nextComment = null;
      //search through the ordered comments for the active one
      const allComments = this.getFlattenedComments();
      //go through all the comments where there is at least one after
      for(let i = 0;i < allComments.length - 1;i++) {
        if(allComments[i].id === this.activeComment.id) {
          //store the next comment
          nextComment = allComments[i + 1];
          break;
        }
      }
      //if there was a next comment
      if(nextComment) {
        //move to it
        this.stepToCommentById(nextComment.id);
      } else { //there was no next comment
        //go to the end
        this.stepToEnd();
      }
    } else { //not on a comment
      //find the next event position
      const nextCommentEventPos = this.findNextCommentPosition(this.currentEventIndex);
      //if there is a comment, step to it
      if(nextCommentEventPos !== -1) {
        this.stepToEventNumber(nextCommentEventPos);
      } else { //there is no next comment
        //go to the end
        this.stepToEnd();
      }
    }
  }

  stepToPreviousComment() {
    //if there is a current active comment
    if(this.activeComment) {
      //holds the comment bfore the current active on (if there is one)
      let prevComment = null;
      //search through the ordered comments for the active one
      const allComments = this.getFlattenedComments();
      //go through all the comments in reverse where there is at least one after
      for(let i = allComments.length - 1;i > 0;i--) {
        if(allComments[i].id === this.activeComment.id) {
          //store the prev comment
          prevComment = allComments[i - 1];
          break;
        }
      }
      //if there was a previous comment
      if(prevComment) {
        //move to it
        this.stepToCommentById(prevComment.id);
      } else { //there was no prev comment
        //go to the beginning
        this.stepToBeginning();
      }
    } else { //not on a comment
      //find the previous event position
      const prevCommentEventPos = this.findPreviousCommentPosition(this.currentEventIndex);
      //if there is a comment, step to it
      if(prevCommentEventPos !== -1) {
        this.stepToEventNumber(prevCommentEventPos);
      } else { //there is no prev comment
        //go to the beginning
        this.stepToBeginning();
      }
    }
  }

  stepToBeginning() {
    //go back to the beginning of the playback
    this.stepToEventNumber(this.firstRelevantEventIndex - 1);
  }

  stepToEnd() {
    //go to the end of the playback
    this.stepToEventNumber(this.playbackData.events.length - 1);
  }

  changeActiveFile(fileId) {
    //if this is a new file
    if(fileId && fileId !== this.activeFileId) {
      this.requiresUpdating.activeFile = true;
      this.activeFileId = fileId;
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

  getActiveFilePath() {
    //if there is an active file get the file path
    let filePath = "";
    if(this.activeFileId) {
      filePath = this.editorState.getFilePath(this.activeFileId);
    }
    return filePath;
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
    const searchResults = [];
    //search all the comments text, code and tags for the matching search text
    for(let eventId in this.playbackData.comments) {
      const commentsAtEvent = this.playbackData.comments[eventId];
      for(let i = 0;i < commentsAtEvent.length;i++) {
        const comment = commentsAtEvent[i];

        let isRelevantComment = false;
        const searchResult = {
          commentId: null,
          inSelectedText: false,
          inCommentText: false,
          inTags: false,
          searchText: searchText
        };

        comment.selectedCodeBlocks.some(block => {
          if(block.selectedText.toLowerCase().includes(searchText.toLowerCase())) {
            isRelevantComment = true;
            searchResult.inSelectedText = true;
          }
        });

        if(comment.commentText.toLowerCase().includes(searchText.toLowerCase())) {
          isRelevantComment = true;
          searchResult.inCommentText = true;
        }    
      
        if(comment.commentTags.some(tag => tag.toLowerCase().includes(searchText.toLowerCase()))) {
          isRelevantComment = true;
          searchResult.inTags = true;
        }

        //collect the comments that have the search text
        if (isRelevantComment){
          searchResult.commentId = comment.id;
          searchResults.push(searchResult);
        }
      }
    }
    return searchResults;
  }

  getMostRecentEvent() {
    let retVal = this.playbackData.events[0];
    if(this.currentEventIndex > 0) {
      retVal = this.playbackData.events[this.currentEventIndex];
    }
    return retVal;
  }

  addComment(newComment) {
    //get the event id where the playback is paused
    const eventId = this.playbackData.events[this.currentEventIndex].id;
    //if there is not already a comment here
    if(!this.playbackData.comments[eventId]) {
      //create a new array to hold all comments on this event
      this.playbackData.comments[eventId] = [];
    }
    //get all of the comments in the group and add the new one
    const commentsAtEvent = this.playbackData.comments[eventId];
    commentsAtEvent.push(newComment);

    //make the new comment the active one
    this.activeComment = commentsAtEvent[commentsAtEvent.length - 1];
  }

  updateComment(updatedComment) {
    //get the edited comment's event id 
    const eventId = updatedComment.displayCommentEvent.id;
    
    //get all of the comments in the group
    const commentsAtEvent = this.playbackData.comments[eventId];
    
    //search for the comment by id
    for(let i = 0;i < commentsAtEvent.length;i++) {
      const comment = commentsAtEvent[i];
      if(comment.id === updatedComment.id) {
        //replace the old comment with the new one
        commentsAtEvent[i] = updatedComment;

        //make the edited comment the active one
        this.activeComment = updatedComment;
        break;
      }
    }
  }

  deleteComment(deletedComment) {
    //get the deleted comment's event id 
    const eventId = deletedComment.displayCommentEvent.id;
    
    //get all of the comments in the group
    const commentsAtEvent = this.playbackData.comments[eventId];
    
    //search for the comment by id
    for(let i = 0;i < commentsAtEvent.length;i++) {
      const comment = commentsAtEvent[i];
      if(comment.id === deletedComment.id) {
        //delete the comment
        commentsAtEvent.splice(i, 1);

        //if there are no comments left
        if(commentsAtEvent.length === 0) {
          //delete the empty array at this event
          delete this.playbackData.comments[eventId];
        }

        //clear out the active comment
        this.activeComment = null;
        break;
      }
    }
  }
}
