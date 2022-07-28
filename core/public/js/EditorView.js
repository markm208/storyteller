class EditorView extends HTMLElement {
  constructor(playbackEngine, editorProperties) {
    super();

    this.editorProperties = editorProperties;
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
          flex-direction: column;
          height: 100%;
        }

        .editor {
          flex: 1;
        }
      </style>

      <div class="editor"></div>
      <div class="controls"></div>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    const editor = this.shadowRoot.querySelector('.editor');
    const aceEditor = new AceEditor(this.playbackEngine, this.editorProperties);
    editor.appendChild(aceEditor);

    const controls = this.shadowRoot.querySelector('.controls');
    const playbackControls = new PlaybackControls(this.playbackEngine);
    controls.appendChild(playbackControls);
  }

  disconnectedCallback() {
  }

  updateForCommentSelected() {
    const aceEditor = this.shadowRoot.querySelector('st-ace-editor');
    aceEditor.updateForCommentSelected();
  }

  updateForPlaybackMovement() {
    const aceEditor = this.shadowRoot.querySelector('st-ace-editor');
    aceEditor.updateForPlaybackMovement();

    const playbackControls = this.shadowRoot.querySelector('st-playback-controls');
    playbackControls.updateForPlaybackMovement();
  }

  updateForAddEditDeleteComment() {
    const playbackControls = this.shadowRoot.querySelector('st-playback-controls');
    playbackControls.updateForAddEditDeleteComment();
  }

  updateForFileSelected() {
    const aceEditor = this.shadowRoot.querySelector('st-ace-editor');
    aceEditor.updateForPlaybackMovement();
    aceEditor.updateForCommentSelected();
  }

  updateForPlaybackPause() {
    const playbackControls = this.shadowRoot.querySelector('st-playback-controls');
    playbackControls.updateForPlaybackPause();
  }
  
  updateForPlaybackPlay() {
    const playbackControls = this.shadowRoot.querySelector('st-playback-controls');
    playbackControls.updateForPlaybackPlay();
  }

  updateEditorFontSize(newFontSize) {
    const aceEditor = this.shadowRoot.querySelector('st-ace-editor');
    aceEditor.updateEditorFontSize(newFontSize);
  }

  updateHandleTextSelection(makeCodeSelectable, isEditedComment) {
    const aceEditor = this.shadowRoot.querySelector('st-ace-editor');
    aceEditor.updateHandleTextSelection(makeCodeSelectable, isEditedComment);
  }
  
  updateLinesAboveBelow(linesAbove, linesBelow) {
    const aceEditor = this.shadowRoot.querySelector('st-ace-editor');
    aceEditor.updateLinesAboveBelow(linesAbove, linesBelow);
  }

  updateToDisplaySearchResults(searchResults) {
    const aceEditor = this.shadowRoot.querySelector('st-ace-editor');
    aceEditor.updateToDisplaySearchResults(searchResults);
  }

  getSelectedCodeInfo() {
    const aceEditor = this.shadowRoot.querySelector('st-ace-editor');
    return aceEditor.getSelectedCodeInfo();
  }
}

window.customElements.define('st-editor-view', EditorView);