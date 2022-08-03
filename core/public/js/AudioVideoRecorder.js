class AudioVideoRecorder extends HTMLElement {
  constructor(recorderType='video') {
    super();

    //audio or video
    if(recorderType === 'audio' || recorderType === 'video') {
      this.recorderType = recorderType;
    } else {
      this.recorderType = 'video';
    }

    //for webcam/mic and recording the stream of data it produces
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.mediaType = ''; //mpeg or webm

    //holds raw media data
    this.chunksOfMediaData = [];

    //saved media file that can be stored
    this.savedFile = null;
    this.savedFileName = '';
    
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    //capitalized media type
    const upperCasedRecorderType = this.recorderType[0].toUpperCase() + this.recorderType.slice(1);

    const template = document.createElement('template');
    template.innerHTML =
    `
      <style>
        audio, video {
          width: 100%;
        }

        .recordingControls {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }

        .controlButton {
          background-color: inherit;
          color: lightgray;
          border: 1px solid lightgray;
          padding: 5px;
          border-radius: 5px;
          display: flex;
          align-items: center;
          opacity: .8;
        }
        .controlButton:hover {
          opacity: 1;
        }
        .hidden {
          display: none;
        }

        .error {
          color: red;
          padding: 10px;
        }

        @keyframes recording-flashing {
          from {color: lightgray;}
          to {color: red;}
        }
        .recording {
          animation-name: recording-flashing;
          animation-duration: 1.5s;
          animation-iteration-count: infinite;
        }

        svg {
          padding-right: 5px;
        }
        
        #createNewMediaContainer
        {
          border: 1px solid gray;
          padding: 10px;
        }
      </style>

      <div id="createNewMediaContainer">
        <div id="recordingControlsContainer">
          <div id="mediaPreviewContainer"></div>
          <div class="recordingControls">
            <button id="startRecordingButton" class="controlButton" title="Click to begin recording from your web cam.">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-record-circle" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                <path d="M11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
              </svg>
              Start Recording
            </button>
            <button id="stopRecordingButton" class="controlButton hidden recording" title="Click to end recording from your web cam.">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-stop-circle" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                <path d="M5 6.5A1.5 1.5 0 0 1 6.5 5h3A1.5 1.5 0 0 1 11 6.5v3A1.5 1.5 0 0 1 9.5 11h-3A1.5 1.5 0 0 1 5 9.5v-3z"/>
              </svg>
              Stop Recording
            </button>
          </div>
        </div>
        <div id="mediaToAddContainer" class="hidden">
          <div id="newMediaContainer"></div>
          <div class="recordingControls">
            <button id="addMediaButton" class="controlButton" title="Add this ${this.recorderType} to the comment.">Add ${upperCasedRecorderType}</button>
            <button id="deleteMediaButton" class="controlButton" title="Remove this ${this.recorderType} from the comment.">Delete ${upperCasedRecorderType}</button>
          </div>
        </div>
      </div>
    `;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    //add the new recorded media element, either an audio or video element
    const newMediaContainer = this.shadowRoot.querySelector('#newMediaContainer');
    
    //either an audio or video element
    let mostRecentRecording;
    if(this.recorderType === 'video') {
      //if this is a video recorder then display a preview window
      const videoPreview = document.createElement('video');
      videoPreview.setAttribute('id', 'videoPreview');
      videoPreview.defaultMuted = true;
      videoPreview.muted = true;
      videoPreview.autoplay = true;
      videoPreview.setAttribute('autoplay', '');
      const mediaPreviewContainer = this.shadowRoot.querySelector('#mediaPreviewContainer');
      mediaPreviewContainer.appendChild(videoPreview);

      //create the element to hold the new media and set the type of file
      mostRecentRecording = document.createElement('video');
      this.mediaType = 'video/webm';
      this.savedFileName = 'browserVideo.webm';
  
    } else { //audio
      //no preview is needed for audio

      //create the element to hold the new media and set the type of file
      mostRecentRecording = document.createElement('audio');
      this.mediaType = 'audio/mpeg';
      this.savedFileName = 'browserAudio.mp3';
    }

    //add playback controls
    mostRecentRecording.setAttribute('controls', '');
    mostRecentRecording.setAttribute('id', 'mostRecentRecording');
    newMediaContainer.appendChild(mostRecentRecording);

    //buttons to start/stop media recording
    const startRecordingButton = this.shadowRoot.querySelector('#startRecordingButton');
    const stopRecordingButton = this.shadowRoot.querySelector('#stopRecordingButton');

    //start recording button clicked
    startRecordingButton.addEventListener('click', () => {
      //make the start button invisible and the stop button visible
      startRecordingButton.classList.add('hidden');
      stopRecordingButton.classList.remove('hidden');

      //start recording media
      this.mediaRecorder.start();
    });

    //stop recording button clicked
    stopRecordingButton.addEventListener('click', () => {
      //make the start button visible and the stop button invisible
      startRecordingButton.classList.remove('hidden');
      stopRecordingButton.classList.add('hidden');

      //stop media recording
      this.mediaRecorder.stop();

      //hide the video preview container and show the video to store container
      const recordingControlsContainer = this.shadowRoot.querySelector('#recordingControlsContainer');
      recordingControlsContainer.classList.add('hidden');

      const mediaToAddContainer = this.shadowRoot.querySelector('#mediaToAddContainer');
      mediaToAddContainer.classList.remove('hidden');
    });

    //in the media to add container, a button to save the media and one to delete it
    const addMediaButton = this.shadowRoot.querySelector('#addMediaButton');
    const deleteMediaButton = this.shadowRoot.querySelector('#deleteMediaButton');
    
    //add a new media file to this comment
    addMediaButton.addEventListener('click', () => {
      //hide the video to add and make the video preview visible again
      const mediaToAddContainer = this.shadowRoot.querySelector('#mediaToAddContainer');
      mediaToAddContainer.classList.add('hidden');

      const recordingControlsContainer = this.shadowRoot.querySelector('#recordingControlsContainer');
      recordingControlsContainer.classList.remove('hidden');

      //send an event with the file data
      this.sendMediaUpload(this.savedFile);
    });

    //abandon the media file that was created
    deleteMediaButton.addEventListener('click', () => {
      //hide the video to add and make the video preview visible again
      const mediaToAddContainer = this.shadowRoot.querySelector('#mediaToAddContainer');
      mediaToAddContainer.classList.add('hidden');

      const recordingControlsContainer = this.shadowRoot.querySelector('#recordingControlsContainer');
      recordingControlsContainer.classList.remove('hidden');

      //get the media to delete
      const mostRecentRecording = this.shadowRoot.querySelector('#mostRecentRecording');
      //clean up the url object for the deleted media
      window.URL.revokeObjectURL(mostRecentRecording.getAttribute('src'));

      //empty out the saved file
      this.savedFile = null;
    });

    this.setUpMediaRecordingOfComments();
  }

  disconnectedCallback() {
    //turn off the camera/mic
    this.tearDownMediaRecordingOfComments();
  }

  setUpMediaRecordingOfComments() {
    //get the user media or an alternative if it doesn't exist
    navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);

    //if there is media support
    if(navigator.getUserMedia && window.MediaRecorder) {
      //set the type of recording
      const mediaConstraints = {
        audio: true,
        video: this.recorderType === 'video' ? true : false
      };

      //set up the webcam/mic
      navigator.getUserMedia(mediaConstraints, this.onMediaCreateSuccess, this.onMediaCreateError);

    } else { //audio/video recording is not supported in this browser
      const createNewMediaContainer = this.shadowRoot.querySelector('#createNewMediaContainer');
      createNewMediaContainer.innerHTML = '';

      const errorMessage = document.createElement('span');
      errorMessage.classList.add('error');
      errorMessage.innerHTML = 'We are unable to capture audio or video in your browser.';
      createNewMediaContainer.appendChild(errorMessage);
    }
  }

  onMediaCreateSuccess = stream => {
    //store the media stream so that it can be used to turn the web cam off later
    this.mediaStream = stream;

    //if its a video recorder set up the preview 
    if(this.recorderType === 'video') {
      //tie the media stream to the video preview element
      const videoPreview = this.shadowRoot.querySelector('#videoPreview');
      videoPreview.srcObject = stream;
    }

    //use the stream to make a media recorder and store it 
    this.mediaRecorder = new MediaRecorder(stream);
    
    //when there is new data from the media recorder
    this.mediaRecorder.ondataavailable = e => {
      //store a new chunk of raw media data 
      this.chunksOfMediaData.push(e.data);
    }

    //when the recording has stopped and is ready to be stored
    this.mediaRecorder.onstop = e => {
      //create a blob of the data
      const blob = new Blob(this.chunksOfMediaData, { type: this.mediaType });
      //turn the blob into a media file and store it
      this.savedFile = new File([blob], this.savedFileName, {type: this.mediaType, lastModified: Date.now()});
      
      //empty out the chunksOfMediaData, they aren't needed anymore for this media file
      this.chunksOfMediaData = [];

      //create a data url and set the control to point to it
      const mediaURL = window.URL.createObjectURL(blob);
      const mostRecentRecording = this.shadowRoot.querySelector('#mostRecentRecording');
      mostRecentRecording.setAttribute('src', mediaURL);
    }
  }

  onMediaCreateError = err => {
    const createNewMediaContainer = this.shadowRoot.querySelector('#createNewMediaContainer');
    createNewMediaContainer.innerHTML = '';
    
    const errorMessage = document.createElement('span');
    errorMessage.classList.add('error');
    errorMessage.innerHTML = 'Sorry, something went wrong! We are unable to capture audio or video in your browser.';
    createNewMediaContainer.appendChild(errorMessage);

    console.log('The following error occured: ' + err);
  }

  /*
  * Clean up the media controls for capturing audio/video
  */
  tearDownMediaRecordingOfComments() {
    if(this.mediaStream) {
      //get all the 'tracks' from the media stream
      const allMediaStreamTracks = this.mediaStream.getTracks();

      //go through each track and stop it
      for(let i = 0;i < allMediaStreamTracks.length;i++) {
        allMediaStreamTracks[i].stop();
      }
    }
    //reset the media stream
    this.mediaStream = null;

    //reset the media recorder
    this.mediaRecorder = null;
  }

  
  sendMediaUpload(fileData) {
    const event = new CustomEvent(`${this.recorderType}-upload`, {
      detail: { fileData: fileData },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }
}

window.customElements.define('st-audio-video-recorder', AudioVideoRecorder);