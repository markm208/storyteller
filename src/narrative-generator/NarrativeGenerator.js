/**
 * NarrativeGenerator - Main coordinator for AI-powered narrative generation
 *
 * New approach - let AI see everything and decide:
 * 1. Create snapshots at every line change (capture all potential comment points)
 * 2. Build transitions showing before/after states
 * 3. Ask AI to score each transition's pedagogical significance
 * 4. Select high-scoring transitions as comment points
 * 5. Ask AI to generate educational comments for selected points
 * 6. Inject comments into playback
 */

const fs = require('fs');
const path = require('path');
const PlaybackSummarizer = require('./PlaybackSummarizer');
const AIService = require('./AIService');
const CommentInjector = require('./CommentInjector');
const { NARRATIVE_CONFIG } = require('./config');
const { MESSAGES } = require('../constants');

class NarrativeGenerator {
    constructor(projectManager, openaiApiKey, storytellerDirPath) {
        this.projectManager = projectManager;
        this.openaiApiKey = openaiApiKey;
        this.storytellerDirPath = storytellerDirPath;
        this.summarizer = new PlaybackSummarizer(projectManager);
        this.aiService = new AIService(openaiApiKey);
        this.injector = new CommentInjector(projectManager, this.summarizer);
    }

    /**
     * Check if narrative generation is available
     */
    checkAvailability() {
        if (!this.aiService.hasApiKey()) {
            return { available: false, reason: MESSAGES.NARRATIVE_NO_API_KEY };
        }

        const eventCount = this.projectManager.eventManager.numberOfEvents;
        if (eventCount === 0) {
            return { available: false, reason: MESSAGES.NARRATIVE_NO_EVENTS };
        }

        return { available: true };
    }

    /**
     * Generate narratives for the current playback
     */
    async generate(options, progress, token) {
        try {
            // Step 0: Collect existing comments for context
            progress.report({ message: 'Analyzing existing comments...', increment: 2 });

            //collect existing comments in order that they will show up in the playback (sorted by event index and position)
            const existingComments = this._collectExistingComments();
            //is there a custom intro comment at event index 0 that does NOT have the default text?
            const hasCustomIntro = this._hasCustomIntroComment(existingComments);
            //is there a conclusion comment at the last event index
            const hasConclusion = this._hasConclusionComment(existingComments);

            this._writeDebugFile('debug-existing-comments.json', {
                count: existingComments.length,
                hasCustomIntro,
                hasConclusion,
                comments: existingComments.map(c => ({
                    eventIndex: c.eventIndex,
                    title: c.title,
                    preview: c.text.slice(0, 100)
                }))
            });

            // Step 1: Build snapshots at every line change
            progress.report({ message: 'Capturing code snapshots...', increment: 3 });

            if (token.isCancellationRequested) {
                return { success: false, error: 'Cancelled' };
            }

            const snapshotPoints = this.summarizer.buildLineChangeSnapshots();
            const snapshots = this.summarizer.buildSnapshotsWithCode(snapshotPoints);

            // Write debug file
            this._writeDebugFile('debug-snapshots.json', {
                count: snapshots.length,
                points: snapshots.map(s => ({
                    eventIndex: s.eventIndex,
                    reason: s.reason,
                    fileCount: Object.keys(s.snapshot || {}).length
                }))
            });

            if (token.isCancellationRequested) {
                return { success: false, error: 'Cancelled' };
            }

            // Step 2: Build transitions between snapshots
            progress.report({ message: 'Analyzing code changes...', increment: 5 });

            //create diffs between the snapshots and the previous state of the code, and capture the reason for the snapshot (e.g. "line change in file X")
            const transitions = this.summarizer.buildTransitions(snapshots);

            //add formatted diff text to each transition (new file, line added, line removed, line changed) for AI context and debugging
            for (const t of transitions) {
                t.diffText = this.summarizer.formatDiffForAI(t.diff);
            }

            this._writeDebugFile('debug-transitions.json', {
                count: transitions.length,
                transitions: transitions.map(t => ({
                    index: t.index,
                    fromEventIndex: t.fromEventIndex,
                    toEventIndex: t.toEventIndex,
                    reason: t.reason,
                    diffText: t.diffText
                }))
            });

            if (token.isCancellationRequested) {
                return { success: false, error: 'Cancelled' };
            }

            // Step 3: Score transitions in batches
            progress.report({ message: 'AI scoring transitions...', increment: 10 });

            const allScores = await this._scoreTransitionsInBatches(
                transitions,
                existingComments,
                options,
                progress,
                token
            );

            if (token.isCancellationRequested) {
                return { success: false, error: 'Cancelled' };
            }

            // Calculate threshold based on verbosity for debug output
            const scoreThreshold = options.verbosity === NARRATIVE_CONFIG.VERBOSITY_LEVELS.VERBOSE.value
                ? NARRATIVE_CONFIG.VERBOSITY_LEVELS.VERBOSE.threshold
                : NARRATIVE_CONFIG.VERBOSITY_LEVELS.HIGH_LEVEL.threshold;

            this._writeDebugFile('debug-scores.json', {
                totalTransitions: transitions.length,
                verbosity: options.verbosity,
                threshold: scoreThreshold,
                scores: allScores,
                highScoring: allScores.filter(s => s.score >= scoreThreshold).length
            });

            // Step 4: Select high-scoring transitions
            progress.report({ message: 'Selecting comment points...', increment: 5 });

            const selectedTransitions = this._selectCommentPoints(transitions, allScores, options.verbosity);

            this._writeDebugFile('debug-selected.json', {
                count: selectedTransitions.length,
                selected: selectedTransitions.map(t => ({
                    eventIndex: t.toEventIndex,
                    score: t.score,
                    suggestedTitle: t.suggestedTitle
                }))
            });

            if (selectedTransitions.length === 0) {
                return {
                    success: true,
                    injectedCount: 0,
                    message: 'No significant comment points identified'
                };
            }

            if (token.isCancellationRequested) {
                return { success: false, error: 'Cancelled' };
            }

            // Step 5: Generate comments for selected points
            progress.report({ message: 'AI generating comments...', increment: 20 });

            // Add context about previous comments for narrative flow
            for (let i = 0; i < selectedTransitions.length; i++) {
                if (i > 0) {
                    selectedTransitions[i].previousContext = selectedTransitions[i - 1].suggestedTitle;
                }
            }

            const comments = await this._generateCommentsInBatches(
                selectedTransitions,
                existingComments,
                options,
                progress,
                token
            );

            // Build a map of eventIndex to snapshot for debugging
            const snapshotMap = {};
            for (const t of selectedTransitions) {
                snapshotMap[t.toEventIndex] = t.toSnapshot;
            }

            this._writeDebugFile('debug-comments.json', {
                count: comments.length,
                uniqueEventIndices: [...new Set(comments.map(c => c.eventIndex))].length,
                comments: comments.map(c => ({
                    eventIndex: c.eventIndex,
                    title: c.title,
                    comment: c.comment,
                    highlightCount: c.codeHighlights?.length || 0,
                    codeHighlights: c.codeHighlights,
                    // Include snapshot info for debugging line numbers
                    snapshotFiles: snapshotMap[c.eventIndex]
                        ? Object.entries(snapshotMap[c.eventIndex]).map(([path, content]) => ({
                            path,
                            lineCount: content.split('\n').length,
                            preview: content.split('\n').slice(0, 10).map((l, i) => `${i+1}: ${l}`).join('\n')
                        }))
                        : null
                }))
            });

            if (token.isCancellationRequested) {
                return { success: false, error: 'Cancelled' };
            }

            // Step 6: Inject comments into playback
            progress.report({ message: 'Creating comments...', increment: 10 });

            // Convert AI comments to narrative points format with highlight data
            const allEvents = this.projectManager.getAllEvents();
            const narrativePoints = [];

            for (const c of comments) {
                const transition = selectedTransitions.find(t => t.toEventIndex === c.eventIndex);

                // Build highlight data if code highlights were provided
                let highlightData = null;
                if (c.codeHighlights && c.codeHighlights.length > 0 && transition) {
                    // Get snapshot with event ID tracking for the highlights
                    const { snapshot, eventIdMap } = this.summarizer._buildSnapshotAtEvent(
                        allEvents,
                        c.eventIndex,
                        true  // Track event IDs
                    );
                    highlightData = {
                        snapshot,
                        eventIdMap,
                        highlights: c.codeHighlights
                    };
                }

                narrativePoints.push({
                    eventIndex: c.eventIndex,
                    eventId: transition?.toEventId || allEvents[c.eventIndex]?.id,
                    title: c.title,
                    narrative: c.comment,
                    codeHighlights: c.codeHighlights || [],
                    highlightData,
                    linesAbove: c.linesAbove,
                    linesBelow: c.linesBelow
                });
            }

            const { injectedCount, errors } = await this.injector.injectNarratives(narrativePoints);

            if (token.isCancellationRequested) {
                return { success: false, error: 'Cancelled' };
            }

            // Step 7: Generate and update the introduction and conclusion
            progress.report({ message: 'Generating introduction and conclusion...', increment: 5 });

            // Get the final snapshot (last transition's toSnapshot)
            const finalSnapshot = selectedTransitions.length > 0
                ? selectedTransitions[selectedTransitions.length - 1].toSnapshot
                : {};

            // Create summaries of all comments (existing + new) for intro/conclusion context
            const allCommentSummaries = [
                ...existingComments.map(c => ({ title: c.title, comment: c.text })),
                ...comments.map(c => ({ title: c.title, comment: c.comment }))
            ];

            // Generate introduction only if no custom intro exists
            if (!hasCustomIntro) {
                try {
                    const introduction = await this.aiService.generateIntroduction({
                        finalSnapshot,
                        commentSummaries: allCommentSummaries,
                        audienceLevel: options.audienceLevel,
                        authorGuidance: options.authorGuidance
                    });

                    this._writeDebugFile('debug-introduction.json', introduction);

                    // Update the first comment with the introduction
                    const introResult = this.injector.updateFirstComment(introduction);
                    if (!introResult.success) {
                        errors.push('Failed to update introduction: ' + introResult.error);
                    }
                } catch (introError) {
                    console.error('Failed to generate introduction:', introError);
                    errors.push('Failed to generate introduction: ' + introError.message);
                }
            } else {
                this._writeDebugFile('debug-introduction.json', { skipped: true, reason: 'Custom intro exists' });
            }

            // Generate conclusion only if none exists
            if (!hasConclusion) {
                try {
                    const conclusion = await this.aiService.generateConclusion({
                        finalSnapshot,
                        commentSummaries: allCommentSummaries,
                        audienceLevel: options.audienceLevel,
                        authorGuidance: options.authorGuidance
                    });

                    this._writeDebugFile('debug-conclusion.json', conclusion);

                    // Add the conclusion comment at the last event
                    const conclusionResult = this.injector.addConclusionComment(conclusion);
                    if (!conclusionResult.success) {
                        errors.push('Failed to add conclusion: ' + conclusionResult.error);
                    }
                } catch (conclusionError) {
                    console.error('Failed to generate conclusion:', conclusionError);
                    errors.push('Failed to generate conclusion: ' + conclusionError.message);
                }
            } else {
                this._writeDebugFile('debug-conclusion.json', { skipped: true, reason: 'Conclusion already exists' });
            }

            progress.report({ message: 'Done!', increment: 5 });

            return {
                success: true,
                injectedCount,
                existingCommentsPreserved: existingComments.length,
                introPreserved: hasCustomIntro,
                conclusionPreserved: hasConclusion,
                totalSnapshots: snapshots.length,
                totalTransitions: transitions.length,
                highScoringCount: allScores.filter(s => s.score >= scoreThreshold).length,
                selectedPausePoints: selectedTransitions.length,
                totalCommentsGenerated: comments.length,
                commentsWithHighlights: comments.filter(c => c.codeHighlights?.length > 0).length,
                errors: errors.length > 0 ? errors : undefined
            };

        } catch (error) {
            console.error('Narrative generation failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Score transitions in batches to avoid overwhelming the API
     */
    async _scoreTransitionsInBatches(transitions, existingComments, options, progress, token) {
        const allScores = [];
        const batches = [];

        // Split into batches
        for (let i = 0; i < transitions.length; i += NARRATIVE_CONFIG.BATCH_SIZE) {
            batches.push(transitions.slice(i, i + NARRATIVE_CONFIG.BATCH_SIZE));
        }

        const incrementPerBatch = 30 / Math.max(1, batches.length);

        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            if (token.isCancellationRequested) {
                break;
            }

            const batch = batches[batchIndex];
            progress.report({
                message: `Scoring batch ${batchIndex + 1}/${batches.length}...`,
                increment: incrementPerBatch
            });

            try {
                const scores = await this.aiService.scoreTransitions({
                    transitions: batch,
                    existingComments,
                    audienceLevel: options.audienceLevel,
                    authorGuidance: options.authorGuidance
                });

                // Adjust indices to be global
                const globalOffset = batchIndex * NARRATIVE_CONFIG.BATCH_SIZE;
                for (const score of scores) {
                    allScores.push({
                        ...score,
                        transitionIndex: score.transitionIndex + globalOffset
                    });
                }
            } catch (error) {
                console.error(`Batch ${batchIndex + 1} scoring failed:`, error);
                // Continue with other batches
            }
        }

        return allScores;
    }

    /**
     * Generate comments in batches to avoid token limit issues
     */
    async _generateCommentsInBatches(selectedTransitions, existingComments, options, progress, token) {
        const allComments = [];
        const batches = [];

        // Split into batches
        for (let i = 0; i < selectedTransitions.length; i += NARRATIVE_CONFIG.COMMENT_BATCH_SIZE) {
            batches.push(selectedTransitions.slice(i, i + NARRATIVE_CONFIG.COMMENT_BATCH_SIZE));
        }

        const incrementPerBatch = 15 / Math.max(1, batches.length);

        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            if (token.isCancellationRequested) {
                break;
            }

            const batch = batches[batchIndex];
            progress.report({
                message: `Generating comments ${batchIndex + 1}/${batches.length}...`,
                increment: incrementPerBatch
            });

            try {
                const comments = await this.aiService.generateComments({
                    selectedTransitions: batch,
                    existingComments,
                    previouslyGeneratedComments: allComments,  // Pass comments generated so far
                    audienceLevel: options.audienceLevel,
                    verbosity: options.verbosity,
                    authorGuidance: options.authorGuidance
                });

                allComments.push(...comments);
            } catch (error) {
                console.error(`Batch ${batchIndex + 1} comment generation failed:`, error);
                // Continue with other batches
            }
        }

        return allComments;
    }

    /**
     * Select transitions to become comment points, grouping related transitions
     * @param {Array} transitions - All transitions
     * @param {Array} scores - Scores for each transition
     * @param {string} verbosity - Verbosity level ('verbose' or 'high-level')
     */
    _selectCommentPoints(transitions, scores, verbosity) {
        // Determine score threshold based on verbosity
        const threshold = verbosity === NARRATIVE_CONFIG.VERBOSITY_LEVELS.VERBOSE.value
            ? NARRATIVE_CONFIG.VERBOSITY_LEVELS.VERBOSE.threshold
            : NARRATIVE_CONFIG.VERBOSITY_LEVELS.HIGH_LEVEL.threshold;
        // Create a map of transition index to score
        const scoreMap = new Map();
        for (const s of scores) {
            scoreMap.set(s.transitionIndex, s);
        }

        // Group consecutive related transitions
        // A group starts when relatedToPrevious is false and continues while it's true
        const groups = [];
        let currentGroup = null;

        for (let i = 0; i < transitions.length; i++) {
            const score = scoreMap.get(i);
            if (!score) continue;

            const isRelatedToPrevious = score.relatedToPrevious === true;

            if (!isRelatedToPrevious || currentGroup === null) {
                // Start a new group
                if (currentGroup !== null) {
                    groups.push(currentGroup);
                }
                currentGroup = {
                    transitions: [{ ...transitions[i], score: score.score, reasoning: score.reasoning }],
                    maxScore: score.score,
                    suggestedTitle: score.suggestedTitle,
                    lastIndex: i
                };
            } else {
                // Continue current group
                currentGroup.transitions.push({ ...transitions[i], score: score.score, reasoning: score.reasoning });
                currentGroup.maxScore = Math.max(currentGroup.maxScore, score.score);
                currentGroup.lastIndex = i;
                // Only use title from first transition in group (the one that starts the topic)
            }
        }

        // Don't forget the last group
        if (currentGroup !== null) {
            groups.push(currentGroup);
        }

        // Filter groups by max score threshold
        const selectedGroups = groups.filter(g => g.maxScore >= threshold);

        // Convert groups to selected transitions
        // Each group becomes one pause point (at the last transition) with info about all transitions in the group
        const selected = selectedGroups.map(group => {
            const lastTransition = group.transitions[group.transitions.length - 1];
            return {
                ...lastTransition,
                score: group.maxScore,
                suggestedTitle: group.suggestedTitle,
                reasoning: lastTransition.reasoning,
                // Include all transitions in the group for comment generation
                groupedTransitions: group.transitions,
                groupSize: group.transitions.length
            };
        });

        // Always include the last transition if it scored reasonably (for closure)
        const lastTransitionIndex = transitions.length - 1;
        const lastScore = scoreMap.get(lastTransitionIndex);
        if (lastScore && lastScore.score >= 6) {
            const alreadyIncluded = selected.some(t => t.index === lastTransitionIndex);
            if (!alreadyIncluded) {
                selected.push({
                    ...transitions[lastTransitionIndex],
                    score: lastScore.score,
                    suggestedTitle: lastScore.suggestedTitle,
                    reasoning: lastScore.reasoning,
                    groupedTransitions: [{ ...transitions[lastTransitionIndex], score: lastScore.score }],
                    groupSize: 1
                });
            }
        }

        return selected;
    }

    /**
     * Collect existing comments from the project for context
     * @returns {Array} Array of { eventIndex, eventId, title, text, tags }
     */
    _collectExistingComments() {
        const existingComments = [];
        const allEvents = this.projectManager.getAllEvents();
        const comments = this.projectManager.commentManager.comments;

        // Build a map of event ID to event index
        const eventIdToIndex = {};
        for (let i = 0; i < allEvents.length; i++) {
            eventIdToIndex[allEvents[i].id] = i;
        }

        // Collect all comments with their event indices
        for (const eventId in comments) {
            const commentsAtEvent = comments[eventId];
            const eventIndex = eventIdToIndex[eventId];
            
            if (eventIndex === undefined) continue;

            for (const comment of commentsAtEvent) {
                existingComments.push({
                    eventIndex,
                    eventId,
                    title: comment.commentTitle || '',
                    text: comment.commentText || '',
                    tags: comment.commentTags || [],
                    position: comment.position || 0
                });
            }
        }

        // Sort by event index, then by position
        existingComments.sort((a, b) => {
            if (a.eventIndex !== b.eventIndex) {
                return a.eventIndex - b.eventIndex;
            }
            return a.position - b.position;
        });

        return existingComments;
    }

    /**
     * Check if the intro comment has been customized (not default text)
     */
    _hasCustomIntroComment(existingComments) {
        // Find comment at event index 0
        const introComment = existingComments.find(c => c.eventIndex === 0);
        if (!introComment) return false;

        // Check if it's still the default text
        const defaultText = 'Enter a playback description.';
        return introComment.text.trim() !== defaultText;
    }

    /**
     * Check if a conclusion comment already exists at the last event
     */
    _hasConclusionComment(existingComments) {
        const allEvents = this.projectManager.getAllEvents();
        if (allEvents.length === 0) return false;

        const lastEventIndex = allEvents.length - 1;

        // Check if there's more than just the intro comment at the last event
        // (The intro is at event 0, so if last event has a comment and it's not event 0, it's a conclusion)
        // Or if event 0 is the last event, check if there's more than one comment
        const commentsAtLast = existingComments.filter(c => c.eventIndex === lastEventIndex);

        if (lastEventIndex === 0) {
            // Single event playback - conclusion exists if there's more than the intro
            return commentsAtLast.length > 1;
        }

        // Multi-event playback - conclusion exists if there's any comment at last event
        return commentsAtLast.length > 0;
    }

    /**
     * Write debug file
     */
    _writeDebugFile(filename, data) {
        try {
            const filePath = path.join(this.storytellerDirPath, filename);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        } catch (e) {
            console.error(`Failed to write debug file ${filename}:`, e);
        }
    }
}

module.exports = { NarrativeGenerator, NARRATIVE_CONFIG };
