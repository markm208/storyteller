const vscode = require('vscode');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const { COMMANDS, STATUS_BAR, MESSAGES, BROWSER_COMMANDS, PLAYBACK_INDEX_URL, PLAYBACK_COMMENT_URL, STATUS_BAR_MESSAGE_TIMEOUT_MS, IGNORE_FILE_DOCS_URL } = require('./constants');
const { updateStatusBar } = require('./status-bar');
const { zipProject, zipViewablePlayback } = require('./zip');

/**
 * Registers all Storyteller commands
 * @param {vscode.ExtensionContext} context 
 * @param {Object} state - Shared extension state
 */
function registerCommands(context, state) {
    const commands = [
        [COMMANDS.START, () => startStoryteller(state)],
        [COMMANDS.STOP, () => stopStoryteller(state)],
        [COMMANDS.PLAYBACK_NO_COMMENT, () => startPlaybackNoComment(state)],
        [COMMANDS.PLAYBACK_TO_COMMENT, () => startPlaybackToMakeAComment(state)],
        [COMMANDS.STATE, () => storytellerState(state)],
        [COMMANDS.CURRENT_DEVELOPERS, () => currentActiveDevelopers(state)],
        [COMMANDS.CREATE_DEVELOPER, () => createNewDeveloper(state)],
        [COMMANDS.ADD_DEVELOPERS, () => addDevelopersToActiveGroup(state)],
        [COMMANDS.REMOVE_DEVELOPERS, () => removeDevelopersFromActiveGroup(state)],
        [COMMANDS.ZIP_PROJECT, () => zipProject(state)],
        [COMMANDS.ZIP_PLAYBACK, () => zipViewablePlayback(state)],
        [COMMANDS.PREVIEW_PERFECT, () => previewPerfectProgrammer(state)],
        [COMMANDS.REPLACE_PERFECT, () => replaceWithPerfectProgrammer(state)],
        [COMMANDS.PLAYBACK_SELECTED, () => playbackSelectedText(state)],
        [COMMANDS.CREATE_IGNORE_FILE, () => createIgnoreFile()],
        [COMMANDS.DELETE_FILE_HISTORY, () => deleteFileHistory(state)]
    ];
    
    for (const [commandId, handler] of commands) {
        context.subscriptions.push(vscode.commands.registerCommand(commandId, handler));
    }
}

/*****************************************************************************
 * Core Commands
 *****************************************************************************/

/**
 * Starts Storyteller in the current workspace
 */
function startStoryteller(state) {
    //if Storyteller is already active then display the Storyteller state
    if (state.isActive) {
        storytellerState(state);
        return;
    }
    
    //an open workspace is required to start Storyteller
    if (vscode.workspace.workspaceFolders) {
        //import here to avoid circular dependency, since extension.js imports commands.js 
        const { startNewProject } = require('../extension');
        startNewProject();
    } else { //no open workspace
        promptAboutStoryteller(true);
    }
}

/**
 * Stops Storyteller tracking
 */
function stopStoryteller(state) {
    //import here to avoid circular dependency, since extension.js imports commands.js
    const { stopTracking } = require('../extension');
    stopTracking();
}

/**
 * Shows current Storyteller state
 */
function storytellerState(state) {
    //if the project is not active, prompt how to start Storyteller
    if (!state.isActive || !state.projectManager) {
        promptAboutStoryteller(true);
        return;
    }
    
    //show active developers and workspace path
    try {
        const activeDevs = state.projectManager.getActiveDevelopers();
        const devStrings = formatDeveloperList(activeDevs);
        const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        
        vscode.window.showInformationMessage(`Storyteller is active in ${workspacePath}. Active developers: ${devStrings}`);
    } catch (err) {
        console.error('Error in storytellerState:', err);
    }
}

/*****************************************************************************
 * Playback Commands
 *****************************************************************************/

/**
 * Starts a playback from the beginning
 */
function startPlaybackNoComment(state) {
    if (state.isActive) {
        startPlayback(state, false);
    } else {
        promptAboutStoryteller(true);
    }
}

/**
 * Starts a playback at the end for adding comments
 */
function startPlaybackToMakeAComment(state) {
    if (state.isActive) {
        startPlayback(state, true);
    } else {
        promptAboutStoryteller(true);
    }
}

/**
 * Starts a playback in the browser
 * @param {Object} state - Shared extension state
 * @param {boolean} forAddingComments - If true, starts at end for commenting
 */
function startPlayback(state, forAddingComments) {
    if (!state.isActive) return;
    
    //display status bar message
    vscode.window.setStatusBarMessage(MESSAGES.PLAYBACK_SERVER_STARTED, STATUS_BAR_MESSAGE_TIMEOUT_MS);
    //start the playback in the browser 
    openPlaybackInBrowser(forAddingComments);
}

/**
 * Opens the playback in the system browser
 * @param {boolean} forAddingComments - If true, opens comment URL
 */
function openPlaybackInBrowser(forAddingComments) {
    //process comes from Node.js environment
    const command = BROWSER_COMMANDS[process.platform];
    
    //if there is an unsupported platform
    if (!command) {
        console.error(`${MESSAGES.ERROR_UNSUPPORTED_PLATFORM}: ${process.platform}`);
        vscode.window.showErrorMessage(`${MESSAGES.ERROR_UNSUPPORTED_PLATFORM}: ${process.platform}`);
        return;
    }
    
    //determine URL to open
    const url = forAddingComments ? PLAYBACK_COMMENT_URL : PLAYBACK_INDEX_URL;
    spawn(command, [url]);
}

/**
 * Preview with perfect programmer mode (no changes made to the history)
 */
async function previewPerfectProgrammer(state) {
    if (!state.isActive) {
        promptAboutStoryteller(true);
        return;
    }
    //ask user if they want to use perfect programmer reordering
    const selection = await vscode.window.showQuickPick(MESSAGES.YES_NO_OPTIONS, { placeHolder: "Use 'perfect programmer' reordering?" });
    const usePerfectProgrammer = selection === MESSAGES.YES_NO_OPTIONS[0];
    state.projectManager.setNextPlaybackPerfectProgrammer(usePerfectProgrammer);
    //start playback 
    startPlayback(state, false);
}

/**
 * Replace history with perfect programmer version (modifies the history)
 */
async function replaceWithPerfectProgrammer(state) {
    if (!state.isActive) {
        promptAboutStoryteller(true);
        return;
    }
    //ask user if they want to use perfect programmer reordering
    const usePerfect = await vscode.window.showQuickPick(MESSAGES.YES_NO_OPTIONS, { placeHolder: "Use 'perfect programmer' reordering?" });
    //confirm that they want to replace the history
    const confirm = await vscode.window.showQuickPick(
        MESSAGES.YES_NO_OPTIONS, 
        { placeHolder: "Are you sure you want to replace the project's history? This cannot be undone." }
    );
    //if confirmed, replace the history
    if (confirm === MESSAGES.YES_NO_OPTIONS[0]) {
        const usePerfectProgrammer = usePerfect === MESSAGES.YES_NO_OPTIONS[0];
        state.projectManager.replaceEventsCommentsWithPerfectProgrammerData(usePerfectProgrammer);
    }
}

/**
 * Playback history of selected text
 */
function playbackSelectedText(state) {
    if (!state.isActive) {
        promptAboutStoryteller(true);
        return;
    }
    
    //get events for current selection and tell the project manager to use them for next playback
    const selectedEvents = getCurrentSelectionEvents(state);
    state.projectManager.setNextPlaybackSelectedText(selectedEvents);
    startPlayback(state, false);
}

/**
 * Gets insert events for currently selected text
 */
function getCurrentSelectionEvents(state) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return [];
    
    const selection = editor.selection;
    if (selection.isEmpty) return [];
    if (selection.start.isEqual(selection.end)) return [];
    
    //get the file info from the Storyteller project manager
    const filePath = state.projectManager.pathHelper.normalizeFilePath(editor.document.fileName);
    //get the file which contains the events currently in the editor
    const file = state.projectManager.fileSystemManager.getFileInfoFromFilePath(filePath);
    
    //get the events for the selection range
    return file.getInsertEventsByPos(
        selection.start.line, 
        selection.start.character, 
        selection.end.line, 
        selection.end.character
    );
}

/*****************************************************************************
 * Developer Commands
 *****************************************************************************/

/**
 * Shows currently active developers
 */
function currentActiveDevelopers(state) {
    if (!state.isActive) {
        promptAboutStoryteller(true);
        return;
    }
    
    try {
        const activeDevs = state.projectManager.getActiveDevelopers();
        const devStrings = formatDeveloperList(activeDevs);
        
        vscode.window.showInformationMessage(`Active developers: ${devStrings}`);
    } catch (err) {
        console.error('Error in currentActiveDevelopers:', err);
    }
}

/**
 * Creates a new developer and adds to active group
 */
async function createNewDeveloper(state) {
    if (!state.isActive) {
        promptAboutStoryteller(true);
        return;
    }
    
    try {
        const devInfo = await promptForDeveloperInfo();
        
        if (devInfo) {
            state.projectManager.createDeveloperAndAddToActiveGroup(devInfo.userName, devInfo.email);
            
            const activeDevs = state.projectManager.getActiveDevelopers();
            const devStrings = formatDeveloperList(activeDevs);
            
            vscode.window.showInformationMessage(`Active developers: ${devStrings}`);
        } else {
            currentActiveDevelopers(state);
        }
    } catch (err) {
        vscode.window.showErrorMessage(`Error adding developer: ${err.message || err}`);
    }
}

/**
 * Creates the first developer for a new project (replaces anonymous)
 */
async function createFirstDeveloper(projectManager) {
    try {
        const devInfo = await promptForDeveloperInfo();
        
        if (devInfo) {
            projectManager.replaceAnonymousDeveloperWithNewDeveloper(devInfo.userName, devInfo.email);
        }
    } catch (err) {
        vscode.window.showErrorMessage(`Error adding developer: ${err.message || err}`);
    }
}

/**
 * Adds an inactive developer to the active group
 */
async function addDevelopersToActiveGroup(state) {
    if (!state.isActive) {
        promptAboutStoryteller(true);
        return;
    }
    
    try {
        const inactiveDevs = state.projectManager.getInactiveDevelopers();
        
        if (inactiveDevs.length === 0) {
            vscode.window.showErrorMessage(MESSAGES.ERROR_NO_INACTIVE_DEVELOPERS);
            return;
        }
        
        const activeDevs = state.projectManager.getActiveDevelopers();
        const activeDevStrings = formatDeveloperList(activeDevs);
        const inactiveDevStrings = inactiveDevs.map(dev => `${dev.userName} <${dev.email}>`);
        
        const selected = await vscode.window.showQuickPick(inactiveDevStrings, {
            placeHolder: `Choose a developer to add. Currently active: ${activeDevStrings}`
        });
        
        if (!selected) {
            vscode.window.showErrorMessage(MESSAGES.ERROR_NO_DEVELOPER_CHOSEN);
            return;
        }
        
        const userName = extractUserNameFromSelection(selected);
        if (userName) {
            state.projectManager.addDevelopersToActiveGroupByUserName([userName]);
            
            const updatedDevs = state.projectManager.getActiveDevelopers();
            const updatedStrings = formatDeveloperList(updatedDevs);
            
            vscode.window.showInformationMessage(
                `${selected} added to active group. Active developers: ${updatedStrings}`
            );
        }
    } catch (err) {
        console.error('Error adding developer to active group:', err);
    }
}

/**
 * Removes a developer from the active group
 */
async function removeDevelopersFromActiveGroup(state) {
    if (!state.isActive) {
        promptAboutStoryteller(true);
        return;
    }
    
    try {
        const activeDevs = state.projectManager.getActiveDevelopers();
        
        if (activeDevs.length <= 1) {
            vscode.window.showErrorMessage(MESSAGES.ERROR_CANNOT_REMOVE_LAST_DEVELOPER);
            return;
        }
        
        const activeDevStrings = activeDevs.map(dev => `${dev.userName} <${dev.email}>`);
        
        const selected = await vscode.window.showQuickPick(activeDevStrings, {
            placeHolder: 'Choose a developer to remove from the active group'
        });
        
        if (!selected) {
            vscode.window.showErrorMessage(MESSAGES.ERROR_NO_DEVELOPER_CHOSEN);
            return;
        }
        
        const userName = extractUserNameFromSelection(selected);
        if (userName) {
            state.projectManager.removeDevelopersFromActiveGroupByUserName([userName]);
            
            const updatedDevs = state.projectManager.getActiveDevelopers();
            const updatedStrings = formatDeveloperList(updatedDevs);
            
            vscode.window.showInformationMessage(
                `${selected} removed. Active developers: ${updatedStrings}`
            );
        }
    } catch (err) {
        console.error('Error removing developer from active group:', err);
    }
}

/*****************************************************************************
 * Ignore File Command
 *****************************************************************************/

/**
 * Creates a template st-ignore.json file in the workspace root
 */
async function createIgnoreFile() {
    if (!vscode.workspace.workspaceFolders) {
        vscode.window.showErrorMessage(MESSAGES.OPEN_FOLDER_REQUIRED);
        return;
    }

    const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const ignoreFilePath = path.join(workspacePath, 'st-ignore.json');

    //check if file already exists
    if (fs.existsSync(ignoreFilePath)) {
        const overwrite = await vscode.window.showQuickPick(
            MESSAGES.YES_NO_OPTIONS,
            { placeHolder: 'st-ignore.json already exists. Overwrite it?' }
        );

        if (overwrite !== MESSAGES.YES_NO_OPTIONS[0]) {
            return;
        }
    }

    const template = {
        ignoredFileExtensions: [".an-extension-here"],
        ignoredFiles: ["a-file-name-here.txt", "another-file-name-here.txt"],
        ignoredDirectories: ["/a-directory-name-here"]
    };

    try {
        fs.writeFileSync(ignoreFilePath, JSON.stringify(template, null, 4), 'utf8');

        //open the file in the editor
        const document = await vscode.workspace.openTextDocument(ignoreFilePath);
        await vscode.window.showTextDocument(document);

        const selection = await vscode.window.showInformationMessage(
            'Created st-ignore.json. Add patterns to ignore files and directories. Click the button below for documentation.',
            'View Ignore File Documentation'
        );

        if (selection === 'View Ignore File Documentation') {
            vscode.env.openExternal(vscode.Uri.parse(IGNORE_FILE_DOCS_URL));
        }
    } catch (err) {
        vscode.window.showErrorMessage(`Failed to create st-ignore.json: ${err.message}`);
    }
}

/*****************************************************************************
 * Delete File History Command
 *****************************************************************************/

/**
 * Deletes all history (events and comments) for a selected file
 * and adds it to st-ignore.json
 */
async function deleteFileHistory(state) {
    if (!state.isActive) {
        promptAboutStoryteller(true);
        return;
    }

    //get all tracked files that are not deleted
    const allFiles = state.projectManager.fileSystemManager.allFiles;
    const fileItems = [];

    for (const fileId in allFiles) {
        const file = allFiles[fileId];
        if (!file.isDeleted) {
            fileItems.push({
                label: file.currentPath,
                fileId: fileId
            });
        }
    }

    if (fileItems.length === 0) {
        vscode.window.showInformationMessage('No tracked files found.');
        return;
    }

    //sort files alphabetically
    fileItems.sort((a, b) => a.label.localeCompare(b.label));

    //show file picker
    const selected = await vscode.window.showQuickPick(fileItems, {
        placeHolder: 'Select a file to delete its entire history'
    });

    if (!selected) return;

    //show confirmation
    const confirm = await vscode.window.showQuickPick(
        MESSAGES.YES_NO_OPTIONS,
        { placeHolder: `Delete all history for "${selected.label}"? This cannot be undone.` }
    );

    if (confirm !== MESSAGES.YES_NO_OPTIONS[0]) return;

    try {
        state.projectManager.deleteFileHistory(selected.fileId);
        vscode.window.showInformationMessage(
            `Deleted history for ${selected.label} and added to st-ignore.json`
        );
    } catch (err) {
        vscode.window.showErrorMessage(`Error: ${err.message}`);
    }
}

/*****************************************************************************
 * Helper Functions
 *****************************************************************************/

/**
 * Prompts user for developer info
 * @returns {Object|null} Object with userName and email, or null if cancelled
 */
async function promptForDeveloperInfo() {
    const input = await vscode.window.showInputBox({
        prompt: MESSAGES.DEVELOPER_PROMPT
    });
    
    if (!input || input.trim() === '') {
        return null;
    }
    
    return parseDeveloperInfo(input);
}

/**
 * Parses developer info string into object
 * @param {string} devInfoString - String like "Grace Hopper grace@mail.com"
 * @returns {Object} Object with userName and email
 * @throws {Error} If email is missing or invalid
 */
function parseDeveloperInfo(devInfoString) {
    const trimmed = devInfoString.trim();
    const parts = trimmed.split(/\s+/);
    
    if (parts.length === 0) {
        throw new Error(MESSAGES.ERROR_EMAIL_REQUIRED);
    }
    
    const possibleEmail = parts[parts.length - 1];
    
    if (!possibleEmail.includes('@') || !possibleEmail.includes('.')) {
        throw new Error(MESSAGES.ERROR_EMAIL_REQUIRED);
    }
    
    parts.pop();
    
    return {
        userName: parts.join(' '),
        email: possibleEmail
    };
}

/**
 * Extracts username from formatted developer string
 * @param {string} selection - String like "Grace Hopper <grace@mail.com>"
 * @returns {string|null} Username or null if not found
 */
function extractUserNameFromSelection(selection) {
    const startOfEmail = selection.indexOf('<');
    
    if (startOfEmail > 0) {
        return selection.substring(0, startOfEmail - 1);
    }
    
    return null;
}

/**
 * Formats developer array into display string
 * @param {Array} developers - Array of developer objects
 * @returns {string} Formatted string
 */
function formatDeveloperList(developers) {
    return developers.map(dev => `${dev.userName} <${dev.email}>`).join(', ');
}

/**
 * Prompts user about how to use Storyteller
 */
function promptAboutStoryteller(requiresOpenFolder) {
    let message = MESSAGES.HOW_TO_START;
    
    if (requiresOpenFolder) {
        message = MESSAGES.OPEN_FOLDER_REQUIRED + ' ' + message;
    }
    
    vscode.window.showInformationMessage(message);
}

module.exports = {
    registerCommands,
    createFirstDeveloper,
    getCurrentSelectionEvents
};