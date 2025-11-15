class App extends HTMLElement {
  constructor(playbackData, initialMode, startingCommentIndex, startingEventIndex) {
    super();
    //create the main playback 'engine' which drives the ui
    this.playbackEngine = new PlaybackEngine(playbackData, startingCommentIndex, startingEventIndex);

    //code or blog mode
    this.activeMode = '';
    this.initialMode = initialMode;

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
    titleBar.appendChild(new TitleBar(this.initialMode, this.playbackEngine));

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
      this.updateForDisplay(newMode);
    }
  }

  updateForDisplay(requestedMode) {
    //get the title bar
    const titleBar = this.shadowRoot.querySelector('st-title-bar');

    //clear out the old view
    const playbackContent = this.shadowRoot.querySelector('.playbackContent');
    playbackContent.innerHTML = '';

    //create the requested view
    let newView;
    if(requestedMode === 'code') {
      newView = new CodeView(this.playbackEngine);
    } else { //blog view
      newView = new BlogView(this.playbackEngine);
    }

    //add the new view
    playbackContent.appendChild(newView);

    //store the current mode
    this.activeMode = requestedMode;
  }

  addEventListeners() {
    //resize the main view when the window resizes
    window.addEventListener('resize', () => {
      this.updateForDisplay(this.activeMode);
    });

    //global listener for all keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      //check if the user is typing inside an input, textarea, or contenteditable element.
      //if so, ignore all of our custom shortcuts.
      const target = event.target;
      const isTyping = target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      //exit early if the user is in a typing context.
      if(isTyping) {
        return;
      }

      //handle shortcuts related to the physical '/' key 
      if(event.code === 'Slash') {
        // Case 1: Just '/' (without Shift) is pressed for focusing the search bar.
        if(!event.shiftKey) {
          event.preventDefault();
          const searchBar = this.shadowRoot.querySelector('st-title-bar')
            .shadowRoot.querySelector('st-search-bar')
            .shadowRoot.querySelector('#searchBar');
          if(searchBar) {
            searchBar.focus();
          }
        }
        // Case 2: 'Shift + /' is pressed for opening the media picker.
        else if(event.shiftKey) {
          event.preventDefault();
          this.dispatchEvent(new CustomEvent('open-media-picker', {
            bubbles: true,
            composed: true
          }));
        }
      }
    });

    //media picker
    this.addEventListener('open-media-picker', () => {
      let mediaPicker = this.shadowRoot.querySelector('st-media-picker');
      
      //if the modal has been created before, remove it
      if(mediaPicker) {
        mediaPicker.remove();
      }

      //create a fresh picker with the latest media
      mediaPicker = new MediaPicker(this.playbackEngine);
      this.shadowRoot.appendChild(mediaPicker);
      mediaPicker.show();
    });

    this.shadowRoot.addEventListener('media-selected', event => {
      //move to the selected comment
      this.playbackEngine.stepToCommentById(event.detail.commentId);

      //update the view to show the selected comment
      if(this.activeMode === 'code') {
        const codeView = this.shadowRoot.querySelector('st-code-view');
        codeView.updateForPlaybackMovement();
        codeView.updateForCommentSelected();
      } else { // 'blog' mode
        const blogView = this.shadowRoot.querySelector('st-blog-view');
        // Find the blog component and scroll to it
        const element = blogView.shadowRoot.querySelector(`#id-${event.detail.commentId}`);
        if(element) {
          const activeElements = blogView.shadowRoot.querySelectorAll('.activeComment');
          activeElements.forEach(el => el.classList.remove('activeComment'));
          element.classList.add('activeComment');
          // Scroll to the element
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });

    //code mode to blog mode or vice versa
    this.shadowRoot.addEventListener('mode-change', event => {
      //switch to a different mode ('code' or 'blog')
      this.changeMode(event.detail.mode);
      event.preventDefault();
    });

    //new search bar text entered
    this.shadowRoot.addEventListener('search', event => {
      const eventText = event.detail.searchText;
      this.handleSearch(eventText);
    });

    this.shadowRoot.addEventListener('enable-search', event => {
      const titleBar = this.shadowRoot.querySelector('st-title-bar');
      titleBar.updateToEnableSearch();
    });

    this.shadowRoot.addEventListener('disable-search', event => {
      const titleBar = this.shadowRoot.querySelector('st-title-bar');
      titleBar.updateToDisableSearch();
    });

    //request a change in the title
    this.shadowRoot.addEventListener('title-change', async event => {
      if(this.activeMode === 'code') {
        const codeView = this.shadowRoot.querySelector('st-code-view');
        codeView.updateForTitleChange(event.detail.newTitle);
      } else { //blog view
        const blogView = this.shadowRoot.querySelector('st-blog-view');
        blogView.updateForTitleChange(event.detail.newTitle);
      }
      //update the playback title
      this.playbackEngine.changePlaybackTitle(event.detail.newTitle);
      //change the page's title
      document.title = this.playbackEngine.playbackData.playbackTitle;

      //and on the server
      const serverProxy = new ServerProxy();
      await serverProxy.updateTitleOnServer(event.detail.newTitle);
    });

    this.shadowRoot.addEventListener('add-edit-delete-comment', event => {
      //update the title bar when the comments change (read time estimate)
      const titleBar = this.shadowRoot.querySelector('st-title-bar');
      titleBar.updateForAddEditDeleteComment();
    });

    this.shadowRoot.addEventListener('change-tts-speed', event => {
      this.changeTTSSpeed(event.detail.speed);
    });
  }

  //handles the search from the search bar
  handleSearch(searchText) {
    //get the search results and then display them
    const searchResults = this.playbackEngine.performSearch(searchText);

    //display results in code/blog mode
    if(this.activeMode === 'code') {
      const codeView = this.shadowRoot.querySelector('st-code-view');
      codeView.updateToDisplaySearchResults(searchResults);
    } else {
      const blogView = this.shadowRoot.querySelector('st-blog-view');
      blogView.updateToDisplaySearchResults(searchResults);
    }

    //display search results in the title bar
    const titleBar = this.shadowRoot.querySelector('st-title-bar');
    titleBar.updateToDisplaySearchResults(searchText, searchResults);
  }

  changeTTSSpeed(speed) {
    this.playbackEngine.editorProperties.ttsSpeed = speed;
    if(this.activeMode === 'code') {
      const codeView = this.shadowRoot.querySelector('st-code-view');
      codeView.updateTTSSpeed(speed);
    } else {
      const blogView = this.shadowRoot.querySelector('st-blog-view');
      blogView.updateTTSSpeed(speed);
    }
  }
}

window.customElements.define('st-app', App);