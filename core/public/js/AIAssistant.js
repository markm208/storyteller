class AIAssistant extends HTMLElement {
  constructor(playbackEngine, sendResponseAsEvent=false, localStorageManager=null, commentId=null) {
    super();

    this.playbackEngine = playbackEngine;
    this.sendResponseAsEvent = sendResponseAsEvent;
    // Use passed localStorageManager or fall back to global
    this.localStorageManager = localStorageManager || window.storytellerLocalStorage || null;
    this.commentId = commentId;
    this.isExpanded = false;
    this.activeTab = 'askAQuestion';
    this.skillLevel = 'beginner';
    this.numQuestionsToGenerate = 3; // Configurable number of questions

    const AI_SUGGESTION_TEXT = 'Let the AI assistant suggest a question';

    this.defaultQuestions = [
      { text: 'Summarize this code and explain the key concepts.', prompt: 'What is being demonstrated by the author in the highlighted code? If there is no highlighted code then provide a summary of what the entire code does.' },
      { text: 'What could go wrong here?', prompt: 'What potential bugs or issues might arise from this code? Are there any performance issues or edge cases that need to be addressed?' },
      { text: 'Explain this using an analogy or real-world example', prompt: 'Explain the logic in this code using an analogy or real-world example that makes it easier to understand. Avoid technical jargon and tailor the explanation to a ${this.skillLevel} programmer.' },
      { text: AI_SUGGESTION_TEXT, prompt: 'Come up with an insightful question about this code that would help someone learn. Then, provide the answer in the response. Clearly identify the question and the answer.' }
    ];

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .container {
          background-color: #374151;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        }

        .toggle-button {
          width: 100%;
          padding: 16px 20px;
          background-color: #4b5563;
          border: none;
          color: #e2e8f0;
          font-size: 16px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: background-color 0.2s;
        }

        .toggle-button:hover {
          background-color: #6b7280;
        }

        .arrow {
          transition: transform 0.2s;
          font-size: 14px;
        }

        .arrow.open {
          transform: rotate(180deg);
        }

        .expanded-content {
          display: none;
          background-color: #374151;
        }

        .expanded-content.open {
          display: block;
        }

        .tabs {
          display: flex;
          background-color: #1f2937;
          border-bottom: 1px solid #4b5563;
        }

        .tab {
          flex: 1;
          padding: 12px 16px;
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
          border-bottom: 2px solid transparent;
        }

        .tab:hover {
          color: #e2e8f0;
        }

        .tab.active {
          color: #e2e8f0;
          border-bottom-color: #3b82f6;
          background-color: #374151;
        }

        .tab-content {
          display: none;
          padding: 20px;
        }

        .tab-content.active {
          display: block;
        }

        .skill-level-global {
          display: flex;
          gap: 16px;
          padding: 16px 20px;
          background-color: #2d3748;
          border-bottom: 1px solid #4b5563;
        }

        .skill-level-global label {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-size: 14px;
          color: #e2e8f0;
        }

        .skill-level-global input[type="radio"] {
          cursor: pointer;
        }

        .default-questions {
          display: grid;
          gap: 10px;
          margin: 20px 0px;
        }

        .question-button {
          padding: 12px 16px;
          background-color: #4b5563;
          border: 1px solid #6b7280;
          color: #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
          font-size: 14px;
        }

        .question-button:hover {
          background-color: #6b7280;
          transform: translateX(4px);
        }

        .question-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        h3 {
          margin-top: 0;
          margin-bottom: 8px;
          font-size: 14px;
          color: #e2e8f0;
        }

        .checkbox-container {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          font-size: 14px;
          color: #e2e8f0;
        }

        .text-input {
          width: 100%;
          background-color: #2d3748;
          border: 1px solid #4b5563;
          color: #e2e8f0;
          border-radius: 6px;
          font-size: 14px;
          resize: vertical;
          min-height: 80px;
          outline: none;
        }

        .text-input:focus {
          border-color: #6b7280;
        }

        .submit-button {
          width: 100%;
          padding: 12px 24px;
          background-color: #3b82f6;
          border: none;
          color: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }

        .submit-button:hover {
          background-color: #2563eb;
        }

        .submit-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .generate-question-button {
          width: 100%;
          padding: 16px;
          background-color: #10b981;
          border: none;
          color: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          margin-top: 20px;
          transition: background-color 0.2s;
        }

        .generate-question-button:hover {
          background-color: #059669;
        }

        .generate-question-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .project-button {
          width: 100%;
          padding: 16px;
          background-color: #8b5cf6;
          border: none;
          color: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          margin-top: 20px;
          transition: background-color 0.2s;
        }

        .project-button:hover {
          background-color: #7c3aed;
        }

        .project-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .results-area {
          margin-top: 20px;
          padding: 16px;
          background-color: #2d3748;
          border-radius: 6px;
          font-size: 14px;
          color: #e2e8f0;
        }

        .response-item {
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 1px solid #4b5563;
        }

        .response-item:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }

        .question-text {
          font-style: italic;
          color: #9ca3af;
          margin-bottom: 10px;
        }

        .response-text {
          color: #e2e8f0;
        }

        .response-text pre {
          background-color: #1f2937;
          padding: 10px;
          border-radius: 4px;
          overflow-x: auto;
        }

        .response-text code {
          background-color: #1f2937;
          padding: 2px 4px;
          border-radius: 2px;
        }

        .ai-question-wrapper {
          position: relative;
          margin-bottom: 10px;
        }

        .ai-question-delete {
          position: absolute;
          top: 5px;
          right: 5px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: none;
          background-color: rgba(239, 68, 68, 0.2);
          color: #f87171;
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
          background-color: rgba(239, 68, 68, 0.4);
        }

        .save-to-notes-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background-color: rgba(59, 130, 246, 0.2);
          border: 1px solid rgba(59, 130, 246, 0.5);
          color: rgba(96, 165, 250, 0.9);
          border-radius: 4px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .save-to-notes-button:hover {
          background-color: rgba(59, 130, 246, 0.3);
          border-color: rgba(59, 130, 246, 0.8);
        }

        .save-to-notes-button.saved {
          background-color: rgba(34, 197, 94, 0.2);
          border-color: rgba(34, 197, 94, 0.5);
          color: rgba(34, 197, 94, 0.9);
          cursor: default;
        }

        .save-to-notes-button svg {
          width: 14px;
          height: 14px;
        }

        .save-to-notes-container {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 10px;
        }

        .view-notes-button {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          background-color: rgba(59, 130, 246, 0.2);
          border: 1px solid rgba(59, 130, 246, 0.5);
          color: rgba(96, 165, 250, 0.9);
          border-radius: 4px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .view-notes-button:hover {
          background-color: rgba(59, 130, 246, 0.3);
          border-color: rgba(59, 130, 246, 0.8);
        }

        .view-notes-button svg {
          width: 14px;
          height: 14px;
        }
      </style>
      <div class="container">
        <button class="toggle-button">
          <span>
            <!-- duck svg -->
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="bi bi-duck" style="transform: translateY(2px);" viewBox="0 0 16 16">
              <path d="M8 2.5c1.5 0 2.5 1 2.5 2.5s-1 2.5-2.5 2.5-2.5-1-2.5-2.5 1-2.5 2.5-2.5z"/>
              <path d="M7 7c0 .3.2.5.5.5h1c.3 0 .5-.2.5-.5"/>
              <path d="M5.5 7.5c-1 .7-2 2-2 3.5 0 2 1.5 3.5 3.5 3.5h2c2 0 3.5-1.5 3.5-3.5 0-1.5-1-2.8-2-3.5"/>
              <path d="M5 10c0-1 .3-1.5.7-2"/>
              <path d="M9.5 10c.5.2.8.7.8 1.5"/>
              <circle cx="7" cy="4.5" r="0.5" fill="currentColor"/>
              <path d="M5.5 4.5h-1"/>
              <path d="M2 13.5h12"/>
            </svg>
            Ask a question about this code
          </span>
          <span class="arrow">▼</span>
        </button>
        
        <div class="expanded-content">
          <div class="tabs">
            <button class="tab active" data-tab="askAQuestion">Ask A Question</button>
            <button class="tab" data-tab="practice">Test Your Knowledge</button>
            <button class="tab" data-tab="projects">Write Your Own Code</button>
          </div>
          
          <!-- Ask A Question Tab -->
          <div class="tab-content active" data-tab-content="askAQuestion">
            <div class="custom-question-section">
              <h3>Ask a question about this code or choose a common question:</h3>
              <div class="default-questions"></div>
              <textarea id="customQuestion" class="text-input" placeholder="Ask your question about this code..."></textarea>
              <div class="checkbox-container" title="If checked, only the changes since the last comment will be sent to the AI model. If unchecked, all current code will be sent.">
                <input type="checkbox" id="sinceLastComment" checked>
                <label for="sinceLastComment">Compare the code since the last comment only</label>
              </div>
              <button class="submit-button">Submit Question</button>
            </div>
            
            <div class="results-area"></div>
          </div>
          
          <!-- Test Your Knowledge Tab -->
          <div class="tab-content" data-tab-content="practice">
            <h3>Generate multiple choice questions to test your understanding of this code (your answers are not stored or shared with anyone).</h3>
            <button class="generate-question-button">Generate Some Practice Questions</button>
            <div class="results-area"></div>
          </div>
          
          <!-- Project Ideas Tab -->
          <div class="tab-content" data-tab-content="projects">
            <h3>Get suggestions to build on the concepts in this code. </h3>
            <button class="project-button">Get Suggestions</button>
            <div class="results-area"></div>
          </div>

          <div class="skill-level-global">
            <label for="skill-level-global">Skill Level:</label>
            <label>
                <input type="radio" name="skill-level-global" value="beginner" checked>
                Beginner
            </label>
            <label>
                <input type="radio" name="skill-level-global" value="intermediate">
                Intermediate
            </label>
            <label>
                <input type="radio" name="skill-level-global" value="expert">
                Expert
            </label>
          </div>
        </div>
      </div>
    `;
  }

  connectedCallback() {
    this.setupEventListeners();
    this.renderDefaultQuestions();
    this.updateResultsVisibility(); // Ensure visibility logic is applied on load
    // Note: Saved AI questions are restored in the comment view (CommentView/BlogComponent), not here
  }

  /**
   * Restore saved AI questions for this comment from localStorage
   */
  restoreSavedQuestions() {
    if (!this.localStorageManager || !this.commentId) return;

    const savedQuestions = this.localStorageManager.getAIQuestionsForComment(this.commentId);
    if (savedQuestions.length === 0) return;

    const resultsArea = this.shadowRoot.querySelector('[data-tab-content="practice"] .results-area');

    savedQuestions.forEach(savedQuestion => {
      const questionData = savedQuestion.questionCommentData;
      const wrapper = this.createQuestionWrapper(questionData, savedQuestion.id);
      resultsArea.appendChild(wrapper);
    });

    // Make results visible if there are saved questions
    if (savedQuestions.length > 0) {
      resultsArea.classList.add('has-results');
    }
  }

  /**
   * Create a wrapper for an AI question with delete button
   */
  createQuestionWrapper(questionData, questionId) {
    const wrapper = document.createElement('div');
    wrapper.className = 'ai-question-wrapper';
    wrapper.dataset.questionId = questionId;

    // Create delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'ai-question-delete';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.title = 'Delete this AI-generated question';
    deleteBtn.addEventListener('click', () => this.deleteQuestion(questionId, wrapper));

    // Render markdown for the question and explanation
    const md = markdownit();
    const renderedData = {
      ...questionData,
      question: md.render(questionData.question),
      explanation: questionData.explanation ? md.render(questionData.explanation) : ''
    };

    // Create the question view
    const qAndAView = new QuestionAnswerView(
      { questionCommentData: renderedData },
      { localStorageManager: this.localStorageManager, questionSource: 'ai', commentId: this.commentId }
    );

    wrapper.appendChild(deleteBtn);
    wrapper.appendChild(qAndAView);

    return wrapper;
  }

  /**
   * Delete an AI-generated question
   */
  deleteQuestion(questionId, wrapperElement) {
    if (!this.localStorageManager) return;

    this.localStorageManager.deleteAIQuestion(questionId);
    wrapperElement.remove();

    // Check if there are any questions left
    const resultsArea = this.shadowRoot.querySelector('[data-tab-content="practice"] .results-area');
    const remainingQuestions = resultsArea.querySelectorAll('.ai-question-wrapper');
    if (remainingQuestions.length === 0) {
      resultsArea.classList.remove('has-results');
    }
  }

  /**
   * Save an AI question to localStorage and create wrapper
   */
  saveAndDisplayQuestion(questionData, resultsArea, prepend = true) {
    if (!this.localStorageManager || !this.commentId) {
      // If no localStorage or commentId, just create without saving (but still render markdown)
      const md = markdownit();
      const renderedData = {
        ...questionData,
        question: md.render(questionData.question),
        explanation: questionData.explanation ? md.render(questionData.explanation) : ''
      };
      const qAndAView = new QuestionAnswerView(
        { questionCommentData: renderedData },
        { localStorageManager: this.localStorageManager, questionSource: 'ai' }
      );
      if (prepend) {
        resultsArea.prepend(qAndAView);
      } else {
        resultsArea.appendChild(qAndAView);
      }
      return;
    }

    // Save to localStorage (save raw data before markdown rendering)
    const savedRecord = this.localStorageManager.saveAIQuestion(this.commentId, questionData);

    if (savedRecord) {
      // Dispatch event so comment view can display the question
      const event = new CustomEvent('ai-question-saved', {
        detail: { savedQuestion: savedRecord, commentId: this.commentId },
        bubbles: true,
        composed: true
      });
      this.dispatchEvent(event);
    }
  }

  disconnectedCallback() {
    // Clean up event listeners if needed
  }

  setupEventListeners() {
    // Toggle expand/collapse
    const toggleButton = this.shadowRoot.querySelector('.toggle-button');
    toggleButton.addEventListener('click', () => this.toggleExpanded());

    // Tab switching
    const tabs = this.shadowRoot.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });

    // Skill level sync
    const skillRadios = this.shadowRoot.querySelectorAll('input[name="skill-level-global"]');
    skillRadios.forEach(skillRadio => {
        skillRadio.addEventListener('change', () => {
            this.skillLevel = skillRadio.value;
        });
    });

    // Submit custom question
    const submitButton = this.shadowRoot.querySelector('.submit-button');
    submitButton.addEventListener('click', () => this.submitCustomQuestion());

    // Generate practice questions
    const generateButton = this.shadowRoot.querySelector('.generate-question-button');
    generateButton.addEventListener('click', () => this.generatePracticeQuestion());

    // Get project suggestions
    const projectButton = this.shadowRoot.querySelector('.project-button');
    projectButton.addEventListener('click', () => this.getProjectSuggestions());

    // Prevent keyboard event propagation in text input
    const textInput = this.shadowRoot.querySelector('.text-input');
    textInput.addEventListener('keydown', (e) => e.stopPropagation());

    // Observe changes in results-area content
    const resultsAreas = this.shadowRoot.querySelectorAll('.results-area');
    resultsAreas.forEach(resultsArea => {
        const observer = new MutationObserver(() => {
            resultsArea.style.display = resultsArea.innerHTML.trim() ? 'block' : 'none';
        });
        observer.observe(resultsArea, { childList: true, subtree: true });
    });
  }

  renderDefaultQuestions() {
    const container = this.shadowRoot.querySelector('.default-questions');
    this.defaultQuestions.forEach((question, index) => {
      const button = document.createElement('button');
      button.className = 'question-button';
      button.textContent = question.text;
      button.addEventListener('click', () => {
        this.submitDefaultQuestion(question);
        const textInput = this.shadowRoot.querySelector('.text-input');
        textInput.value = question.text === this.AI_SUGGESTION_TEXT 
          ? 'Generating a question and an answer about this code.' 
          : question.text; // Fill the textarea with the appropriate text
      });
      container.appendChild(button);
    });
  }

  toggleExpanded() {
    this.isExpanded = !this.isExpanded;
    const expandedContent = this.shadowRoot.querySelector('.expanded-content');
    const arrow = this.shadowRoot.querySelector('.arrow');
    
    if (this.isExpanded) {
      expandedContent.classList.add('open');
      arrow.classList.add('open');
    } else {
      expandedContent.classList.remove('open');
      arrow.classList.remove('open');
    }
  }

  switchTab(tabName) {
    this.activeTab = tabName;
    
    // Update active tab
    const tabs = this.shadowRoot.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Update active content
    const contents = this.shadowRoot.querySelectorAll('.tab-content');
    contents.forEach(content => {
      content.classList.toggle('active', content.dataset.tabContent === tabName);
    });
  }

  async submitDefaultQuestion(question) {
    const sinceLastComment = this.shadowRoot.querySelector('#sinceLastComment').checked;
    const skillLevel = this.skillLevel;
    
    const codeFromPlayback = this.playbackEngine.getMostRecentFileEdits(sinceLastComment);
    const prompt = `${codeFromPlayback}\n\nNow, for the user's question, briefly respond to this prompt:\n\n${question.prompt}\n\nThe user is a ${skillLevel} programmer, tailor your answer appropriately.`;

    await this.sendPromptToServer('Ask', prompt, question.text, 'askAQuestion');
  }

  async submitCustomQuestion() {
    const textInput = this.shadowRoot.querySelector('.text-input');
    const questionText = textInput.value.trim();
    
    if (!questionText) return;
    
    const sinceLastComment = this.shadowRoot.querySelector('#sinceLastComment').checked;
    const skillLevel = this.skillLevel;
    
    const codeFromPlayback = this.playbackEngine.getMostRecentFileEdits(sinceLastComment);
    const prompt = `${codeFromPlayback}\n\nNow, for the user's question, briefly respond to this prompt:\n\n${questionText}\n\nThe user is a ${skillLevel} programmer, tailor your answer appropriately.`;

    await this.sendPromptToServer('Ask', prompt, questionText, 'askAQuestion');
    
    textInput.value = '';
  }

  async generatePracticeQuestion() {
    const generateButton = this.shadowRoot.querySelector('.generate-question-button');
    generateButton.textContent = 'Generating questions...';
    generateButton.setAttribute('disabled', 'true');

    const skillLevel = this.skillLevel;
    let codeFromPlayback = this.playbackEngine.getMostRecentFileEdits(false);

    let promptWithCode = `
      Look at the following code and come up with ${this.numQuestionsToGenerate} multiple choice questions that can be asked about it:\n\n${codeFromPlayback}\n\n
      Each question should be tailored to a ${skillLevel} level learner. Avoid "what is the output of this code?" type questions and ask something deeper. Look at the supplied code and the author's description when choosing questions.\n\n
      The format of the response must be raw JSON. Specifically, do not surround the response with \`\`\`json designators. Each question must be stored in an array called 'questions'. Each question object must have the following members:\n\n
      {
        "question": "The question text",
        "allAnswers": [
          "Correct answer",
          "Incorrect answer 1",
          "Incorrect answer 2",
          "Incorrect answer 3"
        ],
        "correctAnswer": "Correct answer",
        "explanation": "A brief explanation of why the correct answer is correct"
      }\n\n`;

    const promptObject = {
        requestType: 'Generate Question',
        prompt: promptWithCode,
        playbackViewId: this.playbackEngine.playbackData.viewId || null
    };

    const serverProxy = new ServerProxy();
    serverProxy.sendAIPromptToServer(promptObject).then(responseObject => {
        generateButton.textContent = 'Generate More Practice Questions';
        generateButton.removeAttribute('disabled');

        const resultsArea = this.shadowRoot.querySelector('[data-tab-content="practice"] .results-area');

        if (responseObject.error) {
            const errorDiv = document.createElement('div');
            errorDiv.textContent = responseObject.response;
            errorDiv.style.color = '#ef4444';
            resultsArea.prepend(errorDiv);
        } else {
            try {
                const questionsData = JSON.parse(responseObject.response);

                questionsData.questions.forEach(questionData => {
                    // Randomize answer positions
                    const randomIndex = Math.floor(Math.random() * questionData.allAnswers.length);
                    const temp = questionData.allAnswers[0];
                    questionData.allAnswers[0] = questionData.allAnswers[randomIndex];
                    questionData.allAnswers[randomIndex] = temp;

                    // Save raw data to localStorage before markdown rendering
                    this.saveAndDisplayQuestion({ ...questionData }, resultsArea, true);
                });

                if (this.sendResponseAsEvent) {
                    const event = new CustomEvent('ai-generate-questions-response', {
                        detail: { response: questionsData.questions },
                        bubbles: true,
                        composed: true
                    });
                    this.dispatchEvent(event);
                }
            } catch (e) {
                const errorDiv = document.createElement('div');
                errorDiv.textContent = 'Failed to parse questions';
                errorDiv.style.color = '#ef4444';
                resultsArea.prepend(errorDiv);
            }
        }
    });
  }

  async getProjectSuggestions() {
    const codeFromPlayback = this.playbackEngine.getMostRecentFileEdits(false);
    const skillLevel = this.skillLevel;

    const prompt = `
      Imagine that I, as a ${skillLevel} learner, want to alter this code slightly to reinforce the concepts that are being shown in this program. \n
      Pick an interesting section of code that clearly exemplifies a concept and suggest some features, additions, or changes that I can make to this code to learn more about what is happening. \n
      The changes required should be fairly small in size and require a effort required. \n
      Include a brief suggestion of the change and he key concepts that will be reinforced. \n
      Don't suggest adding comments to the code as it is not significant enough. \n\n

      For a fourth suggestion, suggest a completely different program that transfers some of the ideas from this one into a brand new program with a short but clear specification of what is required in this new program. \n\n
      
      Format the response as clear, numbered suggestions. Add this text to the end of the response: 
        "You can download the code from this playback by going to the 'File System' tab and clicking on the 'Download code at this point' button. 
        This will download the code at this point in the playback as a zip file. You can then unzip it and open it in your favorite code editor."\n\n
      
        Here is the code:\n\n${codeFromPlayback}\n\n
    `;

    await this.sendPromptToServer('Ask', prompt, 'Project Ideas', 'projects');
  }

  async sendPromptToServer(requestType, prompt, questionText, tab) {
    // Disable relevant buttons
    const buttons = this.shadowRoot.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = true);
    
    // Update button text
    let targetButton;
    if (tab === 'askAQuestion') {
      targetButton = this.shadowRoot.querySelector('.submit-button');
      targetButton.textContent = 'Generating response...';
    } else if (tab === 'practice') {
      targetButton = this.shadowRoot.querySelector('.generate-question-button');
      targetButton.textContent = 'Generating questions...';
    } else if (tab === 'projects') {
      targetButton = this.shadowRoot.querySelector('.project-button');
      targetButton.textContent = 'Getting suggestions...';
    }
    
    const promptObject = {
      requestType: requestType,
      prompt: prompt,
      playbackViewId: this.playbackEngine.playbackData.viewId || null
    };
    
    try {
      const serverProxy = new ServerProxy();
      const responseObject = await serverProxy.sendAIPromptToServer(promptObject);
      
      if (responseObject.error) {
        this.displayError(responseObject.response, tab);
      } else {
        this.displayResponse(responseObject.response, questionText, tab);
      }
    } catch (error) {
      this.displayError('Failed to get response from server', tab);
    } finally {
      // Re-enable buttons and reset text
      buttons.forEach(btn => btn.disabled = false);
      
      if (tab === 'askAQuestion') {
        targetButton.textContent = 'Submit Question';
      } else if (tab === 'practice') {
        targetButton.textContent = 'Generate 5 Practice Questions';
      } else if (tab === 'projects') {
        targetButton.textContent = 'Get Project Suggestions';
      }
    }
  }

  displayResponse(response, questionText, tab) {
    const resultsArea = this.shadowRoot.querySelector(`[data-tab-content="${tab}"] .results-area`);

    if (tab === 'askAQuestion') {
      const md = markdownit();
      const responseDiv = document.createElement('div');
      responseDiv.className = 'response-item';

      if (questionText) {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-text';
        questionDiv.textContent = questionText;
        responseDiv.appendChild(questionDiv);

        // Update the textarea with the generated question
        const textInput = this.shadowRoot.querySelector('.text-input');
        textInput.value = '';
      }

      const answerDiv = document.createElement('div');
      answerDiv.className = 'response-text';
      answerDiv.innerHTML = md.render(response);
      responseDiv.appendChild(answerDiv);

      // Add "Save to Notes" button if localStorage and commentId are available
      if (this.localStorageManager && this.commentId) {
        const saveButton = this.createSaveToNotesButton(questionText, response);
        responseDiv.appendChild(saveButton);
      }

      resultsArea.insertBefore(responseDiv, resultsArea.firstChild);

      if (this.sendResponseAsEvent) {
        const event = new CustomEvent('ai-prompt-response', {
          detail: {
            prompt: questionText,
            response: answerDiv.innerHTML
          },
          bubbles: true,
          composed: true
        });
        this.dispatchEvent(event);
      }
    } else if (tab === 'practice') {
      try {
        const questions = JSON.parse(response);
        resultsArea.innerHTML = '';

        questions.forEach((q, index) => {
          // Randomize answer positions
          const randomIndex = Math.floor(Math.random() * q.allAnswers.length);
          const temp = q.allAnswers[0];
          q.allAnswers[0] = q.allAnswers[randomIndex];
          q.allAnswers[randomIndex] = temp;

          // Save raw data to localStorage before markdown rendering
          this.saveAndDisplayQuestion({ ...q }, resultsArea, false);
        });

        if (this.sendResponseAsEvent) {
          const event = new CustomEvent('ai-generate-questions-response', {
            detail: { response: questions },
            bubbles: true,
            composed: true
          });
          this.dispatchEvent(event);
        }
      } catch (e) {
        this.displayError('Failed to parse questions', tab);
      }
    } else if (tab === 'projects') {
      const md = markdownit();
      resultsArea.innerHTML = md.render(response);

      if (this.sendResponseAsEvent) {
        const event = new CustomEvent('ai-project-suggestions-response', {
          detail: { response: response },
          bubbles: true,
          composed: true
        });
        this.dispatchEvent(event);
      }
    }
  }

  displayError(error, tab) {
    const resultsArea = this.shadowRoot.querySelector(`[data-tab-content="${tab}"] .results-area`);
    resultsArea.innerHTML = `<div style="color: #ef4444;">Error: ${error}</div>`;
  }

  updateResultsVisibility() {
    const resultsAreas = this.shadowRoot.querySelectorAll('.results-area');
    resultsAreas.forEach(resultsArea => {
        if (resultsArea.children.length > 0) {
            resultsArea.style.display = 'block';
        } else {
            resultsArea.style.display = 'none';
        }
    });
  }

  setLocalStorageManager(localStorageManager) {
    this.localStorageManager = localStorageManager;
  }

  /**
   * Create a "Save to Notes" button for a Q&A response
   */
  createSaveToNotesButton(questionText, responseText) {
    const container = document.createElement('div');
    container.className = 'save-to-notes-container';

    const button = document.createElement('button');
    button.className = 'save-to-notes-button';
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
      Save to Notes
    `;
    button.title = 'Save this question and answer to your personal notes';

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.saveQAToNotes(questionText, responseText, container);
    });

    container.appendChild(button);
    return container;
  }

  /**
   * Save a Q&A to the notes for this comment
   */
  saveQAToNotes(questionText, responseText, container) {
    if (!this.localStorageManager || !this.commentId) return;

    // Format the Q&A as markdown
    const qaPart = `**Question:** ${questionText}\n\n**Answer:** ${responseText}\n\n---\n\n`;

    // Get existing note (if any) and append
    const existingNote = this.localStorageManager.getNote(this.commentId);
    let newNoteText;

    if (existingNote && existingNote.text) {
      // Append to existing note
      newNoteText = existingNote.text + '\n\n' + qaPart;
    } else {
      // Create new note
      newNoteText = qaPart;
    }

    // Save the note
    this.localStorageManager.saveNote(this.commentId, newNoteText.trim());

    // Update button to show saved state
    const saveButton = container.querySelector('.save-to-notes-button');
    saveButton.classList.add('saved');
    saveButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      Saved!
    `;
    saveButton.disabled = true;

    // Add "View" button if not already present
    if (!container.querySelector('.view-notes-button')) {
      const viewButton = document.createElement('button');
      viewButton.className = 'view-notes-button';
      viewButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        View In Note
      `;
      viewButton.title = 'Open notes editor';
      viewButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dispatchEvent(new CustomEvent('open-note-editor', {
          detail: { commentId: this.commentId },
          bubbles: true,
          composed: true
        }));
      });
      container.appendChild(viewButton);
    }

    // Dispatch event so NoteEditor and note indicator can update
    this.dispatchEvent(new CustomEvent('note-saved', {
      detail: { commentId: this.commentId, hasNote: true },
      bubbles: true,
      composed: true
    }));
  }
}

window.customElements.define('st-ai-assistant', AIAssistant);