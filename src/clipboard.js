const vscode = require('vscode');

const { setClipboardData, setActivePaste } = require('./file-watcher');

/**
 * Disposables for clipboard command overrides. These are used for 
 * unregistering the overrides temporarily while executing the default 
 * commands.
 */
let copyDisposable = null;
let cutDisposable = null;
let pasteDisposable = null;

/**
 * Reference to extension state (isActive, projectManager)
 */
let extensionState = null;

/**
 * Initializes clipboard tracking by overriding copy/cut/paste commands
 * @param {vscode.ExtensionContext} context 
 * @param {Object} state - Shared extension state
 */
function initializeClipboard(context, state) {
    extensionState = state;
    //register command overrides to capture selections for copy/cut operations 
    //and mark pastes
    registerCopyOverride(context);
    registerCutOverride(context);
    registerPasteOverride(context);
}

/**
 * Disposes clipboard command overrides
 */
function disposeClipboard() {
    if (copyDisposable) {
        copyDisposable.dispose();
        copyDisposable = null;
    }
    if (cutDisposable) {
        cutDisposable.dispose();
        cutDisposable = null;
    }
    if (pasteDisposable) {
        pasteDisposable.dispose();
        pasteDisposable = null;
    }
}

/*****************************************************************************
 * Copy Override
 *****************************************************************************/

/**
 * Registers the copy command override so that a selection in the editor can
 * be captured
 */
function registerCopyOverride(context) {
    copyDisposable = vscode.commands.registerTextEditorCommand(
        'editor.action.clipboardCopyAction',
        handleCopy //the custom Storyteller copy handler
    );
    context.subscriptions.push(copyDisposable);
}

/**
 * Handles copy command for Storyteller specific behavior
 */
async function handleCopy(textEditor, edit, params) {
    // Capture selection before the copy happens
    saveSelectionToClipboardData();
    
    // Temporarily remove our override
    copyDisposable.dispose();
    
    // Execute the default copy
    await vscode.commands.executeCommand('editor.action.clipboardCopyAction');
    
    // Re-register our override
    copyDisposable = vscode.commands.registerTextEditorCommand(
        'editor.action.clipboardCopyAction',
        handleCopy //the custom Storyteller copy handler
    );
}

/*****************************************************************************
 * Cut Override
 *****************************************************************************/

/**
 * Registers the cut command override so that a selection in the editor can
 * be captured
 */
function registerCutOverride(context) {
    cutDisposable = vscode.commands.registerTextEditorCommand(
        'editor.action.clipboardCutAction',
        handleCut //the custom Storyteller cut handler
    );
    context.subscriptions.push(cutDisposable);
}

/**
 * Handles cut command for Storyteller specific behavior
 */
async function handleCut(textEditor, edit, params) {
    // Capture selection before the cut happens
    saveSelectionToClipboardData();
    
    // Temporarily remove our override
    cutDisposable.dispose();
    
    // Execute the default cut
    await vscode.commands.executeCommand('editor.action.clipboardCutAction');
    
    // Re-register our override
    cutDisposable = vscode.commands.registerTextEditorCommand(
        'editor.action.clipboardCutAction',
        handleCut //the custom Storyteller cut handler
    );
}

/*****************************************************************************
 * Paste Override
 *****************************************************************************/

/**
 * Registers the paste command override so that pastes can be tracked
 * in the file-watcher
 */
function registerPasteOverride(context) {
    pasteDisposable = vscode.commands.registerTextEditorCommand(
        'editor.action.clipboardPasteAction',
        handlePaste //the custom Storyteller paste handler
    );
    context.subscriptions.push(pasteDisposable);
}

/**
 * Handles paste command for Storyteller specific behavior
 */
async function handlePaste(textEditor, edit, params) {
    // Mark that a paste is happening so file-watcher knows
    setActivePaste();
    
    // Temporarily remove our override
    pasteDisposable.dispose();
    
    // Execute the default paste
    await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
    
    // Re-register our override
    pasteDisposable = vscode.commands.registerTextEditorCommand(
        'editor.action.clipboardPasteAction',
        handlePaste //the custom Storyteller paste handler
    );
}

/*****************************************************************************
 * Selection Handling
 *****************************************************************************/

/**
 * Saves the current selection's text and event IDs to clipboard data
 */
function saveSelectionToClipboardData() {
    //get the selected events
    const selectedEvents = getSelectedEvents();
    
    //no selection, clear clipboard data
    if (selectedEvents.length === 0) {
        setClipboardData('', []);
        return;
    }
    
    //get the selected text 
    const text = selectedEvents.map(event => event.character).join('');
    //get the event IDs for the selected events
    const eventIds = selectedEvents.map(event => event.eventId);
    
    //store the text and event IDs in clipboard data
    setClipboardData(text, eventIds);
}

/**
 * Gets the Storyteller events for the current selection
 * @returns {Array} Array of insert events
 */
function getSelectedEvents() {
    if (!extensionState || !extensionState.isActive || !extensionState.projectManager) {
        return [];
    }
    
    const editor = vscode.window.activeTextEditor;
    if (!editor) return [];
    
    const selection = editor.selection;
    if (selection.isEmpty) return [];
    if (selection.start.isEqual(selection.end)) return [];
    
    try {
        //get the file info from the Storyteller project manager
        const filePath = extensionState.projectManager.pathHelper.normalizeFilePath(editor.document.fileName);
        //get the file which contains the events currently in the editor
        const file = extensionState.projectManager.fileSystemManager.getFileInfoFromFilePath(filePath);
        
        if (!file) return [];
        //get the events for the selection range
        return file.getInsertEventsByPos(
            selection.start.line,
            selection.start.character,
            selection.end.line,
            selection.end.character
        );
    } catch (err) {
        console.error('Error getting selected events:', err);
        return [];
    }
}

module.exports = {
    initializeClipboard,
    disposeClipboard
};