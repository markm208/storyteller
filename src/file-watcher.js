const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

const { STORYTELLER_DIR, MOVE_DETECTION_WINDOW_MS } = require('./constants');

/**
 * Tracks pending create events to detect moves/renames
 * Key: file path, Value: { timestamp, timeout }
 */
const pendingCreates = new Map();

/**
 * Reference to shared state
 */
let sharedState = null;

/**
 * Clipboard data for tracking copy/paste operations
 */
const clipboardData = {
    text: '',
    eventIds: [],
    activePaste: false
};

/**
 * Initializes file system watcher and text change handlers
 * @param {vscode.ExtensionContext} context 
 * @param {Object} state - Shared extension state
 */
function initializeFileWatcher(context, state) {
    sharedState = state;
    
    // Watch for text changes in editors
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(handleTextEditorChange)
    );
    
    // Watch for file/directory creates and deletes
    const fsWatcher = vscode.workspace.createFileSystemWatcher('**/*', false, true, false);
    
    context.subscriptions.push(fsWatcher.onDidCreate(handleCreate));
    context.subscriptions.push(fsWatcher.onDidDelete(handleDelete));
    context.subscriptions.push(fsWatcher);
}

/*****************************************************************************
 * File System Event Handlers
 *****************************************************************************/

/**
 * Handles file/directory create events
 * 
 * A create event might be:
 * - A new file/directory created
 * - The destination of a move operation (create followed by delete)
 * - The destination of a rename operation (create followed by delete)
 * 
 * We store the create and wait briefly to see if a corresponding delete arrives.
 */
function handleCreate(createEvent) {
    if (!sharedState.isActive) return;
    
    const fileDirPath = createEvent.fsPath;
    
    //ignore creates in .storyteller directory
    if (isInStorytellerDir(fileDirPath)) return;
    
    //clear any existing timeout for this path
    //this would happen if the same file is created multiple times quickly, like in tests, we want to only track the latest create
    if (pendingCreates.has(fileDirPath)) {
        clearTimeout(pendingCreates.get(fileDirPath).timeout);
    }
    
    //set up timeout to handle as real create if no delete follows
    //this code executes after the detection window
    const timeoutId = setTimeout(() => {
        if (pendingCreates.has(fileDirPath)) {
            //no delete in the detection window so this is a real create
            //remove the path from pending creates
            pendingCreates.delete(fileDirPath);
            processRealCreate(fileDirPath);
        }
    }, MOVE_DETECTION_WINDOW_MS);
    
    //store the pending create in the map so that it can be matched with a delete in the timeout above
    pendingCreates.set(fileDirPath, {
        timestamp: Date.now(),
        timeout: timeoutId
    });
}

/**
 * Handles file/directory delete events
 * 
 * A delete event might be:
 * - A file/directory actually deleted
 * - The source of a move operation (create followed by delete)
 * - The source of a rename operation (create followed by delete)
 * 
 * We check if there's a recent create that pairs with this delete.
 */
function handleDelete(deleteEvent) {
    if (!sharedState.isActive) return;
    
    const deletedPath = deleteEvent.fsPath;
    
    //ignore deletes in .storyteller directory
    if (isInStorytellerDir(deletedPath)) return;
    
    // Look for a pending create that could be paired with this delete
    const matchedCreatePath = findMatchingCreate();
    
    //if there is a matching create event, then it's a move/rename
    if (matchedCreatePath) {
        //this is a move or rename
        const data = pendingCreates.get(matchedCreatePath);
        //clear the timeout and remove from pending creates
        clearTimeout(data.timeout);
        pendingCreates.delete(matchedCreatePath);
        //process the move/rename by creating a new filesystem event
        processMoveOrRename(deletedPath, matchedCreatePath);
    } else { //there is no matching create event
        //this is a real delete
        processRealDelete(deletedPath);
    }
}

/**
 * Finds the oldest pending create within the detection window
 * @returns {string|null} Path of matching create, or null
 */
function findMatchingCreate() {
    let matchedPath = null;
    let oldestTimestamp = Infinity;
    const now = Date.now();
    
    //check all pending creates for one within the detection window
    for (const [createPath, data] of pendingCreates) {
        const age = now - data.timestamp;
        
        //if within detection window and older than current oldest, select it
        if (age < MOVE_DETECTION_WINDOW_MS && data.timestamp < oldestTimestamp) {
            oldestTimestamp = data.timestamp;
            matchedPath = createPath;
        }
    }
    
    return matchedPath;
}

/**
 * Processes a confirmed new file/directory creation
 */
function processRealCreate(fileDirPath) {
    try {
        const stats = fs.statSync(fileDirPath);
        
        if (stats.isFile()) {
            sharedState.projectManager.createFile(fileDirPath);
        } else if (stats.isDirectory()) {
            sharedState.projectManager.createDirectory(fileDirPath);
        }
    } catch (err) {
        console.error('Error processing create:', err);
    }
}

/**
 * Processes a confirmed file/directory deletion
 */
function processRealDelete(fileDirPath) {
    try {
        sharedState.projectManager.deleteFileOrDirectory(fileDirPath);
    } catch (err) {
        console.error('Error processing delete:', err);
    }
}

/**
 * Processes a move or rename operation
 * @param {string} oldPath - Original path (from delete event)
 * @param {string} newPath - New path (from create event)
 */
function processMoveOrRename(oldPath, newPath) {
    try {
        const stats = fs.statSync(newPath);
        const parsedOld = path.parse(oldPath);
        const parsedNew = path.parse(newPath);
        
        const sameParent = parsedOld.dir === parsedNew.dir;
        const differentName = parsedOld.base !== parsedNew.base;
        const isRename = sameParent && differentName;
        
        if (stats.isFile()) {
            if (isRename) {
                sharedState.projectManager.renameFile(oldPath, newPath);
            } else {
                sharedState.projectManager.moveFile(oldPath, newPath);
            }
        } else if (stats.isDirectory()) {
            if (isRename) {
                sharedState.projectManager.renameDirectory(oldPath, newPath);
            } else {
                sharedState.projectManager.moveDirectory(oldPath, newPath);
            }
        }
    } catch (err) {
        console.error('Error processing move/rename:', err);
    }
}

/**
 * Checks if a path is inside the .storyteller directory
 */
function isInStorytellerDir(filePath) {
    const storytellerPath = path.join(
        vscode.workspace.workspaceFolders[0].uri.fsPath, 
        STORYTELLER_DIR
    );
    return filePath.startsWith(storytellerPath);
}

/*****************************************************************************
 * Text Editor Change Handler
 *****************************************************************************/

/**
 * Handles text changes in the editor
 */
function handleTextEditorChange(event) {
    if (!sharedState.isActive) return;
    
    const filePath = event.document.fileName;
    const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    
    // Only track changes in the workspace
    if (!filePath.startsWith(workspacePath)) return;
    
    // Ignore changes in .storyteller directory
    if (isInStorytellerDir(filePath)) return;
    
    for (const change of event.contentChanges) {
        processChange(filePath, change);
    }
}

/**
 * Processes a single text change
 * @param {string} filePath - Path to the file being edited
 * @param {Object} change - VS Code change object
 */
function processChange(filePath, change) {
    const isDelete = change.text.length === 0;
    const hasSelectedText = change.rangeLength > 0;
    
    if (isDelete) {
        // Pure deletion
        processDelete(filePath, change);
    } else {
        // Insert (possibly replacing selected text)
        if (hasSelectedText) {
            // First delete the selected text
            processDelete(filePath, change);
        }
        processInsert(filePath, change);
    }
}

/**
 * Processes a text deletion
 */
function processDelete(filePath, change) {
    const numCharacters = change.rangeLength;
    const startLine = change.range.start.line;
    const startColumn = change.range.start.character;
    
    sharedState.projectManager.handleDeletedText(
        filePath, 
        startLine, 
        startColumn, 
        numCharacters
    );
}

/**
 * Processes a text insertion
 */
function processInsert(filePath, change) {
    const newText = change.text;
    const startLine = change.range.start.line;
    const startColumn = change.range.start.character;
    
    let pastedInsertEventIds = [];
    
    if (clipboardData.activePaste) {
        pastedInsertEventIds = getPastedEventIds(newText);
        clipboardData.activePaste = false;
    }
    
    sharedState.projectManager.handleInsertedText(
        filePath, 
        newText, 
        startLine, 
        startColumn, 
        pastedInsertEventIds
    );
}

/**
 * Gets event IDs for pasted text
 * @param {string} newText - The inserted text
 * @returns {Array} Array of event IDs or 'other' markers
 */
function getPastedEventIds(newText) {
    if (newText === clipboardData.text) {
        // Paste matches our tracked clipboard
        return clipboardData.eventIds;
    }
    
    // Paste from external source
    clipboardData.text = '';
    clipboardData.eventIds = [];
    
    return newText.split('').map(() => 'other');
}

/*****************************************************************************
 * Clipboard Functions (for use by clipboard.js)
 *****************************************************************************/

/**
 * Sets clipboard data when text is copied/cut
 * @param {string} text - Copied text
 * @param {Array} eventIds - Event IDs for each character
 */
function setClipboardData(text, eventIds) {
    clipboardData.text = text;
    clipboardData.eventIds = eventIds;
}

/**
 * Marks that a paste operation is active
 */
function setActivePaste() {
    clipboardData.activePaste = true;
}

/**
 * Gets current clipboard data
 * @returns {Object} Clipboard data object
 */
function getClipboardData() {
    return { ...clipboardData };
}

/**
 * Clears pending creates (useful for cleanup/testing)
 */
function clearPendingCreates() {
    for (const [, data] of pendingCreates) {
        clearTimeout(data.timeout);
    }
    pendingCreates.clear();
}

module.exports = {
    initializeFileWatcher,
    setClipboardData,
    setActivePaste,
    getClipboardData,
    clearPendingCreates
};