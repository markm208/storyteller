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

    this.mediaType = mediaType.toLowerCase();

    if (this.mediaType !== 'audio' && this.mediaType !== 'video' && this.mediaType !== 'image') {
      return;
    }

    this.mediaURLs = mediaURLs;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    const typeLabel = this.mediaType.charAt(0).toUpperCase() + this.mediaType.slice(1) + 's';
    template.innerHTML = `<style> 
      .draggable{
          height: 80%;
          width: 50%;
      }

      error{
          color: red;
          padding: 10px;
      }

      .mediaContainer{
          display: grid;
          border-style: groove;
          overflow-y: auto;
      }

      .mediaDiv{
          margin: 10px;
      }
      
      .removeMedia{
          color: red;
          position: absolute;
          cursor: pointer;
      }

      .header {
        display: flex;
        justify-content: space-between;
        padding: 5px 15px;
      }

      #typeLabel {
        /*padding-left: 20px;*/
      }
      #addNewMediaButton {
        /*padding-right: 20px;*/
      }
      </style>
      <div class="header">
        <span id="typeLabel">${typeLabel}</span>
        <span id="addNewMediaButton" title="Click to add a new ${this.mediaType} here.">
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
    const addNewMediaButton = this.shadowRoot.querySelector('#addNewMediaButton');
    addNewMediaButton.addEventListener('click', event => {console.log('click')});
    
    const mediaContainer = this.shadowRoot.querySelector('.mediaContainer');
    this.mediaURLs.forEach(mediaURL => {
      this.addMedia(mediaURL);
    })

    mediaContainer.addEventListener('dragover', event => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      const draggable = mediaContainer.querySelector('.dragging');

      if (draggable) {
        event.preventDefault();
        const afterElement = this.#getDragAfterElement(event.clientY);
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
        //alert(data);
      } else if (event.dataTransfer.files) {
        const temp = event.dataTransfer.files;
        for (let i = 0; i < temp.length; i++) {
          const file = temp[i];
          //alert(file.name);
        }
      }

      event.preventDefault();
      event.stopPropagation();
    })
  }

  disconnectedCallback() {
    //TODO remove eventListeners?
  }

  addMedia(mediaURL, fromDragIn = false) {
    //TODO get type from src

    const mediaContainer = this.shadowRoot.querySelector('.mediaContainer');
    const newMedia = this.#createMedia(mediaURL);
    mediaContainer.appendChild(newMedia);
  }

  #createMedia(mediaURL) {
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
        this.pauseMedia(); //TODO can be removed once the event below is handled
        this.sendPauseAllEvent();
        media.classList.add('playing');
      };

      media.onpause = () => {
        media.classList.remove('playing');
      }


    }
    //TODO add anon functions for eventListeners so listeners can be removed with disconnectedCallback()

    media.setAttribute('src', mediaURL);
    media.setAttribute('draggable', 'true');
    media.classList.add('draggable');

    media.addEventListener('dragstart', (event) => {
      //event.preventDefault();
      //set data to 'internal-drag' so we can later identify that this drag came from storyteller and not the OS
      event.dataTransfer.setData('Text/html', 'internal-drag');
      //event.dataTransfer.effectAllowed = 'move';
      this.pauseMedia(); //TODO can be removed once the event below is handled
      this.sendPauseAllEvent();

      media.classList.add('dragging');
    })

    media.addEventListener('dragend', (event) => {
      event.preventDefault();

      media.classList.remove('dragging');
    })

    //media.setAttribute('preload', 'metadata');   
    //media.classList.add('commentVideo');


    const removeMediaButton = document.createElement('btn');
    removeMediaButton.classList.add('removeMedia');
    removeMediaButton.title = `Remove ${this.mediaType}`;
    removeMediaButton.innerHTML = 'X';


    removeMediaButton.addEventListener('click', () => {
      mediaContainer.removeChild(mediaDiv);
    })

    //if an error exists with the media, show an error message and allow user to remove media
    media.addEventListener('error', () => {
      const error = document.createElement('span');
      error.innerHTML = `Error with file: <b><error>${media.src}</error></b>`;
      removeMediaButton.title = 'Remove file';

      //replace the file with an error message and move it to the top of the media container
      media.replaceWith(error);
      mediaContainer.removeChild(mediaDiv);
      mediaContainer.firstChild.after(mediaDiv);


      // mediaContainer.removeChild(mediaDiv);
    })

    mediaDiv.appendChild(media);

    mediaDiv.appendChild(removeMediaButton);
    return mediaDiv;
  }

  getURLsInOrder() {
    const allMedia = this.shadowRoot.querySelectorAll('.draggable');

    let retVal = [];
    allMedia.forEach(media => {
      retVal.push(media.src);
    })
    return retVal;
  }

  sendPauseAllEvent() {
    //send an event to pause all vertical media containers
    const event = new CustomEvent('pause-all-vertical-media-containers', {
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  #getDragAfterElement(y) {
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