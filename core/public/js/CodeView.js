class CodeView extends HTMLElement {
  constructor(playbackEngine, editorProperties) {
    super();

    this.editorProperties = editorProperties;
    this.width = window.innerWidth * .27;
    this.playbackEngine = playbackEngine;

    //used to track the play/pause state of the playback
    this.autoPlayback = {
      isPaused: true,
      playTimer: null,
      playbackSpeedMs: 75,
    };

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host {
          display: flex;
          height: 100%;
        }

        .commentsSlot {
          flex: 0 0 auto;
          overflow-y: scroll;
          scrollbar-width: none;
        }
        .commentsSlot::-webkit-scrollbar {
          display: none;
        }

        .editorViewSlot {
          flex: 0 0 auto;
          padding: 1px 5px 0px 0px;
        }

        .dragBar {
          display: flex;
          align-items: center;
          cursor: col-resize;
          background-color: rgb(58,58,58);
        }
      </style>

      <div class="commentsSlot"></div>
      <div class="dragBar">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="32" fill="gray" className="bi bi-grip-vertical" viewBox="4 2 8 8">
          <path d="M7 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
        </svg>
      </div>
      <div class="editorViewSlot"></div>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    //set the initial width of the elements
    this.setWidthInPixels(this.width);

    //add the playback navigator
    this.addPlaybackNavigator();

    //add the editor view
    const editorViewSlot = this.shadowRoot.querySelector('.editorViewSlot');
    const editorView = new EditorView(this.playbackEngine, this.editorProperties);
    editorViewSlot.appendChild(editorView);

    //add the event listeners
    this.addEventListeners();
  }
  
  addEventListeners() {
    //add the adjustable drag bar separating the playback nav and the editor view
    const dragBar = this.shadowRoot.querySelector('.dragBar');
    //events to handle dragging
    dragBar.addEventListener('mousedown', this.addMouseEventListeners);
    //for mobile devices add touch events too
    dragBar.addEventListener('touchstart', this.addTouchEventListeners);

    //double clicking the drag bar will divide the comment navigator and editor view 50/50
    dragBar.addEventListener('dblclick', (event)=>{
      const currentXPos = event.pageX;
      const codeView = this.shadowRoot.host;
      const screenWidthHalf = codeView.getBoundingClientRect().width / 2;
      if (screenWidthHalf != currentXPos){
        this.setWidthInPixels(screenWidthHalf);
      }
    });
    
    //begin editing a new comment
    this.shadowRoot.addEventListener('begin-add-comment', event => {
      this.updateUIToAddNewComment();
    });

    //begin editing an existing comment
    this.shadowRoot.addEventListener('begin-edit-comment', event => {
      this.updateUIToEditComment(event.detail.comment);
    });

    //cancel the creating/editing of a comment
    this.shadowRoot.addEventListener('cancel-add-edit-comment', event => {
      this.updateForCommentSelected();
    });

    //new comment successfully created
    this.shadowRoot.addEventListener('add-comment', async event => {
      //get the comment object (without the selected text)
      const comment = event.detail.comment;
      //add the selected text to the comment when creating a new comment
      this.addSelectedTextToComment(comment);

      //send the new comment to the st server
      const serverProxy = new ServerProxy();
      const newComment = await serverProxy.sendNewCommentToServer(comment);

      //add the new comment to the playback engine's data
      this.playbackEngine.addComment(newComment);

      //close the editing UI and display the new comment
      this.updateForAddEditDeleteComment();
      this.updateForCommentSelected();
    });

    //existing comment successfully edited
    this.shadowRoot.addEventListener('edit-comment', async event => {
      //get the comment object (without the selected text)
      const comment = event.detail.comment;
      //add the selected text to the comment when creating a new comment
      this.addSelectedTextToComment(comment);

      //send the new comment to the st server
      const serverProxy = new ServerProxy();
      const editedComment = await serverProxy.updateCommentOnServer(comment);

      //update the playback engine's data
      this.playbackEngine.updateComment(editedComment);

      //close the editing UI and display the edited commnt
      this.updateForAddEditDeleteComment();
      this.updateForCommentSelected();
    });

    //delete an existing comment
    this.shadowRoot.addEventListener('delete-comment', async event => {
      //get the comment object to delete
      const comment = event.detail.comment;

      //delete the comment on the st server
      const serverProxy = new ServerProxy();
      await serverProxy.deleteCommentFromServer(comment);

      //update the playback engine's data
      this.playbackEngine.deleteComment(comment);

      //update
      this.updateForAddEditDeleteComment();
      this.updateForCommentSelected();
    });

    this.shadowRoot.addEventListener('reorder-comments', async (event) => {
      //when the reordering of events is complete send the pb engine the new comment ordering
      this.playbackEngine.reorderComments(event.detail.updatedCommentPosition);
      
      //send the new comment ordering to the st server
      const serverProxy = new ServerProxy();
      await serverProxy.updateCommentPositionOnServer(event.detail.updatedCommentPosition);

      //update
      this.updateForCommentReordering();
      this.updateForCommentSelected();
    });

    //change to the lines above/below when creating/editing a comment
    this.shadowRoot.addEventListener('lines-above-below-change', event => {
      const linesAbove = event.detail.linesAbove;
      const linesBelow = event.detail.linesBelow;
      //send the message to the editor view
      const editorView = this.shadowRoot.querySelector('st-editor-view');
      editorView.updateLinesAboveBelow(linesAbove, linesBelow);
    });

    //a comment was selected
    this.shadowRoot.addEventListener('active-comment', event => {
      //move to the selected comment
      this.moveToSelectedComment(event.detail.activeCommentId);
      event.preventDefault();
    });

    //play
    this.shadowRoot.addEventListener('play-button-click', event => {
      //begin animated playback
      this.pausePlayback(false);
      event.preventDefault();
    });

    //pause
    this.shadowRoot.addEventListener('pause-button-click', event => {
      //pause animated playback
      this.pausePlayback(true);
      event.preventDefault();
    });

    //display next comment
    this.shadowRoot.addEventListener('next-comment-button-click', event => {
      //move to the next comment
      this.moveToNextComment();
      event.preventDefault();
    });

    //slider has changed
    this.shadowRoot.addEventListener('slide-to-position', event => {
      this.sliderUpdate(event.detail.newPosition);
      event.preventDefault();
    });

    //a file has been selected
    this.shadowRoot.addEventListener('active-file', event => {
      this.updateForFileSelected(event.detail.activeFileId);
      event.preventDefault();
    });

    //playback speed increased
    this.shadowRoot.addEventListener('increase-playback-speed', () => {
      //if there is a code view make it go faster
      this.adjustPlaybackSpeed(-25);
    });

    //playback speed decreased
    this.shadowRoot.addEventListener('decrease-playback-speed', () => {
      this.adjustPlaybackSpeed(50);
    });

    //request an increase in the editor font size
    this.shadowRoot.addEventListener('increase-font', event => {
      this.increaseEditorFontSize();
    });

    //request a decrease in the editor font size
    this.shadowRoot.addEventListener('decrease-font', event => {
      this.decreaseEditorFontSize();
    });

    document.addEventListener('keydown', this.addKeyListeners);
  }

  disconnectedCallback() {
    const dragBar = this.shadowRoot.querySelector('.dragBar');
    dragBar.removeEventListener('mousedown', this.addMouseEventListeners);
    dragBar.removeEventListener('touchstart', this.addTouchEventListeners);
    
    document.removeEventListener('mouseup', this.stopDrag, false);
    document.removeEventListener('mousemove', this.doDrag, false);  
    document.removeEventListener('touchend', this.stopDrag, false);
    document.removeEventListener('touchmove', this.doDrag, false);  

    document.removeEventListener('keydown', this.addKeyListeners);
  }

  addKeyListeners = event => {
    //get the state of the keys
    const keyPressed = event.key;
    const shiftPressed = event.shiftKey;
    const ctrlPressed = event.ctrlKey;

    //keyboard controls
    if (ctrlPressed && shiftPressed && keyPressed === 'ArrowRight') { //ctrl + shift + right arrow press
      this.moveToEndOfPlayback();
      event.preventDefault();
      event.stopPropagation();
    } else if(shiftPressed && keyPressed === 'ArrowRight') { //shift + right arrow press
      this.moveToNextComment();
      event.preventDefault();
      event.stopPropagation();
    } else if(keyPressed === 'ArrowRight') { //right arrow press
      //move to the next event
      this.pausePlayback(true);
      this.playNextEvent();
      event.preventDefault();
      event.stopPropagation();
    } else if (ctrlPressed && shiftPressed && keyPressed === 'ArrowLeft') { //ctrl + shift + left arrow press
      this.moveToBeginningOfPlayback();
      event.preventDefault();
      event.stopPropagation();
    } else if (shiftPressed && keyPressed === 'ArrowLeft') { //shift + left arrow press
      this.moveToPreviousComment();
      event.preventDefault();
      event.stopPropagation();
    } else if (keyPressed === 'ArrowLeft') {//left arrow press
      //move to the previous event
      this.pausePlayback(true);
      this.playPreviousEvent();
      event.preventDefault();
      event.stopPropagation();
    } else if (ctrlPressed && shiftPressed && keyPressed === 'ArrowUp') { //ctrl + shift + up arrow press
      this.increaseEditorFontSize();
      event.preventDefault();
      event.stopPropagation();
    } else if (ctrlPressed && shiftPressed && keyPressed === 'ArrowDown') { //ctrl + shift + down arrow press
      this.decreaseEditorFontSize();
      event.preventDefault();
      event.stopPropagation();
    } else if (event.code === 'Space') {
      //toggle play/pause 
      this.pausePlayback(!this.autoPlayback.isPaused);
      event.preventDefault();
      event.stopPropagation();
    } else if (ctrlPressed && shiftPressed && keyPressed === 'Enter') {
      this.updateUIToAddNewComment();
      event.preventDefault();
      event.stopPropagation();
    }
  }

  addPlaybackNavigator() {
    //update nav rebuild all comment views with a new playback nav
    const commentsSlot = this.shadowRoot.querySelector('.commentsSlot');
    commentsSlot.innerHTML = '';
    const playbackNavigator = new PlaybackNavigator(this.playbackEngine);
    commentsSlot.appendChild(playbackNavigator);
  }

  updateForCommentSelected() {
    //if the add/edit comment UI is visible then close it
    this.updateUIToCancelAddEditComment();

    //update nav
    const playbackNavigator = this.shadowRoot.querySelector('st-playback-navigator');
    playbackNavigator.updateForCommentSelected();
    //update the editor
    const editorView = this.shadowRoot.querySelector('st-editor-view');
    editorView.updateForCommentSelected();
  }

  updateForPlaybackMovement() {
    //if the add/edit comment UI is visible then close it
    this.updateUIToCancelAddEditComment();

    //update nav
    const playbackNavigator = this.shadowRoot.querySelector('st-playback-navigator');
    playbackNavigator.updateForPlaybackMovement();

    //update the editor
    const editorView = this.shadowRoot.querySelector('st-editor-view');
    editorView.updateForPlaybackMovement();
  }

  updateForCommentReordering() {
    //update playback nav
    this.addPlaybackNavigator();
  }

  updateForAddEditDeleteComment() {
    //if the add/edit comment UI is visible then close it
    this.updateUIToCancelAddEditComment();

    //notify with an event that the comments have changed
    this.notifyAddEditDeleteComment();

    //if there are a different number of comment groups
    if(this.playbackEngine.mostRecentChanges.numberOfCommentGroupsChanged) {
      //update the editor's slider
      const editorView = this.shadowRoot.querySelector('st-editor-view');
      editorView.updateForAddEditDeleteComment();
    }
  }

  updateForFileSelected(fileId) {
    //make sure playback is paused
    this.pausePlayback(true);

    //update the active file
    this.playbackEngine.changeActiveFileId(fileId);

    //if there is a new active file
    if(this.playbackEngine.mostRecentChanges.hasNewActiveFile) {
      //update the UI
      const playbackNavigator = this.shadowRoot.querySelector('st-playback-navigator');
      //if there is a playback navigator update it
      if(playbackNavigator) {
        playbackNavigator.updateForFileSelected();
      } else { //there is a comment being created or edited
        //update the add/edit comment
        const addEditComment = this.shadowRoot.querySelector('st-add-edit-comment');
        addEditComment.updateForFileSelected();
      }
      //update the editor
      const editorView = this.shadowRoot.querySelector('st-editor-view');
      editorView.updateForFileSelected();
    }
  }

  updateToDisplaySearchResults(searchResults) {
    const playbackNavigator = this.shadowRoot.querySelector('st-playback-navigator');
    playbackNavigator.updateToDisplaySearchResults(searchResults);

    const editorView = this.shadowRoot.querySelector('st-editor-view');
    editorView.updateToDisplaySearchResults(searchResults);
  }

  updateUIToAddNewComment() {
    //make the code in the editor selectable
    const editorView = this.shadowRoot.querySelector('st-editor-view');
    editorView.updateHandleTextSelection(true, false);

    //build a new add/edit comment component
    const addEditComment = new AddEditComment(this.playbackEngine, null);
    const commentsSlot = this.shadowRoot.querySelector('.commentsSlot');
    commentsSlot.innerHTML = '';
    commentsSlot.appendChild(addEditComment);

    //disable search
    this.notifyDisableSearch();
  }

  updateUIToEditComment(comment) {
    //make the code in the editor selectable
    const editorView = this.shadowRoot.querySelector('st-editor-view');
    editorView.updateHandleTextSelection(true, true);

    //build a new add/edit comment component
    const addEditComment = new AddEditComment(this.playbackEngine, comment);
    const commentsSlot = this.shadowRoot.querySelector('.commentsSlot');
    commentsSlot.innerHTML = '';
    commentsSlot.appendChild(addEditComment);

    //disable search
    this.notifyDisableSearch();
  }

  updateUIToCancelAddEditComment() {
    //attempt to retrieve the add/edit comment component (it may not be in the UI)
    const addEditComment = this.shadowRoot.querySelector('st-add-edit-comment');
    //if it is present in the UI, then replace it with a playback nav
    if(addEditComment) {
      //disable selection in the editor
      const editorView = this.shadowRoot.querySelector('st-editor-view');
      editorView.updateHandleTextSelection(false, false);

      //rebuild all comment views with a new playback nav
      this.addPlaybackNavigator();
    }

    //enable search
    this.notifyEnableSearch();
  }

  updateForTitleChange(newTitle) {
    const playbackNavigator = this.shadowRoot.querySelector('st-playback-navigator');
    playbackNavigator.updateForTitleChange(newTitle);
  }

  addSelectedTextToComment(comment) {
    //ask the ace editor for the selected text
    const editorView = this.shadowRoot.querySelector('st-editor-view');
    const selectedCodeInfo = editorView.getSelectedCodeInfo();

    //add the selected text info to the comment object and let it propagate up
    comment.selectedCodeBlocks = selectedCodeInfo.selectedCodeBlocks;
    comment.viewableBlogText = selectedCodeInfo.viewableBlogText;
    comment.linesAbove = selectedCodeInfo.linesAbove;
    comment.linesBelow = selectedCodeInfo.linesBelow;
  }

  doDrag = event => {
    const codeView = this.shadowRoot.host;
    const codeViewWidth = codeView.getBoundingClientRect().width;
    const minWidth = .1 * codeViewWidth;
    const maxWidth = .9 * codeViewWidth;

    let newX = 0;
    //if this is a touch event
    if(event.touches) {
      newX = event.touches[0].pageX;
    } else { //it is a mouse down
      newX = event.pageX;
    }
    let newWidth = newX - codeView.offsetLeft;
    if(newWidth < minWidth) {
      newWidth = minWidth;
    } else if(newWidth >= maxWidth) {
      newWidth = maxWidth;
    }

    this.setWidthInPixels(newWidth);
    this.width = newWidth;

    //prevent selection during a drag
    event.preventDefault();
  }

  stopDrag = event => {
    document.removeEventListener('mouseup', this.stopDrag, false);
    document.removeEventListener('mousemove', this.doDrag, false);  

    document.removeEventListener('touchend', this.stopDrag, false);
    document.removeEventListener('touchmove', this.doDrag, false);  
  }

  addMouseEventListeners = () => {
    document.addEventListener('mousemove', this.doDrag, false);
    document.addEventListener('mouseup', this.stopDrag, false);
  }

  addTouchEventListeners = () => {
    document.addEventListener('touchmove', this.doDrag, false);
    document.addEventListener('touchend', this.stopDrag, false);
  }

  setWidthInPixels(newWidth) {
    const codeView = this.shadowRoot.host;
    const codeViewWidth = codeView.getBoundingClientRect().width;

    const dragBar = this.shadowRoot.querySelector('.dragBar');
    const dragBarWidth = dragBar.getBoundingClientRect().width;

    const commentsSlot = this.shadowRoot.querySelector('.commentsSlot');
    const editorViewSlot = this.shadowRoot.querySelector('.editorViewSlot');

    commentsSlot.style.width = (newWidth - (dragBarWidth / 2)) + 'px';
    editorViewSlot.style.width = (codeViewWidth - newWidth - dragBarWidth) + 'px';
  }

  //used to switch from play->pause and pause->play
  pausePlayback = (newIsPaused) => {
    //if requesting to change to a different state
    if(this.autoPlayback.isPaused !== newIsPaused) {
      //starting pause
      if (newIsPaused === true) { 
        //cancel timer
        clearInterval(this.autoPlayback.playTimer);
        this.autoPlayback.playTimer = null;

        //update the UI
        const editorView = this.shadowRoot.querySelector('st-editor-view');
        editorView.updateForPlaybackPause();

        //store pause state
        this.autoPlayback.isPaused = true;
      } else { //starting play
        //start timer if not at end 
        if (this.autoPlayback.playTimer === null && this.playbackEngine.mostRecentChanges.endingLocation !== 'end') {
          //increment one event per interval
          this.autoPlayback.playTimer = setInterval(this.playNextEvent, this.autoPlayback.playbackSpeedMs);

          //update the UI
          const editorView = this.shadowRoot.querySelector('st-editor-view');
          editorView.updateForPlaybackPlay();
          
          //store play state
          this.autoPlayback.isPaused = false;
        } //else- at end or timer already running, no change
      }
    }
  }

  //interval function used to animate the events during a playback when the play button is pressed
  playNextEvent = () => {
    //move forward one step
    this.playbackEngine.stepForward(1);

    //update
    this.updateForPlaybackMovement();
    this.updateForCommentSelected();

    //if there is a comment at the new location or its the end of a playback w/o a comment
    if (this.playbackEngine.mostRecentChanges.endedOnAComment || this.playbackEngine.currentEventIndex === this.playbackEngine.playbackData.events.length - 1) { 
      //pause
      this.pausePlayback(true);
    }
  }

  //used to take one step backward
  playPreviousEvent = () => {
    //make sure playback is paused
    this.pausePlayback(true);
    
    //move backward one step
    this.playbackEngine.stepBackward(1);
    
    //update
    this.updateForPlaybackMovement();
    this.updateForCommentSelected();
  }

  //used when the slider moves
  sliderUpdate = (newPosition) => {
    //make sure playback is paused
    this.pausePlayback(true);

    //move to the new position
    this.playbackEngine.stepToEventNumber(newPosition);

    //update
    this.updateForPlaybackMovement();
    this.updateForCommentSelected();
  }

  //used when a comment is clicked on
  moveToSelectedComment = (commentId) => {
    //make sure playback is paused
    this.pausePlayback(true);

    //move to the selected comment
    this.playbackEngine.stepToCommentById(commentId);

    //update 
    this.updateForPlaybackMovement();
    this.updateForCommentSelected();
  }

  //used when the user clicks the button to move to the next comment
  moveToNextComment = () => {
    //make sure playback is paused
    this.pausePlayback(true);

    //move to the next comment
    this.playbackEngine.stepToNextComment();

    //update
    this.updateForPlaybackMovement();
    this.updateForCommentSelected();
  }

  //used when the user wants to move to the previous comment
  moveToPreviousComment = () => {
    //make sure playback is paused
    this.pausePlayback(true);

    //move to the next comment
    this.playbackEngine.stepToPreviousComment();

    //update
    this.updateForPlaybackMovement();
    this.updateForCommentSelected();
  }

  //used when the user wants to move to the end of the playback
  moveToEndOfPlayback = () => {
    //make sure playback is paused
    this.pausePlayback(true);

    //move to the end of the playback
    this.playbackEngine.stepToEnd();

    //update
    this.updateForPlaybackMovement();
    this.updateForCommentSelected();
  }

  //used when the user wants to move to the beginning of the playback
  moveToBeginningOfPlayback = () => {
    //make sure playback is paused
    this.pausePlayback(true);

    //move to the beginning of the playback
    this.playbackEngine.stepToBeginning();

    //update
    this.updateForPlaybackMovement();
    this.updateForCommentSelected();
  }

  updateEditorFontSize(newFontSize) {
    const editorView = this.shadowRoot.querySelector('st-editor-view');
    editorView.updateEditorFontSize(newFontSize);
  }
  increaseEditorFontSize() {
    //make the font bigger
    this.editorProperties.fontSize = this.editorProperties.fontSize + 4;
    //update the editor
    this.updateEditorFontSize(this.editorProperties.fontSize);
  }
  decreaseEditorFontSize() {
    //make the font smaller
    this.editorProperties.fontSize = this.editorProperties.fontSize - 2;
    //update the editor
    this.updateEditorFontSize(this.editorProperties.fontSize);
  }

  //adjusts playback speed
  adjustPlaybackSpeed(delta) {
    //adjust the playback speed
    this.autoPlayback.playbackSpeedMs += delta;
    if(this.autoPlayback.playbackSpeedMs < 0) {
      this.autoPlayback.playbackSpeedMs = 0;
    }
  }

  notifyDisableSearch() {
    //send an event that the search functionality should be disabled
    const event = new CustomEvent('disable-search', { 
      bubbles: true, 
      composed: true 
    });
    this.dispatchEvent(event);
  }

  notifyEnableSearch() {
    //send an event that the search functionality should be enabled
    const event = new CustomEvent('enable-search', { 
      bubbles: true, 
      composed: true 
    });
    this.dispatchEvent(event);
  }

  notifyAddEditDeleteComment() {
    //send an event that a comment has been changed
    const event = new CustomEvent('add-edit-delete-comment', { 
      bubbles: true, 
      composed: true 
    });
    this.dispatchEvent(event);
  }
}

window.customElements.define('st-code-view', CodeView);