class BlogCodeSnippet extends HTMLElement {
  constructor(comment, editorProperties) {
    super();

    this.comment = comment;
    this.editorProperties = editorProperties;

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
          opacity: 0.27;
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
    const aceEditor = ace.edit(codeSnippet, {
      theme: this.editorProperties.aceTheme,
      mode: this.getEditorModeForFilePath(this.comment.currentFilePath),
      value: this.comment.viewableBlogText,
      showPrintMargin: false,
      readOnly: true,
      fontSize: this.editorProperties.fontSize,
      firstLineNumber: snippetStartLineNumber + 1,
      maxLines: numLines,
      highlightActiveLine: false,
      highlightGutterLine: false
    });

    //go through the markers and highlight them
    allMarkers.forEach(marker => {
      //create a marker in the right range
      const aceRange = new AceRange(marker.startRow, marker.startColumn, marker.endRow, marker.endColumn);
      aceEditor.getSession().addMarker(aceRange, marker.className, marker.type, true);
    });

    //attach the ace editor to the shadow dom
    aceEditor.renderer.attachToShadowRoot();
    //hide the cursor
    aceEditor.renderer.$cursorLayer.element.style.display = "none";

    //display the file name above the snippet
    const fileName = this.shadowRoot.querySelector('.fileName');
    fileName.innerHTML = this.comment.currentFilePath;
  }

  getEditorModeForFilePath(filePath) {
    //get the ace mode based on the file path
    const modelist = ace.require("ace/ext/modelist");
    const fileMode = modelist.getModeForPath(filePath);
    return fileMode.mode;
  }
}

window.customElements.define('st-blog-code-snippet', BlogCodeSnippet);