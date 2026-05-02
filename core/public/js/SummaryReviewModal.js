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

  close() {
    // Remove escape key listener
    document.removeEventListener('keydown', this.handleEscapeKey);

    // Remove from DOM
    this.remove();
  }
}

window.customElements.define('st-summary-review-modal', SummaryReviewModal);
