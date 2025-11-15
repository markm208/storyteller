class OptionsMenu extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host {
          position: relative;
        }
        .modal-opener {
          background: transparent;
          border: none;
          color: #adb5bd;
          cursor: pointer;
          padding: 9px 4px 0px 0px;
          opacity: 0.8;
          transition: opacity 0.2s;
        }
        .modal-opener:hover {
          opacity: 1;
        }
        .modal {
          display: none;
          position: fixed;
          z-index: 1001; /* Ensure it's on top */
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0,0,0,0.6);
          -webkit-backdrop-filter: blur(4px);
          backdrop-filter: blur(4px);
        }
        .modal.visible {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-content {
          width: 90%;
          max-width: 550px;
          background-color: #2c2c2c;
          border-radius: 8px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.5);
          color: #f0f0f0;
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .modal-header {
          padding: 16px;
          border-bottom: 1px solid #444;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modal-title {
          font-size: 1.25rem;
          margin: 0;
        }
        .close-button {
          background: transparent;
          border: none;
          color: #aaa;
          font-size: 28px;
          font-weight: bold;
          cursor: pointer;
          line-height: 1;
        }
        .modal-body {
          padding: 0;
        }
        .tab-container {
          display: flex;
          background-color: #383838;
          padding: 0 16px;
        }
        .tab-link {
          background-color: transparent;
          border: none;
          color: #aaa;
          cursor: pointer;
          padding: 12px 16px;
          font-size: 1rem;
          border-bottom: 3px solid transparent;
          transition: all 0.2s;
        }
        .tab-link:hover {
          color: #fff;
        }
        .tab-link.active-tab {
          color: #fff;
          border-bottom: 3px solid #3B4C62;
        }
        .tab-content {
          display: none;
          padding: 24px;
        }
        .tab-content.active {
          display: block;
        }
        
        /* Options Tab Styles */
        .option-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 0;
          border-bottom: 1px solid #383838;
        }
        .option-row:last-child {
          border-bottom: none;
        }
        .option-label {
          font-size: 1rem;
        }
        .option-controls {
          display: flex;
          gap: 10px;
        }
        .btn {
          background-color: #444;
          border: 1px solid #666;
          color: #f0f0f0;
          padding: 8px 16px;
          border-radius: 5px;
          cursor: pointer;
          transition: background-color 0.2s, border-color 0.2s;
        }
        .btn:hover {
          background-color: #555;
          border-color: #888;
        }
        .tts-radios label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }
        .tts-radios input[type="radio"] {
          cursor: pointer;
        }
        
        /* Shortcuts Tab Styles */
        .shortcuts-container h3 {
          margin-top: 24px;
          margin-bottom: 12px;
          color: #ccc;
          border-bottom: 1px solid #444;
          padding-bottom: 8px;
        }
        .shortcuts-container h3:first-child {
          margin-top: 0;
        }
        .shortcut-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
        }
        .shortcut-action {
          color: #ddd;
        }
        .shortcut-keys {
          text-align: right;
        }
        .shortcut-keys code {
          background-color: #444;
          border: 1px solid #555;
          border-radius: 4px;
          padding: 2px 6px;
          font-family: Consolas, "Courier New", monospace;
          color: #f0f0f0;
          margin: 0 2px;
        }

        .option-description {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .shortcut-hint {
          font-size: 0.8rem;
          color: #aaa;
          margin-top: 4px;
        }

        .shortcut-hint code {
          background-color: #444;
          border: 1px solid #555;
          border-radius: 4px;
          padding: 2px 6px;
          font-family: Consolas, "Courier New", monospace;
          color: #f0f0f0;
          margin: 0 2px;
        }
      </style>
    
      <button id='modal-opener' class='modal-opener' title='Options Menu'>
        <svg width='20' height='20' viewBox='0 0 16 16' fill='currentColor' xmlns='http://www.w3.org/2000/svg'>
          <path fill-rule='evenodd' d='M8.932.727c-.243-.97-1.62-.97-1.864 0l-.071.286a.96.96 0 0 1-1.622.434l-.205-.211c-.695-.719-1.888-.03-1.613.931l.08.284a.96.96 0 0 1-1.186 1.187l-.284-.081c-.96-.275-1.65.918-.931 1.613l.211.205a.96.96 0 0 1-.434 1.622l-.286.071c-.97.243-.97 1.62 0 1.864l.286.071a.96.96 0 0 1 .434 1.622l-.211.205c-.719.695-.03 1.888.931 1.613l.284-.08a.96.96 0 0 1 1.187 1.187l-.081.283c-.275.96.918 1.65 1.613.931l.205-.211a.96.96 0 0 1 1.622.434l.071.286c.243.97 1.62.97 1.864 0l.071-.286a.96.96 0 0 1 1.622-.434l.205.211c.695.719 1.888.03 1.613-.931l-.08-.284a.96.96 0 0 1 1.187-1.187l.283.081c.96.275 1.65-.918.931-1.613l-.211-.205a.96.96 0 0 1 .434-1.622l.286-.071c.97-.243.97-1.62 0-1.864l-.286-.071a.96.96 0 0 1-.434-1.622l.211-.205c.719-.695.03-1.888-.931-1.613l-.284.08a.96.96 0 0 1-1.187-1.186l.081-.284c.275-.96-.918-1.65-1.613-.931l-.205.211a.96.96 0 0 1-1.622-.434L8.932.727zM8 12.997a4.998 4.998 0 1 0 0-9.995 4.998 4.998 0 0 0 0 9.996z'/>
        </svg>
      </button>

      <div class='modal'>
        <div class='modal-content'>
          <div class='modal-header'>
            <h2 class='modal-title'>Playback Options</h2>
            <button type='button' class='close-button'>&times;</button>
          </div>
          <div class='modal-body'>
            <div class='tab-container'>
              <button class='tab-link active-tab' data-tab='Options'>Options</button>
              <button class='tab-link' data-tab='Shortcuts'>Keyboard Shortcuts</button>
            </div>
            
            <div id='Options' class='tab-content active'>
              <div class='option-row'>
                <div class="option-description">
                  <span class='option-label'>Code Editor Font Size</span>
                  <span class="shortcut-hint">
                    Shortcut: <code>Ctrl</code> + <code>Shift</code> + <code>↑</code> / <code>↓</code>
                  </span>
                </div>
                <div class='option-controls'>
                  <button id='textSmallerButton' class='btn'>Smaller</button>
                  <button id='textBiggerButton' class='btn'>Bigger</button>
                </div>
              </div>
              <div class='option-row'>
                <div class="option-description">
                  <span class='option-label'>Automatic Playback Speed</span>
                  <span class="shortcut-hint">
                    Manual Stepping: <code>←</code> / <code>→</code>
                  </span>
                </div>
                <div class='option-controls'>
                  <button id='playbackSpeedDown' class='btn'>Slower</button>
                  <button id='playbackSpeedUp' class='btn'>Faster</button>
                </div>
              </div>
              <div class='option-row'>
                <span class='option-label'>Text-to-Speech Speed</span>
                <div class='option-controls tts-radios'>
                  <label><input type='radio' name='ttsSpeed' value='1' checked> 1x</label>
                  <label><input type='radio' name='ttsSpeed' value='1.25'> 1.25x</label>
                  <label><input type='radio' name='ttsSpeed' value='1.5'> 1.5x</label>
                </div>
              </div>
            </div>
            <div id='Shortcuts' class='tab-content'>
                <div class="shortcuts-container">
                    <h3>Playback Navigation</h3>
                    <div class="shortcut-row">
                        <span class="shortcut-action">Next / Previous Event</span>
                        <span class="shortcut-keys"><code>→</code> / <code>←</code></span>
                    </div>
                    <div class="shortcut-row">
                        <span class="shortcut-action">Next / Previous Comment</span>
                        <span class="shortcut-keys"><code>Shift</code> + <code>→</code> / <code>←</code></span>
                    </div>
                    <div class="shortcut-row">
                        <span class="shortcut-action">End / Start of Playback</span>
                        <span class="shortcut-keys"><code>Ctrl</code> + <code>Shift</code> + <code>→</code> / <code>←</code></span>
                    </div>
                    <div class="shortcut-row">
                        <span class="shortcut-action">Toggle Play / Pause</span>
                        <span class="shortcut-keys"><code>Spacebar</code></span>
                    </div>

                    <h3>General Application</h3>
                    <div class="shortcut-row">
                        <span class="shortcut-action">Focus the Search Bar</span>
                        <span class="shortcut-keys"><code>/</code></span>
                    </div>
                    <div class="shortcut-row">
                      <span class="shortcut-action">Open Media Picker</span>
                      <span class="shortcut-keys"><code>Shift</code> + <code>/</code></span>
                    </div>
                     <div class="shortcut-row">
                        <span class="shortcut-action">Play/Pause Comment Audio</span>
                        <span class="shortcut-keys"><code>P</code></span>
                    </div>

                    <h3>Editor & Comments</h3>
                    <div class="shortcut-row">
                        <span class="shortcut-action">Increase / Decrease Font Size</span>
                        <span class="shortcut-keys"><code>Ctrl</code> + <code>Shift</code> + <code>↑</code> / <code>↓</code></span>
                    </div>
                    <div class="shortcut-row">
                        <span class="shortcut-action">Filter Comments in Selection</span>
                        <span class="shortcut-keys"><code>Ctrl</code> + <code>Shift</code> + <code>S</code></span>
                    </div>
                    <div class="shortcut-row">
                        <span class="shortcut-action">Add New Comment</span>
                        <span class="shortcut-keys"><code>Ctrl</code> + <code>Shift</code> + <code>Enter</code></span>
                    </div>
                </div>
            </div>

          </div>
        </div>
      </div>
    `;
    return template.content.cloneNode(true);
  }

  connectedCallback() {
    this.shadowRoot.querySelector('#modal-opener').addEventListener('click', this.showModal);
    this.shadowRoot.querySelector('.close-button').addEventListener('click', this.hideModal);
    this.shadowRoot.querySelector('.modal').addEventListener('click', (event) => {
        if (event.target === this.shadowRoot.querySelector('.modal')) {
            this.hideModal();
        }
    });

    // Tab functionality
    this.shadowRoot.querySelectorAll('.tab-link').forEach(tabLink => {
      tabLink.addEventListener('click', this.handleTabClick);
    });

    // Options functionality
    this.shadowRoot.querySelector('#playbackSpeedDown').addEventListener('click', this.decreasePlaybackSpeed);
    this.shadowRoot.querySelector('#playbackSpeedUp').addEventListener('click', this.increasePlaybackSpeed);
    this.shadowRoot.querySelector('#textSmallerButton').addEventListener('click', this.decreaseFontSize);
    this.shadowRoot.querySelector('#textBiggerButton').addEventListener('click', this.increaseFontSize);
    this.shadowRoot.querySelectorAll('input[name="ttsSpeed"]').forEach(radio => {
        radio.addEventListener('change', this.changeTTSSpeed);
    });
  }

  disconnectedCallback() {
  }

  showModal = () => {
    this.shadowRoot.querySelector('.modal').classList.add('visible');
  }

  hideModal = () => {
    this.shadowRoot.querySelector('.modal').classList.remove('visible');
  }

  handleTabClick = (event) => {
    const clickedTab = event.target;
    const tabName = clickedTab.dataset.tab;

    // Update active state for tabs
    this.shadowRoot.querySelectorAll('.tab-link').forEach(tab => tab.classList.remove('active-tab'));
    clickedTab.classList.add('active-tab');

    // Update active state for content
    this.shadowRoot.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    this.shadowRoot.querySelector(`#${tabName}`).classList.add('active');
  }
  
  increasePlaybackSpeed = () => {
    this.dispatchEvent(new CustomEvent('increase-playback-speed', { bubbles: true, composed: true }));
  }

  decreasePlaybackSpeed = () => {
    this.dispatchEvent(new CustomEvent('decrease-playback-speed', { bubbles: true, composed: true }));
  }

  increaseFontSize = () => {
    this.dispatchEvent(new CustomEvent('increase-font', { bubbles: true, composed: true }));
  }

  decreaseFontSize = () => {
    this.dispatchEvent(new CustomEvent('decrease-font', { bubbles: true, composed: true }));
  }

  changeTTSSpeed = (event) => {
    const speed = parseFloat(event.target.value);
    this.dispatchEvent(new CustomEvent('change-tts-speed', {
      detail: { speed },
      bubbles: true,
      composed: true
    }));
  }
}

window.customElements.define('st-options-menu', OptionsMenu);
