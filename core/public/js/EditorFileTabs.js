class EditorFileTabs extends HTMLElement {
  constructor(playbackEngine) {
    super();

    this.playbackEngine = playbackEngine;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        .tabDiv {
          padding: 10px 5px 5px 5px;
          flex-wrap: nowrap;
          overflow-y: hidden;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .tabDiv::-webkit-scrollbar {
          display: none;
        }

        .fileTab {
          border-top-left-radius: 2px;
          border-top-right-radius: 2px;
          border: 1px gray solid;
          padding: 3px 10px;
        }

        .activeFile {
          border: 1px lightgray solid;
          border-bottom: none;
          background-color: black;
        }

        .fileUpdated::before {
          content: "*";
        }
      </style>

      <div class="tabDiv"></div>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() {    
    //create the file tabs for any existing files
    this.createFileTabs();
  }

  disconnectedCallback() {
    //remove all of the event handlers on the tabs
    const alltabs = this.shadowRoot.querySelectorAll('.fileTab');
    alltabs.forEach(tab => {
      tab.removeEventListener('click', this.handleFileTabClick)
    });
  }

  createFileTabs() {
    //remove all of the event handlers on the old tabs
    const allTabs = this.shadowRoot.querySelectorAll('.fileTab');
    allTabs.forEach(tab => {
      if(!tab.classList.contains('dummyTab')) {
        tab.removeEventListener('click', this.handleFileTabClick);
      }
    });

    //remove all of the old tabs
    const tabDiv = this.shadowRoot.querySelector('.tabDiv');
    tabDiv.innerHTML = '';

    //create and add a dummy file tab
    const dummyTab = document.createElement('span');
    dummyTab.setAttribute('id', 'no-file');
    dummyTab.classList.add('fileTab');
    dummyTab.classList.add('dummyTab');
    dummyTab.innerHTML = '&nbsp;';
    tabDiv.appendChild(dummyTab);
    
    //for marking file tabs
    const newCodeMarkers = this.playbackEngine.getNewCodeMarkers();
    const allChangedFileIds = newCodeMarkers ? newCodeMarkers.allChangedFileIds : [];
    
    //go through all of the files at this point
    for(let fileId in this.playbackEngine.editorState.allFiles) {
      //get a file and make sure it is not deleted
      const file = this.playbackEngine.editorState.allFiles[fileId];
      //if the file has not been deleted previously
      if(this.isFileDeleted(fileId) === false) {
        //get the file name to display
        const indexOfLastSlash = file.filePath.lastIndexOf("/");
        const fileName = file.filePath.substring(indexOfLastSlash + 1);
        
        //create a tab and add it
        const tab = document.createElement('span');
        tab.setAttribute('id', file.fileId);
        tab.classList.add('fileTab');
        tab.title = file.filePath;
        tab.innerHTML = fileName;
        tab.addEventListener('click', this.handleFileTabClick)
        tabDiv.appendChild(tab);

        //mark it if it has a recent change
        if(allChangedFileIds.includes(file.fileId)) {
          tab.classList.add('fileUpdated');
        }
        //mark it if it is the active file
        if (this.playbackEngine.activeFileId === file.fileId) {
          tab.classList.add('activeFile');
        }
      }
    }
  }

  isFileDeleted(fileId) {
    let retVal = false;
    const file = this.playbackEngine.editorState.allFiles[fileId];
    //check to see if the file is deleted
    if(file.isDeleted) {
      retVal = true;
    } else { //check to see if any parent dir has been deleted
      let parentDir = this.playbackEngine.editorState.allDirectories[file.parentDirectoryId];
      while(parentDir) {
        if(parentDir.isDeleted) {
          retVal = true;
          break;
        }
        //move up to the next parent dir
        parentDir = this.playbackEngine.editorState.allDirectories[parentDir.parentDirectoryId];
      }
    }

    return retVal;
  }
  
  handleFileTabClick = (event) => {
    const fileId = event.target.getAttribute('id');
    this.sendEventActiveFile(fileId);
  }

  sendEventActiveFile(fileId) {
    const event = new CustomEvent('active-file', { 
      detail: {activeFileId: fileId}, 
      bubbles: true, 
      composed: true 
    });
    this.dispatchEvent(event);
  }
}

window.customElements.define('st-editor-file-tabs', EditorFileTabs);