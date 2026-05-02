/**
 * NoteEditor - Component for editing personal notes on comments
 *
 * Features:
 * - Markdown textarea for note content
 * - Save/Cancel/Delete buttons
 * - Renders saved notes with markdown
 */
class NoteEditor extends HTMLElement {
  constructor(commentId, localStorageManager) {
    super();

    this.commentId = commentId;
    this.localStorageManager = localStorageManager;
    this.isEditing = false;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host {
          display: block;
          margin-top: 8px;
        }

        .note-container {
          background-color: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 4px;
          padding: 8px;
        }

        .note-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .note-label {
          font-size: 0.85em;
          color: rgba(96, 165, 250, 0.9);
          font-weight: 500;
        }

        .note-actions {
          display: flex;
          gap: 4px;
        }

        .action-button {
          background: none;
          border: 1px solid rgba(59, 130, 246, 0.5);
          color: rgba(96, 165, 250, 0.9);
          padding: 2px 8px;
          border-radius: 3px;
          font-size: 0.8em;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-button:hover {
          background-color: rgba(59, 130, 246, 0.2);
          border-color: rgba(59, 130, 246, 0.8);
        }

        .action-button.delete {
          border-color: rgba(239, 68, 68, 0.5);
          color: rgba(239, 68, 68, 0.8);
        }

        .action-button.delete:hover {
          background-color: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.8);
        }

        .action-button.save {
          border-color: rgba(34, 197, 94, 0.5);
          color: rgba(34, 197, 94, 0.8);
        }

        .action-button.save:hover {
          background-color: rgba(34, 197, 94, 0.2);
          border-color: rgba(34, 197, 94, 0.8);
        }

        .note-textarea {
          width: 100%;
          min-height: 80px;
          background-color: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          color: #e2e8f0;
          padding: 8px;
          font-family: inherit;
          font-size: 0.9em;
          resize: vertical;
          box-sizing: border-box;
        }

        .note-textarea:focus {
          outline: none;
          border-color: rgba(59, 130, 246, 0.5);
        }

        .note-textarea::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .note-content {
          font-size: 0.9em;
          color: #e2e8f0;
          line-height: 1.5;
        }

        .note-content p {
          margin: 0 0 8px 0;
        }

        .note-content p:last-child {
          margin-bottom: 0;
        }

        .note-content code {
          background-color: rgba(0, 0, 0, 0.3);
          padding: 1px 4px;
          border-radius: 3px;
          font-size: 0.9em;
        }

        .note-content pre {
          background-color: rgba(0, 0, 0, 0.3);
          padding: 8px;
          border-radius: 4px;
          overflow-x: auto;
        }

        .note-content pre code {
          background: none;
          padding: 0;
        }

        .note-meta {
          font-size: 0.75em;
          color: rgba(255, 255, 255, 0.4);
          margin-top: 8px;
        }

        .hidden {
          display: none;
        }
      </style>

      <div class="note-container">
        <div class="note-header">
          <span class="note-label">Personal Note</span>
          <div class="note-actions">
            <button class="action-button edit-button">Edit</button>
            <button class="action-button save save-button hidden">Save</button>
            <button class="action-button cancel-button hidden">Cancel</button>
            <button class="action-button delete delete-button hidden">Delete</button>
          </div>
        </div>
        <div class="note-view">
          <div class="note-content"></div>
          <div class="note-meta"></div>
        </div>
        <div class="note-edit hidden">
          <textarea class="note-textarea" placeholder="Write your note here... (supports Markdown)"></textarea>
        </div>
      </div>
    `;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    this.setupEventListeners();
    this.loadNote();
  }

  setupEventListeners() {
    const editButton = this.shadowRoot.querySelector('.edit-button');
    const saveButton = this.shadowRoot.querySelector('.save-button');
    const cancelButton = this.shadowRoot.querySelector('.cancel-button');
    const deleteButton = this.shadowRoot.querySelector('.delete-button');
    const textarea = this.shadowRoot.querySelector('.note-textarea');

    editButton.addEventListener('click', () => this.enterEditMode());
    saveButton.addEventListener('click', () => this.saveNote());
    cancelButton.addEventListener('click', () => this.cancelEdit());
    deleteButton.addEventListener('click', () => this.deleteNote());

    // Prevent keyboard events from propagating
    textarea.addEventListener('keydown', (e) => {
      e.stopPropagation();
      // Save on Ctrl+Enter or Cmd+Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        this.saveNote();
      }
      // Cancel on Escape
      if (e.key === 'Escape') {
        this.cancelEdit();
      }
    });
  }

  loadNote() {
    const noteData = this.localStorageManager.getNote(this.commentId);

    if (noteData) {
      this.displayNote(noteData);
    } else {
      // No note exists, show edit mode for new note
      this.enterEditMode(true);
    }
  }

  displayNote(noteData) {
    const noteView = this.shadowRoot.querySelector('.note-view');
    const noteEdit = this.shadowRoot.querySelector('.note-edit');
    const noteContent = this.shadowRoot.querySelector('.note-content');
    const noteMeta = this.shadowRoot.querySelector('.note-meta');
    const editButton = this.shadowRoot.querySelector('.edit-button');
    const saveButton = this.shadowRoot.querySelector('.save-button');
    const cancelButton = this.shadowRoot.querySelector('.cancel-button');
    const deleteButton = this.shadowRoot.querySelector('.delete-button');

    // Render markdown
    const md = markdownit();
    noteContent.innerHTML = md.render(noteData.text);

    // Show last edited time
    const editedDate = LocalStorageManager.formatDate(noteData.lastEdited);
    noteMeta.textContent = `Last edited: ${editedDate}`;

    // Show view mode
    noteView.classList.remove('hidden');
    noteEdit.classList.add('hidden');

    // Show edit and delete buttons
    editButton.classList.remove('hidden');
    deleteButton.classList.remove('hidden');
    saveButton.classList.add('hidden');
    cancelButton.classList.add('hidden');

    this.isEditing = false;
  }

  enterEditMode(isNew = false) {
    const noteView = this.shadowRoot.querySelector('.note-view');
    const noteEdit = this.shadowRoot.querySelector('.note-edit');
    const textarea = this.shadowRoot.querySelector('.note-textarea');
    const editButton = this.shadowRoot.querySelector('.edit-button');
    const saveButton = this.shadowRoot.querySelector('.save-button');
    const cancelButton = this.shadowRoot.querySelector('.cancel-button');
    const deleteButton = this.shadowRoot.querySelector('.delete-button');

    // Load existing note text into textarea
    const noteData = this.localStorageManager.getNote(this.commentId);
    textarea.value = noteData ? noteData.text : '';

    // Show edit mode
    noteView.classList.add('hidden');
    noteEdit.classList.remove('hidden');

    // Show save and cancel buttons
    editButton.classList.add('hidden');
    saveButton.classList.remove('hidden');
    cancelButton.classList.remove('hidden');

    // Show delete button only if note exists
    if (noteData) {
      deleteButton.classList.remove('hidden');
    } else {
      deleteButton.classList.add('hidden');
    }

    // Focus textarea
    textarea.focus();

    this.isEditing = true;
  }

  saveNote() {
    const textarea = this.shadowRoot.querySelector('.note-textarea');
    const text = textarea.value.trim();

    if (text) {
      this.localStorageManager.saveNote(this.commentId, text);
      const noteData = this.localStorageManager.getNote(this.commentId);
      this.displayNote(noteData);

      // Dispatch event to update note indicator
      this.dispatchEvent(new CustomEvent('note-saved', {
        detail: { commentId: this.commentId, hasNote: true },
        bubbles: true,
        composed: true
      }));
    } else {
      // Empty note, treat as delete
      this.deleteNote();
    }
  }

  cancelEdit() {
    const noteData = this.localStorageManager.getNote(this.commentId);

    if (noteData) {
      this.displayNote(noteData);
    } else {
      // No note exists, close the editor
      this.dispatchEvent(new CustomEvent('note-cancelled', {
        detail: { commentId: this.commentId },
        bubbles: true,
        composed: true
      }));
    }
  }

  deleteNote() {
    if (confirm('Are you sure you want to delete this note?')) {
      this.localStorageManager.deleteNote(this.commentId);

      // Dispatch event to update note indicator and close editor
      this.dispatchEvent(new CustomEvent('note-deleted', {
        detail: { commentId: this.commentId },
        bubbles: true,
        composed: true
      }));
    }
  }
}

window.customElements.define('st-note-editor', NoteEditor);
