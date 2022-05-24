class CodeView extends HTMLElement {
  constructor(codeViewData) {
    super();

    this.editorProperties = codeViewData.editorProperties;
    this.width = codeViewData.playbackNavigatorWidth;
    this.playbackEngine = codeViewData.playbackEngine;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host {
          display: flex;
          height: 100%;
        }

        .playbackNavigatorSlot {
          flex: 0 0 auto;
        }

        .editorViewSlot {
          flex: 0 0 auto;
          padding: 1px 5px 0px 0px;
        }

        .dragBar {
          display: flex;
          align-items: center;
          cursor: col-resize;
          background-color: rgb(58,58,58);
        }
      </style>

      <div class="playbackNavigatorSlot"></div>
      <div class="dragBar" onmousedown="return false" onselectstart="return false">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="32" fill="gray" className="bi bi-grip-vertical" viewBox="4 2 8 8">
          <path d="M7 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
        </svg>
      </div>
      <div class="editorViewSlot"></div>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    //set the initial width of the elements
    this.setWidthInPixels(this.width);

    //add the playback navigator
    const playbackNavigatorSlot = this.shadowRoot.querySelector('.playbackNavigatorSlot');
    const playbackNavigator = new PlaybackNavigator(this.playbackEngine);
    playbackNavigatorSlot.appendChild(playbackNavigator);

    //add the editor view
    const editorViewSlot = this.shadowRoot.querySelector('.editorViewSlot');
    const editorView = new EditorView({
      editorProperties: this.editorProperties, 
      playbackEngine: this.playbackEngine
    });
    editorViewSlot.appendChild(editorView);

    //add the adjustable drag bar separating the playback nav and the editor view
    const dragBar = this.shadowRoot.querySelector('.dragBar');
    //events to handle dragging
    dragBar.addEventListener('mousedown', this.addMouseEventListeners);
    //for mobile devices add touch events too
    dragBar.addEventListener('touchstart', this.addTouchEventListeners);

    //double clicking the drag bar will divide the comment navigator and editor view 50/50
    dragBar.addEventListener('dblclick', (event)=>{
      const currentXPos = event.pageX;
      const codeView = this.shadowRoot.host;
      const screenWidthHalf = codeView.getBoundingClientRect().width / 2;
      if (screenWidthHalf != currentXPos){
        this.setWidthInPixels(screenWidthHalf);
      }
    });
  }

  disconnectedCallback() {
    const dragBar = this.shadowRoot.querySelector('.dragBar');
    dragBar.removeEventListener('mousedown', this.addMouseEventListeners);
    dragBar.removeEventListener('touchstart', this.addTouchEventListeners);
  }

  doDrag = event => {
    const codeView = this.shadowRoot.host;
    const codeViewWidth = codeView.getBoundingClientRect().width;
    const minWidth = .05 * codeViewWidth;
    const maxWidth = .95 * codeViewWidth;

    let newX = 0;
    //if this is a touch event
    if(event.touches) {
      newX = event.touches[0].pageX;
    } else { //it is a mouse down
      newX = event.pageX;
    }
    let newWidth = newX - codeView.offsetLeft;
    if(newWidth < minWidth) {
      newWidth = minWidth;
    } else if(newWidth >= maxWidth) {
      newWidth = maxWidth;
    }

    this.setWidthInPixels(newWidth);
    this.width = newWidth;
    this.sendEventNewWidth(newWidth);
  }

  stopDrag = event => {
    document.removeEventListener('mouseup', this.stopDrag, false);
    document.removeEventListener('mousemove', this.doDrag, false);  

    document.removeEventListener('touchend', this.stopDrag, false);
    document.removeEventListener('touchmove', this.doDrag, false);  
  }

  addMouseEventListeners = () => {
    document.addEventListener('mousemove', this.doDrag, false);
    document.addEventListener('mouseup', this.stopDrag, false);
  }

  addTouchEventListeners = () => {
    document.addEventListener('touchmove', this.doDrag, false);
    document.addEventListener('touchend', this.stopDrag, false);
  }

  setWidthInPixels(newWidth) {
    const codeView = this.shadowRoot.host;
    const codeViewWidth = codeView.getBoundingClientRect().width;

    const dragBar = this.shadowRoot.querySelector('.dragBar');
    const dragBarWidth = dragBar.getBoundingClientRect().width;

    const playbackNavigatorSlot = this.shadowRoot.querySelector('.playbackNavigatorSlot');
    const editorViewSlot = this.shadowRoot.querySelector('.editorViewSlot');

    playbackNavigatorSlot.style.width = newWidth + 'px';
    editorViewSlot.style.width = (codeViewWidth - dragBarWidth - newWidth) + 'px';
  }

  sendEventNewWidth(newWidth) {
    const event = new CustomEvent('code-view-width-change', { 
      detail: {width: newWidth}, 
      bubbles: true, 
      composed: true 
    });
    this.dispatchEvent(event);
  }

  updateSliderMoved(isPaused=true) {
    const editorView = this.shadowRoot.querySelector('st-editor-view');
    editorView.update(isPaused);

    const playbackNavigator = this.shadowRoot.querySelector('st-playback-navigator');
    playbackNavigator.updateSliderMoved();
  }

  updateSelectedComment() {
    const editorView = this.shadowRoot.querySelector('st-editor-view');
    editorView.update();

    const playbackNavigator = this.shadowRoot.querySelector('st-playback-navigator');
    playbackNavigator.updateSelectedComment();
  }

  updateActiveFile() {
    const editorView = this.shadowRoot.querySelector('st-editor-view');
    editorView.updateActiveFile();

    const playbackNavigator = this.shadowRoot.querySelector('st-playback-navigator');
    playbackNavigator.updateActiveFile();
  }

  performSearch(searchText){
    const playbackNavigator = this.shadowRoot.querySelector('st-playback-navigator');
    playbackNavigator.performSearch(searchText);
  }
}

window.customElements.define('st-code-view', CodeView);