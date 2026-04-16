/**
 * PlaybackSummarizer - Creates code snapshots at meaningful points
 *
 * New approach: Create snapshots whenever the line changes during editing.
 * This captures every potential comment point without trying to pre-filter.
 * The AI will analyze these snapshots to identify pedagogically significant moments.
 */

const Diff = require('diff');

class PlaybackSummarizer {
    constructor(projectManager) {
        this.projectManager = projectManager;
    }

    /**
     * Build snapshots at every line change
     *
     * A "line change" occurs when:
     * - The programmer moves to a different line (INSERT on different line than previous INSERT)
     * - A file switch occurs
     * - A file is created
     * - Significant deletion occurs (captures "before" state)
     *
     * @returns {Array} Array of { eventIndex, reason, snapshot } objects
     */
    buildLineChangeSnapshots() {
        const allEvents = this.projectManager.getAllEvents();
        const totalEvents = allEvents.length;
        const snapshots = [];

        if (totalEvents === 0) {
            return snapshots;
        }

        // Track state
        let lastInsertEvent = null;
        let lastInsertIndex = -1;
        let inDeleteCluster = false;
        let deleteClusterCharCount = 0;

        // Always start with initial state
        snapshots.push({
            eventIndex: 0,
            reason: 'start',
            snapshot: null  // Will be built later
        });

        for (let i = 0; i < totalEvents; i++) {
            const event = allEvents[i];
            if (!event) continue;

            // Track deletions to capture state after deletion cluster completes
            if (event.type === 'DELETE') {
                if (!inDeleteCluster) {
                    inDeleteCluster = true;
                    deleteClusterCharCount = 1;
                } else {
                    deleteClusterCharCount++;
                }
                continue;
            }

            // When transitioning from DELETE to non-DELETE
            if (inDeleteCluster) {
                // If significant deletion, capture the state after deletion completes
                if (deleteClusterCharCount >= 10) {
                    snapshots.push({
                        eventIndex: i - 1,  // Last DELETE event - shows state after all deletes
                        reason: 'after_deletion'
                    });
                }
                inDeleteCluster = false;
                deleteClusterCharCount = 0;
            }

            // Handle INSERT events
            if (event.type === 'INSERT') {
                if (lastInsertEvent) {
                    // Check for line change (different line than previous insert)
                    const lineChanged = event.lineNumber !== lastInsertEvent.lineNumber;

                    // Check for file switch
                    const fileChanged = event.fileId !== lastInsertEvent.fileId;

                    if (lineChanged || fileChanged) {
                        snapshots.push({
                            eventIndex: lastInsertIndex,
                            reason: fileChanged ? 'file_switch' : 'line_change'
                        });
                    }
                }

                lastInsertEvent = event;
                lastInsertIndex = i;
            }

            // Handle file creation
            if (event.type === 'CREATE FILE') {
                snapshots.push({
                    eventIndex: i,
                    reason: 'file_created'
                });
            }
        }

        // Handle unclosed delete cluster at end
        if (inDeleteCluster && deleteClusterCharCount >= 10) {
            snapshots.push({
                eventIndex: totalEvents - 1,  // Last event - shows state after all deletes
                reason: 'after_deletion'
            });
        }

        // Always include final state
        const lastEventIndex = totalEvents - 1;
        snapshots.push({
            eventIndex: lastEventIndex,
            reason: 'end'
        });

        // Sort by eventIndex and remove duplicates
        snapshots.sort((a, b) => a.eventIndex - b.eventIndex);
        const unique = [];
        let lastIndex = -1;
        for (const s of snapshots) {
            if (s.eventIndex !== lastIndex) {
                unique.push(s);
                lastIndex = s.eventIndex;
            }
        }

        return unique;
    }

    /**
     * Build the actual code snapshots for a list of snapshot points
     * @param {Array} snapshotPoints - Array of { eventIndex, reason } objects
     * @returns {Array} Same array with 'snapshot' property added
     */
    buildSnapshotsWithCode(snapshotPoints) {
        const allEvents = this.projectManager.getAllEvents();

        return snapshotPoints.map(point => ({
            ...point,
            eventId: allEvents[point.eventIndex]?.id,
            snapshot: this._buildSnapshotAtEvent(allEvents, point.eventIndex)
        }));
    }

    /**
     * Build transitions between consecutive snapshots
     * Each transition shows before/after code states
     *
     * @param {Array} snapshots - Array with snapshot code
     * @returns {Array} Array of { fromSnapshot, toSnapshot, diff } objects
     */
    buildTransitions(snapshots) {
        const transitions = [];

        for (let i = 0; i < snapshots.length - 1; i++) {
            const from = snapshots[i];
            const to = snapshots[i + 1];

            transitions.push({
                index: i,
                fromEventIndex: from.eventIndex,
                toEventIndex: to.eventIndex,
                toEventId: to.eventId,
                reason: to.reason,
                fromSnapshot: from.snapshot,
                toSnapshot: to.snapshot,
                diff: this._computeDiff(from.snapshot, to.snapshot)
            });
        }

        return transitions;
    }

    /**
     * Reconstruct the code state at a given event index
     */
    _buildSnapshotAtEvent(allEvents, eventIndex, trackEventIds = false) {
        const snapshot = {};
        const fileContents = new Map();
        const fileExists = new Map();
        const fileEventIds = trackEventIds ? new Map() : null;

        for (let i = 0; i <= eventIndex; i++) {
            const event = allEvents[i];
            if (!event) continue;
            this._applyEventToSnapshot(event, fileContents, fileExists, fileEventIds);
        }

        const eventIdMap = trackEventIds ? {} : null;

        for (const [fileId, content] of fileContents) {
            if (fileExists.get(fileId)) {
                const file = this.projectManager.fileSystemManager.allFiles[fileId];
                if (file) {
                    snapshot[file.currentPath] = content;
                    if (trackEventIds && fileEventIds.has(fileId)) {
                        eventIdMap[file.currentPath] = fileEventIds.get(fileId);
                    }
                }
            }
        }

        if (trackEventIds) {
            return { snapshot, eventIdMap };
        }
        return snapshot;
    }

    /**
     * Apply a single event to the snapshot state
     */
    _applyEventToSnapshot(event, fileContents, fileExists, fileEventIds = null) {
        switch (event.type) {
            case 'CREATE FILE':
                fileContents.set(event.fileId, '');
                fileExists.set(event.fileId, true);
                if (fileEventIds) fileEventIds.set(event.fileId, []);
                break;

            case 'DELETE FILE':
                fileExists.set(event.fileId, false);
                break;

            case 'INSERT':
                this._applyInsert(event, fileContents, fileEventIds);
                break;

            case 'DELETE':
                this._applyDelete(event, fileContents, fileEventIds);
                break;
        }
    }

    /**
     * Apply an INSERT event
     */
    _applyInsert(event, fileContents, fileEventIds = null) {
        let content = fileContents.get(event.fileId);
        if (content === undefined) return;

        const lineNumber = event.lineNumber - 1;
        const column = event.column - 1;
        let char = this._unescapeCharacter(event.character);

        const lines = content.split('\n');
        let eventIds = fileEventIds ? fileEventIds.get(event.fileId) : null;
        let eventIdLines = eventIds ? this._splitEventIdsIntoLines(eventIds, content) : null;

        while (lines.length <= lineNumber) {
            lines.push('');
            if (eventIdLines) eventIdLines.push([]);
        }

        const line = lines[lineNumber] || '';

        if (char === '\n' || char === '\r\n') {
            const before = line.slice(0, column);
            const after = line.slice(column);
            lines[lineNumber] = before;
            lines.splice(lineNumber + 1, 0, after);

            if (eventIdLines) {
                const eventIdLine = eventIdLines[lineNumber] || [];
                const beforeIds = eventIdLine.slice(0, column);
                const afterIds = eventIdLine.slice(column);
                beforeIds.push(event.id);
                eventIdLines[lineNumber] = beforeIds;
                eventIdLines.splice(lineNumber + 1, 0, afterIds);
            }
        } else {
            lines[lineNumber] = line.slice(0, column) + char + line.slice(column);
            if (eventIdLines) {
                const eventIdLine = eventIdLines[lineNumber] || [];
                eventIdLine.splice(column, 0, event.id);
                eventIdLines[lineNumber] = eventIdLine;
            }
        }

        fileContents.set(event.fileId, lines.join('\n'));
        if (fileEventIds && eventIdLines) {
            fileEventIds.set(event.fileId, this._joinEventIdLines(eventIdLines));
        }
    }

    /**
     * Apply a DELETE event
     */
    _applyDelete(event, fileContents, fileEventIds = null) {
        let content = fileContents.get(event.fileId);
        if (content === undefined) return;

        const lineNumber = event.lineNumber - 1;
        const column = event.column - 1;
        let char = this._unescapeCharacter(event.character);

        const lines = content.split('\n');
        let eventIds = fileEventIds ? fileEventIds.get(event.fileId) : null;
        let eventIdLines = eventIds ? this._splitEventIdsIntoLines(eventIds, content) : null;

        if (lineNumber >= lines.length) return;

        if (char === '\n' || char === '\r\n' || char === 'CR-LF') {
            if (lineNumber < lines.length - 1) {
                lines[lineNumber] = (lines[lineNumber] || '') + (lines[lineNumber + 1] || '');
                lines.splice(lineNumber + 1, 1);

                if (eventIdLines && lineNumber < eventIdLines.length - 1) {
                    const currentLineIds = eventIdLines[lineNumber] || [];
                    currentLineIds.pop();
                    const nextLineIds = eventIdLines[lineNumber + 1] || [];
                    eventIdLines[lineNumber] = currentLineIds.concat(nextLineIds);
                    eventIdLines.splice(lineNumber + 1, 1);
                }
            }
        } else {
            const line = lines[lineNumber] || '';
            lines[lineNumber] = line.slice(0, column) + line.slice(column + 1);
            if (eventIdLines && eventIdLines[lineNumber]) {
                eventIdLines[lineNumber].splice(column, 1);
            }
        }

        fileContents.set(event.fileId, lines.join('\n'));
        if (fileEventIds && eventIdLines) {
            fileEventIds.set(event.fileId, this._joinEventIdLines(eventIdLines));
        }
    }

    _unescapeCharacter(char) {
        if (char === 'NEWLINE') return '\n';
        if (char === 'CR-LF') return '\r\n';
        if (char === 'TAB') return '\t';
        return char;
    }

    _splitEventIdsIntoLines(eventIds, content) {
        const lines = [];
        let currentLine = [];
        let charIndex = 0;

        for (let i = 0; i < content.length; i++) {
            if (content[i] === '\n') {
                if (charIndex < eventIds.length) currentLine.push(eventIds[charIndex]);
                lines.push(currentLine);
                currentLine = [];
                charIndex++;
            } else {
                if (charIndex < eventIds.length) currentLine.push(eventIds[charIndex]);
                charIndex++;
            }
        }
        lines.push(currentLine);
        return lines;
    }

    _joinEventIdLines(eventIdLines) {
        const result = [];
        for (const line of eventIdLines) {
            for (const eventId of (line || [])) {
                result.push(eventId);
            }
        }
        return result;
    }

    /**
     * Get event IDs for a specific line range
     */
    getEventIdsForLineRange(eventIds, content, startLine, endLine) {
        const eventIdLines = this._splitEventIdsIntoLines(eventIds, content);
        const uniqueIds = new Set();

        for (let line = startLine; line <= endLine && line < eventIdLines.length; line++) {
            for (const id of (eventIdLines[line] || [])) {
                if (id) uniqueIds.add(id);
            }
        }

        return Array.from(uniqueIds);
    }

    /**
     * Compute diff between two snapshots
     */
    _computeDiff(previous, current) {
        if (!previous) {
            return { type: 'initial', files: Object.keys(current || {}) };
        }

        const diff = {
            added: [],
            removed: [],
            modified: []
        };

        const prevFiles = new Set(Object.keys(previous));
        const currFiles = new Set(Object.keys(current));

        for (const file of currFiles) {
            if (!prevFiles.has(file)) {
                diff.added.push({
                    path: file,
                    content: current[file],
                    lineCount: (current[file] || '').split('\n').length
                });
            }
        }

        for (const file of prevFiles) {
            if (!currFiles.has(file)) {
                diff.removed.push({ path: file });
            }
        }

        for (const file of currFiles) {
            if (prevFiles.has(file) && previous[file] !== current[file]) {
                diff.modified.push({
                    path: file,
                    before: previous[file],
                    after: current[file],
                    lineDiff: this._computeLineDiff(previous[file], current[file])
                });
            }
        }

        return diff;
    }

    /**
     * Compute line-level diff
     */
    _computeLineDiff(before, after) {
        const changes = Diff.diffLines(before || '', after || '');
        const added = [];
        const removed = [];

        for (const part of changes) {
            const lines = part.value.split('\n');
            if (lines[lines.length - 1] === '') lines.pop();

            if (part.added) {
                added.push(...lines);
            } else if (part.removed) {
                removed.push(...lines);
            }
        }

        return { linesAdded: added.length, linesRemoved: removed.length, added, removed };
    }

    /**
     * Format a diff for display to AI
     */
    formatDiffForAI(diff) {
        if (diff.type === 'initial') {
            return `Initial state with files: ${diff.files.join(', ')}`;
        }

        const parts = [];

        for (const file of (diff.added || [])) {
            parts.push(`NEW FILE: ${file.path}\n${file.content}`);
        }

        for (const file of (diff.removed || [])) {
            parts.push(`DELETED FILE: ${file.path}`);
        }

        for (const mod of (diff.modified || [])) {
            parts.push(`MODIFIED: ${mod.path}`);
            if (mod.lineDiff.added.length > 0) {
                parts.push('Added:');
                mod.lineDiff.added.forEach(line => parts.push(`  + ${line}`));
            }
            if (mod.lineDiff.removed.length > 0) {
                parts.push('Removed:');
                mod.lineDiff.removed.forEach(line => parts.push(`  - ${line}`));
            }
        }

        return parts.join('\n') || 'No changes';
    }
}

module.exports = PlaybackSummarizer;
