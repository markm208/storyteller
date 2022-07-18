class PlaybackSlider extends HTMLElement {
  constructor(playbackEngine) {
    super();

    this.playbackEngine = playbackEngine;

    this.thumbWidth = 20;
    this.thumbBorderWidth = 1;
    this.totalThumbWidth = this.thumbWidth + (2 * this.thumbBorderWidth);

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        .slider {
          -webkit-appearance: none;  
          border: 1px solid gray;
          margin: 20px 0px;
          appearance: none;
          width: 100%; 
          height: 9px; 
          background: rgb(76, 76, 76); 
          outline: none; 
          opacity: 0.7; 
          -webkit-transition: .2s; 
          transition: opacity .2s;
        }

        .slider:hover {
          opacity: 1;
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: ${this.thumbWidth}px;
          height: 20px; 
          background: #3B4C62;
          cursor: pointer; 
          border: ${this.thumbBorderWidth}px solid #C9E2F2;
          opacity: 1;
          border-radius: 2px;
        }
        
        .slider::-moz-range-thumb {
          width: ${this.thumbWidth}px; 
          height: 20px;
          background: #3B4C62;
          cursor: pointer; 
          border: ${this.thumbBorderWidth}px solid #C9E2F2;
          opacity: 1;
          border-radius: 2px;
        }

        .commentMarker {
          width: 2px;
          background-color: inherit;
          position: absolute;
          top: -10px;
          border-left: 2px solid #C9E2F2;
          opacity: .65;
          cursor: pointer;
        }

        .commentMarker:hover {
          opacity: 1.0;
        }

        .pips {
          position: relative; 
          width: calc(100% - ${this.totalThumbWidth}px); /* room for 1/2 thumb on each side */
          margin-left: ${(this.totalThumbWidth / 2)}px; /* start 1/2 a thumb from the left to push the pips under the thumb */
        }
      </style>
      <input type="range" class="slider" step="1"></input>
      <div class="pips"></div>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    this.buildSliderAndPips();
  }

  disconnectedCallback() {
    const commentMarkers = this.shadowRoot.querySelectorAll('.commentMarker');
    commentMarkers.forEach(commentMarker => {
      commentMarker.removeEventListener('click', this.addPipEventHandler);
    });
  }

  buildSliderAndPips() {
    const slider = this.shadowRoot.querySelector('.slider');
    slider.setAttribute('min', this.playbackEngine.firstRelevantEventIndex - 1);
    slider.setAttribute('max', this.playbackEngine.playbackData.events.length - 1);
    slider.value = this.playbackEngine.currentEventIndex;
    slider.addEventListener('input', this.sliderMoved);

    const pips = this.shadowRoot.querySelector('.pips');
    pips.innerHTML = "";
    
    //get all of the comment positions from the playback engine
    const commentGroupEventPosisitons = this.playbackEngine.commentInfo.commentGroupPositions;
    commentGroupEventPosisitons.forEach(pos => {
      //calculate the percentage offset for every comment
      const percentageOffset = ((pos - this.playbackEngine.firstRelevantEventIndex + 1) / (this.playbackEngine.numRelevantEvents)) * 100.0;
      const commentMarker = document.createElement('div');
      commentMarker.innerHTML = '&nbsp;'
      commentMarker.setAttribute('data-pos', pos);
      commentMarker.classList.add('commentMarker');

      //set the left offset to the percentage calculated above
      commentMarker.setAttribute('style', `left: ${percentageOffset}%`);
      commentMarker.addEventListener('click', this.addPipEventHandler);
      pips.appendChild(commentMarker);
    });
  }

  addPipEventHandler = event => {
    const slider = this.shadowRoot.querySelector('.slider');
    const commentPosition = event.target.getAttribute('data-pos');
    slider.value = commentPosition;
    this.sendEventSliderClick(commentPosition);
    event.preventDefault();
    event.stopPropagation();
  }

  sliderMoved = event => {
    const newPosition = event.target.value;
    this.sendEventSliderClick(newPosition);
  }

  updateForPlaybackMovement() {
    //if there is a different number of comment groups than before
    if(this.playbackEngine.mostRecentChanges.numberOfCommentGroupsChanged) {
      //rebuild
      this.buildSliderAndPips();
    } else { //the comment groups have not changed
      const slider = this.shadowRoot.querySelector('.slider');
      //if the playback has moved update the slider
      if(slider.value !== this.playbackEngine.currentEventIndex) {
        slider.value = this.playbackEngine.currentEventIndex;
      }
    }
  }

  sendEventSliderClick(newPosition) {
    const event = new CustomEvent('slide-to-position', { 
      detail: {newPosition: newPosition}, 
      bubbles: true, 
      composed: true 
    });
    this.dispatchEvent(event);
  }
}

window.customElements.define('st-playback-slider', PlaybackSlider);