class CodeView extends HTMLElement {
  constructor(playbackEngine, editorProperties) {
    super();

    this.editorProperties = editorProperties;
    this.width = window.innerWidth * .27;
    this.autoPlayback = {
      isPaused: true,
      playTimer: null,
      playbackSpeedMs: 75,
    };
    this.playbackEngine = playbackEngine;

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

        .playbackNavigatorSlot {
          flex: 0 0 auto;
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

      <div class="playbackNavigatorSlot"></div>
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
    const playbackNavigatorSlot = this.shadowRoot.querySelector('.playbackNavigatorSlot');
    const playbackNavigator = new PlaybackNavigator(this.playbackEngine);
    playbackNavigatorSlot.appendChild(playbackNavigator);

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
      this.updateUIToCancelAddEditComment();
      this.updateForNewComment();
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
      this.updateUIToCancelAddEditComment();
      this.updateForCommentEdit(editedComment);
    });

    //cancel the creating/editing of a comment
    this.shadowRoot.addEventListener('cancel-add-edit-comment', event => {
      this.updateUIToCancelAddEditComment();
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
      this.updateForDeleteComment();
    });

    //change to the lines above/below when creating/editing a comment
    this.shadowRoot.addEventListener('lines-above-below-change', event => {
      const linesAbove = event.detail.linesAbove;
      const linesBelow = event.detail.linesBelow;
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
      this.updateForSelectedFile(event.detail.activeFileId);
      event.preventDefault();
    });

    document.addEventListener('keydown', event => {
      //get the state of the keys
      const keyPressed = event.key;
      const shiftPressed = event.shiftKey;
      const ctrlPressed = event.ctrlKey;

      //keyboard controls
      if (ctrlPressed && shiftPressed && keyPressed === 'ArrowRight') { //ctrl + shift + right arrow press
        this.moveToEndOfPlayback();
        event.preventDefault();
      } else if(shiftPressed && keyPressed === 'ArrowRight') { //shift + right arrow press
        this.moveToNextComment();
        event.preventDefault();
      } else if(keyPressed === 'ArrowRight') { //right arrow press
        //move to the next event
        this.pausePlayback(true);
        this.playNextEvent();
        event.preventDefault();
      } else if (ctrlPressed && shiftPressed && keyPressed === 'ArrowLeft') { //ctrl + shift + left arrow press
        this.moveToBeginningOfPlayback();
        event.preventDefault();
      } else if (shiftPressed && keyPressed === 'ArrowLeft') { //shift + left arrow press
        this.moveToPreviousComment();
        event.preventDefault();
      } else if (keyPressed === 'ArrowLeft') {//left arrow press
          //move to the previous event
          this.pausePlayback(true);
          this.playPreviousEvent();
          event.preventDefault();
      } else if (ctrlPressed && shiftPressed && keyPressed === 'ArrowUp') { //ctrl + shift + up arrow press
        //make the font bigger
        this.increaseEditorFontSize();
        event.preventDefault();
      } else if (ctrlPressed && shiftPressed && keyPressed === 'ArrowDown') { //ctrl + shift + down arrow press
        //make the font smaller
        this.decreaseEditorFontSize();
        event.preventDefault();
      } else if (event.code === "Space") {
        //toggle play/pause 
        this.pausePlayback(!this.autoPlayback.isPaused);
        event.preventDefault();
      } else if (ctrlPressed && shiftPressed && keyPressed === 'Enter') {
        this.updateUIToAddNewComment();
      }
    });
  }

  disconnectedCallback() {
    const dragBar = this.shadowRoot.querySelector('.dragBar');
    dragBar.removeEventListener('mousedown', this.addMouseEventListeners);
    dragBar.removeEventListener('touchstart', this.addTouchEventListeners);
  }

  updateForPlaybackMovement() {
    //update nav
    const playbackNavigator = this.shadowRoot.querySelector('st-playback-navigator');
    playbackNavigator.updateForPlaybackMovement();
    //update the editor
    const editorView = this.shadowRoot.querySelector('st-editor-view');
    editorView.updateForPlaybackMovement();
  }

  updateForNewComment() {
    //add the new comment view and mark it as active
    const playbackNavigator = this.shadowRoot.querySelector('st-playback-navigator');
    playbackNavigator.updateForNewComment();

    //get the event where the new comment is being added
    const commentEvent = this.playbackEngine.getMostRecentEvent();
    //if there is only one comment here after creating a new one
    if(this.playbackEngine.playbackData.comments[commentEvent.id].length === 1) {
      //update the editor view to add a new pip
      const editorView = this.shadowRoot.querySelector('st-editor-view');
      editorView.updateForNewComment();
    }
    //update
    this.updateForPlaybackMovement();
  }

  updateForCommentEdit(editedComment) {
    //add the new comment view and mark it as active
    const playbackNavigator = this.shadowRoot.querySelector('st-playback-navigator');
    playbackNavigator.updateForCommentEdit(editedComment);
    
    //update
    this.updateForPlaybackMovement();
  }

  updateForDeleteComment() {
    //the previous comment was made active, display it
    const playbackNavigator = this.shadowRoot.querySelector('st-playback-navigator');
    playbackNavigator.updateForDeleteComment();

    //get the event where the comment was deleted
    const commentEvent = this.playbackEngine.getMostRecentEvent();
    //if there are no more comments at this event
    if(!this.playbackEngine.playbackData.comments[commentEvent.id]) {
      //update the editor view to remove the pip
      const editorView = this.shadowRoot.querySelector('st-editor-view');
      editorView.updateForDeleteComment();
    }
    //update
    this.updateForPlaybackMovement();
  }

  updateUIToAddNewComment() {
    const editorView = this.shadowRoot.querySelector('st-editor-view');
    editorView.updateHandleTextSelection(true);

    const playbackNavigator = this.shadowRoot.querySelector('st-playback-navigator');
    playbackNavigator.updateUIToAddNewComment();
  }

  updateUIToEditComment(comment) {
    const editorView = this.shadowRoot.querySelector('st-editor-view');
    editorView.updateHandleTextSelection(true);

    const playbackNavigator = this.shadowRoot.querySelector('st-playback-navigator');
    playbackNavigator.updateUIToEditComment(comment);
  }

  updateUIToCancelAddEditComment() {
    const editorView = this.shadowRoot.querySelector('st-editor-view');
    editorView.updateHandleTextSelection(false);

    const playbackNavigator = this.shadowRoot.querySelector('st-playback-navigator');
    playbackNavigator.updateUIToCancelAddEditComment();
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
    const minWidth = .05 * codeViewWidth;
    const maxWidth = .95 * codeViewWidth;

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

    const playbackNavigatorSlot = this.shadowRoot.querySelector('.playbackNavigatorSlot');
    const editorViewSlot = this.shadowRoot.querySelector('.editorViewSlot');

    playbackNavigatorSlot.style.width = newWidth + 'px';
    editorViewSlot.style.width = (codeViewWidth - dragBarWidth - newWidth) + 'px';
  }

  //used to switch from play->pause and pause->play
  pausePlayback = (newIsPaused) => {
    if (newIsPaused === true) { //starting pause
      //cancel timer
      clearInterval(this.autoPlayback.playTimer);
      this.autoPlayback.playTimer = null;
    } else { //starting play
      //start timer
      if (this.autoPlayback.playTimer === null) {
        //increment one event per interval
        this.autoPlayback.playTimer = setInterval(this.playNextEvent, this.autoPlayback.playbackSpeedMs);
      }
    }
    this.autoPlayback.isPaused = newIsPaused;
  }

  //interval function used to animate the events during a playback when the play button is pressed
  playNextEvent = () => {
    //move forward one step
    this.playbackEngine.stepForward(1);
    
    //if there is a comment at the new location or it is at the end of a playback
    if (this.playbackEngine.activeComment || this.playbackEngine.currentEventIndex === this.playbackEngine.playbackData.events.length - 1) {
      //pause
      this.pausePlayback(true);
    }
    //update
    this.updateForPlaybackMovement();
  }

  //adjusts playback speed
  adjustPlaybackSpeed(delta) {
    //adjust the playback speed
    this.autoPlayback.playbackSpeedMs += delta;
    if(this.autoPlayback.playbackSpeedMs < 0) {
      this.autoPlayback.playbackSpeedMs = 0;
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
  }
  
  //used when a file tab is selected or a file is chosen in the file system view
  updateForSelectedFile = (fileId) => {
    //make sure playback is paused
    this.pausePlayback(true);

    //update the active file
    this.playbackEngine.changeActiveFile(fileId);

    //update the UI
    const editorView = this.shadowRoot.querySelector('st-editor-view');
    editorView.updateForSelectedFile();
    const playbackNavigator = this.shadowRoot.querySelector('st-playback-navigator');
    playbackNavigator.updateForSelectedFile();
  }

  //used when the slider moves
  sliderUpdate = (newPosition) => {
    //make sure playback is paused
    this.pausePlayback(true);

    //move to the new position
    this.playbackEngine.stepToEventNumber(newPosition);

    //update
    this.updateForPlaybackMovement();
  }

  //used when a comment is clicked on
  moveToSelectedComment = (commentId) => {
    //make sure playback is paused
    this.pausePlayback(true);

    //if this requires some movement
    //if there was not an active comment OR it was paused on a different comment
    if(!this.playbackEngine.activeComment || this.playbackEngine.activeComment.id !== commentId) {
      //move to the selected comment
      this.playbackEngine.stepToCommentById(commentId);
      //update 
      this.updateForPlaybackMovement();
    }
  }

  //used when the user clicks the button to move to the next comment
  moveToNextComment = () => {
    //make sure playback is paused
    this.pausePlayback(true);

    //move to the next comment
    this.playbackEngine.stepToNextComment();

    //update
    this.updateForPlaybackMovement();
  }

  //used when the user wants to move to the previous comment
  moveToPreviousComment = () => {
    //make sure playback is paused
    this.pausePlayback(true);

    //move to the next comment
    this.playbackEngine.stepToPreviousComment();

    //update
    this.updateForPlaybackMovement();
  }

  //used when the user wants to move to the end of the playback
  moveToEndOfPlayback = () => {
    //make sure playback is paused
    this.pausePlayback(true);

    //move to the end of the playback
    this.playbackEngine.stepToEnd();

    //update
    this.updateForPlaybackMovement();
  }

  //used when the user wants to move to the beginning of the playback
  moveToBeginningOfPlayback = () => {
    //make sure playback is paused
    this.pausePlayback(true);

    //move to the beginning of the playback
    this.playbackEngine.stepToBeginning();

    //update
    this.updateForPlaybackMovement();
  }

  updateEditorFontSize(newFontSize) {
    const editorView = this.shadowRoot.querySelector('st-editor-view');
    editorView.updateEditorFontSize(newFontSize);
  }

  displaySearchResults(searchResults){
    const playbackNavigator = this.shadowRoot.querySelector('st-playback-navigator');
    playbackNavigator.displaySearchResults(searchResults);
  }
}

window.customElements.define('st-code-view', CodeView);