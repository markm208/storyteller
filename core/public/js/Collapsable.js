class Collapsable extends HTMLElement {
  constructor(buttonText) {
    super();
    
    this.buttonText = buttonText;
    this.content = null;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
        }

        #expandButton {
          width: 100%;
          margin: 5px;
          padding: 5px;
          background-color: transparent;
          color: lightgrey;
          border: 1px solid lightgrey;
          border-radius: .25rem;
          transition: color .15s ease-in-out, background-color .15s ease-in-out, border-color .15s ease-in-out, box-shadow .15s ease-in-out;
          opacity: 0.8;
        }
        
        #expandButton:hover {
          opacity: 1.0;
        }

        #content {
          display: none;
          margin: 5px;
          width: 100%;
        }
      </style>

      <div class="inputContainer">
        <button id="expandButton">${this.buttonText} ▶</button>
        <div id="content"></div>
      </div>  
    `;
  }

  connectedCallback() {
    const expandButton = this.shadowRoot.querySelector('#expandButton');
    expandButton.addEventListener('click', this.expandInput);
  }

  disconnectedCallback() {
    const expandButton = this.shadowRoot.querySelector('#expandButton');
    expandButton.removeEventListener('click', this.expandInput);
  }

  addContent(content) {
    this.content = content;
    this.shadowRoot.querySelector('#content').appendChild(this.content);
  }

  expandInput = () => {
    const expandButton = this.shadowRoot.querySelector('#expandButton');
    const content = this.shadowRoot.querySelector('#content');
    if(content.style.display === 'block') {
      expandButton.textContent = `${this.buttonText} ▶`;
      content.style.display = 'none';
    } else {
      expandButton.textContent = `${this.buttonText} ▼`;
      content.style.display = 'block';
    }
  }
}

window.customElements.define('st-collapsable', Collapsable);