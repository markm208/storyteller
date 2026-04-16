/**
 * CommentInjector - Creates and injects AI-generated comments into playback
 *
 * Transforms narrative points from AI into proper Comment objects
 * and adds them to the project's comment store.
 *
 * Key behaviors:
 * - Preserves existing comments (new comments are appended via position)
 * - Tags all AI-generated comments with 'ai-generated' tag
 * - Uses the system developer group for attribution
 * - Builds selectedCodeBlocks from AI-identified code highlights
 */

const { NARRATIVE_CONFIG } = require('./config');

class CommentInjector {
    constructor(projectManager, summarizer = null) {
        this.projectManager = projectManager;
        this.summarizer = summarizer;  // Needed for event ID lookups
    }

    /**
     * Inject narrative points as comments
     * @param {NarrativePoint[]} narrativePoints - Array of narrative points from AI
     * @returns {Promise<{ injectedCount: number, errors: string[] }>}
     */
    async injectNarratives(narrativePoints) {
        let injectedCount = 0;
        const errors = [];

        for (const point of narrativePoints) {
            try {
                const commentData = this._createCommentData(point);
                this.projectManager.addComment(commentData);
                injectedCount++;
            } catch (error) {
                const errorMsg = `Failed to inject comment at event ${point.eventIndex}: ${error.message}`;
                console.error(errorMsg);
                errors.push(errorMsg);
                // Continue with other comments
            }
        }

        return { injectedCount, errors };
    }

    /**
     * Create comment data object from a narrative point
     * @param {NarrativePoint} narrativePoint
     * @returns {Object} Comment data ready for ProjectManager.addComment()
     */
    _createCommentData(narrativePoint) {
        if (!narrativePoint.eventId) {
            throw new Error(`Narrative point missing eventId for eventIndex ${narrativePoint.eventIndex}`);
        }

        // Build the comment text - just the narrative, no headers or key concepts
        // Comments should flow together as a cohesive narrative
        let commentText = narrativePoint.narrative;

        // Determine current file context from the event
        const currentFilePath = this._getCurrentFileAtEvent(narrativePoint.eventIndex);

        // Build selectedCodeBlocks from AI-identified highlights
        const selectedCodeBlocks = this._buildSelectedCodeBlocks(narrativePoint);

        // Use AI-specified context lines, or defaults
        // If AI specified values, use those; otherwise use sensible defaults
        const hasHighlights = selectedCodeBlocks.length > 0;
        const defaultContext = hasHighlights ? 3 : 5;
        const linesAbove = (narrativePoint.linesAbove !== undefined && narrativePoint.linesAbove !== null)
            ? narrativePoint.linesAbove
            : defaultContext;
        const linesBelow = (narrativePoint.linesBelow !== undefined && narrativePoint.linesBelow !== null)
            ? narrativePoint.linesBelow
            : defaultContext;

        return {
            displayCommentEventId: narrativePoint.eventId,
            displayCommentEventSequenceNumber: narrativePoint.eventIndex,
            timestamp: Date.now(),
            commentText: commentText,
            textFormat: 'markdown',
            commentTitle: narrativePoint.title || '',
            ttsFilePath: null,
            selectedCodeBlocks: selectedCodeBlocks,
            imageURLs: [],
            videoURLs: [],
            audioURLs: [],
            linesAbove: linesAbove,
            linesBelow: linesBelow,
            currentFilePath: currentFilePath,
            viewableBlogText: null,
            // Tag as AI-generated so authors can identify and filter
            commentTags: [NARRATIVE_CONFIG.AI_GENERATED_TAG],
            questionCommentData: null
            // Note: position is set automatically by CommentManager.addComment()
            // Note: developerGroupId is set by ProjectManager.addComment()
        };
    }

    /**
     * Build selectedCodeBlocks from AI-identified highlights
     * @param {NarrativePoint} narrativePoint
     * @returns {Array} Array of selectedCodeBlock objects
     */
    _buildSelectedCodeBlocks(narrativePoint) {
        const selectedCodeBlocks = [];

        // Debug logging
        console.log(`Building code blocks for event ${narrativePoint.eventIndex}:`);
        console.log(`  - Has highlightData: ${!!narrativePoint.highlightData}`);
        console.log(`  - codeHighlights count: ${narrativePoint.codeHighlights?.length || 0}`);

        // Need highlightData which contains snapshot, eventIdMap, and highlights
        if (!narrativePoint.highlightData) {
            console.log(`  - No highlightData, returning empty array`);
            return selectedCodeBlocks;
        }

        const { snapshot, eventIdMap, highlights } = narrativePoint.highlightData;

        console.log(`  - Processing ${highlights.length} highlights`);
        console.log(`  - Snapshot files: ${Object.keys(snapshot).join(', ')}`);

        for (const highlight of highlights) {
            try {
                const { filePath, startLine, endLine } = highlight;
                console.log(`  - Highlight: ${filePath} lines ${startLine}-${endLine}`);

                // Get the file content from snapshot
                const content = snapshot[filePath];
                if (!content) {
                    console.warn(`File ${filePath} not found in snapshot for highlight`);
                    console.warn(`  Available files: ${Object.keys(snapshot).join(', ')}`);
                    continue;
                }

                // Get the file ID from path
                const fileId = this._getFileIdFromPath(filePath);
                if (!fileId) {
                    console.warn(`Could not find fileId for path ${filePath}`);
                    continue;
                }

                // Convert 1-based line numbers to 0-based
                const startRow = startLine - 1;
                const endRow = endLine - 1;

                // Extract the selected text
                const lines = content.split('\n');
                const selectedLines = lines.slice(startRow, endRow + 1);
                const selectedText = selectedLines.join('\n');

                // Get event IDs for this line range
                const eventIds = eventIdMap[filePath];
                let selectedTextEventIds = [];

                if (eventIds && this.summarizer) {
                    selectedTextEventIds = this.summarizer.getEventIdsForLineRange(
                        eventIds,
                        content,
                        startRow,
                        endRow
                    );
                }

                // Calculate start and end columns (full lines)
                const startColumn = 0;
                const endColumn = selectedLines[selectedLines.length - 1]?.length || 0;

                selectedCodeBlocks.push({
                    fileId: fileId,
                    selectedText: selectedText,
                    startRow: startRow,
                    startColumn: startColumn,
                    endRow: endRow,
                    endColumn: endColumn,
                    selectedTextEventIds: selectedTextEventIds
                });

            } catch (err) {
                console.warn(`Failed to build code block for highlight:`, highlight, err);
            }
        }

        return selectedCodeBlocks;
    }

    /**
     * Get file ID from file path
     * @param {string} filePath
     * @returns {string|null}
     */
    _getFileIdFromPath(filePath) {
        try {
            const allFiles = this.projectManager.fileSystemManager.allFiles;
            for (const fileId in allFiles) {
                const file = allFiles[fileId];
                if (file.currentPath === filePath && !file.isDeleted) {
                    return fileId;
                }
            }
        } catch (e) {
            console.error('Error finding file ID:', e);
        }
        return null;
    }

    /**
     * Determine which file is "current" at a given event index
     * Used to set the file context for the comment
     * @param {number} eventIndex
     * @returns {string|null} File path or null
     */
    _getCurrentFileAtEvent(eventIndex) {
        try {
            const allEvents = this.projectManager.getAllEvents();

            // Scan backwards from eventIndex to find last file-related event
            for (let i = Math.min(eventIndex, allEvents.length - 1); i >= 0; i--) {
                const event = allEvents[i];
                if (event && event.fileId) {
                    const file = this.projectManager.fileSystemManager.allFiles[event.fileId];
                    if (file && !file.isDeleted) {
                        return file.currentPath;
                    }
                }
            }
        } catch (e) {
            console.error('Error finding current file:', e);
        }

        return null;
    }

    /**
     * Update the first comment (description comment) with AI-generated introduction
     * @param {Object} introduction - { title, description } from AI
     * @returns {{ success: boolean, error?: string }}
     */
    updateFirstComment(introduction) {
        try {
            // Get the first event
            const allEvents = this.projectManager.getAllEvents();
            if (allEvents.length === 0) {
                return { success: false, error: 'No events in playback' };
            }

            const firstEventId = allEvents[0].id;

            // Get comments at the first event
            const commentsAtFirst = this.projectManager.commentManager.comments[firstEventId];
            if (!commentsAtFirst || commentsAtFirst.length === 0) {
                return { success: false, error: 'No comment at first event' };
            }

            // Get the first comment (position 0)
            const firstComment = commentsAtFirst[0];

            // Update the comment
            const updatedCommentData = {
                displayCommentEventId: firstComment.displayCommentEventId,
                displayCommentEventSequenceNumber: firstComment.displayCommentEventSequenceNumber,
                developerGroupId: firstComment.developerGroupId,
                timestamp: firstComment.timestamp,
                commentText: introduction.description,
                textFormat: 'markdown',
                commentTitle: introduction.title,
                ttsFilePath: firstComment.ttsFilePath,
                selectedCodeBlocks: [],  // No code highlights for intro
                imageURLs: firstComment.imageURLs || [],
                videoURLs: firstComment.videoURLs || [],
                audioURLs: firstComment.audioURLs || [],
                linesAbove: 0,
                linesBelow: 0,
                currentFilePath: firstComment.currentFilePath,
                viewableBlogText: firstComment.viewableBlogText,
                commentTags: firstComment.commentTags || [],
                questionCommentData: firstComment.questionCommentData,
                position: 0
            };

            this.projectManager.updateComment(updatedCommentData);

            return { success: true };
        } catch (error) {
            console.error('Failed to update first comment:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Add a conclusion comment at the last event
     * @param {Object} conclusion - { title, conclusion } from AI
     * @returns {{ success: boolean, error?: string }}
     */
    addConclusionComment(conclusion) {
        try {
            // Get the last event
            const allEvents = this.projectManager.getAllEvents();
            if (allEvents.length === 0) {
                return { success: false, error: 'No events in playback' };
            }

            const lastEventIndex = allEvents.length - 1;
            const lastEvent = allEvents[lastEventIndex];

            // Create the conclusion comment
            const commentData = {
                displayCommentEventId: lastEvent.id,
                displayCommentEventSequenceNumber: lastEventIndex,
                timestamp: Date.now(),
                commentText: conclusion.conclusion,
                textFormat: 'markdown',
                commentTitle: conclusion.title || 'Summary',
                ttsFilePath: null,
                selectedCodeBlocks: [],
                imageURLs: [],
                videoURLs: [],
                audioURLs: [],
                linesAbove: 5,
                linesBelow: 5,
                currentFilePath: this._getCurrentFileAtEvent(lastEventIndex),
                viewableBlogText: null,
                commentTags: [NARRATIVE_CONFIG.AI_GENERATED_TAG],
                questionCommentData: null
            };

            this.projectManager.addComment(commentData);

            return { success: true };
        } catch (error) {
            console.error('Failed to add conclusion comment:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = CommentInjector;
