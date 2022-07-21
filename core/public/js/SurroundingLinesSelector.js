class SurroundingLinesSelector extends HTMLElement {
  constructor(rotateAngle, prompt, numLinesInFile) {
    super();
    //the number of surrounding lines that the user has selected
    this.surroundingLines = 0;

    //turns the normally horizontal slider into a vertical one
    //since this is rotated all of the heights and widths will be reversed on the slider
    this.rotateAngle = rotateAngle;
    
    //lets the user know if this is above or below selected text
    this.prompt = prompt;
    
    //the total number of lines in the current file
    this.numLinesInFile = numLinesInFile;
    
    //timer for surrounding text
    this.surroundingTextTimerId = null;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
    <style>
      input[type=range] {
        appearance: none;
        -webkit-appearance: none;
        height: 30px;
        width: 50px;
        background-color: inherit;
        margin: 20px 0px;
        opacity: 0.7; 
        -webkit-transition: .2s; 
        transition: opacity .2s;
        cursor: pointer;
      }
      input[type=range]:hover {
        opacity: 1;
      }
      
      input[type=range]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        margin-top: -5px;
        width: 14px;
        height: 14px; 
        background: #3B4C62;
        border: 1px solid #C9E2F2;
        opacity: 1;
        border-radius: 2px;
      }
      input[type=range]::-moz-range-thumb {
        width: 14px; 
        height: 14px;
        background: #3B4C62;
        border: 1px solid #C9E2F2;
        opacity: 1;
        border-radius: 2px;
      }

      input[type=range]::-webkit-slider-runnable-track {
        background-color: rgb(76, 76, 76);
        height: 6px;
        border: 1px solid gray;
      }
      input[type=range]::-moz-range-track {
        background-color: rgb(76, 76, 76);
        height: 4px;
        border: 1px solid gray;
      }

      #slider {
        transform: rotate(${this.rotateAngle}deg);
      }

      .linesAroundDiv {
        display: flex;
        align-items: center;
        margin: -8px -5px;
        padding: 0px;
      }
    </style>

    <div class="linesAroundDiv">
      <input type="range" id="slider" value="0" min="-1" max="1" step="1" title="Drag to select lines around the selected code"/>
      <span id="lineDisplay" title="Highlight the code around the selected code.">${this.surroundingLines} Lines ${this.prompt}</span>
    </div>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    const slider = this.shadowRoot.querySelector('#slider');

    //every time the slider changes
    slider.addEventListener('input', event => {
      //handle the first move
      this.moveCheck();

      //start selecting if there is a continuous selection of the slider
      this.startSelecting();
    });

    //mouse up
    slider.addEventListener('mouseup', event => {
      //move the slider back to the center
      slider.value = '0';
      
      //clear the timer 
      clearInterval(this.surroundingTextTimerId);
      this.surroundingTextTimerId = null;

      //lose the focus
      slider.blur();
    });
  }

  disconnectedCallback() {
  }

  startSelecting() {
    //if the timer is not currently active
    if(!this.surroundingTextTimerId) {  
      //start the timer to repeat the following code
      this.surroundingTextTimerId = setInterval(this.moveCheck, 220);
    }
  }

  moveCheck = () => {
    const slider = this.shadowRoot.querySelector('#slider');

    //get the current value of the range input
    const currentSliderInputValue = Number(slider.value);

    //if the slider is at one of the extremes (-1, or 1)
    if(currentSliderInputValue === 1) {
      //if there is more room to move 
      if((this.surroundingLines + 1) <= this.numLinesInFile) {
        //update the number input
        this.setValue(this.surroundingLines + 1);
        this.sendEventNotifyLinesAboveBelowChange();
      }
    } else if(currentSliderInputValue === -1) {
      //if there is more room to move 
      if((this.surroundingLines - 1) >= 0) {
        //update the number input
        this.setValue(this.surroundingLines - 1);
        this.sendEventNotifyLinesAboveBelowChange();
      }
    } else if(currentSliderInputValue === 0) { //changed to 0
      //stop the timer (if its running)
      clearInterval(this.surroundingTextTimerId);
      this.surroundingTextTimerId = null;
    }
  }

  getValue() {
    return this.surroundingLines;
  }

  setValue(newValue) {
    //store the new value
    this.surroundingLines = newValue;
    
    //display the new value
    const lineDisplay = this.shadowRoot.querySelector('#lineDisplay');
    lineDisplay.innerHTML = `${this.surroundingLines} Line${this.surroundingLines !== 1 ? 's' : ''} ${this.prompt}`;
  }

  setMax(max) {
    //update the max number of lines in the file
    this.numLinesInFile = max;
  }

  sendEventNotifyLinesAboveBelowChange = () => {
    const customEvent = new CustomEvent('surrounding-lines-change', { 
      bubbles: true, 
      composed: true 
    });
    this.dispatchEvent(customEvent);
  }
}

window.customElements.define('st-surrounding-lines-selector', SurroundingLinesSelector);