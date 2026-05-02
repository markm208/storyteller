class BlogComponent extends HTMLElement {
  constructor(playbackEngine, comment) {
    super();
    this.playbackEngine = playbackEngine;
    this.comment = comment;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 14px 10px;
          margin: 0 0 24px 0;
          background-color: rgba(255, 255, 255, 0.03);
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          position: relative;
        }

        :host::after {
          content: '•  •  •';
          position: absolute;
          bottom: -18px;
          left: 50%;
          transform: translateX(-50%);
          color: rgba(255, 255, 255, 0.3);
          font-size: 12px;
          letter-spacing: 2px;
          pointer-events: none;
        }

        :host(:last-of-type)::after {
          content: none;
        }

        :host(.activeComment) {
          background-color: rgb(40, 40, 40);
        }

        :host(.descriptionComment) {
          font-size: 1.2em;
        }

        a {
          color: lightblue;
        }
        a:visited {
          color: lightblue;
        }
        a:hover {
          opacity: 80%;
        }
        
        .blogModeVideo, .blogModeAudio, .blogModePicture {
          width: 75%;
        }

        .commentFileName {
          color: gray;
        }

        .mediaDiv {
          display: flex;
          justify-content: center;
          padding: 10px 0px 5px 0px;
        }

        .commentTitle {
          padding: 8px;
          margin-left: -8px;
          font-size: 1.3em;
        }
        .searchHighlight {
          background-color: #517EB0;
        }

        #aiInput {
          margin-top: 5px;
          padding-top: 5px;
          border-top: 1px solid rgb(83, 84, 86);
        }

        .ai-question-wrapper {
          position: relative;
        }

        .ai-question-delete {
          position: absolute;
          top: 8px;
          right: 15px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: none;
          background-color: transparent;
          color: inherit;
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.6;
          transition: opacity 0.2s, background-color 0.2s;
        }

        .ai-question-delete:hover {
          opacity: 1;
          background-color: rgba(255, 255, 255, 0.1);
        }

        .questions-collapsible {
          margin-top: 8px;
        }

        .questions-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 11px 10px;
          margin-bottom: 10px;
          background-color: transparent;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          cursor: pointer;
          font-size: 0.9em;
          color: rgba(255, 255, 255, 0.7);
          transition: color 0.2s;
        }

        .questions-header:hover {
          color: rgba(255, 255, 255, 0.9);
        }

        .questions-header .arrow {
          font-size: 10px;
          transition: transform 0.2s;
        }

        .questions-header.collapsed .arrow {
          transform: rotate(-90deg);
        }

        .questions-content {
          overflow: hidden;
        }

        .questions-content.collapsed {
          max-height: 0 !important;
          transition: max-height 0.3s ease-out;
        }

        /* Notes section styles */
        .notes-section {
          margin-top: 8px;
        }

        .add-note-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background-color: transparent;
          border: 1px dashed rgba(255, 255, 255, 0.3);
          border-radius: 4px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.9em;
          cursor: pointer;
          transition: all 0.2s;
        }

        .add-note-button:hover {
          border-color: rgba(255, 255, 255, 0.5);
          color: rgba(255, 255, 255, 0.8);
        }

        .note-collapsible {
          margin-top: 8px;
        }

        .note-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 10px;
          background-color: transparent;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          cursor: pointer;
          font-size: 0.9em;
          color: rgba(255, 255, 255, 0.7);
          transition: color 0.2s, border-bottom-color 0.2s;
        }

        .note-header:hover {
          color: rgba(255, 255, 255, 0.9);
        }

        .note-header.collapsed {
          border-bottom-color: transparent;
        }

        .note-header-left {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .note-header .arrow {
          font-size: 10px;
          transition: transform 0.2s;
        }

        .note-header.collapsed .arrow {
          transform: rotate(-90deg);
        }

        .note-actions {
          display: flex;
          gap: 8px;
        }

        .note-action-btn {
          padding: 4px 10px;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 3px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.85em;
          cursor: pointer;
          min-height: 32px;
          transition: all 0.2s;
        }

        .note-action-btn:hover {
          border-color: rgba(255, 255, 255, 0.5);
          color: rgba(255, 255, 255, 0.9);
        }

        .note-action-btn.delete {
          border-color: rgba(239, 68, 68, 0.5);
          color: rgba(239, 68, 68, 0.8);
        }

        .note-action-btn.delete:hover {
          border-color: rgba(239, 68, 68, 0.8);
          color: rgba(239, 68, 68, 1);
        }

        .note-action-btn.save {
          border-color: rgba(34, 197, 94, 0.5);
          color: rgba(34, 197, 94, 0.8);
        }

        .note-action-btn.save:hover {
          border-color: rgba(34, 197, 94, 0.8);
          color: rgba(34, 197, 94, 1);
        }

        .note-content {
          overflow: hidden;
        }

        .note-content.collapsed {
          max-height: 0 !important;
          transition: max-height 0.3s ease-out;
        }

        .note-view {
          padding: 10px;
          font-size: 0.95em;
          line-height: 1.5;
          color: #e2e8f0;
        }

        .note-view p {
          margin: 0 0 8px 0;
        }

        .note-view p:last-child {
          margin-bottom: 0;
        }

        .note-view code {
          background-color: rgba(0, 0, 0, 0.3);
          padding: 1px 4px;
          border-radius: 3px;
          font-size: 0.9em;
        }

        .note-view pre {
          background-color: rgba(0, 0, 0, 0.3);
          padding: 8px;
          border-radius: 4px;
          overflow-x: auto;
        }

        .note-edit {
          padding: 10px;
        }

        .note-textarea {
          width: 100%;
          min-height: 120px;
          background-color: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          color: #e2e8f0;
          padding: 10px;
          font-family: inherit;
          font-size: 0.95em;
          resize: vertical;
          box-sizing: border-box;
        }

        .note-textarea:focus {
          outline: none;
          border-color: rgba(255, 255, 255, 0.4);
        }

        .note-textarea::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .note-meta {
          font-size: 0.75em;
          color: rgba(255, 255, 255, 0.4);
          padding: 0 10px 10px 10px;
        }

        .hidden {
          display: none !important;
        }
      </style>

      <div class="tts-container"></div>
      <div class="commentTitle"></div>
      <div class="blogCommentText"></div>
      <div class="commentVideos"></div>
      <div class="commentAudios"></div>
      <div class="codeEditor"></div>
      <div class="commentImages"></div>
      <div class="tagContainer"></div>
      <div class="questions-section"></div>
      <div class="notes-section"></div>
      <div id="aiInput"></div>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    //if there is a comment title add it
    if(this.comment.commentTitle) {
      const commentTitle = this.shadowRoot.querySelector('.commentTitle');
      commentTitle.innerHTML = this.comment.commentTitle;
    }

    //add the comment text
    const blogCommentText = this.shadowRoot.querySelector('.blogCommentText');
    let commentText = this.comment.commentText;
    if(this.comment.textFormat && this.comment.textFormat === "markdown") {
      const md = markdownit();
      commentText = md.render(this.comment.commentText);
    }
    blogCommentText.innerHTML = commentText;
    
    //text to speech control
    const ttsContainer = this.shadowRoot.querySelector('.tts-container');
    let ttsControl;
    //if this comment has a tts file path
    if(this.comment.ttsFilePath) {
      //create a tts control with the file path
      ttsControl = new TextToSpeechControl(this.comment.ttsFilePath, null, this.playbackEngine.editorProperties.ttsSpeed);
      ttsContainer.appendChild(ttsControl);
    } else if(this.playbackEngine.playbackData.aiEnabled) { //no tts file path in this comment
      //create a tts control with the comment text
      ttsControl = new TextToSpeechControl(null, this.comment.commentTitle + " " + this.comment.commentText, this.playbackEngine.editorProperties.ttsSpeed);
      ttsContainer.appendChild(ttsControl);
    } //else- no tts control
    
    //add the media
    //videos
    const commentVideos = this.shadowRoot.querySelector('.commentVideos');
    if (this.comment.videoURLs.length > 0) {
      this.comment.videoURLs.forEach(url => {
        const video = document.createElement('video');
        video.setAttribute('controls', '');
        video.setAttribute('src', url);
        video.classList.add('blogModeVideo');

        const videoDiv = document.createElement('div');
        videoDiv.classList.add('mediaDiv');
        videoDiv.appendChild(video);
        commentVideos.appendChild(videoDiv);
      });
    }
    //audios
    const commentAudios = this.shadowRoot.querySelector('.commentAudios');
    if (this.comment.audioURLs.length > 0) {
      this.comment.audioURLs.forEach(url => {
        const audio = document.createElement('audio');
        audio.setAttribute('controls', '');
        audio.setAttribute('src', url);
        audio.classList.add('blogModeAudio');

        const audioDiv = document.createElement('div');
        audioDiv.classList.add('mediaDiv');
        audioDiv.appendChild(audio);
        commentAudios.appendChild(audioDiv);
      });
    }

    //if there is some code to display
    if (this.comment.selectedCodeBlocks[0]) {
      //create a code snippet
      const blogCodeSnippet = new BlogCodeSnippet(this.comment, this.playbackEngine);
      const codeEditor = this.shadowRoot.querySelector('.codeEditor');
      codeEditor.appendChild(blogCodeSnippet);
    }

    //images
    const commentImages = this.shadowRoot.querySelector('.commentImages');
    if (this.comment.imageURLs.length > 0) {
      const imageGallery = new ImageGallery(this.comment.imageURLs, false);
      commentImages.appendChild(imageGallery);
    }

    //if there are any comment tags
    if(this.comment.commentTags.length > 0) {
      //create a label
      const tagContainer = this.shadowRoot.querySelector('.tagContainer');
      const tagView = new TagView(this.comment);
      tagContainer.appendChild(tagView);
    }

    //if there is a q&a or saved AI questions, create the collapsible container
    const localStorageManager = window.storytellerLocalStorage;
    const hasAuthorQuestion = this.comment.questionCommentData && this.comment.questionCommentData.question;
    const savedAIQuestions = localStorageManager ?
      localStorageManager.getAIQuestionsForComment(this.comment.id) : [];

    if (hasAuthorQuestion || savedAIQuestions.length > 0) {
      const questionsSection = this.shadowRoot.querySelector('.questions-section');
      const collapsible = this.createQuestionsCollapsible();
      questionsSection.appendChild(collapsible);

      const content = collapsible.querySelector('.questions-content');

      // Add author question first
      if (hasAuthorQuestion) {
        const qaView = new QuestionAnswerView(this.comment);
        content.appendChild(qaView);
      }

      // Add saved AI questions
      savedAIQuestions.forEach(savedQuestion => {
        const wrapper = this.createAIQuestionWrapper(savedQuestion);
        content.appendChild(wrapper);
      });

      this.updateQuestionsCount();
    }

    // Initialize notes section
    this.initializeNotesSection();

    //ai input
    if(!this.isDescriptionComment && this.playbackEngine.playbackData.aiEnabled) {
      //create an AI input to get suggestions
      const aiInput = this.shadowRoot.querySelector('#aiInput');
      const aiAssistant = new AIAssistant(this.playbackEngine, false, window.storytellerLocalStorage, this.comment.id);
      aiInput.appendChild(aiAssistant);
      aiInput.classList.add('aiInput');

      // Listen for newly generated AI questions
      aiAssistant.addEventListener('ai-question-saved', (event) => {
        const { savedQuestion, commentId } = event.detail;
        if (commentId === this.comment.id) {
          const collapsible = this.getOrCreateQuestionsContainer();
          const content = collapsible.querySelector('.questions-content');
          const wrapper = this.createAIQuestionWrapper(savedQuestion);
          content.appendChild(wrapper);
          this.updateQuestionsCount();

          // Expand to show the new question
          const header = collapsible.querySelector('.questions-header');
          header.classList.remove('collapsed');
          content.classList.remove('collapsed');
          content.style.maxHeight = '';
        }
      });

      // Listen for Q&A saved to notes
      aiAssistant.addEventListener('note-saved', (event) => {
        const { commentId } = event.detail;
        if (commentId === this.comment.id) {
          this.refreshNotesSection();
        }
      });

      // Listen for request to open note editor
      aiAssistant.addEventListener('open-note-editor', (event) => {
        const { commentId } = event.detail;
        if (commentId === this.comment.id) {
          this.expandNotesSection();
        }
      });
    }

    //add an event handler so users can click comments
    this.addEventListener('click', event => {
      //move to the comment that is clicked
      this.playbackEngine.stepToCommentById(this.comment.id);

      //mark comment as viewed if storage manager is available
      if (window.storytellerLocalStorage) {
        window.storytellerLocalStorage.markCommentViewed(this.comment.id);
      }
    });
  }

  disconnectedCallback() {
  }

  /**
   * Create the collapsible container for all questions
   */
  createQuestionsCollapsible() {
    const container = document.createElement('div');
    container.className = 'questions-collapsible';

    const header = document.createElement('div');
    header.className = 'questions-header';
    header.innerHTML = `
      <span class="arrow">▼</span>
      <span class="questions-label">Questions (<span class="questions-count">0</span>)</span>
    `;

    const content = document.createElement('div');
    content.className = 'questions-content';

    header.addEventListener('click', (e) => {
      e.stopPropagation();
      header.classList.toggle('collapsed');
      content.classList.toggle('collapsed');

      // Clear inline max-height when expanded so content can grow dynamically
      if (!content.classList.contains('collapsed')) {
        content.style.maxHeight = '';
      }
    });

    container.appendChild(header);
    container.appendChild(content);

    return container;
  }

  /**
   * Get or create the questions collapsible container
   */
  getOrCreateQuestionsContainer() {
    const questionsSection = this.shadowRoot.querySelector('.questions-section');
    let collapsible = questionsSection.querySelector('.questions-collapsible');

    if (!collapsible) {
      collapsible = this.createQuestionsCollapsible();
      questionsSection.appendChild(collapsible);
    }

    return collapsible;
  }

  /**
   * Update the questions count in the header
   */
  updateQuestionsCount() {
    const collapsible = this.shadowRoot.querySelector('.questions-collapsible');
    if (!collapsible) return;

    const content = collapsible.querySelector('.questions-content');
    const countSpan = collapsible.querySelector('.questions-count');

    // Count both author questions and AI questions
    const authorQuestions = content.querySelectorAll('st-question-answer-view:not(.ai-question-wrapper st-question-answer-view)').length;
    const aiQuestions = content.querySelectorAll('.ai-question-wrapper').length;
    const count = authorQuestions + aiQuestions;

    countSpan.textContent = count;

    // If no questions left, remove the collapsible
    if (count === 0) {
      collapsible.remove();
    }
  }

  /**
   * Create a wrapper for an AI question with delete button
   */
  createAIQuestionWrapper(savedQuestion) {
    const localStorageManager = window.storytellerLocalStorage;
    const wrapper = document.createElement('div');
    wrapper.className = 'ai-question-wrapper';
    wrapper.dataset.questionId = savedQuestion.id;

    // Create delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'ai-question-delete';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.title = 'Delete this AI-generated question';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteAIQuestion(savedQuestion.id, wrapper);
    });

    // Render markdown for the question data
    const md = markdownit();
    const questionData = savedQuestion.questionCommentData;
    const renderedData = {
      ...questionData,
      question: md.render(questionData.question),
      explanation: questionData.explanation ? md.render(questionData.explanation) : ''
    };

    // Create the question view
    const qAndAView = new QuestionAnswerView(
      { questionCommentData: renderedData },
      { localStorageManager: localStorageManager, questionSource: 'ai', commentId: this.comment.id }
    );

    wrapper.appendChild(deleteBtn);
    wrapper.appendChild(qAndAView);

    return wrapper;
  }

  /**
   * Delete an AI-generated question
   */
  deleteAIQuestion(questionId, wrapperElement) {
    const localStorageManager = window.storytellerLocalStorage;
    if (!localStorageManager) return;

    localStorageManager.deleteAIQuestion(questionId);
    wrapperElement.remove();
    this.updateQuestionsCount();
  }

  // ============================================
  // Notes Section Methods
  // ============================================

  /**
   * Initialize the notes section
   */
  initializeNotesSection() {
    const localStorageManager = window.storytellerLocalStorage;
    if (!localStorageManager || !this.comment.id) return;

    const notesSection = this.shadowRoot.querySelector('.notes-section');
    const existingNote = localStorageManager.getNote(this.comment.id);

    if (existingNote) {
      // Show the collapsible note
      const collapsible = this.createNoteCollapsible(existingNote);
      notesSection.appendChild(collapsible);
    } else {
      // Show "Add Note" button
      const addButton = this.createAddNoteButton();
      notesSection.appendChild(addButton);
    }
  }

  /**
   * Create the "Add Note" button
   */
  createAddNoteButton() {
    const button = document.createElement('button');
    button.className = 'add-note-button';
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
        <path d="M5 0h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2 2 2 0 0 1-2 2H3a2 2 0 0 1-2-2h1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1H1a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v9a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1H3a2 2 0 0 1 2-2z"/>
        <path d="M1 6v-.5a.5.5 0 0 1 1 0V6h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0V9h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 2.5v.5H.5a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1H2v-.5a.5.5 0 0 0-1 0z"/>
      </svg>
      Add a personal note
    `;

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showNoteEditor(null);
    });

    return button;
  }

  /**
   * Create the collapsible note container
   */
  createNoteCollapsible(noteData) {
    const container = document.createElement('div');
    container.className = 'note-collapsible';

    const header = document.createElement('div');
    header.className = 'note-header';
    header.innerHTML = `
      <div class="note-header-left">
        <span class="arrow">▼</span>
        <span>Personal Note</span>
      </div>
      <div class="note-actions">
        <button class="note-action-btn edit-btn">Edit</button>
      </div>
    `;

    const content = document.createElement('div');
    content.className = 'note-content';

    // View mode
    const viewDiv = document.createElement('div');
    viewDiv.className = 'note-view';
    const md = markdownit();
    viewDiv.innerHTML = md.render(noteData.text);
    content.appendChild(viewDiv);

    // Meta info
    const metaDiv = document.createElement('div');
    metaDiv.className = 'note-meta';
    metaDiv.textContent = `Last edited: ${LocalStorageManager.formatDate(noteData.lastEdited)}`;
    content.appendChild(metaDiv);

    // Edit mode (hidden initially)
    const editDiv = document.createElement('div');
    editDiv.className = 'note-edit hidden';
    editDiv.innerHTML = `
      <textarea class="note-textarea" placeholder="Write your note here... (supports Markdown)">${noteData.text}</textarea>
      <div class="note-actions" style="margin-top: 8px; justify-content: flex-end;">
        <button class="note-action-btn delete">Delete</button>
        <button class="note-action-btn cancel-btn">Cancel</button>
        <button class="note-action-btn save">Save</button>
      </div>
    `;
    content.appendChild(editDiv);

    // Header click toggles collapse (but not on buttons)
    header.addEventListener('click', (e) => {
      if (e.target.closest('.note-action-btn')) return;
      e.stopPropagation();
      header.classList.toggle('collapsed');
      content.classList.toggle('collapsed');

      // Clear inline max-height when expanded so content can grow dynamically
      if (!content.classList.contains('collapsed')) {
        content.style.maxHeight = '';
      }
    });

    // Edit button
    header.querySelector('.edit-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.enterNoteEditMode(container);
    });

    // Save button
    editDiv.querySelector('.save').addEventListener('click', (e) => {
      e.stopPropagation();
      const textarea = editDiv.querySelector('.note-textarea');
      this.saveNote(textarea.value, container);
    });

    // Cancel button
    editDiv.querySelector('.cancel-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.exitNoteEditMode(container, noteData);
    });

    // Delete button
    editDiv.querySelector('.delete').addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteNote(container);
    });

    // Prevent keyboard events from propagating
    editDiv.querySelector('.note-textarea').addEventListener('keydown', (e) => {
      e.stopPropagation();
    });

    container.appendChild(header);
    container.appendChild(content);

    return container;
  }

  /**
   * Show the note editor (for new notes)
   */
  showNoteEditor(existingText) {
    const notesSection = this.shadowRoot.querySelector('.notes-section');
    notesSection.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'note-collapsible';

    const header = document.createElement('div');
    header.className = 'note-header';
    header.innerHTML = `
      <div class="note-header-left">
        <span class="arrow">▼</span>
        <span>Personal Note</span>
      </div>
    `;

    const content = document.createElement('div');
    content.className = 'note-content';

    const editDiv = document.createElement('div');
    editDiv.className = 'note-edit';
    editDiv.innerHTML = `
      <textarea class="note-textarea" placeholder="Write your note here... (supports Markdown)">${existingText || ''}</textarea>
      <div class="note-actions" style="margin-top: 8px; justify-content: flex-end;">
        <button class="note-action-btn cancel-btn">Cancel</button>
        <button class="note-action-btn save">Save</button>
      </div>
    `;
    content.appendChild(editDiv);

    // Save button
    editDiv.querySelector('.save').addEventListener('click', (e) => {
      e.stopPropagation();
      const textarea = editDiv.querySelector('.note-textarea');
      this.saveNote(textarea.value, container);
    });

    // Cancel button
    editDiv.querySelector('.cancel-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.cancelNewNote();
    });

    // Prevent keyboard events from propagating
    editDiv.querySelector('.note-textarea').addEventListener('keydown', (e) => {
      e.stopPropagation();
    });

    container.appendChild(header);
    container.appendChild(content);
    notesSection.appendChild(container);

    // Focus the textarea
    editDiv.querySelector('.note-textarea').focus();
  }

  /**
   * Enter edit mode for an existing note
   */
  enterNoteEditMode(container) {
    const viewDiv = container.querySelector('.note-view');
    const metaDiv = container.querySelector('.note-meta');
    const editDiv = container.querySelector('.note-edit');
    const editBtn = container.querySelector('.edit-btn');

    viewDiv.classList.add('hidden');
    metaDiv.classList.add('hidden');
    editBtn.classList.add('hidden');
    editDiv.classList.remove('hidden');

    // Clear inline max-height so content can grow dynamically
    const content = container.querySelector('.note-content');
    content.style.maxHeight = '';

    editDiv.querySelector('.note-textarea').focus();
  }

  /**
   * Exit edit mode and return to view mode
   */
  exitNoteEditMode(container, noteData) {
    const viewDiv = container.querySelector('.note-view');
    const metaDiv = container.querySelector('.note-meta');
    const editDiv = container.querySelector('.note-edit');
    const editBtn = container.querySelector('.edit-btn');
    const textarea = editDiv.querySelector('.note-textarea');

    // Reset textarea to original value
    textarea.value = noteData.text;

    viewDiv.classList.remove('hidden');
    metaDiv.classList.remove('hidden');
    editBtn.classList.remove('hidden');
    editDiv.classList.add('hidden');

    // Clear inline max-height so content can grow dynamically
    const content = container.querySelector('.note-content');
    content.style.maxHeight = '';
  }

  /**
   * Save a note
   */
  saveNote(text, container) {
    const localStorageManager = window.storytellerLocalStorage;
    if (!localStorageManager) return;

    const trimmedText = text.trim();

    if (trimmedText) {
      localStorageManager.saveNote(this.comment.id, trimmedText);
      const noteData = localStorageManager.getNote(this.comment.id);

      // Replace with updated collapsible
      const notesSection = this.shadowRoot.querySelector('.notes-section');
      notesSection.innerHTML = '';
      const collapsible = this.createNoteCollapsible(noteData);
      notesSection.appendChild(collapsible);
    } else {
      // Empty note, show add button
      this.cancelNewNote();
    }
  }

  /**
   * Delete a note
   */
  deleteNote(container) {
    const localStorageManager = window.storytellerLocalStorage;
    if (!localStorageManager) return;

    if (confirm('Are you sure you want to delete this note?')) {
      localStorageManager.deleteNote(this.comment.id);

      // Replace with add button
      const notesSection = this.shadowRoot.querySelector('.notes-section');
      notesSection.innerHTML = '';
      const addButton = this.createAddNoteButton();
      notesSection.appendChild(addButton);
    }
  }

  /**
   * Cancel creating a new note
   */
  cancelNewNote() {
    const notesSection = this.shadowRoot.querySelector('.notes-section');
    notesSection.innerHTML = '';

    const localStorageManager = window.storytellerLocalStorage;
    const existingNote = localStorageManager ? localStorageManager.getNote(this.comment.id) : null;

    if (existingNote) {
      const collapsible = this.createNoteCollapsible(existingNote);
      notesSection.appendChild(collapsible);
    } else {
      const addButton = this.createAddNoteButton();
      notesSection.appendChild(addButton);
    }
  }

  /**
   * Refresh the notes section (e.g., after saving from AI assistant)
   */
  refreshNotesSection() {
    const localStorageManager = window.storytellerLocalStorage;
    if (!localStorageManager) return;

    const notesSection = this.shadowRoot.querySelector('.notes-section');
    notesSection.innerHTML = '';

    const existingNote = localStorageManager.getNote(this.comment.id);

    if (existingNote) {
      const collapsible = this.createNoteCollapsible(existingNote);
      notesSection.appendChild(collapsible);
    } else {
      const addButton = this.createAddNoteButton();
      notesSection.appendChild(addButton);
    }
  }

  /**
   * Expand the notes section if collapsed
   */
  expandNotesSection() {
    const notesSection = this.shadowRoot.querySelector('.notes-section');
    const noteContainer = notesSection.querySelector('.note-collapsible');

    if (noteContainer) {
      const header = noteContainer.querySelector('.note-header');
      const content = noteContainer.querySelector('.note-content');

      // If collapsed, expand it
      if (header && header.classList.contains('collapsed')) {
        header.classList.remove('collapsed');
        content.classList.remove('collapsed');
        content.style.maxHeight = '';
      }
    }
  }

  updateToDisplaySearchResults(searchResult) {
    //if there is some search text
    if(searchResult.searchText.length > 0) {
      //if there is a result in the tags
      if(searchResult.inTags) {
        const tagView = this.shadowRoot.querySelector('st-tag-view');
        tagView.highlightTag(searchResult.searchText);
      }

      //if there is a result in the comment text
      if(searchResult.inCommentText) {
        const blogCommentText = this.shadowRoot.querySelector('.blogCommentText');
    
        //surround each instance of the search text with a tag
        let replacedString = this.playbackEngine.surroundHTMLTextWithTag(blogCommentText.innerHTML, searchResult.searchText, '<span class="searchHighlight">', '</span>');
        blogCommentText.innerHTML = replacedString;

        const commentTitle = this.shadowRoot.querySelector('.commentTitle');
        //surround each instance of the search text with a tag
        replacedString = this.playbackEngine.surroundHTMLTextWithTag(commentTitle.innerHTML, searchResult.searchText, '<span class="searchHighlight">', '</span>');
        commentTitle.innerHTML = replacedString;
      }

      //if there is a result in the question
      if(searchResult.inQuestion) {
        const questionAnswerView = this.shadowRoot.querySelector('st-question-answer-view');
        questionAnswerView.classList.add('questionSearchHighlight');
      }
    }
  }

  updateTTSSpeed(speed) {
    const ttsControl = this.shadowRoot.querySelector('st-text-to-speech-control');
    ttsControl.updateTTSSpeed(speed);
  }

  revealCommentsBeforeSearch() {
    const tagView = this.shadowRoot.querySelector('st-tag-view');
    if(tagView) {
      //clear out the tags
      tagView.dehighlightTags();
    }

    //set the text back to the original
    const blogCommentText = this.shadowRoot.querySelector('.blogCommentText');
    blogCommentText.innerHTML = this.comment.commentText;

    const commentTitle = this.shadowRoot.querySelector('.commentTitle');
    commentTitle.innerHTML = this.comment.commentTitle;

    const questionAnswerView = this.shadowRoot.querySelector('st-question-answer-view');
    if(questionAnswerView) {
      questionAnswerView.classList.remove('questionSearchHighlight');
    }
  }
  
  highlightSearch(searchText) {
    const blogCodeSnippet = this.shadowRoot.querySelector('st-blog-code-snippet');
    //if there is some code in this comment
    if(blogCodeSnippet) {
      //if there is something to search
      if(searchText.length > 0) {
        //highlight it in the editor
        blogCodeSnippet.highlightSearch(searchText);
      } else { //nothing to search for (empty search box)
        //if there is some code to display, rerender the blog snippet to remove any previous search results
        if(this.comment.selectedCodeBlocks[0]) {
          const codeEditor = this.shadowRoot.querySelector('.codeEditor');
          codeEditor.innerHTML = '';

          //create a code snippet
          const blogCodeSnippet = new BlogCodeSnippet(this.comment, this.playbackEngine);
          codeEditor.appendChild(blogCodeSnippet);
        }
      }
    }
  }
}

window.customElements.define('st-blog-component', BlogComponent);