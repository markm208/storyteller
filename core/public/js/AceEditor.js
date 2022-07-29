class AceEditor extends HTMLElement {
  constructor(playbackEngine, editorProperties) {
    super();

    this.editorProperties = editorProperties;
    this.playbackEngine = playbackEngine;
    this.aceEditor = null;
    this.searchText = '';

    //old line numbers need to be removed before adding new ones from a comment
    this.insertLineNumbers = [];
    this.deleteLineNumbers = [];
    this.markers = [];
    this.selectedCodeBlockMarkerIds = [];
    this.newCodeMarkerIds = [];
    this.surroundingTextMarker = null;
    this.linesAboveSelection = 0;
    this.linesBelowSelection = 0;

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

        .ace_scrollbar {
          scrollbar-width: thin;
        }
        .ace_scrollbar::-webkit-scrollbar {
          width: .65em;
          background-color: inherit;
        }
        .ace_scrollbar::-webkit-scrollbar-thumb {
          background: dimgray;
        }

        .editor {
          display: flex;
          flex-direction: column;
          height:  calc(100% - 25px);
        }

        .selectedCodeHighlight {
          background-color: rgb(199, 224, 241);
          opacity: 0.14;
          position: absolute;
        }

        .surroundingCodeHighlight {
          background-color: rgb(158, 172, 182);
          opacity: 0.04;
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
    this.updateForPlaybackMovement();
  }

  disconnectedCallback() {
  }
  
  updateForCommentSelected() {
    //highlight any selected code from the selected comment
    this.addSelectedCodeAndSurroundingTextMarkers();
    //if there is an active search highlight the code
    this.highlightSearch();
  }

  updateForPlaybackMovement() {
    //update any changes to the file tabs
    const editorFileTabs = this.shadowRoot.querySelector('st-editor-file-tabs');
    editorFileTabs.createFileTabs();

    //update the code in the editor
    if(this.playbackEngine.activeFileId) {
      //get the file contents and load it into ace
      const fileContents = this.playbackEngine.editorState.getFile(this.playbackEngine.activeFileId);
      this.aceEditor.getSession().setValue(fileContents);
      
      //use the file extension for syntax highlighting
      const filePath = this.playbackEngine.editorState.getFilePath(this.playbackEngine.activeFileId);
      
      //if there is a file path
      if(filePath && filePath.trim()) { 
        //if there is NOT an existing file mode for this type of file
        if(!this.editorProperties.fileModes[filePath]) {
          //get the file mode for this file type
          this.editorProperties.fileModes[filePath] = this.editorProperties.modelist.getModeForPath(filePath);
        }
        //set the file mode type
        const fileMode = this.editorProperties.fileModes[filePath];
        this.aceEditor.getSession().setMode(fileMode.mode);
      }

      //scroll to the most recent line number to show the latest code
      if(this.playbackEngine.mostRecentChanges.fileEditLineNumber > 0) {
        this.aceEditor.scrollToLine(this.playbackEngine.mostRecentChanges.fileEditLineNumber, true, true);
      }

      //go through the markers and highlight them
      this.addChangedCodeMarkers();
    }
    //if there is an active search highlight the code
    this.highlightSearch();
  }

  updateEditorFontSize(newFontSize) {
    //update the font of the editor
    this.aceEditor.setFontSize(newFontSize);
  }

  updateHandleTextSelection(makeCodeSelectable, isEditedComment) {
    //if the code is being made selectable to highlight above/below lines
    if(makeCodeSelectable) {
      //add a listener to get changes in the selected text
      this.aceEditor.on('changeSelection', this.handleSelectionLinesAboveBelow);
      
      //remove any previous selected code
      this.clearSelectedCodeMarkers();
      this.clearSurroundingTextMarker();

      //if there is a comment with selected code
      if(isEditedComment && this.playbackEngine.activeComment && this.playbackEngine.activeComment.selectedCodeBlocks.length > 0) {
        //replace a comment's selected code blocks with actual ace selections
        this.playbackEngine.activeComment.selectedCodeBlocks.forEach(selectedCodeBlock => {
          const aceRange = new AceRange(selectedCodeBlock.startRow, selectedCodeBlock.startColumn, selectedCodeBlock.endRow, selectedCodeBlock.endColumn);
          this.aceEditor.getSelection().setSelectionRange(aceRange, false);
        });
        //update the lines above/below
        this.linesAboveSelection = this.playbackEngine.activeComment.linesAbove;
        this.linesBelowSelection = this.playbackEngine.activeComment.linesBelow;

        //highlight the code around the new selections
        this.handleSelectionLinesAboveBelow();
      } else { //no commment or no selected code
        //update the lines above/below to zero
        this.linesAboveSelection = 0;
        this.linesBelowSelection = 0;
      }
    } else { //the above/below highlighting is being turned off
      //remove a listener to get changes in the selected text
      this.aceEditor.off('changeSelection', this.handleSelectionLinesAboveBelow);
      //get rid of any selected context
      this.clearSurroundingTextMarker();
      this.clearSelectedCode();
    }
  }

  handleSelectionLinesAboveBelow = () => {
    //get the selected text (there might be multiple highlighted ranges)
    const selection = this.aceEditor.getSelection();
    const ranges = selection.getAllRanges();

    //if there is anything selected in the editor
    if(ranges.length > 0 && ranges.some(currentRange => currentRange.isEmpty() === false)) {
      //get the min and max line numbers where there is selected text
      let lowestLineNumber = Number.MAX_SAFE_INTEGER;
      let highestLineNumber = 0;
      ranges.forEach(range => {
        if(range.isEmpty() === false) {
          //store the smallest line number
          if(range.start.row < lowestLineNumber) {
            lowestLineNumber = range.start.row;
          }
          //store the largest line number
          if(range.end.row > highestLineNumber) {
            highestLineNumber = range.end.row
          }
        }
      });
      //create the surrounding text context markers
      const startLineNumber = lowestLineNumber - this.linesAboveSelection;
      const endLineNumber = highestLineNumber + this.linesBelowSelection;
      this.addSurroundingTextMarker(startLineNumber, endLineNumber);
    } else {
      this.clearSurroundingTextMarker();
      this.clearSelectedCodeMarkers();
    }
  }

  updateLinesAboveBelow(linesAbove, linesBelow) {
    //the user has changed the lines above/below, update the instance data
    this.linesAboveSelection = linesAbove;
    this.linesBelowSelection = linesBelow;

    //redraw the context markers
    this.handleSelectionLinesAboveBelow();
  }

  addChangedCodeMarkers() {
    //clear any recent markers
    this.clearInsertLineMarkers();
    this.clearDeleteLineMarkers();
    this.clearNewCodeMarkers();

    //highlight changes in the line numbers
    this.addInsertLineMarkers();
    this.addDeleteLineMarkers();

    //highlight the new code
    this.addNewCodeMarkers();
  }

  addSelectedCodeAndSurroundingTextMarkers() {
    //clear any old results
    this.clearSelectedCodeMarkers();
    this.clearSurroundingTextMarker();

    //if there is an active comment that has selected code highlights, highlight the code and surrounding text
    if(this.playbackEngine.activeComment && this.playbackEngine.activeComment.selectedCodeBlocks.length > 0) {
      //if the selected code is in the active file then add the highlights
      if(this.playbackEngine.activeComment.selectedCodeBlocks[0].fileId === this.playbackEngine.activeFileId) {
        //highlight the selected code
        this.addSelectedCodeMarkers();

        //add the surrounding highlights
        this.linesAboveSelection = this.playbackEngine.activeComment.linesAbove;
        this.linesBelowSelection = this.playbackEngine.activeComment.linesBelow;
        const startLineNumber = this.playbackEngine.activeComment.selectedCodeBlocks[0].startRow - this.playbackEngine.activeComment.linesAbove;
        const endLineNumber = this.playbackEngine.activeComment.selectedCodeBlocks[this.playbackEngine.activeComment.selectedCodeBlocks.length - 1].endRow + this.playbackEngine.activeComment.linesBelow;
        this.addSurroundingTextMarker(startLineNumber, endLineNumber);
      }
      //scroll to the highlighted code
      const scrollToLine = this.playbackEngine.activeComment.selectedCodeBlocks[0].startRow;
      this.aceEditor.scrollToLine(scrollToLine, true, true);
    }
  }

  addSelectedCodeMarkers() {
    //go through each selected code block in the active comment
    this.playbackEngine.activeComment.selectedCodeBlocks.forEach(selectedCodeBlock => {
      if (selectedCodeBlock.fileId === this.playbackEngine.activeFileId) {
        //add the selected code markers and store its id for later removal
        const aceRange = new AceRange(selectedCodeBlock.startRow, selectedCodeBlock.startColumn, selectedCodeBlock.endRow, selectedCodeBlock.endColumn);
        const newMarkerId = this.aceEditor.getSession().addMarker(aceRange, 'selectedCodeHighlight', 'text', true);
        this.selectedCodeBlockMarkerIds.push(newMarkerId);
      }
    });
  }

  clearSelectedCodeMarkers() {
    //remove all the code block markers
    this.selectedCodeBlockMarkerIds.forEach(markerId => {
      this.aceEditor.getSession().removeMarker(markerId);
    });
    this.selectedCodeBlockMarkerIds = [];
  }

  addSurroundingTextMarker(startLineNumber, endLineNumber) {
    //clear any existing surrounding text
    this.clearSurroundingTextMarker();

    //create a marker in the right range
    const aceRange = new AceRange(startLineNumber, 0, endLineNumber, Number.MAX_SAFE_INTEGER);
    this.surroundingTextMarker = this.aceEditor.getSession().addMarker(aceRange, "surroundingCodeHighlight", "fullLine", true);
  }

  clearSurroundingTextMarker() {
    //if there is currently a context marker, get rid of it
    if(this.surroundingTextMarker) {
      this.aceEditor.getSession().removeMarker(this.surroundingTextMarker);
      this.surroundingTextMarker = null;
    }
  }

  addNewCodeMarkers() {
    //get the new code markers from the pb engine
    const newCodeMarkers = this.playbackEngine.getNewCodeMarkers();

    //if there any new code markers, new code is highlighted from the last pause point
    if (newCodeMarkers) {
      const activeFileNewCodeMarkers = newCodeMarkers.allNewCodeMarkers;
      if (activeFileNewCodeMarkers) {
        //add the new code highlight markers
        activeFileNewCodeMarkers.forEach(newCodeMarker => {
          //create a marker in the right range
          const aceRange = new AceRange(newCodeMarker.startRow, newCodeMarker.startColumn, newCodeMarker.endRow, newCodeMarker.endColumn);
          const newCodeMarkerId = this.aceEditor.getSession().addMarker(aceRange, "newCodeHighlight", "text", true);
          this.newCodeMarkerIds.push(newCodeMarkerId);
        });
      }
    }
  }

  clearNewCodeMarkers() {
    this.newCodeMarkerIds.forEach(markerId => {
      this.aceEditor.getSession().removeMarker(markerId);
    });
    this.newCodeMarkerIds = [];
  }

  addInsertLineMarkers() {
    //get the new code markers
    const newCodeMarkers = this.playbackEngine.getNewCodeMarkers();

    //if there are new code markers add the line number decoration
    if(newCodeMarkers) {
      newCodeMarkers.allInsertLineNumbers.forEach(lineNumber => {
        this.aceEditor.getSession().addGutterDecoration(lineNumber, "insertOnLine");
      });
      this.insertLineNumbers = newCodeMarkers.allInsertLineNumbers;
    }
  }

  clearInsertLineMarkers() {
    //remove the old insert line numbers
    this.insertLineNumbers.forEach(lineNumber => {
      this.aceEditor.getSession().removeGutterDecoration(lineNumber, "insertOnLine");
    });
    this.insertLineNumbers = [];
  }

  addDeleteLineMarkers() {
    //get the new code markers
    const newCodeMarkers = this.playbackEngine.getNewCodeMarkers();

    //if there are new code markers add the line number decoration
    if(newCodeMarkers) {
      newCodeMarkers.allDeleteLineNumbers.forEach(lineNumber => {
        this.aceEditor.getSession().addGutterDecoration(lineNumber, "deleteOnLine");
      });
      this.deleteLineNumbers = newCodeMarkers.allDeleteLineNumbers;
    }
  }

  clearDeleteLineMarkers() {
    //remove the old delete line numbers
    this.deleteLineNumbers.forEach(lineNumber => {
      this.aceEditor.getSession().removeGutterDecoration(lineNumber, "deleteOnLine");
    });
    this.deleteLineNumbers = [];
  }

  clearSelectedCode() {
    this.aceEditor.getSelection().clearSelection();
  }

  getSelectedCodeInfo() {
    //get the selected text, the surrounding text, and the lines above/below
    let selectedCode = {
      viewableBlogText: '',
      selectedCodeBlocks: [],
      linesAbove: 0,
      linesBelow: 0
    };
    
    //get the selected text from the editor (there might be multiple highlighted ranges)
    const selection = this.aceEditor.getSelection();
    const ranges = selection.getAllRanges().filter(currentRange => currentRange.isEmpty() === false);

    //if there are any non-empty selections in the editor
    if(ranges.length > 0) {
      //get the min and max line numbers where there is selected text
      let lowestLineNumber = ranges[0].start.row;
      let highestLineNumber = ranges[ranges.length - 1].end.row;
      
      //get all of the text within the highlights
      //calculate the lines above (and adjust if it is out of the file range)
      selectedCode.linesAbove = this.linesAboveSelection;
      let surroundingTextStartRow = lowestLineNumber - this.linesAboveSelection;
      if(surroundingTextStartRow < 0) {
        surroundingTextStartRow = lowestLineNumber;
        selectedCode.linesAbove = lowestLineNumber;
      }

      //calculate the lines below (and adjust if it is out of the file range)
      selectedCode.linesBelow = this.linesBelowSelection;
      const numLinesInFile = this.playbackEngine.editorState.getNumLinesInFile(this.playbackEngine.activeFileId);
      let surroundingTextEndRow = highestLineNumber + this.linesBelowSelection;
      if(surroundingTextEndRow >= numLinesInFile) {
        surroundingTextEndRow = numLinesInFile - highestLineNumber - 1;
        selectedCode.linesBelow = surroundingTextEndRow;
      }

      //store a string with the selected and surrounding text
      selectedCode.viewableBlogText = this.aceEditor.getSession().getLines(surroundingTextStartRow, surroundingTextEndRow).join('\n');

      //now get the info about the currently selected text
      ranges.forEach(range => {
        if(range.isEmpty() === false) {
          //get the highlighted text 
          const selectedText = this.aceEditor.getSession().getTextRange(range);
          //create an object describing the selected text
          const selectedCodeBlock = {
            fileId: this.playbackEngine.activeFileId,
            selectedText: selectedText,
            startRow: range.start.row,
            startColumn: range.start.column,
            endRow: range.end.row,
            endColumn: range.end.column
          };
          //add it to the array of all selections
          selectedCode.selectedCodeBlocks.push(selectedCodeBlock);
        }
      });
    }
    return selectedCode;
  }

  highlightSearch() {
    //if there is any search text to highlight
    if(this.searchText.trim() !== '') {
      //highlight the text in the editor
      this.aceEditor.findAll(this.searchText, {
        wrap: true,
        preventScroll: true,
      });
    }
  }

  updateToDisplaySearchResults(searchResults) {
    //store the search text
    this.searchText = searchResults.searchText;
    
    //if the user is searching for something
    if(this.searchText !== '') {
      //highlight whatever they entered in the search box
      this.highlightSearch();
    } else { //the search is newly empty
      //rerender the editor to get rid of all previous search results
      this.updateForPlaybackMovement();
      this.updateForCommentSelected();
    }
  }
}

window.customElements.define('st-ace-editor', AceEditor);