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

    //active dev group, file, and comment
    this.activeDevGroupId = null;
    this.activeFileId = null;
    this.activeComment = null;
    
    //used for slider bounds (there is always at least on non-relevant event at the beginning of a playback)
    this.firstRelevantEventIndex = 1;
    this.numRelevantEvents = this.playbackData.events.length - 1;

    //holds the changes from a playback engine interaction
    this.mostRecentChanges = {
      endedOnAComment: false,
      hasNewActiveFile: false,
      hasNewActiveDevGroup: false,
      numberOfCommentGroupsChanged: false,
      fileEditLineNumber: -1
    };

    //aggregate info about the playback's comments
    this.commentInfo = {
      totalNumberOfComments: 0,
      allTags: [],
      allCommentsInGroups: [],
      commentGroupPositions: [],
      flattenedComments: []  
    };

    //create aggregate info about comments
    this.updateCommentInfo();

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
        //decrease the number of relevant events
        this.numRelevantEvents--;
      } else {
        break;
      }
    }
    //step through the non-relevant events to get ready for action
    this.stepForward(this.firstRelevantEventIndex, false);
  }

  //holds the types of changes that have been made
  clearMostRecentChanges() {
    this.mostRecentChanges = {
      endedOnAComment: false,
      hasNewActiveFile: false,
      hasNewActiveDevGroup: false,
      numberOfCommentGroupsChanged: false,
      fileEditLineNumber: -1
    };
  }
  
  changeActiveFileId(fileId) {
    //if the passed in file id is different than the current active file id
    if(fileId && fileId !== this.activeFileId) {
      //indicate a change and store the active file id
      this.mostRecentChanges.hasNewActiveFile = true;
      this.activeFileId = fileId;
    }
  }
  
  changeActiveComment(comment) {
    //if there is a comment passed in
    if(comment) {
      this.activeComment = comment;
    } else { //there is no comment passed in (indicating that there is not a comment at this point in the playback)
      this.activeComment = null;
    }
  }

  changeActiveDeveloperGroupId(devGroupId) {
    //if the passed in dev group id is different than the current active dev group id
    if(devGroupId && devGroupId !== this.activeDevGroupId) {
      //indicate a change and store the active dev group id
      this.mostRecentChanges.hasNewActiveDevGroup = true;
      this.activeDevGroupId = devGroupId;
    }
  }

  stepForward(numberOfSteps, trackNewCodeChanges=true) {
    //reset the recent changes
    this.clearMostRecentChanges();

    //if there is any room to move forward at least one event
    if (numberOfSteps > 0 && this.currentEventIndex < this.playbackData.events.length - 1) {       
      //create a new code marker generator if the user requests one
      this.newCodeMarkerGenerator = trackNewCodeChanges ? new NewCodeMarkerGenerator() : null;

      let currentEvent;
      //step forward the requested number of steps
      for (let stepNumber = 0; stepNumber < numberOfSteps && this.currentEventIndex < this.playbackData.events.length - 1; stepNumber++) {
        //move forward before handling event
        this.currentEventIndex++;

        //playback the event
        currentEvent = this.playbackData.events[this.currentEventIndex];
        this.handleEvent(currentEvent);
      }
      //store the active developer group
      this.changeActiveDeveloperGroupId(currentEvent.createdByDevGroupId);

      //store the file where the latest event occurred (dir events will return null) 
      this.changeActiveFileId(currentEvent.fileId);

      //store the line number of the latest edit to scroll to in the playback
      if(currentEvent.type === 'INSERT' || currentEvent.type === 'DELETE') {
        this.mostRecentChanges.fileEditLineNumber = currentEvent.lineNumber;
      }

      //check where the action stopped to see if there is a comment to highlight
      this.checkForCommentAtCurrentIndex();
    }
  }

  stepBackward(numberOfSteps) {
    //reset the recent changes
    this.clearMostRecentChanges();

    //if there is any room to move forward
    if (numberOfSteps > 0 && this.currentEventIndex >= this.firstRelevantEventIndex) {
      //never track changes moving backwards
      this.newCodeMarkerGenerator = null;

      let currentEvent;
      //step backward the requested number of steps
      for (let stepNumber = 0; stepNumber < numberOfSteps && this.currentEventIndex >= this.firstRelevantEventIndex; stepNumber++) {
        //playback the event
        currentEvent = this.playbackData.events[this.currentEventIndex];
        this.handleEventBackward(currentEvent);

        //move backward after handling event
        this.currentEventIndex--;
      }
      //store the active developer group
      this.changeActiveDeveloperGroupId(currentEvent.createdByDevGroupId);

      //store the file where the latest event occurred (dir events will return null) 
      this.changeActiveFileId(currentEvent.fileId);

      //store the line number of the latest edit to scroll to in the playback
      if(currentEvent.type === 'INSERT' || currentEvent.type === 'DELETE') {
        this.mostRecentChanges.fileEditLineNumber = currentEvent.lineNumber;
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
        this.changeActiveFileId(comment.selectedCodeBlocks[0].fileId);
      }

      //record the active comment
      this.changeActiveComment(comment);
    }
  }

  stepToNextComment() {
    //if there is a current active comment
    if(this.activeComment) {
      //holds the comment after the current active on (if there is one)
      let nextComment = null;
      //search through the ordered comments for the active one
      const allComments = this.commentInfo.flattenedComments;
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
      const allComments = this.commentInfo.flattenedComments;
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

  updateCommentInfo() {
    //clear out any old data
    this.commentInfo = {
      totalNumberOfComments: 0,
      allTags: [],
      allCommentsInGroups: [],
      commentGroupPositions: [],
      flattenedComments: []  
    };

    //holds the groups for sorting
    const orderedCommentGroups = [];
    
    //go through all of the comments
    for(let eventId in this.playbackData.comments) {
      //create groups of comments and where they land in the sequence of events
      orderedCommentGroups.push({
        comments: this.playbackData.comments[eventId], 
        eventSequenceNumber: this.playbackData.comments[eventId][0].displayCommentEvent.eventSequenceNumber
      });
    }
    
    //sort the groups of events by event sequence position
    orderedCommentGroups.sort((first, second) => {
      return first.eventSequenceNumber - second.eventSequenceNumber;
    });

    //used to hold distinct comment tags
    const distinctCommentTags = new Set();

    //go through each group of comments
    orderedCommentGroups.forEach(commentGroup => {
      //go through each comment in this group
      commentGroup.comments.forEach(comment => {
        //increase the comment count
        this.commentInfo.totalNumberOfComments++;
        
        //add all tags to a set to ignores duplicates
        comment.commentTags.forEach(tag => {
          distinctCommentTags.add(tag);
        });

        //add the comment to the 1D array of all comments in order
        this.commentInfo.flattenedComments.push(comment);
      });

      //add the whole group of comments by group
      this.commentInfo.allCommentsInGroups.push(commentGroup.comments);
      //add the comment group position
      this.commentInfo.commentGroupPositions.push(commentGroup.eventSequenceNumber);
    });

    //sort the tags alphabetically
    this.commentInfo.allTags.push(...Array.from(distinctCommentTags).sort());
  }
  
  checkForCommentAtCurrentIndex() {
    //get the most recently played event
    const currentEvent = this.playbackData.events[this.currentEventIndex];

    //if there is a comment at the current event index point
    if (this.playbackData.comments[currentEvent.id]) {
      //landed on an event with at least one comment
      this.mostRecentChanges.endedOnAComment = true;

      //get all of the comments at this event
      const allCommentsAtCurrentEvent = this.playbackData.comments[currentEvent.id];
      //get the first in the group
      const firstCommentInGroup = allCommentsAtCurrentEvent[0];
      
      //store the selected comment
      this.changeActiveComment(firstCommentInGroup);

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
      this.changeActiveFileId(activeFileId);
    } else { //no comment at the current event
      //clear the active comment info
      this.changeActiveComment(null);
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

  haveFilesOtherThanCurrentActiveFileBeenChanged() {
    //if there are no markers then assume no changes (if there are then perform a check)
    let retVal = this.newCodeMarkerGenerator ? true : false;
    if(this.newCodeMarkerGenerator) {
      //get all of the changed files since the last move
      const changedFileIds = this.newCodeMarkerGenerator.getAllChangedFileIds();
      //if there is exactly one file changed and it is the most recent active file
      if(changedFileIds.length === 1 && changedFileIds[0] === this.activeFileId) {
        //there are no changes of the active file
        retVal = false;
      }
    }
    return retVal;
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
    //update the editor state 
    if (currentEvent.type === "CREATE DIRECTORY") {
      this.editorState.createDirectory(currentEvent.directoryId, currentEvent.directoryPath, currentEvent.parentDirectoryId);
    } else if (currentEvent.type === "DELETE DIRECTORY") {
      this.editorState.deleteDirectory(currentEvent.directoryId, currentEvent.parentDirectoryId);
    } else if (currentEvent.type === "RENAME DIRECTORY") {
      this.editorState.renameDirectory(currentEvent.directoryId, currentEvent.newDirectoryPath);
    } else if (currentEvent.type === "MOVE  DIRECTORY") {
      this.editorState.moveDirectory(currentEvent.directoryId, currentEvent.newDirectoryPath, currentEvent.newParentDirectoryId, currentEvent.oldParentDirectoryId);
    } else if (currentEvent.type === "CREATE FILE") {
      this.editorState.createFile(currentEvent.fileId, currentEvent.filePath, currentEvent.parentDirectoryId);
      
      if(this.newCodeMarkerGenerator) {
        this.newCodeMarkerGenerator.touchFile(currentEvent);
      }
    } else if (currentEvent.type === "DELETE FILE") {
      this.editorState.deleteFile(currentEvent.fileId, currentEvent.parentDirectoryId);
      
      if(this.newCodeMarkerGenerator) {
        this.newCodeMarkerGenerator.touchFile(currentEvent);
      }
    } else if (currentEvent.type === "RENAME FILE") {
      this.editorState.renameFile(currentEvent.fileId, currentEvent.newFilePath);
      
      if(this.newCodeMarkerGenerator) {
        this.newCodeMarkerGenerator.touchFile(currentEvent);
      }
    } else if (currentEvent.type === "MOVE FILE") {
      this.editorState.moveFile(currentEvent.fileId, currentEvent.newFilePath, currentEvent.newParentDirectoryId, currentEvent.oldParentDirectoryId);
    } else if (currentEvent.type === "INSERT") {
      this.editorState.insert(currentEvent.fileId, currentEvent.character, currentEvent.id, currentEvent.lineNumber - 1, currentEvent.column - 1);
      
      if(this.newCodeMarkerGenerator) {
        this.newCodeMarkerGenerator.insert(currentEvent);
      }
    } else if (currentEvent.type === "DELETE") {
      this.editorState.delete(currentEvent.fileId, currentEvent.lineNumber - 1, currentEvent.column - 1);

      if(this.newCodeMarkerGenerator) {
        this.newCodeMarkerGenerator.delete(currentEvent);
      }
    } else {
      throw Error(`Invalid event type: ${currentEvent.type}`);
    }
  }

  handleEventBackward(currentEvent) {
    //update the editor state 
    if (currentEvent.type === "CREATE DIRECTORY") {
      this.editorState.createDirectoryBackward(currentEvent.directoryId, currentEvent.parentDirectoryId);
    } else if (currentEvent.type === "DELETE DIRECTORY") {
      this.editorState.deleteDirectoryBackward(currentEvent.directoryId, currentEvent.parentDirectoryId);
    } else if (currentEvent.type === "RENAME DIRECTORY") {
      this.editorState.renameDirectoryBackward(currentEvent.directoryId, currentEvent.oldDirectoryPath);
    } else if (currentEvent.type === "MOVE  DIRECTORY") {
      this.editorState.moveDirectoryBackward(currentEvent.directoryId, currentEvent.oldDirectoryPath, currentEvent.newParentDirectoryId, currentEvent.oldParentDirectoryId,);
    } else if (currentEvent.type === "CREATE FILE") {
      this.editorState.createFileBackward(currentEvent.fileId, currentEvent.parentDirectoryId);
    } else if (currentEvent.type === "DELETE FILE") {
      this.editorState.deleteFileBackward(currentEvent.fileId, currentEvent.parentDirectoryId);
    } else if (currentEvent.type === "RENAME FILE") {
      this.editorState.renameFileBackward(currentEvent.fileId, currentEvent.oldFilePath);
    } else if (currentEvent.type === "MOVE FILE") {
      this.editorState.moveFileBackward(currentEvent.fileId, currentEvent.oldFilePath, currentEvent.newParentDirectoryId, currentEvent.oldParentDirectoryId);
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

  changePlaybackTitle(newTitle) {
    this.playbackData.playbackTitle = newTitle;
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
      //indicate that there is a new comment group
      this.mostRecentChanges.numberOfCommentGroupsChanged = true;
    }
    //get all of the comments in the group and add the new one
    const commentsAtEvent = this.playbackData.comments[eventId];
    commentsAtEvent.push(newComment);

    //make the new comment the active one
    this.changeActiveComment(newComment);

    //update the aggregate comment info
    this.updateCommentInfo();
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
        this.changeActiveComment(updatedComment);
        break;
      }
    }
    //update the aggregate  comment info
    this.updateCommentInfo();
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
          //indicate that there is one fewer comment group
          this.mostRecentChanges.numberOfCommentGroupsChanged = true;
        }

        //clear out the active comment
        this.changeActiveComment(null);
        break;
      }
    }
    //update the aggregate comment info
    this.updateCommentInfo();
  }

  reorderComments(updatedCommentPosition) {
    //get the group of comments at for an event
    const allCommentsAtEvent = this.playbackData.comments[updatedCommentPosition.eventId];
    //get a reference to the comment being moved
    const movedComment = allCommentsAtEvent[updatedCommentPosition.oldCommentPosition];
    //remove the comment from its original position
    allCommentsAtEvent.splice(updatedCommentPosition.oldCommentPosition, 1);
    //add the comment to its new position
    allCommentsAtEvent.splice(updatedCommentPosition.newCommentPosition, 0, movedComment);
    //mark the moved comment as active
    this.changeActiveComment(movedComment);

    //update the aggregate comment info
    this.updateCommentInfo();
  }
}
