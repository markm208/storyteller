class FileSystemNavigator extends HTMLElement {
  constructor(playbackEngine) {
    super();

    this.playbackEngine = playbackEngine;
    this.root = null;
    this.zipUrl = null;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        .fsView {
          padding: 8px;
          margin: 8px;
          border: 1px solid gray;
          background-color: rgb(58, 58, 58);
        }

        .fsFile {
          list-style-type: none;
          color: lightblue;
          text-decoration: underline;
        }
        .fsFile:hover {
          cursor: pointer;
        }

        .fsDirectory {
          list-style-type: none;
        }

        .activeFileSystemFile {
          font-weight: bold;
        }

        .editedFile::before {
          content: "*";
        }

        .downloadProgressDisplay {
          display: none;
        }
        .downloadInProgress {
          padding: 10px 20px;
          display: block;
        }

        a {
          color: lightblue;
          padding: 10px;
        }
        a:hover {
          color: gray;
        }

        .downloadControls {
          display: flex;
          flex-direction: column;
          padding: 10px;
        }

        .downloadCodeButton {
          background-color: gray;
          color: black;
          border: none;
          font-weight: bold;
          opacity: .85;
          height: 40px;
        }

        .smallButton {
          height: unset;
        }

        .downloadCodeButton:hover {
          opacity: 1;
        }
      </style>

      <div class="downloadControls">
        <button class="downloadCodeButton">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-download" viewBox="0 0 16 16">
            <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
            <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
          </svg>
          Download code at this point
        </button>
        <div class="downloadProgressDisplay">
          Download in progress, this may take a while...
        </div>
        <div class="downloadArea"></div>
      </div>

      <ul class="fsView fsDirectory"></ul>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    //find the root directory and store it for later updates
    for(let dirId in this.playbackEngine.editorState.allDirectories) {
      const directory = this.playbackEngine.editorState.allDirectories[dirId];
      if(directory.parentDirectoryId === null) {
        this.root = directory;
        break;
      }
    }
    //create the root and work down
    const fsView = this.shadowRoot.querySelector('.fsView');
    //get the changed file ids
    let changedFileIds = null;
    if(this.playbackEngine.newCodeMarkerGenerator) {
      changedFileIds = new Set(this.playbackEngine.newCodeMarkerGenerator.getAllChangedFileIds());
    }
    this.renderHelper(this.root, fsView, changedFileIds);

    const downloadCodeButton = this.shadowRoot.querySelector('.downloadCodeButton');
    downloadCodeButton.addEventListener('click', this.downloadCodeIntoZip);
  }

  disconnectedCallback() {
    //get all click handlers and remove them
    const allFileListItems = this.shadowRoot.querySelectorAll('.fsFile');
    allFileListItems.forEach(fileLi => {
      fileLi.removeEventListener('click', this.handleFileClick);
    });

    const downloadCodeButton = this.shadowRoot.querySelector('.downloadCodeButton');
    downloadCodeButton.removeEventListener('click', this.downloadCodeIntoZip);
  }

  renderHelper(aDirectory, aList, changedFileIds) {
    if(aDirectory.isDeleted === false) {
      //get the name of the directory
      const directory = this.playbackEngine.editorState.allDirectories[aDirectory.directoryId];
      const indexOfLastSlash = directory.directoryPath.lastIndexOf("/", directory.directoryPath.length - 2);
      let dirName = directory.directoryPath.substring(indexOfLastSlash + 1);
      if(dirName.length === 0) {
        dirName = directory.directoryPath;
      }
      //add the name of the directory to the list
      const newDirectoryName = document.createElement('li');
      newDirectoryName.innerHTML = dirName;
      aList.appendChild(newDirectoryName);

      //if there are sub-directories to traverse 
      aDirectory.childDirectories.forEach(subDirectoryId => {
        //create a new list for the dir and add it to this dir's list
        const newSubDirectoryList = document.createElement('ul');
        newSubDirectoryList.classList.add('fsDirectory');
        aList.appendChild(newSubDirectoryList);
        
        //get the subdirectory from the collection of all directories
        const subDirectory = this.playbackEngine.editorState.allDirectories[subDirectoryId];
        
        //recurse down the fs
        this.renderHelper(subDirectory, newSubDirectoryList, changedFileIds);
      });

      //all dirs added, now get all of the files in this directory
      const filesList = document.createElement('ul');
      filesList.classList.add('fileList');

      aDirectory.childFiles.forEach(fileId => {
        //get the file from the collection of all files
        const file = this.playbackEngine.editorState.allFiles[fileId];

        if(file.isDeleted === false) {
          //get the file name
          const indexOfLastSlash = file.filePath.lastIndexOf("/");
          let fileName = file.filePath.substring(indexOfLastSlash + 1);
          //add it as a child to the files list
          const newListItem = document.createElement('li');
          newListItem.innerHTML = fileName;
          newListItem.setAttribute('id', file.fileId);
          newListItem.classList.add('fsFile');
          if (file.fileId === this.playbackEngine.activeFileId) {
            newListItem.classList.add('activeFileSystemFile');
          }
          if(changedFileIds && changedFileIds.has(fileId)) {
            newListItem.classList.add('editedFile');
          }
          newListItem.addEventListener('click', this.handleFileClick);

          filesList.appendChild(newListItem);
        }
      });
      //add all of the files to this dir's list
      aList.appendChild(filesList);
    } 
  }

  updateForPlaybackMovement() {
    const fsView = this.shadowRoot.querySelector('.fsView');
    fsView.innerHTML = '';
    
    //get the changed file ids
    let changedFileIds = null;
    if(this.playbackEngine.newCodeMarkerGenerator) {
      changedFileIds = new Set(this.playbackEngine.newCodeMarkerGenerator.getAllChangedFileIds());
    }
    this.renderHelper(this.root, fsView, changedFileIds);
  }

  updateForFileSelected() {
    //de-highlight the active file
    let activeFileSystemFile = this.shadowRoot.querySelector('.activeFileSystemFile');
    if(activeFileSystemFile) {
      activeFileSystemFile.classList.remove('activeFileSystemFile');
    }
    
    //highlight the new active file
    if(this.playbackEngine.activeFileId) {
      activeFileSystemFile = this.shadowRoot.querySelector(`#${this.playbackEngine.activeFileId}`);
      if(activeFileSystemFile) {
        activeFileSystemFile.classList.add('activeFileSystemFile');
      }
    }
  }

  handleFileClick = (event) => {
    const fileId = event.target.getAttribute('id');
    this.sendActiveFileEvent(fileId);
  }

  downloadCodeIntoZip = async () => {
    //display a wait message
    const downloadProgressDisplay = this.shadowRoot.querySelector('.downloadProgressDisplay');
    downloadProgressDisplay.classList.add('downloadInProgress');

    //download the code
    const codeDownloader = new CodeDownloader(this.playbackEngine);
    const blobbedZip = await codeDownloader.zipAndDownload();
    
    //create a downloadable blob
    const blob = new Blob([blobbedZip], {type: 'application/zip'});
    //return a url that holds the zip
    this.zipUrl = window.URL.createObjectURL(blob);
    
    //create a download link
    let zipFileName = 'stProject.zip';

    //update the message with instructions
    downloadProgressDisplay.innerHTML = `
      A zip file has been created that includes all of the files and directories at this point in the playback (event #${this.playbackEngine.currentEventIndex + 1}). 
      Click on the link below to download the zip file and then unzip it. 
      The zip file also contains a valid Storyteller project so you can build off of this code and create new playbacks.
      Clear the zip download after you have downloaded it.`;

    const downloadArea = this.shadowRoot.querySelector('.downloadArea');

    const downloadLink = document.createElement('a');
    downloadLink.innerHTML = zipFileName;
    downloadLink.href = this.zipUrl;
    downloadLink.download = zipFileName;
    downloadLink.addEventListener('click', event => console.log('link clicked'));
    const clearButton = document.createElement('button');
    clearButton.innerHTML = 'Clear download';
    clearButton.addEventListener('click', this.clearDownload);
    clearButton.classList.add('downloadCodeButton');
    clearButton.classList.add('smallButton');

    downloadArea.appendChild(downloadLink);
    downloadArea.appendChild(clearButton);
  }

  clearDownload = () => {
    //give back the resources for the zip file in memory
    window.URL.revokeObjectURL(this.zipUrl);

    const downloadProgressDisplay = this.shadowRoot.querySelector('.downloadProgressDisplay');
    downloadProgressDisplay.classList.remove('downloadInProgress');
    downloadProgressDisplay.innerHTML = 'Download in progress, this may take a while...';

    const downloadArea = this.shadowRoot.querySelector('.downloadArea');
    downloadArea.innerHTML = '';
  }

  sendActiveFileEvent = (fileId) => {
    const event = new CustomEvent('active-file', { 
      detail: {activeFileId: fileId}, 
      bubbles: true, 
      composed: true 
    });
    this.dispatchEvent(event);
  }
}

window.customElements.define('st-file-system-navigator', FileSystemNavigator);