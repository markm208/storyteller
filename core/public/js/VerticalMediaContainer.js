/**
 * Create a vertical container to display audio, video, or image files.
 * Allows user to change the order of media as well as removal. 
 * 
 * 
 * mediaType should be 'audio', 'video', or 'image' 
 */
class VerticalMediaContainer extends HTMLElement {
  constructor(mediaURLs, mediaType) {
    super();
    //type of media (image, video, audio)
    this.mediaType = mediaType.toLowerCase();

    //verifies the type of media is valid
    if (this.mediaType !== 'audio' && this.mediaType !== 'video' && this.mediaType !== 'image') {
      this.mediaType = 'image';
    }

    //the urls of newly added/deleted media in case the user decides abandon a comment
    this.newMediaURLsToDelete = [];
    this.newMediaURLsToAdd = [];

    //store a copy of the urls of the media on the server
    this.mediaURLs = Array.from(mediaURLs);

    //initial list of acceptable media files (copied from HTTPServer.js)
    this.acceptableImageMimeTypes = ['image/apng', 'image/bmp', 'image/gif', 'image/ico', 'image/jpeg', 'image/png', 'image/svg+xml'];
    this.acceptableAudioMimeTypes = ['audio/aac', 'audio/mpeg', 'audio/wav', 'audio/webm'];
    this.acceptableVideoMimeTypes = ['video/mpeg', 'video/mp4', 'video/webm'];

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    const typeLabel = this.mediaType.charAt(0).toUpperCase() + this.mediaType.slice(1) + 's';
    template.innerHTML = `<style> 
      .draggable{
          width: 100%;
      }

      error{
          color: red;
          padding: 10px;
      }

      .mediaContainer{
        display: grid;
        overflow-y: auto;
      }

      .mediaDiv {
        margin: 10px;
      }
      .mediaDiv img {
        border: 1px solid gray;
      }

      .removeMedia{
          cursor: pointer;
          background-image: url("data:image/svg+xml,<svg viewBox='0 0 16 16' height='16' width='16' class='bi bi-x-lg' fill='red' xmlns='http://www.w3.org/2000/svg'><path d='M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z'/></svg>");
          background-repeat: no-repeat;
          background-color: transparent;
          height: 1em;
          width: 1em;
      }

      .header {
        display: flex;
        justify-content: space-between;
      }

      #typeLabel {
      }
      #addNewMediaButton {
        opacity: 80%;
        padding: 5px 20px;
      }
      #addNewMediaButton:hover {
        opacity: 100%;
      }
      </style>
      <div class="header">
        <span id="typeLabel">${typeLabel}</span>
        <span id="addNewMediaButton" title="Click to add a new ${this.mediaType} here or paste a file.">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-plus-lg" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2Z"/>
          </svg>
        </span>
      </div>
      <div class='mediaContainer'></div>
      <hr/>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    //display all of the media from the comment's url
    const mediaContainer = this.shadowRoot.querySelector('.mediaContainer');
    this.mediaURLs.forEach(mediaURL => {
      this.addMedia(mediaURL);
    })

    //the + button to add new media
    const addNewMediaButton = this.shadowRoot.querySelector('#addNewMediaButton');
    addNewMediaButton.addEventListener('click', this.createFileChooser);

    //the paste file event handler
    window.addEventListener("paste", pasteEvent => {
      //check for clipboard data
      if (pasteEvent.clipboardData) {
        //whether the paste data has media files or not
        let pasteHasFiles = false;
        let acceptableMimeTypes;

        //acceptable image mime types
        if (this.mediaType === 'image') {
          acceptableMimeTypes = this.acceptableImageMimeTypes;
        } else if (this.mediaType === 'video') {
          acceptableMimeTypes = this.acceptableVideoMimeTypes;
        } else if (this.mediaType === 'audio') {
          acceptableMimeTypes = this.acceptableAudioMimeTypes;
        }

        //get all of the files on the clipboard
        const files = pasteEvent.clipboardData.files;
        //go through the clipboard files if there are any
        for (let i = 0; i < files.length; i++) {
          //if the clipboard data has any files and they are acceptable images
          if (acceptableMimeTypes.includes(files[i].type)) {
            //indicate that media files will be added to the comment
            pasteHasFiles = true;
            break;
          }
        }
        //if new images will be added to the media pop up
        if (pasteHasFiles) {
          //prevent a paste in the comment text box if it has the focus
          pasteEvent.preventDefault();

          //add the files from the clipboard to the comment
          this.sendFilesToServer(pasteEvent.clipboardData.files);
        }
      }
    });

    //dragging and dropping existing media
    mediaContainer.addEventListener('dragover', event => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      const draggable = mediaContainer.querySelector('.dragging');

      if (draggable) {
        event.preventDefault();
        const afterElement = this.getDragAfterElement(event.clientY);
        if (typeof afterElement === 'undefined') {
          mediaContainer.appendChild(draggable.parentElement);
        } else {
          mediaContainer.insertBefore(draggable.parentElement, afterElement.parentElement);
        }
      }
    })

    //TODO add ability to drop media files in from operating system
    mediaContainer.addEventListener('drop', event => {
      var data = event.dataTransfer.getData('text/html');
      if (data === 'internal-drag') {
        //TODO is this being used??
      } else if (event.dataTransfer.files) {
        const temp = event.dataTransfer.files;
        for (let i = 0; i < temp.length; i++) {
          const file = temp[i];
          console.log(file.name);
        }
      }

      event.preventDefault();
      event.stopPropagation();
    })
  }

  disconnectedCallback() {
    if(this.newMediaURLsToAdd.length > 0) {
      //delete any media explicitly added by the user but not committed
      this.deleteMedia(this.newMediaURLsToAdd);
    }
  }

  createFileChooser = event => {
    let acceptedFiles;
    //make some choices based on the type of media container this is
    if (this.mediaType === 'image') {
      acceptedFiles = this.acceptableImageMimeTypes.join(',');
    } else if (this.mediaType === 'video') {
      acceptedFiles = this.acceptableVideoMimeTypes.join(',');
    } else if (this.mediaType === 'audio') {
      acceptedFiles = this.acceptableAudioMimeTypes.join(',');
    }

    //create a file chooser input with the acceptable files only
    const fileInput = document.createElement('input');
    fileInput.setAttribute('type', 'file');
    fileInput.setAttribute('accept', acceptedFiles);
    fileInput.setAttribute('multiple', 'true');

    //add the handler when the selection is complete
    fileInput.addEventListener('change', event => {
      this.sendFilesToServer(fileInput.files);
    });
    //simulate a click on the file chooser
    fileInput.click();
  }

  async sendFilesToServer(files) {
    const serverProxy = new ServerProxy();
    let serverMethod;

    //choose the server method based on the type of media container this is
    if (this.mediaType === 'image') {
      serverMethod = serverProxy.addImageOnServer;
    } else if (this.mediaType === 'video') {
      serverMethod = serverProxy.addVideoOnServer;
    } else if (this.mediaType === 'audio') {
      serverMethod = serverProxy.addAudioOnServer;
    }

    //send the request to the server and get the new paths to the files
    const newFilePaths = await serverMethod(files);

    //add each file path and to the urls and add the media
    newFilePaths.forEach(newFilePath => {
      //add the new url to all of the url for this component
      this.mediaURLs.push(newFilePath);
      
      //add it to a list so that it can be deleted if the comment is abandoned
      this.newMediaURLsToAdd.push(newFilePath);

      //build the media UI element
      this.addMedia(newFilePath);
    });
  }

  addMedia(mediaURL) {
    //build and add a UI element of the new media file to the container
    const mediaContainer = this.shadowRoot.querySelector('.mediaContainer');
    const newMedia = this.createMedia(mediaURL);
    mediaContainer.appendChild(newMedia);
  }

  createMedia(mediaURL) {
    const mediaDiv = document.createElement('div');
    mediaDiv.classList.add('mediaDiv');

    const mediaContainer = this.shadowRoot.querySelector('.mediaContainer');

    let media;
    if (this.mediaType === 'image') {
      media = document.createElement('img');
    } else { //video and audio
      media = document.createElement(this.mediaType);
      media.setAttribute('controls', '');
      const fileExtension = mediaURL.substring(mediaURL.lastIndexOf('.'), mediaURL.length) || mediaURL;

      //message if browser doesn't support playback of the current file type
      media.innerHTML = `<p>Your browswer does not support playback of *${fileExtension}* files</p>`;

      media.onplay = () => {
        this.sendPauseAllEvent();
        media.classList.add('playing');
      };

      media.onpause = () => {
        media.classList.remove('playing');
      }
    }

    //make the media draggable
    media.setAttribute('src', mediaURL);
    media.setAttribute('draggable', 'true');
    media.classList.add('draggable');
    //handle dragging
    media.addEventListener('dragstart', (event) => {
      //set data to 'internal-drag' so we can later identify that this drag came from storyteller and not the OS
      event.dataTransfer.setData('Text/html', 'internal-drag');
      this.sendPauseAllEvent();
      media.classList.add('dragging');
    });

    //drag ends
    media.addEventListener('dragend', (event) => {
      event.preventDefault();
      media.classList.remove('dragging');
    });

    //TODO does this save us any load time???
    media.setAttribute('preload', 'metadata');
    media.classList.add('commentVideo');

    //button to remove media from the server and comment
    const removeMediaButton = document.createElement('div');
    removeMediaButton.classList.add('removeMedia');
    removeMediaButton.title = `Remove ${this.mediaType}`;

    removeMediaButton.addEventListener('click', () => {
      //remove the media from the UI
      mediaContainer.removeChild(mediaDiv);

      //don't delete yet, add the url to be deleted later
      this.newMediaURLsToDelete.push(mediaURL);
    });

    //if an error exists with the media, show an error message and allow user to remove media
    media.addEventListener('error', () => {
      const error = document.createElement('span');
      error.innerHTML = `Error with file: <b><error>${media.src}</error></b>`;
      removeMediaButton.title = 'Remove file';

      //replace the file with an error message and move it to the top of the media container
      media.replaceWith(error);
      mediaContainer.removeChild(mediaDiv);
      mediaContainer.firstChild.after(mediaDiv);
    });

    mediaDiv.appendChild(media);
    mediaDiv.appendChild(removeMediaButton);

    return mediaDiv;
  }

  getURLsInOrder() {
    const allMedia = this.shadowRoot.querySelectorAll('.draggable');

    let retVal = [];
    allMedia.forEach(media => {
      //get only the path from 'media/'
      const mediaURL = media.src.substring(media.src.indexOf('media/'));
      retVal.push(mediaURL);
    })
    return retVal;
  }

  commitChanges() {
    //delete the requested media on the server
    this.deleteMedia(this.newMediaURLsToDelete);
    //in order to not delete these in disco method, clear all of the new media urls
    this.newMediaURLsToAdd = [];
  }

  deleteAll() {
    //used when a comment is deleted to delete all of the existing media associated with a comment
    this.deleteMedia(this.mediaURLs);
  }

  deleteMedia(mediaURLs) {
    //create a reference that can talk to the server
    const serverProxy = new ServerProxy();
    let serverMethod;
    //make some choices based on the type of media container this is
    if (this.mediaType === 'image') {
      serverMethod = serverProxy.deleteImageOnServer;
    } else if (this.mediaType === 'video') {
      serverMethod = serverProxy.deleteVideoOnServer;
    } else if (this.mediaType === 'audio') {
      serverMethod = serverProxy.deleteAudioOnServer;
    }
    mediaURLs.forEach(async mediaURL => {
      await serverMethod(mediaURL);
    });
  }

  sendPauseAllEvent() {
    //send an event to pause all vertical media containers
    const event = new CustomEvent('pause-all-vertical-media-containers', {
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  getDragAfterElement(y) {
    const container = this.shadowRoot.querySelector('.mediaContainer');
    const draggableElements = [...container.querySelectorAll('.draggable:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {

      //gives us the dimensions of the box
      const box = child.getBoundingClientRect();

      //getting the center of the box
      const offset = y - box.top - box.height / 2;

      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element
  }

  pauseMedia() {
    if (this.mediaType === 'video' || this.mediaType === 'audio') {
      const playing = this.shadowRoot.querySelector('.playing');

      if (playing) {
        playing.pause();
        playing.classList.remove('playing');
      }
    }
  }
}

window.customElements.define('st-vertical-media-container', VerticalMediaContainer);