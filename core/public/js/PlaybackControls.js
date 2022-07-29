class PlaybackControls extends HTMLElement {
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
        :host {
          display: flex;
          align-items: start;
          padding: 10px;
        }

        .slider {
          flex: 1;
          padding: 0px 10px;
        }
        
        .playbackButton {
          color: rgb(201, 226, 242);
          background-color: inherit;
          border: none;
          padding: 10px 0px;
          opacity: .8;
          cursor: pointer;
        }
        
        .playbackButton:hover {
          opacity: 1.0;
        }
        .playbackControl {
          flex: 0;
          display: none;
        }

        .playbackControl.active {
          flex: 0;
          display: initial;
        }

        .devAvatars {
          padding: 0px;
        }

        button {
          outline: none;
        }
      </style>

      <button id="goToNextCommentButton" type="button" class="playbackButton" title="Go to the next comment">
        <!-- icon url: https://icons.getbootstrap.com/icons/skip-forward-circle-fill/ -->
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" class="bi bi-skip-forward-circle" viewBox="0 0 16 16">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
          <path d="M4.271 5.055a.5.5 0 0 1 .52.038L7.5 7.028V5.5a.5.5 0 0 1 .79-.407L11 7.028V5.5a.5.5 0 0 1 1 0v5a.5.5 0 0 1-1 0V8.972l-2.71 1.935a.5.5 0 0 1-.79-.407V8.972l-2.71 1.935A.5.5 0 0 1 4 10.5v-5a.5.5 0 0 1 .271-.445z"/>
        </svg>
      </button>

      <div class="slider"></div>

      <button id="playButton" type="button" class="playbackControl playbackButton active" title="Play">
        <!-- icon url: https://icons.getbootstrap.com/icons/play-circle/ -->
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" class="bi bi-play-circle" viewBox="0 0 16 16">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
          <path d="M6.271 5.055a.5.5 0 0 1 .52.038l3.5 2.5a.5.5 0 0 1 0 .814l-3.5 2.5A.5.5 0 0 1 6 10.5v-5a.5.5 0 0 1 .271-.445z"/>
        </svg>
      </button>

      <button id="pauseButton" type="button" class="playbackControl playbackButton" title="Pause">
        <!-- icon url: https://icons.getbootstrap.com/icons/pause-circle/ -->
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" class="bi bi-pause-circle" viewBox="0 0 16 16">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
          <path d="M5 6.25a1.25 1.25 0 1 1 2.5 0v3.5a1.25 1.25 0 1 1-2.5 0v-3.5zm3.5 0a1.25 1.25 0 1 1 2.5 0v3.5a1.25 1.25 0 1 1-2.5 0v-3.5z"/>
        </svg>
      </button>

      <div class="devAvatars"></div>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    const goToNextCommentButton = this.shadowRoot.querySelector('#goToNextCommentButton');
    goToNextCommentButton.addEventListener('click', this.sendEventNextCommentClick);

    //build the slider
    this.buildPlaybackSlider();

    const playButton = this.shadowRoot.querySelector('#playButton');
    playButton.addEventListener('click', this.playClicked);

    const pauseButton = this.shadowRoot.querySelector('#pauseButton');
    pauseButton.addEventListener('click', this.pauseClicked);

    const devAvatars = this.shadowRoot.querySelector('.devAvatars');
    const devGroupAvatar = new DevGroupAvatar({
      developerGroupId: this.playbackEngine.activeDevGroupId, 
      developers: this.playbackEngine.playbackData.developers, 
      developerGroups: this.playbackEngine.playbackData.developerGroups
    });
    devAvatars.appendChild(devGroupAvatar);
  }

  disconnectedCallback() {
    const playButton = this.shadowRoot.querySelector('#playButton');
    playButton.removeEventListener('click', this.playClicked);

    const pauseButton = this.shadowRoot.querySelector('#pauseButton');
    pauseButton.removeEventListener('click', this.pauseClicked);

    const goToNextCommentButton = this.shadowRoot.querySelector('#goToNextCommentButton');
    goToNextCommentButton.removeEventListener('click', this.sendEventNextCommentClick);
  }

  playClicked = () => {
    this.sendEventPlayClick();
  }

  pauseClicked = () => {
    this.sendEventPauseClick();
  }
  
  updateForPlaybackMovement() {
    //if there has been a change in the dev group, update the dev avatars
    if(this.playbackEngine.mostRecentChanges.hasNewActiveDevGroup) {
      this.updateActiveDevGroup();
    }

    //update the slider to hold the new position
    const playbackSlider = this.shadowRoot.querySelector('st-playback-slider');
    playbackSlider.updateForPlaybackMovement();
  }

  updateForAddEditDeleteComment() {
    this.buildPlaybackSlider();
  }

  buildPlaybackSlider() {
    const slider = this.shadowRoot.querySelector('.slider');
    slider.innerHTML = '';
    const playbackSlider = new PlaybackSlider(this.playbackEngine);
    slider.appendChild(playbackSlider);
  }

  updateActiveDevGroup() {
    const devAvatars = this.shadowRoot.querySelector('.devAvatars');
    devAvatars.innerHTML = '';

    const devGroupAvatar = new DevGroupAvatar({
      developerGroupId: this.playbackEngine.activeDevGroupId, 
      developers: this.playbackEngine.playbackData.developers, 
      developerGroups: this.playbackEngine.playbackData.developerGroups
    });
    devAvatars.appendChild(devGroupAvatar);
  }

  updateForPlaybackPause() {
    this.updatePlayPauseButton(true);
  }
  
  updateForPlaybackPlay() {
    this.updatePlayPauseButton(false);
  }

  updatePlayPauseButton(isPaused) {
    const playButton = this.shadowRoot.querySelector('#playButton');
    const pauseButton = this.shadowRoot.querySelector('#pauseButton');

    //if paused, make the play button active
    if(isPaused) {
      pauseButton.classList.remove('active');
      playButton.classList.add('active');
    } else { //make the pause button active 
      pauseButton.classList.add('active');
      playButton.classList.remove('active');
    }
  }

  sendEventPlayClick() {
    const event = new CustomEvent('play-button-click', { 
      bubbles: true, 
      composed: true 
    });
    this.dispatchEvent(event);
  }

  sendEventPauseClick() {
    const event = new CustomEvent('pause-button-click', { 
      bubbles: true, 
      composed: true 
    });
    this.dispatchEvent(event);
  }

  sendEventNextCommentClick() {
    const event = new CustomEvent('next-comment-button-click', { 
      bubbles: true, 
      composed: true 
    });
    this.dispatchEvent(event);
  }
}

window.customElements.define('st-playback-controls', PlaybackControls);