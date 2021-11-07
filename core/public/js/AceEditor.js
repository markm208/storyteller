class AceEditor extends HTMLElement {
  constructor(aceEditorData) {
    super();

    this.editorProperties = aceEditorData.editorProperties;
    this.playbackEngine = aceEditorData.playbackEngine;
    this.aceEditor = null;

    //old line numbers need to be removed before adding new ones from a comment
    this.insertLineNumbers = [];
    this.deleteLineNumbers = [];
    this.markers = [];

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host {
          height: 100%;
        }

        .editor {
          display: flex;
          flex-direction: column;
          height:  calc(100% - 25px);
        }

        .selectedCodeHighlight {
          background-color: rgb(199, 224, 241); 
          opacity: 0.17;
          position: absolute;
        }

        .surroundingCodeHighlight {
          background-color: rgb(158, 172, 182);
          opacity: 0.03;
          position: absolute;
        }

        .newCodeHighlight {
          position:absolute;
          z-index:10; 
          opacity: 0.6;
          border-bottom-style: dotted;
          border-bottom-width: 3px;
          border-bottom-color: rgb(33, 130, 36);
          border-bottom-left-radius: 0px;
          border-bottom-right-radius: 0px;
        }

        .insertOnLine {
          color: rgb(33, 130, 36);
          font-weight: bold;
        }

        .deleteOnLine {
          text-decoration-line: underline;
          text-decoration-color: red;
          text-decoration-style: solid;
        }
      </style>

      <div class="fileTabs"></div>
      <div class="editor"></div>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    //create the file tabs
    const fileTabs = this.shadowRoot.querySelector('.fileTabs');
    const editorFileTabs = new EditorFileTabs(this.playbackEngine);
    fileTabs.appendChild(editorFileTabs);
    
    //create the ace editor
    const editor = this.shadowRoot.querySelector('.editor');
    const aceEditor = ace.edit(editor, {
      theme: this.editorProperties.aceTheme, 
      value: '',
      showPrintMargin: false,
      readOnly: true,
      fontSize: this.editorProperties.fontSize,
      highlightActiveLine: false,
      highlightGutterLine: false,
      scrollPastEnd: true,
      minLines: 1,
      useWorker: false,
    });

    //attach the ace editor to the shadow dom
    aceEditor.renderer.attachToShadowRoot();
    aceEditor.renderer.$cursorLayer.element.style.display = "none";
    
    //store for later
    this.aceEditor = aceEditor;

    //update the editor with the initial file contents
    this.update();
  }

  disconnectedCallback() {
  }

  update() {
    if(this.playbackEngine.requiresUpdating.fileSystem || this.playbackEngine.requiresUpdating.activeFile) {
      //update any changes to the file tabs
      const editorFileTabs = this.shadowRoot.querySelector('st-editor-file-tabs');
      editorFileTabs.createFileTabs();
    }

    //update the code in the editor
    if(this.playbackEngine.activeFileId) {
      //get the file contents and load it into ace
      const fileContents = this.playbackEngine.editorState.getFile(this.playbackEngine.activeFileId);
      this.aceEditor.getSession().setValue(fileContents);
      
      //use the file extension for syntax highlighting
      const filePath = this.playbackEngine.editorState.getFilePath(this.playbackEngine.activeFileId);
      this.aceEditor.getSession().setMode(this.getEditorModeForFilePath(filePath));

      //go through the markers and highlight them
      this.addMarkers();
    }
  }

  getEditorModeForFilePath(filePath) {
    const modelist = ace.require("ace/ext/modelist");
    const fileMode = modelist.getModeForPath(filePath);
    return fileMode.mode;
  }

  addMarkers() {
    //remove any old markers
    this.markers.forEach(oldMarkerId => {
      this.aceEditor.getSession().removeMarker(oldMarkerId);
    });

    //highlight changes in the line numbers
    this.addLineNumberHighlights();

    //get the comment markers (selected code and surrounding code)
    let commentMarkers = [];
    if(this.playbackEngine.activeComment.pausedOnComment) {
      commentMarkers = this.getCommentMarkers();
    }
    //get the new code markers
    const newCodeMarkers = this.getNewCodeMarkers();
    
    //combine all the markers
    const allMarkers = commentMarkers.concat(newCodeMarkers);
    //go through the markers and highlight them
    allMarkers.forEach(marker => {
      //create a marker in the right range
      const aceRange = new AceRange(marker.startRow, marker.startCol, marker.endRow, marker.endCol);
      const newMarker = this.aceEditor.getSession().addMarker(aceRange, marker.className, marker.type, true);
      
      //store to remove them later
      this.markers.push(newMarker);
    });
  }

  getCommentMarkers() {
    const allMarkers = [];
    //used for surrounding context highlights
    let minRowHighlight = Number.MAX_SAFE_INTEGER;
    let maxRowHighlight = Number.MIN_SAFE_INTEGER;

    //go through each selected code block in the active comment
    let commentBlocks = this.playbackEngine.activeComment.comment.selectedCodeBlocks;
    commentBlocks.forEach(commentBlock => {
      if (commentBlock.fileId === this.playbackEngine.activeFileId) {
        //record the min/max row number for the highlighted code
        if (commentBlock.startRow < minRowHighlight) {
          minRowHighlight = commentBlock.startRow;
        }
        if (commentBlock.endRow > maxRowHighlight) {
          maxRowHighlight = commentBlock.endRow;
        }
        //add the selected code markers
        allMarkers.push({
          startRow: commentBlock.startRow,
          startCol: commentBlock.startColumn,
          endRow: commentBlock.endRow,
          endCol: commentBlock.endColumn,
          type: "text",
          className: "selectedCodeHighlight"
        });
      }
    });

    //if there were any selected code blocks add the surrounding context highlight
    if (commentBlocks.length > 0) {
      //get the user specified line numbers above the smallest row number and below the largest row
      const linesAboveHighlight = minRowHighlight - Number.parseInt(this.playbackEngine.activeComment.comment.linesAbove);
      const linesBelowHighlight = maxRowHighlight + Number.parseInt(this.playbackEngine.activeComment.comment.linesBelow);
      
      allMarkers.push({
        startRow: linesAboveHighlight,
        startCol: 0,
        endRow: linesBelowHighlight,
        endCol: Number.MAX_SAFE_INTEGER,
        type: "fullLine",
        className: "surroundingCodeHighlight"
      });
    }

    return allMarkers;
  }

  getNewCodeMarkers() {
    const allMarkers = [];
    
    //get the new code markers
    const newCodeMarkers = this.playbackEngine.getNewCodeMarkers();

    //new code markers, new code is highlighted from the last pause point
    if (newCodeMarkers) {
      const activeFileNewCodeMarkers = newCodeMarkers.allNewCodeMarkers;
      if (activeFileNewCodeMarkers) {
        //add the new code highlight markers
        activeFileNewCodeMarkers.forEach(newCodeMarker => {
          allMarkers.push({
            startRow: newCodeMarker.startRow,
            startCol: newCodeMarker.startColumn,
            endRow: newCodeMarker.endRow,
            endCol: newCodeMarker.endColumn,
            type: "text",
            className: "newCodeHighlight"
          });
        });
      }
    }
    return allMarkers;
  }

  addLineNumberHighlights() {
    //get the new code markers
    const newCodeMarkers = this.playbackEngine.getNewCodeMarkers();

    //remove the old insert/delete line numbers
    this.insertLineNumbers.forEach(lineNumber => {
      this.aceEditor.getSession().removeGutterDecoration(lineNumber, "insertOnLine");
    });
    this.deleteLineNumbers.forEach(lineNumber => {
      this.aceEditor.getSession().removeGutterDecoration(lineNumber, "deleteOnLine");
    });
    this.insertLineNumbers = [];
    this.deleteLineNumbers = [];
    
    //if there are new code markers add the line number decoration
    if(newCodeMarkers) {
      newCodeMarkers.allInsertLineNumbers.forEach(lineNumber => {
        this.aceEditor.getSession().addGutterDecoration(lineNumber, "insertOnLine");
      });

      newCodeMarkers.allDeleteLineNumbers.forEach(lineNumber => {
        this.aceEditor.getSession().addGutterDecoration(lineNumber, "deleteOnLine");
      });
      this.insertLineNumbers = newCodeMarkers.allInsertLineNumbers;
      this.deleteLineNumbers = newCodeMarkers.allDeleteLineNumbers;
    }
  }
}

window.customElements.define('st-ace-editor', AceEditor);