class AIPromptInput extends HTMLElement {
  constructor(playbackEngine, promptButtonText = 'Prompt AI', sinceLastCommentPrompt = 'Describe the how the code has changed.', allTimePrompt = 'Describe this code.') {
    super();

    this.playbackEngine = playbackEngine;
    this.promptButtonText = promptButtonText;
    this.sinceLastCommentPrompt = sinceLastCommentPrompt;
    this.allTimePrompt = allTimePrompt;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .inputContainer {
          width: 100%;
        }

        .inputContainer button {
          margin: 5px;
          padding: 5px;
          width: 100%;
          background-color: transparent;
          color: lightgrey;
          border: 1px solid lightgrey;
          border-radius: .25rem;
          transition: color .15s ease-in-out, background-color .15s ease-in-out, border-color .15s ease-in-out, box-shadow .15s ease-in-out;
          opacity: 0.8;
        }
        
        .inputContainer button:hover {
          opacity: 1.0;
        }

        .inputText {
          width: 100%;
          height: 100px;
          color: lightgrey;
          outline: none;
          border: 1px solid grey;
          overflow-y: scroll;
          word-wrap: break-word;
          scrollbar-width: thin;
          resize: vertical;
        }
      </style>
      <div class="inputContainer">
        <button id="promptButton">${this.promptButtonText}</button>
        <div id="promptContainer" style="display: none;">
          <input type="checkbox" id="sinceLastCommentOnly" name="sinceLastCommentOnly" checked>
          <label for="sinceLastCommentOnly">Since the last comment only</label>
          <div class="inputText" contenteditable="true">${this.sinceLastCommentPrompt}</div>
          <button id="submitButton">Submit</button>
        </div>
      </div>
    `;

    const checkbox = this.shadowRoot.querySelector('#sinceLastCommentOnly');
    const inputText = this.shadowRoot.querySelector('.inputText');

    // Add an event listener to the checkbox
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        inputText.textContent = this.sinceLastCommentPrompt
      } else {
        inputText.textContent = this.allTimePrompt;
      }
    });

    inputText.addEventListener('keydown', event => {
      event.stopImmediatePropagation();
    });
  }

  connectedCallback() {
    const promptButton = this.shadowRoot.querySelector('#promptButton');
    promptButton.addEventListener('click', this.expandInput);
    const submitButton = this.shadowRoot.querySelector('#submitButton');
    submitButton.addEventListener('click', this.submitText);
  }

  disconnectedCallback() {
    const promptButton = this.shadowRoot.querySelector('#promptButton');
    promptButton.removeEventListener('click', this.expandInput);
    const submitButton = this.shadowRoot.querySelector('#submitButton');
    submitButton.removeEventListener('click', this.submitText);
  }

  expandInput = () => {
    const promptContainer = this.shadowRoot.querySelector('#promptContainer');
    if(promptContainer.style.display === 'block') {
      promptContainer.style.display = 'none';
    } else {
      promptContainer.style.display = 'block';
    }
  }

  submitText = () => {
    const inputText = this.shadowRoot.querySelector('.inputText');
    const sinceLastCommentCheckbox = this.shadowRoot.querySelector('#sinceLastCommentOnly');

    let codeFromPlayback = "";

    //describe code from last comment
    if(sinceLastCommentCheckbox.checked) {
      let originalCodeSource;
      let currentCodeSource;
      
      if(this.playbackEngine.mostRecentChanges.endedOnAComment) {
        //use the state at the last two comments
        originalCodeSource = this.playbackEngine.mostRecentChanges.previousCommentState;
        currentCodeSource = this.playbackEngine.mostRecentChanges.currentCommentState;
      } else {
        //use the most recent comment state and the current state of the files
        originalCodeSource = this.playbackEngine.mostRecentChanges.currentCommentState;
        currentCodeSource = this.playbackEngine.editorState.getFiles();
      }
      
      //get only the changed code
      if(this.playbackEngine.newCodeMarkerGenerator) {
        codeFromPlayback = "This is the original code:\n\n";
        
        const changedFiles = this.playbackEngine.newCodeMarkerGenerator.getAllChangedFileIds();
        for(const fileId of changedFiles) {
          //old code
          const filePath = this.playbackEngine.editorState.getFilePath(fileId);
          const codeFromPreviousState = originalCodeSource[fileId];
          if(codeFromPreviousState) {
            codeFromPlayback += `File: ${filePath}\n`;
            codeFromPlayback += codeFromPreviousState;
          }

          //new code
          codeFromPlayback += "\n\nThis is the new code:\n\n";

          for(const fileId of changedFiles) {
            const filePath = this.playbackEngine.editorState.getFilePath(fileId);
            const codeFromCurrentState = currentCodeSource[fileId];
            if(codeFromCurrentState) {
              codeFromPlayback += `File: ${filePath}\n`;
              codeFromPlayback += codeFromCurrentState;
            }
          }
        }
        //add prompt from user
        codeFromPlayback += "\n\n";
        codeFromPlayback += inputText.innerText;
      } 
    } else { //describe all of the code
      //get the code as it is in the editor now
      let currentCodeSource = this.playbackEngine.editorState.getFiles();
      codeFromPlayback = "This is the code:\n\n";
      for(const fileId in currentCodeSource) {
        const filePath = this.playbackEngine.editorState.getFilePath(fileId);
        const codeFromCurrentState = currentCodeSource[fileId];
        codeFromPlayback += `File: ${filePath}\n`;
        codeFromPlayback += codeFromCurrentState;
      }

      //add prompt from user
      codeFromPlayback += "\n\n";
      codeFromPlayback += inputText.innerText;
    }     

    inputText.focus();

    const event = new CustomEvent('ai-prompt-submit', {
      detail: {
        originalPrompt: inputText.innerText,
        promptWithCode: codeFromPlayback
      },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }
}

window.customElements.define('st-ai-prompt-input', AIPromptInput);