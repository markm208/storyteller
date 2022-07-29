class BlogCodeSnippet extends HTMLElement {
  constructor(comment, editorProperties) {
    super();

    this.comment = comment;
    this.editorProperties = editorProperties;
    this.aceEditor = null;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 10px;
        }

        .fileName {
          color: gray;
        }

        .blogSelectedCodeHighlight {
          background-color: rgb(199, 224, 241); 
          opacity: 0.17;
          position: absolute;
        }
      </style>

      <div class="fileName"></div>
      <div class="codeSnippet"></div>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    //create all of the selected code markers for this code snippet
    let allMarkers = [];
    //used for determining how many lines to display in the snippet
    let minRowHighlight = Number.MAX_SAFE_INTEGER;
    let maxRowHighlight = Number.MIN_SAFE_INTEGER;

    //for each selected code block
    this.comment.selectedCodeBlocks.forEach(commentBlock => {
      //store the min and max line numbers from the selected code
      if (commentBlock.startRow < minRowHighlight) {
        minRowHighlight = commentBlock.startRow;
      }
      if (commentBlock.endRow > maxRowHighlight) {
        maxRowHighlight = commentBlock.endRow;
      }

      //add the selected code marker
      allMarkers.push({
        startRow: commentBlock.startRow,
        startColumn: commentBlock.startColumn,
        endRow: commentBlock.endRow,
        endColumn: commentBlock.endColumn,
        type: "text",
        className: "blogSelectedCodeHighlight"
      });
    });

    //calculate the start and end line numbers and the total number of lines
    const snippetStartLineNumber = minRowHighlight - Number.parseInt(this.comment.linesAbove);
    const snippetEndLineNumber = maxRowHighlight + Number.parseInt(this.comment.linesBelow);
    let numLines = snippetEndLineNumber - snippetStartLineNumber + 1;

    //create the editor with the code snippet
    const codeSnippet = this.shadowRoot.querySelector('.codeSnippet');
    this.aceEditor = ace.edit(codeSnippet, {
      theme: this.editorProperties.aceTheme,
      mode: this.getEditorModeForFilePath(this.comment.currentFilePath),
      value: this.comment.viewableBlogText,
      showPrintMargin: false,
      readOnly: true,
      fontSize: this.editorProperties.fontSize,
      firstLineNumber: snippetStartLineNumber + 1,
      maxLines: numLines,
      highlightActiveLine: false,
      highlightGutterLine: false,
      useWorker: false,
    });

    //go through the markers and highlight them
    allMarkers.forEach(marker => {
      //create a marker in the right range
      const aceRange = new AceRange(marker.startRow - snippetStartLineNumber, marker.startColumn, marker.endRow - snippetStartLineNumber, marker.endColumn);
      this.aceEditor.getSession().addMarker(aceRange, marker.className, marker.type, true);
    });

    //attach the ace editor to the shadow dom
    this.aceEditor.renderer.attachToShadowRoot();
    //hide the cursor
    this.aceEditor.renderer.$cursorLayer.element.style.display = "none";

    //display the file name above the snippet
    const fileName = this.shadowRoot.querySelector('.fileName');
    fileName.innerHTML = this.comment.currentFilePath;
  }

  getEditorModeForFilePath(filePath) {
    let retVal = null;
    //if there is a file path
    if(filePath && filePath.trim()) {
      //if there is NOT an existing file mode for this type of file
      if(!this.editorProperties.fileModes[filePath]) {
        //get the file mode for this file type
        this.editorProperties.fileModes[filePath] = this.editorProperties.modelist.getModeForPath(filePath);
      }
      //set the file mode type
      const fileMode = this.editorProperties.fileModes[filePath];
      retVal = fileMode.mode;
    }
    return retVal;
  }

  highlightSearch(searchText) {
    //if there is any search text to highlight
    if(searchText.trim() !== '') {
      //highlight the text in the editor
      this.aceEditor.findAll(searchText, {
        wrap: true,
        preventScroll: true,
      });
    }
  }
}

window.customElements.define('st-blog-code-snippet', BlogCodeSnippet);