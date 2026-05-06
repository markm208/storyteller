/**
 * SummaryReviewModal - Modal dialog showing learning summary
 *
 * My Learning (Viewer's Interaction Summary)
 * - Progress overview
 * - Quiz performance
 * - Notes summary
 */
class SummaryReviewModal extends HTMLElement {
  constructor(playbackEngine, localStorageManager) {
    super();

    this.playbackEngine = playbackEngine;
    this.localStorageManager = localStorageManager;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.7);
        }

        .modal {
          position: relative;
          background-color: #1f2937;
          border-radius: 8px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          max-width: 700px;
          width: 90%;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          color: #e2e8f0;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #374151;
        }

        .modal-title {
          font-size: 1.25em;
          font-weight: 600;
          margin: 0;
        }

        .close-button {
          background: none;
          border: none;
          color: #9ca3af;
          font-size: 1.5em;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }

        .close-button:hover {
          color: #e2e8f0;
        }

        .modal-body {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
        }

        .section {
          margin-bottom: 24px;
        }

        .section:last-child {
          margin-bottom: 0;
        }

        .section-title {
          font-size: 1em;
          font-weight: 600;
          color: #9ca3af;
          margin: 0 0 12px 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-card {
          background-color: #374151;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 12px;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .stat-row:last-child {
          margin-bottom: 0;
        }

        .stat-label {
          color: #9ca3af;
          font-size: 0.9em;
        }

        .stat-value {
          font-weight: 600;
          color: #e2e8f0;
        }

        .stat-value.highlight {
          color: #3b82f6;
        }

        .progress-bar-wrapper {
          position: relative;
          margin-top: 8px;
          margin-bottom: 8px;
        }

        .progress-bar-container {
          background-color: #4b5563;
          border-radius: 4px;
          height: 8px;
          display: flex;
          position: relative;
        }

        .progress-segment {
          height: 100%;
          flex-shrink: 0;
          position: relative;
          cursor: pointer;
          pointer-events: auto;
          z-index: 1;
        }

        .progress-segment:hover {
          filter: brightness(1.2);
        }

        .progress-segment:active {
          filter: brightness(0.9);
        }

        .segment-tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background-color: #1f2937;
          border: 1px solid #374151;
          border-radius: 4px;
          padding: 6px 10px;
          font-size: 0.8em;
          white-space: nowrap;
          z-index: 10;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s;
          margin-bottom: 4px;
        }

        .progress-segment:hover .segment-tooltip {
          opacity: 1;
        }

        .segment-tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 5px solid transparent;
          border-top-color: #374151;
        }

        /* Heat map colors based on visit count */
        .progress-segment.heat-0 {
          background-color: #4b5563; /* gray - not visited */
        }

        .progress-segment.heat-1 {
          background-color: #60a5fa; /* blue - 1 visit */
        }

        .progress-segment.heat-2 {
          background-color: #34d399; /* green - 2 visits */
        }

        .progress-segment.heat-3 {
          background-color: #fbbf24; /* yellow - 3 visits */
        }

        .progress-segment.heat-4 {
          background-color: #f97316; /* orange - 4 visits */
        }

        .progress-segment.heat-5-plus {
          background-color: #ef4444; /* red - 5+ visits */
        }

        .tick-marks-container {
          position: relative;
          height: 16px;
          margin-top: 4px;
        }

        .tick-mark {
          position: absolute;
          width: 3px;
          height: 10px;
          background-color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
          transform: translateX(-50%);
        }

        .tick-mark:hover {
          background-color: #60a5fa;
          height: 14px;
        }

        .tick-mark.viewed {
          background-color: #e5e7eb; /* light gray for viewed */
        }

        .tick-mark.viewed:hover {
          background-color: #f3f4f6;
        }

        .tick-mark-tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background-color: #1f2937;
          border: 1px solid #374151;
          border-radius: 4px;
          padding: 6px 10px;
          font-size: 0.8em;
          white-space: nowrap;
          z-index: 10;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s;
          margin-bottom: 4px;
        }

        .tick-mark:hover .tick-mark-tooltip {
          opacity: 1;
        }

        .tick-mark-tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 5px solid transparent;
          border-top-color: #374151;
        }

        .badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.8em;
          font-weight: 600;
        }

        .badge.success {
          background-color: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }

        .badge.warning {
          background-color: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }

        .badge.info {
          background-color: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }

        .badge.neutral {
          background-color: rgba(156, 163, 175, 0.2);
          color: #9ca3af;
        }

        /* Quiz Review Styles */
        .quiz-overview {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #4b5563;
        }

        .quiz-overview-stat {
          text-align: center;
        }

        .quiz-overview-value {
          font-size: 1.4em;
          font-weight: 600;
          color: #e2e8f0;
        }

        .quiz-overview-label {
          font-size: 0.75em;
          color: #9ca3af;
          text-transform: uppercase;
        }

        .quiz-section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 16px 0 8px 0;
          font-weight: 600;
          font-size: 0.9em;
        }

        .quiz-section-header.needs-review {
          color: #f87171;
        }

        .quiz-section-header.mastered {
          color: #10b981;
        }

        .quiz-section-header svg {
          flex-shrink: 0;
        }

        .quiz-comment-group {
          margin-bottom: 12px;
          background-color: #2d3748;
          border-radius: 6px;
          overflow: hidden;
        }

        .quiz-comment-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background-color: #1f2937;
        }

        .quiz-comment-header svg {
          flex-shrink: 0;
        }

        .quiz-comment-link {
          font-size: 0.9em;
          color: #60a5fa;
          text-decoration: none;
          flex-grow: 1;
        }

        .quiz-comment-link:hover {
          color: #93c5fd;
          text-decoration: underline;
        }

        .quiz-comment-score {
          font-size: 0.85em;
          color: #9ca3af;
        }

        .quiz-comment-score.all-correct {
          color: #10b981;
        }

        .quiz-question-list {
          padding: 0 12px 12px 12px;
        }

        .quiz-question-item {
          padding: 12px;
          margin-top: 8px;
          background-color: #374151;
          border-radius: 4px;
          border-left: 3px solid #ef4444;
        }

        .quiz-question-item.correct {
          border-left-color: #10b981;
        }

        .quiz-question-text {
          font-size: 0.9em;
          color: #e2e8f0;
          margin-bottom: 8px;
        }

        .quiz-answer-row {
          display: flex;
          font-size: 0.85em;
          margin-bottom: 4px;
        }

        .quiz-answer-label {
          color: #9ca3af;
          width: 100px;
          flex-shrink: 0;
        }

        .quiz-answer-value {
          color: #e2e8f0;
        }

        .quiz-answer-value.incorrect {
          color: #f87171;
        }

        .quiz-answer-value.correct-answer {
          color: #10b981;
        }

        .quiz-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 10px;
        }

        .quiz-action-btn {
          padding: 4px 10px;
          font-size: 0.8em;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .quiz-action-btn.clear {
          background-color: rgba(239, 68, 68, 0.2);
          color: #f87171;
        }

        .quiz-action-btn.clear:hover {
          background-color: rgba(239, 68, 68, 0.3);
        }

        .quiz-corrected-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 10px;
          padding: 8px 10px;
          background-color: rgba(16, 185, 129, 0.1);
          border-radius: 4px;
          font-size: 0.85em;
          color: #10b981;
        }

        .quiz-corrected-indicator svg {
          flex-shrink: 0;
        }

        .quiz-question-item.corrected {
          border-left-color: #10b981;
          background-color: rgba(55, 65, 81, 0.7);
        }

        .quiz-forget-hint {
          font-size: 0.9em;
          color: rgba(16, 185, 129, 0.8);
          margin-top: 4px;
          font-style: italic;
        }

        .mastered-clear-btn {
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          padding: 2px;
          display: flex;
          align-items: center;
          opacity: 0.6;
          transition: all 0.2s;
        }

        .mastered-clear-btn:hover {
          color: #f87171;
          opacity: 1;
        }

        .mastered-list {
          padding: 0 12px 12px 12px;
        }

        .mastered-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 0;
          font-size: 0.85em;
          color: #9ca3af;
          border-bottom: 1px solid #374151;
        }

        .mastered-item:last-child {
          border-bottom: none;
        }

        .mastered-item svg {
          color: #10b981;
          flex-shrink: 0;
        }

        .mastered-item a {
          color: #60a5fa;
          text-decoration: none;
          cursor: pointer;
        }

        .mastered-item a:hover {
          color: #93c5fd;
          text-decoration: underline;
        }

        .top-comments-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .top-comments-list li {
          padding: 8px 0;
          border-bottom: 1px solid #4b5563;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .top-comments-list li:last-child {
          border-bottom: none;
        }

        .comment-link {
          color: #60a5fa;
          cursor: pointer;
          text-decoration: none;
        }

        .comment-link:hover {
          text-decoration: underline;
        }

        .notes-list {
          max-height: 300px;
          overflow-y: auto;
        }

        .note-item {
          border-bottom: 1px solid #4b5563;
          padding: 12px 0;
        }

        .note-item:last-child {
          border-bottom: none;
        }

        .note-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .note-comment-link {
          color: #60a5fa;
          text-decoration: none;
          font-weight: 500;
        }

        .note-comment-link:hover {
          text-decoration: underline;
        }

        .note-date {
          font-size: 0.8em;
          color: #6b7280;
        }

        .note-item-content {
          font-size: 0.9em;
          color: #d1d5db;
          line-height: 1.5;
          padding-left: 8px;
          border-left: 2px solid #4b5563;
        }

        .note-item-content p {
          margin: 0 0 8px 0;
        }

        .note-item-content p:last-child {
          margin-bottom: 0;
        }

        .note-item-content code {
          background-color: rgba(0, 0, 0, 0.3);
          padding: 1px 4px;
          border-radius: 3px;
          font-size: 0.9em;
        }

        .modal-footer {
          padding: 16px 20px;
          border-top: 1px solid #374151;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .privacy-notice {
          font-size: 0.8em;
          color: #6b7280;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .action-button {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-button.primary {
          background-color: #3b82f6;
          border: none;
          color: white;
        }

        .action-button.primary:hover {
          background-color: #2563eb;
        }

        .action-button.danger {
          background-color: transparent;
          border: 1px solid #ef4444;
          color: #ef4444;
        }

        .action-button.danger:hover {
          background-color: rgba(239, 68, 68, 0.1);
        }

        .action-button.secondary {
          background-color: transparent;
          border: 1px solid #3b82f6;
          color: #3b82f6;
        }

        .action-button.secondary:hover {
          background-color: rgba(59, 130, 246, 0.1);
        }

        .empty-state {
          text-align: center;
          color: #6b7280;
          padding: 20px;
        }

        a {
          color: #60a5fa;
        }
      </style>

      <div class="overlay"></div>
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">My Progress</h2>
          <button class="close-button" title="Close">&times;</button>
        </div>

        <div class="modal-body">
          <!-- Progress Section -->
          <div class="section">
            <h3 class="section-title">Progress</h3>
            <div class="stat-card">
              <div class="stat-row">
                <span class="stat-label">Comments viewed</span>
                <span class="stat-value" id="viewedComments">0 / 0</span>
              </div>
              <div class="progress-bar-wrapper">
                <div class="progress-bar-container" id="progressBarContainer"></div>
                <div class="tick-marks-container" id="tickMarksContainer"></div>
              </div>
              <div class="stat-row" style="margin-top: 12px;">
                <span class="stat-label">Completion</span>
                <span id="completionBadge"></span>
              </div>
            </div>
          </div>

          <!-- Notes Section -->
          <div class="section">
            <h3 class="section-title">Personal Notes</h3>
            <div class="stat-card" id="notesStats">
              <div class="empty-state">No notes added yet</div>
            </div>
          </div>

          <!-- Quiz Section -->
          <div class="section">
            <h3 class="section-title">Quiz Performance</h3>
            <div class="stat-card" id="quizStats">
              <div class="empty-state">No quizzes attempted yet</div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <span class="privacy-notice">All data is stored locally in your browser</span>
          <div class="action-buttons">
            <button class="action-button danger" id="clearDataButton">Clear My Progress</button>
            <button class="action-button secondary" id="generateReportButton">Generate Study Report</button>
            <button class="action-button primary" id="closeButton">Close</button>
          </div>
        </div>
      </div>
    `;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    this.setupEventListeners();
    this.loadMyLearningData();
  }

  setupEventListeners() {
    // Close button
    const closeButton = this.shadowRoot.querySelector('.close-button');
    closeButton.addEventListener('click', () => this.close());

    // Footer close button
    const footerCloseButton = this.shadowRoot.querySelector('#closeButton');
    footerCloseButton.addEventListener('click', () => this.close());

    // Overlay click to close
    const overlay = this.shadowRoot.querySelector('.overlay');
    overlay.addEventListener('click', () => this.close());

    // Clear data button
    const clearDataButton = this.shadowRoot.querySelector('#clearDataButton');
    clearDataButton.addEventListener('click', () => this.clearAllData());

    // Generate report button
    const generateReportButton = this.shadowRoot.querySelector('#generateReportButton');
    generateReportButton.addEventListener('click', () => this.generateStudyReport());

    // Escape key to close
    document.addEventListener('keydown', this.handleEscapeKey);

    // Comment link clicks
    this.shadowRoot.addEventListener('click', (e) => {
      if (e.target.classList.contains('comment-link')) {
        const commentId = e.target.dataset.commentId;
        if (commentId) {
          this.navigateToComment(commentId);
        }
      }
    });
  }

  handleEscapeKey = (e) => {
    if (e.key === 'Escape') {
      this.close();
    }
  }

  loadMyLearningData() {
    // Progress data
    const totalComments = this.playbackEngine.commentInfo.totalNumberOfComments;
    const viewedCount = this.localStorageManager.getViewedCount();
    const percentage = totalComments > 0 ? Math.round((viewedCount / totalComments) * 100) : 0;
    const flattenedComments = this.playbackEngine.commentInfo.flattenedComments;

    this.shadowRoot.querySelector('#viewedComments').textContent = `${viewedCount} / ${totalComments}`;

    // Generate heat map segments for the progress bar
    const progressBarContainer = this.shadowRoot.querySelector('#progressBarContainer');
    if (totalComments > 0) {
      // Calculate max visit count for relative heat scaling
      const visitCounts = flattenedComments.map(c => this.localStorageManager.getCommentVisitCount(c.id));
      const maxVisits = Math.max(...visitCounts, 1); // At least 1 to avoid division by zero

      const segmentWidth = 100 / totalComments;
      progressBarContainer.innerHTML = flattenedComments.map((comment, index) => {
        const visitCount = this.localStorageManager.getCommentVisitCount(comment.id);
        const isViewed = visitCount > 0;
        const statusText = isViewed
          ? `Visited ${visitCount} time${visitCount !== 1 ? 's' : ''}`
          : 'Not viewed';
        const commentTitle = comment.commentTitle || `Comment ${index + 1}`;
        const truncatedTitle = commentTitle.length > 30 ? commentTitle.substring(0, 30) + '...' : commentTitle;

        // Determine heat class based on relative visit frequency
        let heatClass;
        if (visitCount === 0) {
          heatClass = 'heat-0';
        } else {
          const ratio = visitCount / maxVisits;
          if (ratio > 0.8) {
            heatClass = 'heat-5-plus';
          } else if (ratio > 0.6) {
            heatClass = 'heat-4';
          } else if (ratio > 0.4) {
            heatClass = 'heat-3';
          } else if (ratio > 0.2) {
            heatClass = 'heat-2';
          } else {
            heatClass = 'heat-1';
          }
        }

        return `
          <div class="progress-segment ${heatClass}"
               style="width: ${segmentWidth}%"
               data-comment-id="${comment.id}">
            <div class="segment-tooltip">
              <div><strong>${truncatedTitle}</strong></div>
              <div>${statusText}</div>
            </div>
          </div>`;
      }).join('');

      // Add click handler using event delegation
      progressBarContainer.addEventListener('click', (e) => {
        const segment = e.target.closest('.progress-segment');
        if (segment && segment.dataset.commentId) {
          this.navigateToComment(segment.dataset.commentId);
        }
      });
    }

    const completionBadge = this.shadowRoot.querySelector('#completionBadge');
    if (percentage === 100) {
      completionBadge.innerHTML = '<span class="badge success">Completed!</span>';
    } else if (percentage >= 75) {
      completionBadge.innerHTML = '<span class="badge info">Almost there!</span>';
    } else if (percentage >= 50) {
      completionBadge.innerHTML = '<span class="badge warning">Halfway</span>';
    } else if (percentage > 0) {
      completionBadge.innerHTML = '<span class="badge neutral">In Progress</span>';
    } else {
      completionBadge.innerHTML = '<span class="badge neutral">Not Started</span>';
    }

    // Generate tick marks for each comment
    const tickMarksContainer = this.shadowRoot.querySelector('#tickMarksContainer');

    if (totalComments > 0) {
      tickMarksContainer.innerHTML = flattenedComments.map((comment, index) => {
        const commentId = comment.id;
        const position = ((index + 0.5) / totalComments) * 100;
        const isViewed = this.localStorageManager.isCommentViewed(commentId);
        const visitCount = this.localStorageManager.getCommentVisitCount(commentId);
        const statusText = isViewed
          ? `Visited ${visitCount} time${visitCount !== 1 ? 's' : ''}`
          : 'Not viewed';
        const commentTitle = comment.commentTitle || `Comment ${index + 1}`;
        const truncatedTitle = commentTitle.length > 30 ? commentTitle.substring(0, 30) + '...' : commentTitle;

        return `
          <div class="tick-mark ${isViewed ? 'viewed' : ''}"
               style="left: ${position}%"
               data-comment-id="${commentId}">
            <div class="tick-mark-tooltip">
              <div><strong>${truncatedTitle}</strong></div>
              <div>${statusText}</div>
            </div>
          </div>
        `;
      }).join('');

      // Add click handler using event delegation
      tickMarksContainer.addEventListener('click', (e) => {
        const tick = e.target.closest('.tick-mark');
        if (tick && tick.dataset.commentId) {
          this.navigateToComment(tick.dataset.commentId);
        }
      });
    }

    // Quiz stats - grouped by comment with review focus
    const quizStats = this.localStorageManager.getActiveQuestionStats();
    const questionHistory = this.localStorageManager.getActiveQuestionHistory();
    const quizStatsContainer = this.shadowRoot.querySelector('#quizStats');

    if (quizStats.total > 0) {
      // Group questions by comment
      const questionsByComment = {};
      questionHistory.forEach(q => {
        const commentId = q.commentId || 'unknown';
        if (!questionsByComment[commentId]) {
          questionsByComment[commentId] = [];
        }
        questionsByComment[commentId].push(q);
      });

      // Separate into needs review (has incorrect) and mastered (all correct)
      const needsReview = [];
      const mastered = [];

      Object.entries(questionsByComment).forEach(([commentId, questions]) => {
        const hasIncorrect = questions.some(q => !q.isCorrect);
        const comment = this.playbackEngine.getCommentById(commentId);
        const commentIndex = this.playbackEngine.getCommentIndex(commentId);
        let commentTitle;
        if (comment?.commentTitle) {
          commentTitle = comment.commentTitle;
        } else if (commentIndex >= 0) {
          commentTitle = `Comment ${commentIndex + 1}`;
        } else {
          commentTitle = 'Unknown Comment';
        }
        const correct = questions.filter(q => q.isCorrect).length;

        const group = {
          commentId,
          commentTitle,
          commentIndex,
          questions,
          correct,
          total: questions.length
        };

        if (hasIncorrect) {
          needsReview.push(group);
        } else {
          mastered.push(group);
        }
      });

      // Sort by comment index
      needsReview.sort((a, b) => a.commentIndex - b.commentIndex);
      mastered.sort((a, b) => a.commentIndex - b.commentIndex);

      // Build HTML
      let html = `
        <div class="quiz-overview">
          <div class="quiz-overview-stat">
            <div class="quiz-overview-value">${quizStats.total}</div>
            <div class="quiz-overview-label">Answered</div>
          </div>
          <div class="quiz-overview-stat">
            <div class="quiz-overview-value" style="color: #10b981;">${quizStats.correct}</div>
            <div class="quiz-overview-label">Correct</div>
          </div>
          <div class="quiz-overview-stat">
            <div class="quiz-overview-value" style="color: #3b82f6;">${quizStats.accuracy}%</div>
            <div class="quiz-overview-label">Accuracy</div>
          </div>
        </div>
      `;

      // Needs Review section
      if (needsReview.length > 0) {
        html += `
          <div class="quiz-section-header needs-review">
            Needs Review (${needsReview.length} section${needsReview.length !== 1 ? 's' : ''})
          </div>
        `;

        needsReview.forEach(group => {
          const incorrectQuestions = group.questions.filter(q => !q.isCorrect);
          const commentNumber = group.commentIndex >= 0 ? group.commentIndex + 1 : null;
          const commentUrl = commentNumber ? `?comment=${commentNumber}` : '#';
          html += `
            <div class="quiz-comment-group" data-comment-id="${group.commentId}">
              <div class="quiz-comment-header">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="#f87171" viewBox="0 0 16 16">
                  <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                </svg>
                <a href="${commentUrl}" class="quiz-comment-link">${group.commentTitle}</a>
                <span class="quiz-comment-score">${group.correct}/${group.total} correct</span>
              </div>
              <div class="quiz-question-list">
          `;

          incorrectQuestions.forEach(q => {
            // Use answerId for individual removal, fall back to questionId for old records
            const removeId = q.answerId || q.questionId;

            // Check if there's a later correct answer for this question
            const laterCorrectAnswer = group.questions.find(
              other => other.questionId === q.questionId &&
                       other.isCorrect &&
                       other.timestamp > q.timestamp
            );
            const isCorrected = !!laterCorrectAnswer;

            // Count remaining incorrect answers in this comment group to determine if forgetting moves to mastered
            const remainingIncorrectInGroup = incorrectQuestions.filter(
              other => (other.answerId || other.questionId) !== removeId
            ).length;
            const willMoveTOMastered = remainingIncorrectInGroup === 0;

            html += `
              <div class="quiz-question-item ${isCorrected ? 'corrected' : ''}" data-question-id="${q.questionId}">
                <div class="quiz-question-text">${q.question}</div>
                <div class="quiz-answer-row">
                  <span class="quiz-answer-label">Your answer:</span>
                  <span class="quiz-answer-value incorrect">${q.userAnswer}</span>
                </div>
                <div class="quiz-answer-row">
                  <span class="quiz-answer-label">Correct:</span>
                  <span class="quiz-answer-value correct-answer">${q.correctAnswer}</span>
                </div>
                ${isCorrected ? `
                <div class="quiz-corrected-indicator">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022z"/>
                  </svg>
                  <div>
                    <div>You later answered this correctly</div>
                    <div class="quiz-forget-hint">Click 'Forget' this to move the question to Mastered</div>
                  </div>
                </div>
                ` : ''}
                <div class="quiz-actions">
                  <button class="quiz-action-btn clear" data-answer-id="${removeId}">Forget</button>
                </div>
              </div>
            `;
          });

          html += `
              </div>
            </div>
          `;
        });
      }

      // Mastered section
      if (mastered.length > 0) {
        html += `
          <div class="quiz-section-header mastered">
            Mastered (${mastered.length} section${mastered.length !== 1 ? 's' : ''})
          </div>
          <div class="quiz-comment-group">
            <div class="mastered-list">
        `;

        mastered.forEach(group => {
          // Get all question IDs for this group to enable clearing
          const questionIds = group.questions.map(q => q.questionId).join(',');
          // Use 1-based index for URL, handle unknown comments
          const commentNumber = group.commentIndex >= 0 ? group.commentIndex + 1 : null;
          const commentUrl = commentNumber ? `?comment=${commentNumber}` : '#';
          html += `
            <div class="mastered-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                <path d="M10.97 4.97a.75.75 0 0 1 1.071 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
              </svg>
              <a href="${commentUrl}" class="mastered-link">${group.commentTitle}</a>
              <span style="margin-left: auto;">${group.total}/${group.total}</span>
              <button class="mastered-clear-btn" data-question-ids="${questionIds}" title="Forget these results">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                  <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                </svg>
              </button>
            </div>
          `;
        });

        html += `
            </div>
          </div>
        `;
      }

      quizStatsContainer.innerHTML = html;

      // Add event listeners for clear/forget buttons on individual questions
      // Uses dismissAnswer to preserve data for AI analysis while hiding from UI
      quizStatsContainer.querySelectorAll('.quiz-action-btn.clear').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const answerId = btn.dataset.answerId;
          if (answerId) {
            this.localStorageManager.dismissAnswer(answerId);
            this.loadMyLearningData(); // Refresh the display
          }
        });
      });

      // Add event listeners for clear buttons on mastered items
      // Uses dismissAllAnswersForQuestion to preserve data for AI analysis
      quizStatsContainer.querySelectorAll('.mastered-clear-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const questionIds = btn.dataset.questionIds;
          if (questionIds) {
            questionIds.split(',').forEach(id => {
              this.localStorageManager.dismissAllAnswersForQuestion(id);
            });
            this.loadMyLearningData(); // Refresh the display
          }
        });
      });
    }

    // Notes stats
    const notesCount = this.localStorageManager.getNotesCount();
    const notesStatsContainer = this.shadowRoot.querySelector('#notesStats');

    if (notesCount > 0) {
      const allNotes = this.localStorageManager.getNotes();
      const commentIdsWithNotes = this.localStorageManager.getCommentIdsWithNotes();

      // Sort by comment index
      const sortedCommentIds = commentIdsWithNotes.sort((a, b) => {
        const indexA = this.playbackEngine.getCommentIndex(a);
        const indexB = this.playbackEngine.getCommentIndex(b);
        return indexA - indexB;
      });

      // Build the notes list HTML
      const md = markdownit();
      const notesHtml = sortedCommentIds.map(commentId => {
        const commentIndex = this.playbackEngine.getCommentIndex(commentId);
        const noteData = allNotes[commentId];
        const renderedNote = md.render(noteData.text);
        const commentUrl = `?comment=${commentIndex + 1}`;

        return `
          <div class="note-item">
            <div class="note-item-header">
              <a href="${commentUrl}" class="note-comment-link">Comment ${commentIndex + 1}</a>
              <span class="note-date">${LocalStorageManager.formatDate(noteData.lastEdited)}</span>
            </div>
            <div class="note-item-content">${renderedNote}</div>
          </div>
        `;
      }).join('');

      notesStatsContainer.innerHTML = `
        <div class="notes-list">
          ${notesHtml}
        </div>
      `;
    }
  }

  navigateToComment(commentId) {
    // Dispatch event BEFORE closing so App.js can update the view
    this.dispatchEvent(new CustomEvent('navigate-to-comment', {
      detail: { commentId },
      bubbles: true,
      composed: true
    }));

    // Close the modal
    this.close();
  }

  clearAllData() {
    if (confirm('Are you sure you want to clear all your progress, notes, and quiz history for this playback? This cannot be undone.')) {
      this.localStorageManager.clearAllData();
      this.loadMyLearningData();

      // Dispatch event to update UI
      this.dispatchEvent(new CustomEvent('progress-cleared', {
        bubbles: true,
        composed: true
      }));
    }
  }

  generateStudyReport() {
    const playbackTitle = this.playbackEngine.playbackData.title || 'Untitled Playback';
    const playbackUrl = window.location.href;
    const totalComments = this.playbackEngine.commentInfo.totalNumberOfComments;
    const viewedCount = this.localStorageManager.getViewedCount();
    const percentage = totalComments > 0 ? Math.round((viewedCount / totalComments) * 100) : 0;
    const flattenedComments = this.playbackEngine.commentInfo.flattenedComments;

    // Quiz data
    const quizStats = this.localStorageManager.getActiveQuestionStats();
    const questionHistory = this.localStorageManager.getActiveQuestionHistory();

    // Notes
    const allNotes = this.localStorageManager.getNotes();

    // Helper function to get language hint from file path
    const getLanguageFromPath = (filePath) => {
      if (!filePath) return '';
      const ext = filePath.split('.').pop()?.toLowerCase();
      const langMap = {
        'js': 'javascript',
        'jsx': 'jsx',
        'ts': 'typescript',
        'tsx': 'tsx',
        'py': 'python',
        'rb': 'ruby',
        'java': 'java',
        'c': 'c',
        'cpp': 'cpp',
        'h': 'c',
        'hpp': 'cpp',
        'cs': 'csharp',
        'go': 'go',
        'rs': 'rust',
        'swift': 'swift',
        'kt': 'kotlin',
        'php': 'php',
        'html': 'html',
        'css': 'css',
        'scss': 'scss',
        'less': 'less',
        'json': 'json',
        'xml': 'xml',
        'yaml': 'yaml',
        'yml': 'yaml',
        'md': 'markdown',
        'sql': 'sql',
        'sh': 'bash',
        'bash': 'bash',
        'zsh': 'bash',
        'ps1': 'powershell',
        'vue': 'vue',
        'svelte': 'svelte',
      };
      return langMap[ext] || ext || '';
    };

    // Helper function to get code blocks from a comment (with surrounding context like BlogComponent)
    const getCodeBlocksMarkdown = (comment) => {
      if (!comment?.selectedCodeBlocks || comment.selectedCodeBlocks.length === 0) {
        return '';
      }

      let codeMarkdown = '';
      const lang = getLanguageFromPath(comment.currentFilePath);

      // Show file path
      if (comment.currentFilePath) {
        codeMarkdown += `**File:** \`${comment.currentFilePath}\`\n\n`;
      }

      // Use viewableBlogText if available (includes surrounding lines), otherwise fall back to selected text
      if (comment.viewableBlogText) {
        // Calculate the starting line number for context
        const minRow = Math.min(...comment.selectedCodeBlocks.map(b => b.startRow));
        const startLine = minRow - Number.parseInt(comment.linesAbove || 0) + 1;

        codeMarkdown += `**Code** *(highlighted lines shown in context)*:\n\n`;
        codeMarkdown += '```' + lang + '\n';

        // Add line numbers and mark highlighted lines
        const lines = comment.viewableBlogText.split('\n');
        lines.forEach((line, idx) => {
          const lineNum = startLine + idx;
          // Check if this line is within any highlighted block
          const isHighlighted = comment.selectedCodeBlocks.some(block =>
            lineNum >= block.startRow + 1 && lineNum <= block.endRow + 1
          );
          const marker = isHighlighted ? '→' : ' ';
          const paddedLineNum = String(lineNum).padStart(4, ' ');
          codeMarkdown += `${paddedLineNum} ${marker} ${line}\n`;
        });

        codeMarkdown += '```\n\n';
      } else {
        // Fallback: just show the selected text
        codeMarkdown += '**Highlighted Code:**\n\n';
        comment.selectedCodeBlocks.forEach(block => {
          if (block.selectedText) {
            codeMarkdown += '```' + lang + '\n' + block.selectedText + '\n```\n\n';
          }
        });
      }

      return codeMarkdown;
    };

    // Helper function to get author narrative from a comment
    const getAuthorNarrative = (comment) => {
      if (!comment?.commentText) {
        return '';
      }
      return comment.commentText + '\n\n';
    };

    // Helper function to get media from a comment
    const getMediaMarkdown = (comment) => {
      if (!comment) return '';

      let mediaMarkdown = '';
      const hasImages = comment.imageURLs && comment.imageURLs.length > 0;
      const hasVideos = comment.videoURLs && comment.videoURLs.length > 0;
      const hasAudio = comment.audioURLs && comment.audioURLs.length > 0;

      if (!hasImages && !hasVideos && !hasAudio) {
        return '';
      }

      // Images - use markdown image syntax
      if (hasImages) {
        comment.imageURLs.forEach((url, idx) => {
          mediaMarkdown += `![Image ${idx + 1}](${url})\n\n`;
        });
      }

      // Videos - use HTML video tag (will render in HTML output)
      if (hasVideos) {
        comment.videoURLs.forEach(url => {
          mediaMarkdown += `<video controls src="${url}" style="max-width: 100%;"></video>\n\n`;
        });
      }

      // Audio - use HTML audio tag
      if (hasAudio) {
        comment.audioURLs.forEach(url => {
          mediaMarkdown += `<audio controls src="${url}"></audio>\n\n`;
        });
      }

      return mediaMarkdown;
    };

    // Generate Markdown content
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Build a map of questions by comment ID for easy lookup
    const questionsByCommentId = {};
    questionHistory.forEach(q => {
      const commentId = q.commentId || 'unknown';
      if (!questionsByCommentId[commentId]) {
        questionsByCommentId[commentId] = [];
      }
      questionsByCommentId[commentId].push(q);
    });

    // Calculate visit counts and find max for highlighting
    const visitCountByCommentId = {};
    let maxVisitCount = 0;
    flattenedComments.forEach(comment => {
      const count = this.localStorageManager.getCommentVisitCount(comment.id);
      visitCountByCommentId[comment.id] = count;
      if (count > maxVisitCount) maxVisitCount = count;
    });

    // Determine threshold for "frequently visited" (top 20% or visited 3+ times)
    const frequentlyVisitedThreshold = Math.max(3, Math.ceil(maxVisitCount * 0.6));

    // Helper to build comment URL
    const getCommentUrl = (index) => {
      const baseUrl = playbackUrl.split('?')[0];
      return `${baseUrl}?comment=${index + 1}`;
    };

    const basePlaybackUrl = playbackUrl.split('?')[0];

    // Get author information
    const developers = this.playbackEngine.playbackData.developers || {};
    const anonymousDeveloperId = this.playbackEngine.playbackData.anonymousDeveloperId;
    const systemDeveloperId = this.playbackEngine.playbackData.systemDeveloperId;

    const authors = Object.values(developers).filter(dev =>
      dev.id !== anonymousDeveloperId &&
      dev.id !== systemDeveloperId &&
      dev.userName !== "Anonymous Developer" &&
      dev.userName !== "Storyteller System"
    );

    // Build author string with HTML links (using HTML since we're inside a div)
    const getAuthorHtmlLink = (dev) => {
      // Prefer platform link, then website, then just name
      if (dev.platform && dev.platformUsername) {
        let platformUrl = '';
        if (dev.platform.toLowerCase() === 'github') {
          platformUrl = `https://github.com/${dev.platformUsername}`;
        } else if (dev.platform.toLowerCase() === 'twitter' || dev.platform.toLowerCase() === 'x') {
          platformUrl = `https://twitter.com/${dev.platformUsername}`;
        } else if (dev.platform.toLowerCase() === 'linkedin') {
          platformUrl = `https://linkedin.com/in/${dev.platformUsername}`;
        }
        if (platformUrl) {
          return `<a href="${platformUrl}">${this.escapeHtml(dev.userName)}</a>`;
        }
      }
      if (dev.websiteUrl) {
        return `<a href="${dev.websiteUrl}">${this.escapeHtml(dev.userName)}</a>`;
      }
      return this.escapeHtml(dev.userName);
    };

    let markdown = `<div class="report-header">\n\n`;
    markdown += `<h1>Study Report: <a href="${basePlaybackUrl}">${this.escapeHtml(playbackTitle)}</a></h1>\n\n`;

    // Add author info if available
    if (authors.length > 0) {
      const authorLinks = authors.map(getAuthorHtmlLink);
      const authorText = authorLinks.length === 1
        ? `By ${authorLinks[0]}`
        : `By ${authorLinks.slice(0, -1).join(', ')} and ${authorLinks[authorLinks.length - 1]}`;
      markdown += `<div class="report-author">${authorText}</div>\n\n`;
    }

    markdown += `<div class="report-date">Generated on ${dateStr}</div>\n\n`;
    markdown += `</div>\n\n`;

    // Overview section - styled like quiz-summary with stat boxes
    markdown += `<div class="overview-summary">\n\n`;
    markdown += `## 📊 Overview\n\n`;

    // Stats displayed in boxes
    markdown += `<div class="overview-stats">\n`;
    markdown += `<div class="overview-stat"><div class="overview-stat-value">${viewedCount}/${totalComments}</div><div class="overview-stat-label">Comments Viewed</div></div>\n`;
    markdown += `<div class="overview-stat"><div class="overview-stat-value">${percentage}%</div><div class="overview-stat-label">Progress</div></div>\n`;

    if (quizStats.total > 0) {
      markdown += `<div class="overview-divider"></div>\n`;
      markdown += `<div class="overview-stat"><div class="overview-stat-value">${quizStats.correct}/${quizStats.total}</div><div class="overview-stat-label">Quiz Correct</div></div>\n`;
      markdown += `<div class="overview-stat"><div class="overview-stat-value">${quizStats.accuracy}%</div><div class="overview-stat-label">Accuracy</div></div>\n`;
    }
    markdown += `</div>\n\n`;

    // Quick Review: Incorrect Answers (if any)
    const incorrectQuestions = questionHistory.filter(q => !q.isCorrect);
    if (incorrectQuestions.length > 0) {
      markdown += `### Quick Review: Incorrect Answers\n\n`;
      incorrectQuestions.forEach(q => {
        const comment = this.playbackEngine.getCommentById(q.commentId);
        const commentIndex = this.playbackEngine.getCommentIndex(q.commentId);
        const commentTitle = comment?.commentTitle || `Comment ${commentIndex + 1}`;

        markdown += `<div class="quiz-incorrect">`;
        markdown += `<strong>${commentTitle}:</strong> ${q.question}<br>`;
        markdown += `Your answer: <del>${q.userAnswer}</del> → Correct: <strong>${q.correctAnswer}</strong>`;
        markdown += `</div>\n\n`;
      });
    }

    markdown += `</div>\n\n`;

    // Legend
    markdown += `### Legend\n\n`;
    markdown += `- 🔥 **Frequently Revisited** - You returned to this section multiple times\n`;
    markdown += `- ⚠️ **Needs Review** - Contains questions you answered incorrectly\n`;
    markdown += `- 📝 **Has Notes** - You added personal notes to this section\n\n`;
    markdown += `---\n\n`;

    // All Comments in Order
    markdown += `## Comments\n\n`;

    flattenedComments.forEach((comment, index) => {
      const commentId = comment.id;
      const visitCount = visitCountByCommentId[commentId] || 0;
      const questions = questionsByCommentId[commentId] || [];
      const hasIncorrect = questions.some(q => !q.isCorrect);
      const hasNotes = !!allNotes[commentId];
      const isFrequentlyVisited = visitCount >= frequentlyVisitedThreshold;
      const commentUrl = getCommentUrl(index);

      // Skip comments with no interaction (not viewed, no questions, no notes)
      if (visitCount === 0 && questions.length === 0 && !hasNotes) {
        return;
      }

      // Build status badges
      let badges = '';
      if (isFrequentlyVisited) badges += '🔥';
      if (hasIncorrect) badges += '⚠️';
      if (hasNotes) badges += '📝';

      // Build title - use custom title if available, otherwise just "Comment N"
      let displayTitle = comment.commentTitle ? comment.commentTitle : `Comment ${index + 1}`;

      // Put badges in the link text
      const linkText = badges ? `${badges} ${displayTitle}` : displayTitle;

      // Start collapsible section
      markdown += `<!-- BEGIN:comment-section -->\n`;
      markdown += `### [${linkText}](${commentUrl})`;

      // Add visit count after the link if frequently visited
      if (isFrequentlyVisited) {
        markdown += ` *Visited ${visitCount} times*`;
      }
      markdown += '\n\n';
      markdown += `<!-- BEGIN:comment-body -->\n`;

      // Check if there's author content to show
      const hasAuthorNarrative = comment?.commentText;
      const hasCode = comment?.selectedCodeBlocks && comment.selectedCodeBlocks.length > 0;
      const hasMedia = (comment?.imageURLs?.length > 0) || (comment?.videoURLs?.length > 0) || (comment?.audioURLs?.length > 0);

      // Author's Content section
      if (hasAuthorNarrative || hasCode || hasMedia) {
        markdown += `<!-- BEGIN:author-content -->\n`;
        markdown += `#### Author's Content\n\n`;

        // Include author's narrative
        if (hasAuthorNarrative) {
          markdown += getAuthorNarrative(comment);
        }

        // Include media (images, videos, audio)
        if (hasMedia) {
          markdown += getMediaMarkdown(comment);
        }

        // Include highlighted code
        if (hasCode) {
          markdown += getCodeBlocksMarkdown(comment);
        }

        markdown += `<!-- END:author-content -->\n\n`;
      }

      // Your Activity section
      if (questions.length > 0 || hasNotes) {
        markdown += `<!-- BEGIN:viewer-activity -->\n`;
        markdown += `#### Your Activity\n\n`;

        // Show quiz questions if any
        if (questions.length > 0) {
          markdown += '**Quiz Results:**\n\n';
          questions.forEach(q => {
            const statusIcon = q.isCorrect ? '✓' : '✗';
            const statusText = q.isCorrect ? 'Correct' : 'Incorrect';
            const quizClass = q.isCorrect ? 'quiz-correct' : 'quiz-incorrect';
            const timestamp = q.timestamp ? new Date(q.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

            markdown += `<div class="${quizClass}">`;
            markdown += `<strong>${q.question}</strong><br>`;
            if (q.isCorrect) {
              markdown += `${statusIcon} <strong>${statusText}</strong> — Your answer: <strong>${q.userAnswer}</strong>`;
            } else {
              markdown += `${statusIcon} <strong>${statusText}</strong> — Your answer: <del>${q.userAnswer}</del> → Correct: <strong>${q.correctAnswer}</strong>`;
            }
            if (timestamp) {
              markdown += ` <span class="timestamp">${timestamp}</span>`;
            }
            markdown += `</div>\n\n`;
          });
        }

        // Include user's notes if any
        if (hasNotes) {
          const noteTimestamp = allNotes[commentId].lastEdited
            ? new Date(allNotes[commentId].lastEdited).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
            : '';
          markdown += '**Your Notes:**';
          if (noteTimestamp) {
            markdown += ` <span class="timestamp">Last edited: ${noteTimestamp}</span>`;
          }
          markdown += '\n\n';
          markdown += allNotes[commentId].text + '\n\n';
        }

        markdown += `<!-- END:viewer-activity -->\n\n`;
      }

      markdown += `<!-- END:comment-body -->\n`;
      markdown += `<!-- END:comment-section -->\n\n`;
    });

    // Generate HTML content (enable HTML for video/audio tags)
    const md = markdownit({ html: true });
    let htmlBody = md.render(markdown);

    // Post-process to wrap sections in styled divs
    htmlBody = htmlBody
      .replace(/<!-- BEGIN:author-content -->/g, '<div class="author-content">')
      .replace(/<!-- END:author-content -->/g, '</div>')
      .replace(/<!-- BEGIN:viewer-activity -->/g, '<div class="viewer-activity">')
      .replace(/<!-- END:viewer-activity -->/g, '</div>')
      .replace(/<!-- BEGIN:comment-section -->/g, '<div class="comment-section">')
      .replace(/<!-- END:comment-section -->/g, '</div>')
      .replace(/<!-- BEGIN:comment-body -->/g, '<div class="comment-body">')
      .replace(/<!-- END:comment-body -->/g, '</div>')
      // Make h3 inside comment-section clickable for collapse
      .replace(/<div class="comment-section">\s*<h3>/g, '<div class="comment-section"><h3 class="comment-header" onclick="this.parentElement.classList.toggle(\'collapsed\')">');

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base target="_blank">
  <title>Study Report: ${this.escapeHtml(playbackTitle)}</title>
  <style>
    :root {
      color-scheme: light dark;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
      color: #1f2937;
    }
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #1f2937;
        color: #e2e8f0;
      }
      hr {
        border-color: #374151;
      }
      code {
        background-color: #374151;
      }
    }
    h1 {
      color: #3b82f6;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 10px;
    }
    h2 {
      margin-top: 30px;
      color: #374151;
    }
    h3 {
      margin-top: 20px;
    }
    h4 {
      font-size: 0.8em;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 12px 0;
      padding: 0;
      border: none;
    }
    /* Report header card */
    .report-header {
      background-color: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 20px 24px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .report-header h1 {
      color: #1e40af;
      border-bottom: none;
      padding-bottom: 0;
      margin: 0 0 8px 0;
      font-size: 1.5em;
    }
    .report-header h1 a {
      color: #1e40af;
    }
    .report-header h1 a:hover {
      color: #3b82f6;
    }
    .report-author {
      font-size: 1em;
      color: #374151;
      margin-bottom: 4px;
    }
    .report-author a {
      color: #2563eb;
    }
    .report-author a:hover {
      color: #1e40af;
    }
    .report-date {
      font-size: 0.85em;
      color: #6b7280;
    }
    @media (prefers-color-scheme: dark) {
      .report-header {
        background-color: rgba(59, 130, 246, 0.1);
        border-color: #1e40af;
      }
      .report-header h1,
      .report-header h1 a {
        color: #60a5fa;
      }
      .report-header h1 a:hover {
        color: #93c5fd;
      }
      .report-author {
        color: #d1d5db;
      }
      .report-author a {
        color: #60a5fa;
      }
      .report-date {
        color: #9ca3af;
      }
    }
    .author-content {
      background-color: #eff6ff;
      border: 1px solid #bfdbfe;
      border-left: 4px solid #3b82f6;
      border-radius: 8px;
      padding: 16px 20px;
      margin: 16px 0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
    }
    .author-content h4 {
      color: #3b82f6;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .author-content h4::before {
      content: '';
      display: inline-block;
      width: 18px;
      height: 18px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%233b82f6' viewBox='0 0 16 16'%3E%3Cpath d='M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z'/%3E%3C/svg%3E");
      background-size: contain;
      background-repeat: no-repeat;
    }
    .viewer-activity {
      background-color: #fefce8;
      border-left: 4px solid #eab308;
      border-radius: 0 8px 8px 0;
      padding: 16px 20px;
      margin: 16px 0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
    }
    .viewer-activity h4 {
      color: #ca8a04;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .viewer-activity h4::before {
      content: '';
      display: inline-block;
      width: 18px;
      height: 18px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%23ca8a04' viewBox='0 0 16 16'%3E%3Cpath d='M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z'/%3E%3C/svg%3E");
      background-size: contain;
      background-repeat: no-repeat;
    }
    @media (prefers-color-scheme: dark) {
      .author-content {
        background-color: rgba(59, 130, 246, 0.1);
        border-color: #1e40af;
        border-left-color: #60a5fa;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2);
      }
      .author-content h4 {
        color: #60a5fa;
      }
      .author-content h4::before {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%2360a5fa' viewBox='0 0 16 16'%3E%3Cpath d='M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z'/%3E%3C/svg%3E");
      }
      .viewer-activity {
        background-color: #422006;
        border-left-color: #fbbf24;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2);
      }
      .viewer-activity h4 {
        color: #fbbf24;
      }
      .viewer-activity h4::before {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%23fbbf24' viewBox='0 0 16 16'%3E%3Cpath d='M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z'/%3E%3C/svg%3E");
      }
    }
    hr {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 20px 0;
    }
    ul {
      padding-left: 20px;
    }
    li {
      margin-bottom: 8px;
    }
    code {
      background-color: #e5e7eb;
      color: #1f2937;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.9em;
    }
    @media (prefers-color-scheme: dark) {
      code {
        background-color: #374151;
        color: #e2e8f0;
      }
    }
    pre {
      background-color: #1f2937;
      color: #e2e8f0;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 16px 0;
    }
    pre code {
      background-color: transparent;
      padding: 0;
      color: inherit;
    }
    @media (prefers-color-scheme: dark) {
      pre {
        background-color: #111827;
        border: 1px solid #374151;
      }
    }
    h3 a {
      color: inherit;
      text-decoration: none;
    }
    h3 a:hover {
      color: #3b82f6;
      text-decoration: underline;
    }
    h1 a {
      color: inherit;
      text-decoration: none;
    }
    h1 a:hover {
      text-decoration: underline;
    }
    del {
      color: #ef4444;
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 8px 0;
    }
    video, audio {
      max-width: 100%;
      margin: 8px 0;
    }
    .toolbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 12px 20px;
      background-color: rgba(255,255,255,0.95);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid #e5e7eb;
      z-index: 100;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    @media (prefers-color-scheme: dark) {
      .toolbar {
        background-color: rgba(31,41,55,0.95);
        border-bottom-color: #374151;
      }
    }
    .toolbar button {
      padding: 8px 14px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
    }
    .btn-markdown {
      background-color: #10b981;
      color: white;
    }
    .btn-markdown:hover {
      background-color: #059669;
    }
    .btn-html {
      background-color: #3b82f6;
      color: white;
    }
    .btn-html:hover {
      background-color: #2563eb;
    }
    .btn-print {
      background-color: #6b7280;
      color: white;
    }
    .btn-print:hover {
      background-color: #4b5563;
    }
    body {
      padding-top: 60px;
    }
    @media print {
      .toolbar {
        display: none;
      }
      body {
        padding-top: 0;
      }
    }
    /* Quiz result styling */
    .quiz-correct {
      background-color: #dcfce7;
      border-left: 3px solid #22c55e;
      padding: 8px 12px;
      margin: 8px 0;
      border-radius: 0 4px 4px 0;
    }
    .quiz-incorrect {
      background-color: #fef2f2;
      border-left: 3px solid #ef4444;
      padding: 8px 12px;
      margin: 8px 0;
      border-radius: 0 4px 4px 0;
    }
    @media (prefers-color-scheme: dark) {
      .quiz-correct {
        background-color: rgba(34,197,94,0.15);
      }
      .quiz-incorrect {
        background-color: rgba(239,68,68,0.15);
      }
    }
    /* Collapsible sections */
    .comment-section {
      margin-bottom: 24px;
    }
    .comment-header {
      cursor: pointer;
      user-select: none;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .comment-header::before {
      content: '▼';
      font-size: 0.7em;
      transition: transform 0.2s;
      color: #4b5563;
    }
    .comment-section.collapsed .comment-header::before {
      transform: rotate(-90deg);
    }
    .comment-section.collapsed .comment-body {
      display: none;
    }
    .comment-body {
      margin-top: 8px;
    }
    /* Timestamps */
    .timestamp {
      font-size: 0.75em;
      color: #6b7280;
      font-style: italic;
    }
    /* Quiz summary section */
    .quiz-summary {
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .quiz-summary h3 {
      color: #166534;
      margin-top: 0;
    }
    .quiz-summary-stats {
      display: flex;
      gap: 24px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .quiz-stat {
      text-align: center;
    }
    .quiz-stat-value {
      font-size: 2em;
      font-weight: bold;
      color: #166534;
    }
    .quiz-stat-label {
      font-size: 0.85em;
      color: #4b5563;
    }
    @media (prefers-color-scheme: dark) {
      .quiz-summary {
        background-color: rgba(34,197,94,0.1);
        border-color: #166534;
      }
      .quiz-summary h3 {
        color: #4ade80;
      }
      .quiz-stat-value {
        color: #4ade80;
      }
    }
    /* Overview summary section - similar to quiz-summary */
    .overview-summary {
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .overview-summary h2 {
      color: #166534;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .overview-summary h3 {
      color: #166534;
      margin-top: 20px;
      margin-bottom: 12px;
    }
    .overview-stats {
      display: flex;
      gap: 24px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .overview-stat {
      text-align: center;
    }
    .overview-stat-value {
      font-size: 1.8em;
      font-weight: bold;
      color: #166534;
    }
    .overview-stat-label {
      font-size: 0.85em;
      color: #4b5563;
    }
    .overview-divider {
      width: 1px;
      background-color: #86efac;
      margin: 0 8px;
      align-self: stretch;
    }
    @media (prefers-color-scheme: dark) {
      .overview-summary {
        background-color: rgba(34,197,94,0.1);
        border-color: #166534;
      }
      .overview-summary h2,
      .overview-summary h3 {
        color: #4ade80;
      }
      .overview-stat-value {
        color: #4ade80;
      }
      .overview-divider {
        background-color: #166534;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="btn-print" onclick="window.print()">Print / Save PDF</button>
    <button class="btn-markdown" onclick="saveAsMarkdown()">Save as Markdown</button>
    <button class="btn-html" onclick="saveAsWebPage()">Save as Web Page</button>
  </div>
  ${htmlBody}
  <script>
    const markdownContent = ${JSON.stringify(markdown)};
    const playbackTitle = ${JSON.stringify(playbackTitle)};

    function saveAsMarkdown() {
      const blob = new Blob([markdownContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'study-report-' + sanitizeFilename(playbackTitle) + '.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    function saveAsWebPage() {
      const htmlContent = document.documentElement.outerHTML;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'study-report-' + sanitizeFilename(playbackTitle) + '.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    function sanitizeFilename(name) {
      return name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50);
    }
  </script>
</body>
</html>`;

    // Open in a new window
    const reportWindow = window.open('', '_blank');
    if (reportWindow) {
      reportWindow.document.write(htmlContent);
      reportWindow.document.close();
    } else {
      alert('Unable to open the study report. Please check your popup blocker settings.');
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  close() {
    // Remove escape key listener
    document.removeEventListener('keydown', this.handleEscapeKey);

    // Remove from DOM
    this.remove();
  }
}

window.customElements.define('st-summary-review-modal', SummaryReviewModal);
