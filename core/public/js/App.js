class App extends HTMLElement {
  constructor(playbackData, initialMode) {
    super();
    //create the main playback 'engine' which drives the ui
    this.playbackEngine = new PlaybackEngine(playbackData);
    
    //code or blog mode
    this.activeMode = '';
    this.initialMode = initialMode;
    
    //editor info
    this.editorProperties = {
      fontSize: 20,
      //potential ace editor themes: monokai, gruvbox, idle_fingers, pastel_on_dark, tomorrow_night, tomorrow_night_eighties, twilight
      aceTheme: 'ace/theme/tomorrow_night_eighties',
      modelist: ace.require("ace/ext/modelist"),
      fileModes: {}
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
      //make sure playback is paused TODO
      //this.pausePlayback(true);

      //get the title bar
      const titleBar = this.shadowRoot.querySelector('st-title-bar');

      //clear out the old view
      const playbackContent = this.shadowRoot.querySelector('.playbackContent');
      playbackContent.innerHTML = '';

      let newView;
      //create the requested view
      if(newMode === 'code') {
        newView = new CodeView(this.playbackEngine, this.editorProperties);
      } else { //blog view
        newView = new BlogView(this.playbackEngine, this.editorProperties);
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
  }

  //handles the search from the search bar
  handleSearch(searchText) {
    //get the search results and then display them
    const searchResults = this.playbackEngine.performSearch(searchText);

    //display results in code/blog mode
    if (this.activeMode === 'code') {
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
}

window.customElements.define('st-app', App);