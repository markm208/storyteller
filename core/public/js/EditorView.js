class EditorView extends HTMLElement {
  constructor(editorViewData) {
    super();

    this.editorProperties = editorViewData.editorProperties;
    this.playbackEngine = editorViewData.playbackEngine;
    
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
    const aceEditor = new AceEditor({
      editorProperties: this.editorProperties,
      playbackEngine: this.playbackEngine
    });
    editor.appendChild(aceEditor);

    const controls = this.shadowRoot.querySelector('.controls');
    const playbackControls = new PlaybackControls(this.playbackEngine);
    controls.appendChild(playbackControls);
  }

  disconnectedCallback() {
  }

  update(isPaused=true) {
    const aceEditor = this.shadowRoot.querySelector('st-ace-editor');
    aceEditor.update();

    const playbackControls = this.shadowRoot.querySelector('st-playback-controls');
    playbackControls.update(isPaused);
  }

  updateActiveFile() {
    const aceEditor = this.shadowRoot.querySelector('st-ace-editor');
    aceEditor.update();
  }
}

window.customElements.define('st-editor-view', EditorView);