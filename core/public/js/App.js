class App extends HTMLElement {
  constructor(playbackData, initialMode) {
    super();
    //create the main playback 'engine' which drives the ui
    this.playbackEngine = new PlaybackEngine(playbackData);
    
    this.initialMode = initialMode;
    this.activeMode = '';
    this.playbackNavigatorWidth = window.innerWidth * .27;
    this.editorProperties = {
      fontSize: 20,
      //potential ace editor themes: monokai, gruvbox, idle_fingers, pastel_on_dark, tomorrow_night, tomorrow_night_eighties, twilight
      aceTheme: 'ace/theme/tomorrow_night_eighties',
    };

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
          flex-flow: column;
          height: 100%;
        }
        .playbackContent {
          flex: 1 1 auto;
          overflow: hidden;
        }
      </style>

      <div class="titleBar"></div>
      <div class="playbackContent"></div>
      <div class="footer"></div>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    //change the page's title
    document.title = this.playbackEngine.playbackData.playbackTitle;

    //create the initial components
    //title bar
    const titleBar = this.shadowRoot.querySelector('.titleBar');
    titleBar.appendChild(new TitleBar(this.playbackEngine.playbackData.playbackTitle, this.initialMode, this.playbackEngine));
    
    //set the initial mode ('code' or 'blog')
    this.changeMode(this.initialMode);
    
    //setup the custom event listeners
    this.addEventListeners();
  }

  disconnectedCallback() {
  }

  changeMode(newMode) {
    //if the mode has changed
    if(this.activeMode !== newMode) {
      //make sure playback is paused
      this.togglePlayPause(true);

      //clear out the old view
      const playbackContent = this.shadowRoot.querySelector('.playbackContent');
      playbackContent.innerHTML = '';

      let newView;
      //create the requested view
      if(newMode === 'code') {
        newView = new CodeView({
          editorProperties: this.editorProperties,
          playbackNavigatorWidth: this.playbackNavigatorWidth, 
          playbackEngine: this.playbackEngine
        });
      } else { //blog view
        newView = new BlogView({
          editorProperties: this.editorProperties,
          playbackEngine: this.playbackEngine
        });
      }

      //add the new view
      playbackContent.appendChild(newView);

      //store the current mode
      this.activeMode = newMode;
    }
  }

  addEventListeners() {
    //code mode to blog mode or vice versa
    this.shadowRoot.addEventListener('mode-change', event => {
      //switch to a different mode ('code' or 'blog')
      this.changeMode(event.detail.mode);
      event.preventDefault();
    });

    //a comment was selected
    this.shadowRoot.addEventListener('active-comment', event => {
      //move to the selected comment
      this.moveToSelectedComment(event.detail.activeCommentId);
      event.preventDefault();
    });

    //the width of the code view has changed
    this.shadowRoot.addEventListener('code-view-width-change', event => {
      //set the width of the pb nav and editor view
      this.setplaybackNavigatorWidth(event.detail.width);
      event.preventDefault();
    });

    //play
    this.shadowRoot.addEventListener('play-button-click', event => {
      //begin animated playback
      this.togglePlayPause(false);
      event.preventDefault();
    });

    //pause
    this.shadowRoot.addEventListener('pause-button-click', event => {
      //pause animated playback
      this.togglePlayPause(true);
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
      this.changeActiveFile(event.detail.activeFileId);
      event.preventDefault();
    });

    //playback nav tab switch
    this.shadowRoot.addEventListener('playback-navigator-tab-switch', event => {
      this.changePlaybackNavigatorTab(event.detail.newPlaybackNavTab)
      event.preventDefault();
    });

    //search bar has a key press
    this.shadowRoot.addEventListener('search', event => {
      const eventText = event.detail.searchText;
      this.handleSearch(eventText);
    });

    //playback speed increased
    this.shadowRoot.addEventListener('increase-playback-speed', () => {
      const isPlaying = this.autoPlayback.isPaused === false;

      if (isPlaying){
        this.togglePlayPause(true);
      }

      this.autoPlayback.playbackSpeedMs -= 5;

      if (isPlaying){
        this.togglePlayPause(true);
      }
  
    });

    //playback speed decreased
    this.shadowRoot.addEventListener('decrease-playback-speed'){
      const isPlaying = this.autoPlayback.isPaused === false;

      if (isPlaying){
        this.togglePlayPause(true);
      }

      this.autoPlayback.playbackSpeedMs += 5;

      if (isPlaying){
        this.togglePlayPause(true);
      }
  
    }
  }

  handleSearch(searchText){
    //handles the search from the search bar
    if (this.activeMode === 'code'){
      const codeView = this.shadowRoot.querySelector('st-code-view');
      codeView.performSearch(searchText);
    }else{
      const blogView = this.shadowRoot.querySelector('st-blog-view');
      blogView.performSearch(searchText);
    }
  }

  //used to switch from play->pause and pause->play
  togglePlayPause = (newIsPaused) => {
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
    
    //update the code view
    const codeView = this.shadowRoot.querySelector('st-code-view');
    if (this.playbackEngine.activeComment.pausedOnComment) {
      //pause
      this.togglePlayPause(true);
      //display the new comment
      codeView.updateSelectedComment();
    } else if(this.playbackEngine.currentEventIndex === this.playbackEngine.playbackData.events.length - 1) {
      //if there are no more events, pause and update the editor
      this.togglePlayPause(true);
      codeView.updateSliderMoved();
    } else {
      //update the editor and keep moving
      codeView.updateSliderMoved(false);
    }
  }

  //used when a file tab is selected or a file is chosen in the file system view
  changeActiveFile = (fileId) => {
    //make sure playback is paused
    this.togglePlayPause(true);

    //update the active file
    this.playbackEngine.changeActiveFile(fileId);

    //update the editor
    const codeView = this.shadowRoot.querySelector('st-code-view');
    codeView.updateActiveFile();
  }

  //used when the slider moves
  sliderUpdate = (newPosition) => {
    //make sure playback is paused
    this.togglePlayPause(true);

    //move to the new position
    this.playbackEngine.stepToEventNumber(newPosition);

    const codeView = this.shadowRoot.querySelector('st-code-view');
    //if there is a comment at the new event
    if (this.playbackEngine.activeComment.pausedOnComment) {
      codeView.updateSelectedComment();
    } else {
      codeView.updateSliderMoved();
    }
  }

  //used when a comment is clicked on, this can happen in either 'code' or 'blog' mode
  moveToSelectedComment = (commentId) => {
    //if this requires some movement
    //was previously not on a comment OR a new comment was selected
    if(this.playbackEngine.activeComment.pausedOnComment === false || this.playbackEngine.activeComment.comment.id !== commentId) {
      //make sure playback is paused
      this.togglePlayPause(true);
      
      //move to the selected comment
      this.playbackEngine.stepToCommentById(commentId);

      //this can happen in either 'code' or 'blog' mode so check which one the app is in
      if(this.activeMode === 'code') {
        const codeView = this.shadowRoot.querySelector('st-code-view');
        codeView.updateSelectedComment();
      } else { //blog mode
        const blogView = this.shadowRoot.querySelector('st-blog-view');
        blogView.updateSelectedComment();
      }
    }
  }

  //used when the user clicks the button to move to the next comment
  moveToNextComment = () => {
    //make sure playback is paused
    this.togglePlayPause(true);

    //move to the next comment
    this.playbackEngine.stepToNextComment();

    //update the editor
    const codeView = this.shadowRoot.querySelector('st-code-view');
    codeView.updateSelectedComment();
  }

  changePlaybackNavigatorTab = (newPlaybackNavigatorTab) => {
    //make sure playback is paused
    this.togglePlayPause(true);
  }

  setplaybackNavigatorWidth(newWidth) {
    this.playbackNavigatorWidth = newWidth;
  }
}

window.customElements.define('st-app', App);