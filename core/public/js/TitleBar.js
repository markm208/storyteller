class TitleBar extends HTMLElement {
  constructor(activeMode, playbackEngine) {
    super();
    
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
    this.playbackEngine = playbackEngine;

    this.activeMode = activeMode;
    this.playbackTitle = playbackEngine.playbackData.playbackTitle;
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
        <!-- icon url: https://icons.getbootstrap.com/icons/file-code/ -->
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" class="bi bi-file-code" viewBox="0 0 16 16">
          <path d="M6.646 5.646a.5.5 0 1 1 .708.708L5.707 8l1.647 1.646a.5.5 0 0 1-.708.708l-2-2a.5.5 0 0 1 0-.708l2-2zm2.708 0a.5.5 0 1 0-.708.708L10.293 8 8.646 9.646a.5.5 0 0 0 .708.708l2-2a.5.5 0 0 0 0-.708l-2-2z"/>
          <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2zm10-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1z"/>
        </svg>
      </button>

      <button id="enterBlogModeButton" type="button" class="modeButton" title="Blog View">
        <!-- icon url: https://icons.getbootstrap.com/icons/file-richtext/ -->
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" class="bi bi-file-richtext" viewBox="0 0 16 16">
          <path d="M7 4.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm-.861 1.542 1.33.886 1.854-1.855a.25.25 0 0 1 .289-.047l1.888.974V7.5a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V7s1.54-1.274 1.639-1.208zM5 9a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5zm0 2a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1H5z"/>
          <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2zm10-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1z"/>
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

  updateToDisplaySearchResults(searchResults) {
    //send the number of comments shown and total number of comments to the search bar
    const titleBar = this.shadowRoot.querySelector('st-search-bar');
    titleBar.updateToDisplaySearchResults(searchResults.length, this.playbackEngine.getTotalNumberOfComments());
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