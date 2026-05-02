class CommentView extends HTMLElement {
  constructor(commentViewData) {
    super();

    this.comment = commentViewData.comment;
    this.playbackEngine = commentViewData.playbackEngine;
    this.isDescriptionComment = commentViewData.isDescriptionComment;
    this.commentNumber = commentViewData.commentNumber;
    this.totalNumberOfComments = commentViewData.totalNumberOfComments;
    // Use passed localStorageManager or fall back to global
    this.localStorageManager = commentViewData.localStorageManager || window.storytellerLocalStorage || null;
    this.noteEditorVisible = false;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host {
          display: block;
          border: 1px gray solid;
          padding: 3px 12px;
          background-color: rgb(51, 51, 51);
        }
        :host(.activeGroup) {
          background-color: rgb(60, 60, 60);
        }
        :host(.activeComment) {
          background-color: rgb(59,76,98);
        }
        :host(.nonRelevantSearchResult) {
          display: none;
        }

        #editCommentButton {
          opacity: 80%;
          visibility: hidden;
          content: "";
          background-image: url("data:image/svg+xml,<svg viewBox='0 0 16 16' class='bi bi-pencil-square test' fill='lightgray' xmlns='http://www.w3.org/2000/svg'><path fill-rule='evenodd' d='M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456l-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z'/><path fill-rule='evenodd' d='M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z' clip-rule='evenodd'/></svg>");
          background-repeat: no-repeat;
          background-color: transparent;
          height: 1.6em;
          width: 1.6em;
          border: none;
          cursor: pointer;
        }
        #editCommentButton:hover {
          opacity: 100%;
        }
        :host(.activeComment) #editCommentButton:not(.inactive) {
          visibility: initial;
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

        .aiInput {
          margin: 0px 0px 10px 0px;
          padding-top: 10px;
        }

        #aiInput.hidden {
          display: none;
        }
        #aiInput.visible {
          display: block;
        }

        .commentTopBar {
          border-bottom: 1px solid rgb(83, 84, 86);
          margin-bottom: 8px;
          overflow-y: auto;
        }

        .commentCount {
          font-size: .95em;
          padding-bottom: 3px;
          display: inline;
          color: rgb(127, 138, 148);
        }

        .commentText {
          padding: 2px 5px 12px 5px;
        }

        .commentTitle {
          padding: 5px;
          font-size: 1.3em;
        }

        .commentAvatar {
          display: inline;
        }

        .titleBar {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.35em;
          padding: 8px 0px;
        }

        .commentBar {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .commentDevelopersDiv {
          display: flex;
          align-items: center;
        }

        .commentCountContainer {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          margin-bottom: 5px;
        }

        .commentCountRow {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .descriptionCommentTopBar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          justify-content: space-between;
        }

        .descriptionCommentTopBar .titleBar {
          flex: 1;
          text-align: center;
        }

        .descriptionCommentTopBar .commentCountContainer {
          margin-left: auto;
        }

        .searchHighlight {
          background-color: #517EB0;
        }

        .viewed-indicator {
          display: inline-block;
          color: #10b981;
          font-size: 0.9em;
          margin-left: 6px;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .viewed-indicator.visible {
          opacity: 1;
        }

        .viewed-indicator svg {
          vertical-align: middle;
        }

        .note-button {
          opacity: 60%;
          background-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='lightgray' viewBox='0 0 16 16'><path d='M5 0h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2 2 2 0 0 1-2 2H3a2 2 0 0 1-2-2h1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1H1a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v9a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1H3a2 2 0 0 1 2-2z'/><path d='M1 6v-.5a.5.5 0 0 1 1 0V6h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0V9h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 2.5v.5H.5a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1H2v-.5a.5.5 0 0 0-1 0z'/></svg>");
          background-repeat: no-repeat;
          background-color: transparent;
          background-position: center;
          height: 1.6em;
          width: 1.6em;
          border: none;
          cursor: pointer;
          visibility: hidden;
        }

        .note-button:hover {
          opacity: 100%;
        }

        .note-button.has-note {
          visibility: visible;
          opacity: 100%;
          background-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%2360a5fa' viewBox='0 0 16 16'><path d='M5 0h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2 2 2 0 0 1-2 2H3a2 2 0 0 1-2-2h1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1H1a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v9a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1H3a2 2 0 0 1 2-2z'/><path d='M1 6v-.5a.5.5 0 0 1 1 0V6h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0V9h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 2.5v.5H.5a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1H2v-.5a.5.5 0 0 0-1 0z'/></svg>");
        }

        :host(.activeComment) .note-button {
          visibility: visible;
        }

        st-text-to-speech-control {
          visibility: hidden;
        }

        :host(.activeComment) st-text-to-speech-control {
          visibility: visible;
        }

        .note-editor-container {
          margin-top: 8px;
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
      </style>
      <div>
        <div class="commentTopBar"></div>
        <div class="commentTitle"></div>
        <div class="commentText"></div>
        <div class="media"></div>
        <div class="questions-section"></div>
        <div class="tagContainer"></div>
        <div class="note-editor-container"></div>
        <div id="aiInput" class="hidden"></div>
        <button id="editCommentButton" class="inactive" title="Edit this comment"></button>
      </div>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    const commentView = this.shadowRoot.host;
    commentView.addEventListener('click', this.commentClicked);
    document.addEventListener('keydown', this.ttsKeyboardPress);

    //if this is an editable playback
    if(this.playbackEngine.playbackData.isEditable) {
      //add an edit button
      const editCommentButton = this.shadowRoot.querySelector('#editCommentButton');
      editCommentButton.classList.remove('inactive');
      editCommentButton.addEventListener('click', this.beginEditComment);
    }

    //top of comment view
    this.buildCommentViewTop();

    //comment title
    if(this.comment.commentTitle) {
      const commentTitle = this.shadowRoot.querySelector('.commentTitle');
      commentTitle.innerHTML = this.comment.commentTitle;
    }
    //comment text
    const commentText = this.shadowRoot.querySelector('.commentText');
    let formattedCommentText = this.comment.commentText;
    //if the text format is markdown, convert it to html
    if(this.comment.textFormat && this.comment.textFormat === 'markdown') {
      const md = markdownit();
      formattedCommentText = md.render(this.comment.commentText);
    }
    commentText.innerHTML = formattedCommentText;
    //media
    const media = this.shadowRoot.querySelector('.media');
    //videos
    if(this.comment.videoURLs.length > 0) {
      for(let i = 0;i < this.comment.videoURLs.length;i++) {
        const commentVideo = document.createElement('video');
        commentVideo.setAttribute('controls', '');
        commentVideo.setAttribute('src', this.comment.videoURLs[i]);
        commentVideo.classList.add('commentVideo');
        media.appendChild(commentVideo);
      }
    }
    //audios
    if(this.comment.audioURLs.length > 0) {
      for(let i = 0;i < this.comment.audioURLs.length;i++) {
        const commentAudio = document.createElement('audio');
        commentAudio.setAttribute('controls', '');
        commentAudio.setAttribute('src', this.comment.audioURLs[i]);
        commentAudio.classList.add('commentAudio');
        media.appendChild(commentAudio);
      }
    }
    //images
    if(this.comment.imageURLs.length > 0) {
      media.appendChild(new ImageGallery(this.comment.imageURLs,true));
    }
    
    //if there are any comment tags
    if(this.comment.commentTags.length > 0) {
      //create a tag view to display the tags
      const tagContainer = this.shadowRoot.querySelector('.tagContainer');
      const tagView = new TagView(this.comment);
      tagContainer.appendChild(tagView);
    }

    //if there is a q&a or saved AI questions, create the collapsible container
    const hasAuthorQuestion = this.comment.questionCommentData && this.comment.questionCommentData.question;
    const savedAIQuestions = this.localStorageManager ?
      this.localStorageManager.getAIQuestionsForComment(this.comment.id) : [];

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

    //ai input
    if(!this.isDescriptionComment && this.playbackEngine.playbackData.aiEnabled) {
      //create an AI input to get suggestions
      const aiInput = this.shadowRoot.querySelector('#aiInput');
      const aiAssistant = new AIAssistant(this.playbackEngine, false, this.localStorageManager, this.comment.id);
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
        const { commentId, hasNote } = event.detail;
        if (commentId === this.comment.id) {
          this.updateNoteButtonState(hasNote);
          // If note editor is open, refresh it to show updated content
          if (this.noteEditorVisible && this.localStorageManager) {
            const noteEditorContainer = this.shadowRoot.querySelector('.note-editor-container');
            noteEditorContainer.innerHTML = '';
            const noteEditor = new NoteEditor(this.comment.id, this.localStorageManager);
            noteEditor.addEventListener('note-saved', (e) => {
              this.updateNoteButtonState(true);
            });
            noteEditor.addEventListener('note-deleted', (e) => {
              this.updateNoteButtonState(false);
              noteEditorContainer.innerHTML = '';
              this.noteEditorVisible = false;
            });
            noteEditor.addEventListener('note-cancelled', (e) => {
              noteEditorContainer.innerHTML = '';
              this.noteEditorVisible = false;
            });
            noteEditorContainer.appendChild(noteEditor);
          }
        }
      });

      // Listen for request to open note editor
      aiAssistant.addEventListener('open-note-editor', (event) => {
        const { commentId } = event.detail;
        if (commentId === this.comment.id) {
          this.openNoteEditor();
        }
      });
    }
  }

  disconnectedCallback() {
    const commentView = this.shadowRoot.host;
    commentView.removeEventListener('click', this.commentClicked);
    document.removeEventListener('keydown', this.ttsKeyboardPress);
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
      { localStorageManager: this.localStorageManager, questionSource: 'ai', commentId: this.comment.id }
    );

    wrapper.appendChild(deleteBtn);
    wrapper.appendChild(qAndAView);

    return wrapper;
  }

  /**
   * Delete an AI-generated question
   */
  deleteAIQuestion(questionId, wrapperElement) {
    if (!this.localStorageManager) return;

    this.localStorageManager.deleteAIQuestion(questionId);
    wrapperElement.remove();
    this.updateQuestionsCount();
  }

  makeCommentViewActive() {
    //make this comment view have the active class
    this.shadowRoot.host.classList.add('activeComment');

    //make the aiInput visible
    const aiInput = this.shadowRoot.querySelector('#aiInput');
    aiInput.classList.remove('hidden');
    aiInput.classList.add('visible');

    //get the rectangle around the active comment that is displayed
    const commentRectangle = this.shadowRoot.host.getBoundingClientRect();

    //if the comment's top/bottom edge is  off of the screen (+/- 150px)
    if ((commentRectangle.bottom - 150 < 0) || (commentRectangle.top > window.innerHeight - 150) ) {
      //scroll to the active comment
      this.shadowRoot.host.scrollIntoView({behavior: 'auto', block: 'center', inline: 'start'})
    }

    //mark comment as viewed and update indicator
    if (this.localStorageManager) {
      this.localStorageManager.markCommentViewed(this.comment.id);
      const viewedIndicator = this.shadowRoot.querySelector('.viewed-indicator');
      if (viewedIndicator) {
        viewedIndicator.classList.add('visible');
        const visitCount = this.localStorageManager.getCommentVisitCount(this.comment.id);
        viewedIndicator.title = `Visited ${visitCount} time${visitCount !== 1 ? 's' : ''}`;
      }
    }
  }

  makeCommentViewInactive() {
    this.shadowRoot.host.classList.remove('activeComment');

    //make the aiInput invisible
    const aiInput = this.shadowRoot.querySelector('#aiInput');
    aiInput.classList.remove('visible');
    aiInput.classList.add('hidden');
  }

  makePartOfActiveGroup() {
    this.shadowRoot.host.classList.add('activeGroup');
  }
  makePartOfInactiveGroup() {
    this.shadowRoot.host.classList.remove('activeGroup');
  }

  updateForTitleChange(newTitle) {
    const titleBar = this.shadowRoot.querySelector('.titleBar');
    titleBar.innerHTML = newTitle;
  }

  beginEditComment = (clickEvent) => {
    //stop the click associated with the button to prevent treating as a comment click
    clickEvent.stopPropagation();
    clickEvent.preventDefault();

    const event = new CustomEvent('begin-edit-comment', { 
      detail: {
        comment: this.comment
      },
      bubbles: true, 
      composed: true 
    });
    this.dispatchEvent(event);
  }

  commentClicked = event => {
    this.sendActiveCommentEvent();
  }

  ttsKeyboardPress = event => {
    //if p was pressed and this is the active comment
    if (event.key === 'p' && this.comment.id === this.playbackEngine.activeComment.id) {
      //simulate a button click
      const ttsControl = this.shadowRoot.querySelector('st-text-to-speech-control');
      ttsControl.handleButtonClick();
    }
  }

  buildCommentViewTop() {
    const commentTopBar = this.shadowRoot.querySelector('.commentTopBar');

    const commentCountContainer = document.createElement('div');
    commentCountContainer.classList.add('commentCountContainer');

    // Create a row for note button and comment count
    const commentCountRow = document.createElement('div');
    commentCountRow.classList.add('commentCountRow');

    // Add note button (to the left of comment count)
    const noteButton = document.createElement('button');
    noteButton.classList.add('note-button');
    noteButton.title = 'Add a personal note';
    noteButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleNoteEditor();
    });

    // Check if note exists
    if (this.localStorageManager && this.localStorageManager.getNote(this.comment.id)) {
      noteButton.classList.add('has-note');
      noteButton.title = 'Edit personal note';
    }

    commentCountRow.appendChild(noteButton);

    const commentCount = document.createElement('div');
    commentCount.classList.add('commentCount');
    commentCount.innerHTML = `${this.commentNumber + 1}/${this.totalNumberOfComments}`;

    // Add viewed indicator
    const viewedIndicator = document.createElement('span');
    viewedIndicator.classList.add('viewed-indicator');
    viewedIndicator.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
      <path d="M10.97 4.97a.75.75 0 0 1 1.071 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.235.235 0 0 1 .02-.022z"/>
    </svg>`;
    viewedIndicator.title = 'Not viewed';

    // Check if already viewed
    if (this.localStorageManager && this.localStorageManager.isCommentViewed(this.comment.id)) {
      viewedIndicator.classList.add('visible');
      const visitCount = this.localStorageManager.getCommentVisitCount(this.comment.id);
      viewedIndicator.title = `Visited ${visitCount} time${visitCount !== 1 ? 's' : ''}`;
    }

    commentCount.appendChild(viewedIndicator);
    commentCountRow.appendChild(commentCount);
    commentCountContainer.appendChild(commentCountRow);
    
    let ttsControl;
    //if this comment has a tts file path
    if(this.comment.ttsFilePath) {
      //create a tts control with the file path
      ttsControl = new TextToSpeechControl(this.comment.ttsFilePath, null, this.playbackEngine.editorProperties.ttsSpeed, true);
      commentCountContainer.appendChild(ttsControl);
    } else if(this.playbackEngine.playbackData.aiEnabled) { //no tts file path in this comment
      //create a tts that will convert the text to speech
      ttsControl = new TextToSpeechControl(null, this.comment.commentTitle + " " + this.comment.commentText, this.playbackEngine.editorProperties.ttsSpeed, true);
      commentCountContainer.appendChild(ttsControl);
    } //else- no tts control

    if (this.isDescriptionComment) {
      const titleBarDiv = document.createElement('div');
      titleBarDiv.classList.add('titleBar');
      titleBarDiv.innerHTML = this.playbackEngine.playbackData.playbackTitle;

      const descriptionCommentTopBar = document.createElement('div');
      descriptionCommentTopBar.classList.add('descriptionCommentTopBar');
      descriptionCommentTopBar.appendChild(titleBarDiv);
      descriptionCommentTopBar.appendChild(commentCountContainer);

      commentTopBar.appendChild(descriptionCommentTopBar);
    } else {
      const commentBar = document.createElement('div');
      commentBar.classList.add('commentBar');
  
      const devGroup = document.createElement('div');
      devGroup.classList.add('commentDevelopersDiv');
      devGroup.appendChild(new DevGroupAvatar({
        developerGroupId: this.comment.developerGroupId, 
        developers: this.playbackEngine.playbackData.developers, 
        developerGroups: this.playbackEngine.playbackData.developerGroups
      }));

      commentBar.appendChild(devGroup);
      commentBar.appendChild(commentCountContainer);
      commentTopBar.appendChild(commentBar);
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
        const commentText = this.shadowRoot.querySelector('.commentText');
        //surround each instance of the search text with a tag
        let replacedString = this.playbackEngine.surroundHTMLTextWithTag(commentText.innerHTML, searchResult.searchText, '<span class="searchHighlight">', '</span>');
        commentText.innerHTML = replacedString;

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
    let formattedCommentText = this.comment.commentText;
    //if the text format is markdown, convert it to html
    if(this.comment.textFormat && this.comment.textFormat === 'markdown') {
      const md = markdownit();
      formattedCommentText = md.render(this.comment.commentText);
    }
    const commentText = this.shadowRoot.querySelector('.commentText');
    commentText.innerHTML = formattedCommentText;
    
    const commentTitle = this.shadowRoot.querySelector('.commentTitle');
    commentTitle.innerHTML = this.comment.commentTitle;

    //remove the search highlight
    const questionAnswerView = this.shadowRoot.querySelector('st-question-answer-view');
    if(questionAnswerView) {
      questionAnswerView.classList.remove('questionSearchHighlight');
    }
  }

  sendActiveCommentEvent() {
    const event = new CustomEvent('active-comment', {
      detail: {activeCommentId: this.comment.id},
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  toggleNoteEditor() {
    const noteEditorContainer = this.shadowRoot.querySelector('.note-editor-container');

    if (this.noteEditorVisible) {
      // Close the note editor
      noteEditorContainer.innerHTML = '';
      this.noteEditorVisible = false;
    } else {
      // Open the note editor
      if (this.localStorageManager) {
        const noteEditor = new NoteEditor(this.comment.id, this.localStorageManager);

        // Listen for note events
        noteEditor.addEventListener('note-saved', (e) => {
          this.updateNoteButtonState(true);
        });

        noteEditor.addEventListener('note-deleted', (e) => {
          this.updateNoteButtonState(false);
          noteEditorContainer.innerHTML = '';
          this.noteEditorVisible = false;
        });

        noteEditor.addEventListener('note-cancelled', (e) => {
          noteEditorContainer.innerHTML = '';
          this.noteEditorVisible = false;
        });

        noteEditorContainer.appendChild(noteEditor);
        this.noteEditorVisible = true;
      }
    }
  }

  /**
   * Open the note editor (does nothing if already open)
   */
  openNoteEditor() {
    if (!this.noteEditorVisible) {
      this.toggleNoteEditor();
    }
  }

  updateNoteButtonState(hasNote) {
    const noteButton = this.shadowRoot.querySelector('.note-button');
    if (noteButton) {
      if (hasNote) {
        noteButton.classList.add('has-note');
        noteButton.title = 'Edit personal note';
      } else {
        noteButton.classList.remove('has-note');
        noteButton.title = 'Add a personal note';
      }
    }
  }

  setLocalStorageManager(localStorageManager) {
    this.localStorageManager = localStorageManager;

    // Update viewed indicator if already viewed
    if (this.localStorageManager.isCommentViewed(this.comment.id)) {
      const viewedIndicator = this.shadowRoot.querySelector('.viewed-indicator');
      if (viewedIndicator) {
        viewedIndicator.classList.add('visible');
        const visitCount = this.localStorageManager.getCommentVisitCount(this.comment.id);
        viewedIndicator.title = `Visited ${visitCount} time${visitCount !== 1 ? 's' : ''}`;
      }
    }

    // Update note button if note exists
    if (this.localStorageManager.getNote(this.comment.id)) {
      this.updateNoteButtonState(true);
    }
  }
}

window.customElements.define('st-comment-view', CommentView);