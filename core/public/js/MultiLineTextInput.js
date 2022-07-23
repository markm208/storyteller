class MultiLineTextInput extends HTMLElement {
  constructor(placeholderText, initialText, minHeight) {
    super();
    
    this.placeholderText = placeholderText;
    this.initialText = initialText ? initialText : '';
    this.minHeight = minHeight;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
    <style>
      a:link {
        color: lightblue;
      }
      a:hover {
        opacity: 80%;
      }
      a:visited {
        color: lightblue;
      }

      .inputText {
        height: ${this.minHeight}px;
        min-height: ${this.minHeight}px;
        color: lightgrey;
        outline: none;
        border: 1px solid grey;
        padding: 5px 10px;
        overflow-y: scroll;
        word-wrap: break-word;
        scrollbar-width: thin;
        resize: vertical;
      }

      .inputText::-webkit-scrollbar {
        width: .45em;
        background-color: inherit;
        word-wrap: break-word;
      }
      .inputText::-webkit-scrollbar-thumb {
        background: dimgray;
      }
      .inputText::-webkit-scrollbar-corner {
        background-color: dimgray;
      }

      [contenteditable][placeholder]:empty:before {
        content: attr(placeholder);
        color: gray;
        background-color: transparent;
        font-style: italic;
      }

      .editorControls {
        display: flex;
        width: 100%;
      }
      .editorControl {
        font-size: 1rem;
        padding: 2px 8px;
        margin: 0px;
        background-color: inherit;
        color: lightgray;
        border: 1px solid grey;
        flex-shrink: 1;
        cursor: pointer;
      }
      .editorControl:hover {
        background-color: lightgray;
        border: 1px solid lightgray;
        color: black
      }
      .editorControlTextInput {
        flex: 2;
      }
      .hidden {
        visibility: hidden;
      }
    </style>

    <div>
      <div class="inputText" contenteditable="true" placeholder="${this.placeholderText}"></div>
      <div class="editorControls"></div>
    </div>`;
    return template.content.cloneNode(true);
  }

  connectedCallback() {
    const inputText = this.shadowRoot.querySelector('.inputText');
    if(this.initialText) {
      inputText.innerHTML = this.initialText;
    }
    
    //handle the placeholder text
    inputText.addEventListener('input', event => {
      //check for a mostly empty div
      if(inputText.innerHTML.trim()==='<br>') {
        //make it truly empty
        inputText.innerHTML = '';
      }
    });
    //make the buttons underneath 
    this.buildFormattingButtons();
  }

  disconnectedCallback() {
  }

  buildFormattingButtons() {
    //create the formatting buttons
    const boldButton = document.createElement('button');
    boldButton.setAttribute('id', 'boldButton');
    boldButton.setAttribute('title', 'Bold');
    boldButton.classList.add('editorControl');
    boldButton.innerHTML = '<strong>B</strong>';
    boldButton.addEventListener('click', event => {
      //make the selected text bold
      document.execCommand('styleWithCSS', null, 'true');
      document.execCommand('bold', false, null);
      boldButton.blur();
    });

    const italicButton = document.createElement('button');
    italicButton.setAttribute('id', 'italicButton');
    italicButton.setAttribute('title', 'Italic');
    italicButton.classList.add('editorControl');
    italicButton.innerHTML = '<em>I</em>';
    italicButton.addEventListener('click', event => {
      //make the selected text italic
      document.execCommand('styleWithCSS', null, 'true');
      document.execCommand('italic', false, null);
      italicButton.blur();
    });

    const codeButton = document.createElement('button');
    codeButton.setAttribute('id', 'codeButton');
    codeButton.setAttribute('title', 'Code');
    codeButton.classList.add('editorControl');
    codeButton.innerHTML = '&lt;code/&gt;';
    codeButton.addEventListener('click', event => {
      //make the selected text look like code
      document.execCommand('styleWithCSS', null, 'true');
      document.execCommand('fontName', false, 'Courier');
      codeButton.blur();
    });

    //used to hold a url to make a link
    const urlInput = document.createElement('input');
    urlInput.setAttribute('id', 'urlInput');
    urlInput.setAttribute('type', 'text');
    urlInput.setAttribute('placeholder', 'Enter a URL');
    urlInput.classList.add('editorControlTextInput');
    urlInput.classList.add('hidden');

    //button to toggle and make a link
    const addLink = document.createElement('button');
    addLink.setAttribute('id', 'addLink');
    addLink.setAttribute('title', 'Add a Link');
    addLink.classList.add('editorControl');
    addLink.innerHTML = 'Link';
    addLink.addEventListener('click', event => {
      const urlInput = this.shadowRoot.querySelector('#urlInput');
      //toggle the view of the url input
      //make it so that the user can enter a url
      if(urlInput.classList.contains('hidden')) {
        urlInput.classList.remove('hidden');
        urlInput.focus();
        addLink.innerHTML = 'Add a Link';
      } else { //the user wants to make a link
        urlInput.classList.add('hidden');
        addLink.innerHTML = 'Link';
        //if there is any text in the box
        if(urlInput.value.length > 0) {
          //make the selected text a link
          document.execCommand('styleWithCSS', null, 'true');
          document.execCommand('createLink', false, urlInput.value);
          urlInput.value = '';
          urlInput.blur();
        }
      }
      addLink.blur();
    });

    //add the controls to the editorControls div
    const editorControls = this.shadowRoot.querySelector('.editorControls');
    editorControls.appendChild(boldButton);
    editorControls.appendChild(italicButton);
    editorControls.appendChild(codeButton);
    editorControls.appendChild(addLink);
    editorControls.appendChild(urlInput);
  }

  updateFormattedText(newText) {
    const inputText = this.shadowRoot.querySelector('.inputText');
    inputText.innerHTML = newText;
  }

  getFormattedText() {
    const inputText = this.shadowRoot.querySelector('.inputText');
    return inputText.innerHTML.trim();
  }

  setFocus() {
    const inputText = this.shadowRoot.querySelector('.inputText');
    inputText.focus();
  }
}

window.customElements.define('st-multi-line-text-input', MultiLineTextInput);