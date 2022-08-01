class TitleBar extends HTMLElement {
  constructor(activeMode, playbackEngine) {
    super();

    this.playbackEngine = playbackEngine;
    this.activeMode = activeMode;
    this.playbackTitle = playbackEngine.playbackData.playbackTitle;
    this.readTimeEstimateInMinutes = 0;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
    <style>
      :host {
        background-color: rgb(59,76,98);
        color: rgb(223, 242, 244);
        padding: 2px 10px;
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
        font-size: 1.25rem;
      }

      .stLogo {
        font-size: 1.25rem;
        font-weight: 500;
      }

      .optionsButtonsGroup{
        display: flex;
      }

      #editButton, #doneEditButton {
        opacity: 80%;
        cursor: pointer;
      }
      #editButton:hover, #doneEditButton:hover {
        opacity: 100%;
      }
      #readTime {
        font-size: .8em;
        color: gray;
      }
      .hidden {
        display: none;
      }
    </style>

    <!-- Logo and playback title -->
    <div class="logoTitleCombo">
      <span class="stLogo">Storyteller: </span>
      <span class="playbackTitle"></span>
      <span id="editButton" class="hidden" title="Edit the title of the playback">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16">
          <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
          <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>
        </svg>
      </span>
      <span id="doneEditButton" class="hidden" title="Done editing the title of the playback">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check-square" viewBox="0 0 16 16">
          <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
          <path d="M10.97 4.97a.75.75 0 0 1 1.071 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.235.235 0 0 1 .02-.022z"/>
        </svg>
      </span>
      <span id="readTime"></span>
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
    </div>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    if(this.activeMode === 'code') {
      this.updateToCodeMode();
    } else {
      this.updateToBlogMode();
    }

    //update the estimated read time
    this.updateEstimatedReadTime();

    //set the title
    this.updatePlaybackTitle(this.playbackTitle);  
      
    //prevent normal text editing of the title from firing any keyboard shortcuts
    const playbackTitle = this.shadowRoot.querySelector('.playbackTitle');
    playbackTitle.addEventListener('keydown', event => {
      //if the title is being edited and the user hits the enter key treat that like the end of editing
      if(event.key === 'Enter') {
        this.updateTitleComplete();
      }
      event.stopPropagation();
    });

    //if the title is being edited and the user moves away from the input
    playbackTitle.addEventListener('blur', event => {
      //see if the title is in an editable state
      const isEditable = playbackTitle.getAttribute('contenteditable');
      if(isEditable) {
        this.updateTitleComplete();
      }
    });

    const enterCodeModeButton = this.shadowRoot.querySelector('#enterCodeModeButton');
    enterCodeModeButton.addEventListener('click', this.updateToCodeMode);

    const enterBlogModeButton = this.shadowRoot.querySelector('#enterBlogModeButton');
    enterBlogModeButton.addEventListener('click', this.updateToBlogMode);

    const editButton = this.shadowRoot.querySelector('#editButton');
    editButton.addEventListener('click', this.updateTitleBegin);

    const doneEditButton = this.shadowRoot.querySelector('#doneEditButton');
    doneEditButton.addEventListener('click', this.updateTitleComplete);

    //if this is an editable playback
    if(this.playbackEngine.playbackData.isEditable) {
      //make the edit button visible
      editButton.classList.remove('hidden');
    }
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
    playbackTitle.setAttribute('title', `Estimated read time is about ${this.readTimeEstimateInMinutes} minutes.`);
  }

  updateEstimatedReadTime() {
    //get the updated read time
    this.readTimeEstimateInMinutes = this.playbackEngine.getReadTimeEstimate();

    //display the read time for 10 seconds
    const readTime = this.shadowRoot.querySelector('#readTime');
    readTime.classList.remove('hidden');
    readTime.innerHTML = `Estimated read time is about ${this.readTimeEstimateInMinutes} minutes`;
    setTimeout(() => {
      readTime.classList.add('hidden');
    }, 10000);

    //update the estimate in the hover text of the title
    const playbackTitle = this.shadowRoot.querySelector('.playbackTitle');
    playbackTitle.setAttribute('title', `Estimated read time is about ${this.readTimeEstimateInMinutes} minutes.`);
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
  
  updateForAddEditDeleteComment() {
    //update the estimated read time
    this.updateEstimatedReadTime();
  }

  updateToDisplaySearchResults(searchText, searchResults) {
    //send the number of comments shown and total number of comments to the search bar
    const searchBar = this.shadowRoot.querySelector('st-search-bar');
    searchBar.updateToDisplaySearchResults(searchResults.numberOfResults, this.playbackEngine.commentInfo.totalNumberOfComments, searchText);
  }

  updateToEnableSearch() {
    const searchBar = this.shadowRoot.querySelector('st-search-bar');
    searchBar.updateToEnableSearch();
  }

  updateToDisableSearch() {
    const searchBar = this.shadowRoot.querySelector('st-search-bar');
    searchBar.updateToDisableSearch();
  }

  updateTitleBegin = event => {
    //toggle the edit buttons
    const editButton = this.shadowRoot.querySelector('#editButton');
    editButton.classList.add('hidden');

    const doneEditButton = this.shadowRoot.querySelector('#doneEditButton');
    doneEditButton.classList.remove('hidden');

    //make the title editable
    const playbackTitle = this.shadowRoot.querySelector('.playbackTitle');
    playbackTitle.setAttribute('contenteditable', 'true');
    playbackTitle.focus();
  }

  updateTitleComplete = event => {
    //toggle the edit buttons
    const editButton = this.shadowRoot.querySelector('#editButton');
    editButton.classList.remove('hidden');
    const doneEditButton = this.shadowRoot.querySelector('#doneEditButton');
    doneEditButton.classList.add('hidden');

    //prevent future editing
    const playbackTitle = this.shadowRoot.querySelector('.playbackTitle');
    playbackTitle.setAttribute('title', `Estimated read time is about ${this.readTimeEstimateInMinutes} minutes.`);
    playbackTitle.removeAttribute('contenteditable');
    playbackTitle.blur();

    //if there is anything left in the title notify of a change AND the title is different than the original
    if(playbackTitle.textContent.trim().length > 0 && this.playbackTitle !== playbackTitle.textContent.trim()) {
      this.notifyTitleChange();
    } else { //there's nothing left in the title
      //go back to the original title
      playbackTitle.textContent = this.playbackTitle;
    }
  }

  notifyModeSelected(newMode) {
    const event = new CustomEvent('mode-change', { 
      detail: {mode: newMode}, 
      bubbles: true, 
      composed: true 
    });
    this.dispatchEvent(event);
  }

  notifyTitleChange() {
    //remove any spaces around the new title
    const playbackTitle = this.shadowRoot.querySelector('.playbackTitle');
    this.playbackTitle = playbackTitle.textContent.trim();
    playbackTitle.innerHTML = this.playbackTitle;
    
    //send an event that the title has changed
    const event = new CustomEvent('title-change', { 
      detail: {newTitle: playbackTitle.textContent }, 
      bubbles: true, 
      composed: true 
    });
    this.dispatchEvent(event);
  }
}

window.customElements.define('st-title-bar', TitleBar);