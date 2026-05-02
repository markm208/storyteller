/**
 * LocalStorageManager - Centralized manager for all localStorage operations
 *
 * Storage key structure:
 * - storyteller:progress:{playback-id} - Viewed comments and last visited
 * - storyteller:notes:{playback-id} - Personal notes keyed by comment ID
 * - storyteller:questions:{playback-id} - Question/answer history
 * - storyteller:ai-questions:{playback-id} - AI-generated questions keyed by comment ID
 */
class LocalStorageManager {
  // Track if we've already shown the quota warning this session
  static quotaWarningShown = false;
  constructor(playbackData) {
    this.playbackData = playbackData;
    this.playbackId = this.generatePlaybackId();
    this.storageAvailable = this.checkStorageAvailability();
  }

  /**
   * Generate a unique playback ID based on playbackId or URL path hash
   */
  generatePlaybackId() {
    if (this.playbackData && this.playbackData.playbackId) {
      return this.playbackData.playbackId;
    }
    // Fallback to hash of pathname
    return this.hashString(window.location.pathname);
  }

  /**
   * Simple hash function for strings
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      // A common hash algorithm (djb2)
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return 'path-' + Math.abs(hash).toString(36);
  }

  /**
   * Check if localStorage is available
   */
  checkStorageAvailability() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('LocalStorage is not available:', e);
      return false;
    }
  }

  /**
   * Get the full storage key for a data type
   */
  getKey(type) {
    return `storyteller:${type}:${this.playbackId}`;
  }

  /**
   * Safely get data from localStorage
   */
  getData(type) {
    if (!this.storageAvailable) return null;
    try {
      const data = localStorage.getItem(this.getKey(type));
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn(`Error reading ${type} from localStorage:`, e);
      return null;
    }
  }

  /**
   * Safely set data in localStorage
   */
  setData(type, data) {
    if (!this.storageAvailable) return false;
    try {
      localStorage.setItem(this.getKey(type), JSON.stringify(data));
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded');
        LocalStorageManager.showStorageWarning();
      } else {
        console.warn(`Error writing ${type} to localStorage:`, e);
      }
      return false;
    }
  }

  /**
   * Show a warning notification when storage is full
   */
  static showStorageWarning() {
    // Only show once per session to avoid spamming
    if (LocalStorageManager.quotaWarningShown) return;
    LocalStorageManager.quotaWarningShown = true;

    const toast = document.createElement('div');
    toast.className = 'storyteller-storage-toast';
    toast.innerHTML = `
      <div class="storage-toast-content">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>Local storage full, your data couldn't be saved. Try clearing older playback's data in the summary.</span>
        <button class="storage-toast-close" aria-label="Dismiss">&times;</button>
      </div>
    `;

    // Add styles if not already present
    if (!document.getElementById('storyteller-toast-styles')) {
      const style = document.createElement('style');
      style.id = 'storyteller-toast-styles';
      style.textContent = `
        .storyteller-storage-toast {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10000;
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        .storage-toast-content {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background-color: #7f1d1d;
          border: 1px solid #dc2626;
          border-radius: 8px;
          color: #fecaca;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          max-width: 90vw;
        }
        .storage-toast-content svg {
          flex-shrink: 0;
          color: #f87171;
        }
        .storage-toast-close {
          background: none;
          border: none;
          color: #fecaca;
          font-size: 20px;
          cursor: pointer;
          padding: 0 0 0 8px;
          line-height: 1;
        }
        .storage-toast-close:hover {
          color: white;
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    // Close button handler
    toast.querySelector('.storage-toast-close').addEventListener('click', () => {
      toast.remove();
    });

    // Auto-dismiss after 8 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 8000);
  }

  // ============================================
  // Progress Tracking Methods
  // ============================================

  /**
   * Get progress data for this playback
   */
  getProgress() {
    return this.getData('progress') || {
      viewedComments: {},
      lastVisited: null
    };
  }

  /**
   * Mark a comment as viewed (increments visit count)
   */
  markCommentViewed(commentId) {
    const progress = this.getProgress();
    const now = Date.now();

    if (!progress.viewedComments[commentId]) {
      // First visit
      progress.viewedComments[commentId] = {
        count: 1,
        firstViewed: now,
        lastViewed: now
      };
    } else {
      // Increment visit count
      progress.viewedComments[commentId].count++;
      progress.viewedComments[commentId].lastViewed = now;
    }

    progress.lastVisited = now;
    return this.setData('progress', progress);
  }

  /**
   * Check if a comment has been viewed
   */
  isCommentViewed(commentId) {
    const progress = this.getProgress();
    return !!progress.viewedComments[commentId];
  }

  /**
   * Get the timestamp when a comment was last viewed
   */
  getCommentViewedTime(commentId) {
    const progress = this.getProgress();
    const data = progress.viewedComments[commentId];
    if (!data) return null;
    return data.lastViewed;
  }

  /**
   * Get the visit count for a comment
   */
  getCommentVisitCount(commentId) {
    const progress = this.getProgress();
    const data = progress.viewedComments[commentId];
    if (!data) return 0;
    return data.count;
  }

  /**
   * Get count of viewed comments
   */
  getViewedCount() {
    const progress = this.getProgress();
    return Object.keys(progress.viewedComments).length;
  }

  /**
   * Clear progress data
   */
  clearProgress() {
    return this.setData('progress', {
      viewedComments: {},
      lastVisited: null
    });
  }

  // ============================================
  // Notes Methods
  // ============================================

  /**
   * Get all notes for this playback
   */
  getNotes() {
    return this.getData('notes') || {};
  }

  /**
   * Get note for a specific comment
   */
  getNote(commentId) {
    const notes = this.getNotes();
    return notes[commentId] || null;
  }

  /**
   * Save a note for a comment
   */
  saveNote(commentId, text) {
    const notes = this.getNotes();
    const now = Date.now();

    if (text && text.trim()) {
      notes[commentId] = {
        text: text.trim(),
        timestamp: notes[commentId]?.timestamp || now,
        lastEdited: now
      };
    } else {
      // Delete note if text is empty
      delete notes[commentId];
    }

    return this.setData('notes', notes);
  }

  /**
   * Delete a note for a comment
   */
  deleteNote(commentId) {
    const notes = this.getNotes();
    delete notes[commentId];
    return this.setData('notes', notes);
  }

  /**
   * Get count of notes
   */
  getNotesCount() {
    const notes = this.getNotes();
    return Object.keys(notes).length;
  }

  /**
   * Get all comment IDs that have notes
   */
  getCommentIdsWithNotes() {
    const notes = this.getNotes();
    return Object.keys(notes);
  }

  /**
   * Clear all notes
   */
  clearNotes() {
    return this.setData('notes', {});
  }

  // ============================================
  // Question History Methods
  // ============================================

  /**
   * Get question history for this playback
   */
  getQuestionHistory() {
    return this.getData('questions') || [];
  }

  /**
   * Record a question answer
   */
  recordQuestionAnswer(questionData) {
    const history = this.getQuestionHistory();
    const timestamp = Date.now();

    const record = {
      answerId: `a-${timestamp}-${Math.random().toString(36).substr(2, 9)}`, // Unique ID for this specific answer
      questionId: questionData.questionId || this.generateQuestionId(questionData.question),
      question: questionData.question,
      allAnswers: questionData.allAnswers,
      userAnswer: questionData.userAnswer,
      correctAnswer: questionData.correctAnswer,
      isCorrect: questionData.isCorrect,
      source: questionData.source || 'author', // 'author' or 'ai'
      commentId: questionData.commentId || null,
      timestamp: timestamp
    };

    history.push(record);
    return this.setData('questions', history);
  }

  /**
   * Generate a question ID based on question text
   */
  generateQuestionId(questionText) {
    return 'q-' + this.hashString(questionText);
  }

  /**
   * Check if a question has been answered before
   */
  hasAnsweredQuestion(question) {
    const history = this.getQuestionHistory();
    const questionId = this.generateQuestionId(question);
    return history.some(record => record.questionId === questionId);
  }

  /**
   * Get previous answer for a question
   */
  getPreviousAnswer(question) {
    const history = this.getQuestionHistory();
    const questionId = this.generateQuestionId(question);
    const records = history.filter(record => record.questionId === questionId);
    return records.length > 0 ? records[records.length - 1] : null;
  }

  /**
   * Get question statistics
   */
  getQuestionStats() {
    const history = this.getQuestionHistory();
    const total = history.length;
    const correct = history.filter(r => r.isCorrect).length;
    const authorQuestions = history.filter(r => r.source === 'author').length;
    const aiQuestions = history.filter(r => r.source === 'ai').length;

    return {
      total,
      correct,
      incorrect: total - correct,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      authorQuestions,
      aiQuestions
    };
  }

  /**
   * Clear question history
   */
  clearQuestionHistory() {
    return this.setData('questions', []);
  }

  /**
   * Remove a specific answer from history by answerId
   */
  removeAnswer(answerId) {
    const history = this.getQuestionHistory();
    const filtered = history.filter(q => q.answerId !== answerId);
    return this.setData('questions', filtered);
  }

  /**
   * Remove all answers for a specific question by questionId
   */
  removeAllAnswersForQuestion(questionId) {
    const history = this.getQuestionHistory();
    const filtered = history.filter(q => q.questionId !== questionId);
    return this.setData('questions', filtered);
  }

  /**
   * Dismiss a specific answer (mark as forgotten but keep for AI analysis)
   * The answer will no longer appear in UI but data is preserved
   */
  dismissAnswer(answerId) {
    const history = this.getQuestionHistory();
    const updated = history.map(q => {
      if (q.answerId === answerId) {
        return { ...q, dismissed: true, dismissedAt: Date.now() };
      }
      return q;
    });
    return this.setData('questions', updated);
  }

  /**
   * Dismiss all answers for a specific question by questionId
   */
  dismissAllAnswersForQuestion(questionId) {
    const history = this.getQuestionHistory();
    const updated = history.map(q => {
      if (q.questionId === questionId) {
        return { ...q, dismissed: true, dismissedAt: Date.now() };
      }
      return q;
    });
    return this.setData('questions', updated);
  }

  /**
   * Get only active (non-dismissed) question history for UI display
   */
  getActiveQuestionHistory() {
    const history = this.getQuestionHistory();
    return history.filter(q => !q.dismissed);
  }

  /**
   * Get only dismissed answers (for AI analysis of learning struggles)
   */
  getDismissedAnswers() {
    const history = this.getQuestionHistory();
    return history.filter(q => q.dismissed);
  }

  /**
   * Get question statistics for active (non-dismissed) answers only
   */
  getActiveQuestionStats() {
    const history = this.getActiveQuestionHistory();
    const total = history.length;
    const correct = history.filter(r => r.isCorrect).length;
    const authorQuestions = history.filter(r => r.source === 'author').length;
    const aiQuestions = history.filter(r => r.source === 'ai').length;

    return {
      total,
      correct,
      incorrect: total - correct,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      authorQuestions,
      aiQuestions
    };
  }

  // ============================================
  // AI-Generated Questions Methods
  // ============================================

  /**
   * Get all AI-generated questions for this playback
   */
  getAIQuestions() {
    return this.getData('ai-questions') || {};
  }

  /**
   * Get AI-generated questions for a specific comment
   */
  getAIQuestionsForComment(commentId) {
    const allQuestions = this.getAIQuestions();
    return allQuestions[commentId] || [];
  }

  /**
   * Save an AI-generated question for a comment
   */
  saveAIQuestion(commentId, questionData) {
    const allQuestions = this.getAIQuestions();

    if (!allQuestions[commentId]) {
      allQuestions[commentId] = [];
    }

    const questionRecord = {
      id: `aiq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      questionCommentData: questionData,
      createdAt: Date.now()
    };

    allQuestions[commentId].push(questionRecord);
    return this.setData('ai-questions', allQuestions) ? questionRecord : null;
  }

  /**
   * Delete an AI-generated question by its ID
   * Also dismisses any answer history for that question
   */
  deleteAIQuestion(questionId) {
    const allQuestions = this.getAIQuestions();

    for (const commentId in allQuestions) {
      const questionToDelete = allQuestions[commentId].find(q => q.id === questionId);
      if (questionToDelete) {
        // Get the question text to find related answers
        const questionText = questionToDelete.questionCommentData.question;
        const answerQuestionId = this.generateQuestionId(questionText);

        // Dismiss all answers for this question
        this.dismissAllAnswersForQuestion(answerQuestionId);

        // Remove the AI question
        allQuestions[commentId] = allQuestions[commentId].filter(q => q.id !== questionId);

        // Clean up empty arrays
        if (allQuestions[commentId].length === 0) {
          delete allQuestions[commentId];
        }
        return this.setData('ai-questions', allQuestions);
      }
    }
    return false;
  }

  /**
   * Clear all AI-generated questions
   */
  clearAIQuestions() {
    return this.setData('ai-questions', {});
  }

  /**
   * Get count of AI-generated questions
   */
  getAIQuestionsCount() {
    const allQuestions = this.getAIQuestions();
    let count = 0;
    for (const commentId in allQuestions) {
      count += allQuestions[commentId].length;
    }
    return count;
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Clear all data for this playback
   */
  clearAllData() {
    this.clearProgress();
    this.clearNotes();
    this.clearQuestionHistory();
    this.clearAIQuestions();
  }

  /**
   * Format time in milliseconds to human-readable string
   */
  static formatTime(ms) {
    if (ms < 1000) return 'less than a second';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      const remainingSeconds = seconds % 60;
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
    } else {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
  }

  /**
   * Format date to human-readable string
   */
  static formatDate(timestamp) {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }
}

// Make LocalStorageManager available globally
window.LocalStorageManager = LocalStorageManager;
