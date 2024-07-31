class AIPromptInput extends HTMLElement {
  constructor(playbackEngine, sendResponseAsEvent=false, sinceLastCommentPrompt = 'Describe how the code has changed.', allTimePrompt = 'Describe this code.') {
    super();

    this.playbackEngine = playbackEngine;
    this.sendResponseAsEvent = sendResponseAsEvent;
    this.sinceLastCommentPrompt = sinceLastCommentPrompt;
    this.allTimePrompt = allTimePrompt;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
        }

        hr {
          border: none;
          border-top: 1px solid darkgray;
        }

        #submitChatButton {
          background-color: lightgrey;
          color: black;
          border: 1px solid lightgrey;
          border-radius: .25rem;
          padding: 5px;
          margin: 5px;
          width: 70%;
          display: block;
          margin-left: auto;
          margin-right: auto;

          transition: color .15s ease-in-out, background-color .15s ease-in-out, border-color .15s ease-in-out, box-shadow .15s ease-in-out;
        }

        #inputText {
          min-height: 100px;
          padding: 5px;
          color: lightgrey;
          outline: none;
          border: 1px solid grey;
          overflow-y: scroll;
          word-wrap: break-word;
          scrollbar-width: thin;
          resize: vertical;
        }

        .questionText {
          font-style: italic;
        }

        .responseText {
          margin: 10px;
        }
      </style>
      <div>
        <input type="checkbox" id="sinceLastCommentOnly" name="sinceLastCommentOnly" checked>
        <label for="sinceLastCommentOnly">Since the last comment only</label>
        <div id="inputText" contenteditable="true">${this.sinceLastCommentPrompt}</div>
        <button id="submitChatButton">Submit Your Question</button>
        <div class="aiResponse"></div> 
      </div>
    `;
  }

  connectedCallback() {
    const submitChatButton = this.shadowRoot.querySelector('#submitChatButton');
    submitChatButton.addEventListener('click', this.submitText);

    const checkbox = this.shadowRoot.querySelector('#sinceLastCommentOnly');
    checkbox.addEventListener('change', this.toggleLastComment);

    const inputText = this.shadowRoot.querySelector('#inputText');
    inputText.addEventListener('keydown', this.ignoreKeyboardControls);
  }

  disconnectedCallback() {
    const submitChatButton = this.shadowRoot.querySelector('#submitChatButton');
    submitChatButton.removeEventListener('click', this.submitText);

    const checkbox = this.shadowRoot.querySelector('#sinceLastCommentOnly');
    checkbox.removeEventListener('change', this.toggleLastComment);

    const inputText = this.shadowRoot.querySelector('#inputText');
    inputText.removeEventListener('keydown', this.ignoreKeyboardControls);  
  }

  toggleLastComment = (event) => {
    const checkbox = this.shadowRoot.querySelector('#sinceLastCommentOnly');
    const inputText = this.shadowRoot.querySelector('#inputText');
    if (checkbox.checked) {
      //if other default is set or the box is empty
      if(inputText.textContent.trim() === this.allTimePrompt || inputText.textContent.trim() === "") {
        //set the default prompt
        inputText.textContent = this.sinceLastCommentPrompt;
      } //else- user has something typed in, keep it
    } else {
      //if other default is set or the box is empty
      if(inputText.textContent.trim() === this.sinceLastCommentPrompt || inputText.textContent.trim() === "") {
        //set the default prompt
        inputText.textContent = this.allTimePrompt;
      } //else- user has something typed in, keep it
    }
  }

  ignoreKeyboardControls = (event) => {
    //consume keyboad events while typing the question
    event.stopImmediatePropagation();
  }

  submitText = async () => {
    const inputText = this.shadowRoot.querySelector('#inputText');
    const sinceLastCommentCheckbox = this.shadowRoot.querySelector('#sinceLastCommentOnly');
    const submitChatButton = this.shadowRoot.querySelector('#submitChatButton');

    let codeFromPlayback = this.playbackEngine.getMostRecentFileEdits(sinceLastCommentCheckbox.checked);

    //add prompt from user
    const promptWithCode = `${codeFromPlayback}\n\nBriefly respond to this prompt.\n\n${inputText.innerText}`;
    
    let promptObject = {
      requestType: "Ask",
      prompt: promptWithCode,
      playbackViewId: document.body.dataset.playbackViewId ? document.body.dataset.playbackViewId : null
    };

    submitChatButton.textContent = 'Generating response...';
    //make the submitChatButton disabled
    submitChatButton.setAttribute('disabled', 'true');
    inputText.setAttribute('contenteditable', 'false');
    sinceLastCommentCheckbox.setAttribute('disabled', 'true');

    //send the formatted one to the server
    const serverProxy = new ServerProxy();
    const responseObject = await serverProxy.sendAIPromptToServer(promptObject);

    submitChatButton.textContent = 'Submit Another Question';
    submitChatButton.removeAttribute('disabled');
    inputText.setAttribute('contenteditable', 'true');
    inputText.focus();
    sinceLastCommentCheckbox.removeAttribute('disabled');

    if(responseObject.error) {
      const aiResponse = this.shadowRoot.querySelector('.aiResponse');
      aiResponse.textContent = responseObject.response;
    } else {
      const md = markdownit();  

      if(this.sendResponseAsEvent) {
        const event = new CustomEvent('ai-prompt-response', {
          detail: {
            prompt: inputText.innerText,
            response: md.render(responseObject.response)
          },
          bubbles: true,
          composed: true
        });
        this.dispatchEvent(event);
      } else {
        const answeredQuestion = document.createElement('div');
        answeredQuestion.appendChild(document.createElement('hr'));

        const questionElement = document.createElement('div');
        questionElement.classList.add('questionText');
        questionElement.textContent = inputText.innerText;
        answeredQuestion.appendChild(questionElement);

        const responseElement = document.createElement('div');
        responseElement.classList.add('responseText');
        responseElement.innerHTML = md.render(responseObject.response);
        answeredQuestion.appendChild(responseElement);

        const aiResponse = this.shadowRoot.querySelector('.aiResponse');
        aiResponse.prepend(answeredQuestion);
      } 
    }
  } 
}

window.customElements.define('st-ai-prompt-input', AIPromptInput);