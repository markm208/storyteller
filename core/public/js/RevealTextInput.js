class RevealTextInput extends HTMLElement {
  constructor(revealButtonText, inputPrompt, submitButtonPrompt, eventName) {
    super();
    
    this.revealButtonText = revealButtonText;
    this.inputPrompt = inputPrompt;
    this.submitButtonPrompt = submitButtonPrompt;
    this.eventName = eventName;

    //this.attachShadow({ mode: 'open' });
    //this.shadowRoot.appendChild(this.getTemplate());
    this.innerHTML = `
      <style>
        .notVisible {
          display: none;
        }
      </style>
      <span>
        <button id="revealButton">${this.revealButtonText}</button>
        <input type="text" id="textInput" class="notVisible" placeholder="${this.inputPrompt}">
        <button id="revealSubmitButton" class="notVisible">${this.submitButtonPrompt}</button>
      </span>`;
  }

  getTemplate() {
    const template = document.createElement('template');
    this.innerHTML = `
      <style>
        .notVisible {
          display: none;
        }

        :host {
          width: 100%;
        }
      </style>
      <span>
        <button id="revealButton">${this.revealButtonText}</button><input type="text" id="textInput" class="notVisible" placeholder="${this.inputPrompt}"><button id="revealSubmitButton" class="notVisible">${this.submitButtonPrompt}</button>
      </span>`;
    return template.content.cloneNode(true);
  }

  connectedCallback() {
    const revealButton = this.querySelector("#revealButton");
    const textInput = this.querySelector("#textInput");
    const revealSubmitButton = this.querySelector("#revealSubmitButton");
    
    revealButton.addEventListener('click', event => {
      if(textInput.classList.contains('notVisible')) {
        textInput.classList.remove('notVisible');
        revealSubmitButton.classList.remove('notVisible');
      } else {
        textInput.classList.add('notVisible');
        revealSubmitButton.classList.add('notVisible');
      }
    });

    revealSubmitButton.addEventListener('click', event => {
      this.sendInputEvent(textInput.value);
      textInput.value = '';
      textInput.classList.add('notVisible');
      revealSubmitButton.classList.add('notVisible');
    });
  }

  disconnectedCallback() {
  }    

  sendInputEvent(textInput) {
    if(textInput.trim() !== '') {
      const event = new CustomEvent(this.eventName, { 
        detail: {textInput: textInput}, 
        bubbles: true, 
        composed: true 
      });
      this.dispatchEvent(event);
    }
  }
}

window.customElements.define('st-reveal-text-input', RevealTextInput);