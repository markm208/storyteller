class TitleBar extends HTMLElement {
  constructor(playbackTitle, activeMode, playbackEngine) {
    super();
    
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
    this.playbackEngine = playbackEngine;

    this.activeMode = activeMode;
    this.playbackTitle = playbackTitle;
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
    <style>
      :host {
        background-color: rgb(59,76,98);
        color: rgb(223, 242, 244);
        padding: 5px 10px 10px 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      .modeButton {
        padding: 0px;
        background-color: transparent;
        border: 1px solid transparent;
        color: gray;
        display: none;
        cursor: pointer;
      }

      .activeModeButton {
        color:rgb(201, 226, 242);
        display: block;
      }

      .playbackTitle {
        color:rgb(201, 226, 242);
        font-size: 1.15rem;
      }

      .stLogo {
        font-size: 1.25rem;
        font-weight: 500;
      }

      .optionsButtonsGroup{
        display: flex;
      }      
    </style>

    <!-- Logo and playback title -->
    <div class="logoTitleCombo">
      <span class="stLogo">Storyteller: </span>
      <span class="playbackTitle"></span>
    </div>
    <!-- search bar, code/blog mode buttons and options button -->

    <div class="optionsButtonsGroup" role="group" aria-label="Options Button Group">
      <st-search-bar></st-search-bar>
      <button id="enterCodeModeButton" type="button" class="modeButton" title="Code View">
        <!-- icon url: https://icons.getbootstrap.com/icons/code/ -->
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" class="bi bi-code-slash" viewBox="0 0 16 16">
          <path d="M10.478 1.647a.5.5 0 1 0-.956-.294l-4 13a.5.5 0 0 0 .956.294l4-13zM4.854 4.146a.5.5 0 0 1 0 .708L1.707 8l3.147 3.146a.5.5 0 0 1-.708.708l-3.5-3.5a.5.5 0 0 1 0-.708l3.5-3.5a.5.5 0 0 1 .708 0zm6.292 0a.5.5 0 0 0 0 .708L14.293 8l-3.147 3.146a.5.5 0 0 0 .708.708l3.5-3.5a.5.5 0 0 0 0-.708l-3.5-3.5a.5.5 0 0 0-.708 0z"/>
        </svg>
      </button>

      <button id="enterBlogModeButton" type="button" class="modeButton" title="Blog View">
        <!-- icon url: https://icons.getbootstrap.com/icons/file-richtext/ -->
        <svg width="32" height="32" viewBox="0 0 16 16" class="bi bi-journal-richtext" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 1h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2h1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1H2a2 2 0 0 1 2-2z" />
          <path d="M2 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H2zm0 3v-.5a.5.5 0 0 1 1 0V8h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H2zm0 3v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H2z" />
          <path fillRule="evenodd" d="M5 11.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5zm0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm1.639-4.208l1.33.886 1.854-1.855a.25.25 0 0 1 .289-.047L11 4.75V7a.5.5 0 0 1-.5.5h-5A.5.5 0 0 1 5 7v-.5s1.54-1.274 1.639-1.208zM6.75 4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5z" />
        </svg>
      </button>      
      <st-options-menu></st-options-menu>
    </div>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    if(this.activeMode === 'code') {
      this.updateToCodeMode();
    } else {
      this.updateToBlogMode();
    }

    this.updatePlaybackTitle(this.playbackTitle);    

    const enterCodeModeButton = this.shadowRoot.querySelector('#enterCodeModeButton');
    enterCodeModeButton.addEventListener('click', this.updateToCodeMode);

    const enterBlogModeButton = this.shadowRoot.querySelector('#enterBlogModeButton');
    enterBlogModeButton.addEventListener('click', this.updateToBlogMode);
  }

  disconnectedCallback() {
    const enterCodeModeButton = this.shadowRoot.querySelector('#enterCodeModeButton');
    enterCodeModeButton.removeEventListener('click', this.updateToCodeMode);

    const enterBlogModeButton = this.shadowRoot.querySelector('#enterBlogModeButton');
    enterBlogModeButton.removeEventListener('click', this.updateToBlogMode);
  }


  updatePlaybackTitle(newTitle) {
    //update title
    const playbackTitle = this.shadowRoot.querySelector('.playbackTitle');
    playbackTitle.innerHTML = newTitle;
  }

  updateToCodeMode = () => { //anon fn because it is used as an event handler
    //update the look of the selected button
    const enterCodeModeButton = this.shadowRoot.getElementById('enterCodeModeButton');
    const enterBlogModeButton = this.shadowRoot.getElementById('enterBlogModeButton');    
    enterCodeModeButton.classList.remove('activeModeButton');
    enterBlogModeButton.classList.add('activeModeButton');
    
    //notify the app of the mode change
    this.notifyModeSelected('code');
  }

  updateToBlogMode = () => { //anon fn because it is used as an event handler
    //update the look of the selected button
    const enterCodeModeButton = this.shadowRoot.getElementById('enterCodeModeButton');
    const enterBlogModeButton = this.shadowRoot.getElementById('enterBlogModeButton');    
    enterBlogModeButton.classList.remove('activeModeButton');
    enterCodeModeButton.classList.add('activeModeButton');
    
    //notify the app of the mode change
    this.notifyModeSelected('blog');
  }

  displaySearchResults(searchResults) {
    //send the number of comments shown and total to the search bar
    const titleBar = this.shadowRoot.querySelector('st-search-bar');
    titleBar.displaySearchResults(searchResults.length, this.playbackEngine.flattenedComments.length);
  }

  notifyModeSelected(newMode) {
    const event = new CustomEvent('mode-change', { 
      detail: {mode: newMode}, 
      bubbles: true, 
      composed: true 
    });
    this.dispatchEvent(event);
  }
}

window.customElements.define('st-title-bar', TitleBar);