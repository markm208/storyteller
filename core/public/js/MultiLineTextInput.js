class MultiLineTextInput extends HTMLElement {
  constructor(placeholderText, initialText, minHeight, textFormat="markdown") {
    super();

    this.placeholderText = placeholderText;
    this.initialTextHtml = initialText;
    this.initialTextPlain = initialText;
    this.minHeight = minHeight;
    this.textFormat = textFormat;

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
          background-color: inherit;
          color: lightgrey;
          outline: none;
          border: 1px solid grey;
          padding: 5px 10px;
          margin: 5px;
          width: calc(100% - 32px);
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
          color: black;
        }
        .editorControlTextInput {
          flex: 2;
        }
        .mdControl {
          padding: 0px 5px;
        }
        .hidden {
          //visibility: hidden;
          opacity: 40%;
        }
        .hidden:hover {
          background-color: inherit;
          border: 1px solid inherit;
          color: inherit;
        }
        .markdownMode {
          font-family: monospace;
          white-space: pre-wrap;
        }
        .editorControls.hidden {
          display: none;
        }

        .display-none {
          display: none !important;
        }
      </style>

      <div>
        <div class="inputText htmlEditor" contenteditable="true" placeholder="${this.placeholderText}"></div>
        <div><textarea class="inputText markdownEditor markdownMode display-none" placeholder="${this.placeholderText} (with Markdown)"></textarea></div>
        <div class="editorControls"></div>
      </div>
    `;
    return template.content.cloneNode(true);
  }

  connectedCallback() {
    this.htmlEditor = this.shadowRoot.querySelector(".htmlEditor");
    this.markdownEditor = this.shadowRoot.querySelector(".markdownEditor");
    this.editorControls = this.shadowRoot.querySelector(".editorControls");

    //initialize editor contents
    this.htmlEditor.innerHTML = this.initialTextHtml;
    this.markdownEditor.value = this.initialTextPlain; 
    
    //listen for changes to the html editor
    this.htmlEditor.addEventListener("blur", () => {
      if (this.htmlEditor.innerHTML.trim() === "<br>") {
        this.htmlEditor.innerHTML = "";
      }
    });

    //build formatting buttons
    this.buildFormattingButtons();
    //update the editor visibility
    this.changeTextFormat(this.textFormat);
  }

  disconnectedCallback() {
  }

  changeTextFormat(newFormat) {
    const editorControls = this.shadowRoot.querySelectorAll(".editorControl");
    const mdToggle = this.shadowRoot.querySelector("#mdToggle");
    
    //if in markdown mode, show the markdown editor and hide the html editor
    if (newFormat === "markdown") {
      this.textFormat = newFormat;
      mdToggle.checked = true;
      this.markdownEditor.classList.remove("display-none");
      this.htmlEditor.classList.add("display-none");
      for(let i = 0;i < editorControls.length;i++) {
        editorControls[i].classList.add("hidden");
        editorControls[i].setAttribute("disabled", "true");
      }
      const urlInput = this.shadowRoot.querySelector("#urlInput");
      urlInput.classList.add("display-none");
      mdToggle.title = "Use a WYSISYG Editor";
    } else if(newFormat === "html"){ //html mode
      this.textFormat = newFormat;
      mdToggle.checked = false;
      this.htmlEditor.classList.remove("display-none");
      this.markdownEditor.classList.add("display-none");
      for(let i = 0;i < editorControls.length;i++) {
        editorControls[i].classList.remove("hidden");
        editorControls[i].removeAttribute("disabled");
      }
      mdToggle.title = "Use Markdown";
    }
  }

  buildFormattingButtons() {
    const mdLabel = document.createElement("label");
    mdLabel.classList.add("mdControl");
    mdLabel.title = "Use Markdown";

    const mdToggle = document.createElement("input");
    mdToggle.type = "checkbox";
    mdToggle.id = "mdToggle";
    mdToggle.checked = this.textFormat === "markdown";

    //listen for markdown toggling
    mdToggle.addEventListener("change", () => {
      const newTextFormat = mdToggle.checked ? "markdown" : "html";
      this.changeTextFormat(newTextFormat);
    });

    mdLabel.appendChild(mdToggle);
    mdLabel.appendChild(document.createTextNode("Markdown"));

    //create the formatting buttons
    const boldButton = document.createElement("button");
    boldButton.setAttribute("id", "boldButton");
    boldButton.setAttribute("title", "Bold");
    boldButton.classList.add("editorControl");
    boldButton.innerHTML = "<strong>B</strong>";
    boldButton.addEventListener("click", () => {
      if (this.getTextFormat() !== "markdown") {
        document.execCommand("styleWithCSS", false, true);
        document.execCommand("bold", false, null);
      }
      boldButton.blur();
    });

    const italicButton = document.createElement("button");
    italicButton.setAttribute("id", "italicButton");
    italicButton.setAttribute("title", "Italic");
    italicButton.classList.add("editorControl");
    italicButton.innerHTML = "<em>I</em>";
    italicButton.addEventListener("click", () => {
      if (this.getTextFormat() !== "markdown") {
        document.execCommand("styleWithCSS", false, true);
        document.execCommand("italic", false, null);
      }
      italicButton.blur();
    });

    const codeButton = document.createElement("button");
    codeButton.setAttribute("id", "codeButton");
    codeButton.setAttribute("title", "Code");
    codeButton.classList.add("editorControl");
    codeButton.innerHTML = "&lt;code/&gt;";
    codeButton.addEventListener("click", () => {
      if (this.getTextFormat() !== "markdown") {
        document.execCommand("styleWithCSS", false, true);
        document.execCommand("fontName", false, "Courier");
      }
      codeButton.blur();
    });

    // URL input (hidden by default)
    const urlInput = document.createElement("input");
    urlInput.setAttribute("id", "urlInput");
    urlInput.setAttribute("type", "text");
    urlInput.setAttribute("placeholder", "Enter a URL");
    urlInput.classList.add("editorControlTextInput", "display-none");

    // Button to toggle the URL input and create a link
    const addLink = document.createElement("button");
    addLink.setAttribute("id", "addLink");
    addLink.setAttribute("title", "Add a Link");
    addLink.classList.add("editorControl");
    addLink.innerHTML = "Link";
    addLink.addEventListener("click", () => {
      if (this.getTextFormat() === "markdown") {
        return; //do nothing in Markdown mode
      }
      if (urlInput.classList.contains("display-none")) {
        urlInput.classList.remove("display-none");
        urlInput.focus();
        addLink.innerHTML = "Add a Link";
      } else {
        urlInput.classList.add("display-none");
        addLink.innerHTML = "Link";
        if (urlInput.value.trim()) {
          document.execCommand("styleWithCSS", false, true);
          document.execCommand("createLink", false, urlInput.value.trim());
          urlInput.value = "";
          urlInput.blur();
        }
      }
      addLink.blur();
    });

    //add the controls
    this.editorControls.appendChild(mdLabel);
    this.editorControls.appendChild(boldButton);
    this.editorControls.appendChild(italicButton);
    this.editorControls.appendChild(codeButton);
    this.editorControls.appendChild(addLink);
    this.editorControls.appendChild(urlInput);
  }

  getTextFormat() {
    return this.textFormat;
  }

  getText() {
    let retVal;
    if (this.getTextFormat() === "markdown") {
      //return the markdown text from the textarea
      retVal = this.markdownEditor.value.trim();
    } else {
      //return the full html from the contenteditable div
      retVal = this.htmlEditor.innerHTML.trim();
    }
    return retVal;
  }

  updateText(newText) {
    if (this.getTextFormat() === "markdown") {
      this.markdownEditor.value = newText;
    } else {
      this.htmlEditor.innerHTML = newText;
    }
  }

  setFocus() {
    setTimeout(() => {
      if (this.getTextFormat() === "markdown") {
        this.markdownEditor.focus();
      } else {
        this.htmlEditor.focus();
      }
    }, 0);
  }
}

window.customElements.define('st-multi-line-text-input', MultiLineTextInput);