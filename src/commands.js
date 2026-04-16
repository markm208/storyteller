const vscode = require('vscode');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const { COMMANDS, STATUS_BAR, MESSAGES, BROWSER_COMMANDS, PLAYBACK_INDEX_URL, PLAYBACK_COMMENT_URL, STATUS_BAR_MESSAGE_TIMEOUT_MS, IGNORE_FILE_DOCS_URL, CONFIG_NAMESPACE, CONFIG_OPENAI_API_KEY, STORYTELLER_DIR } = require('./constants');
const { NarrativeGenerator, NARRATIVE_CONFIG } = require('./narrative-generator/NarrativeGenerator');
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
        [COMMANDS.DELETE_FILE_HISTORY, () => deleteFileHistory(state)],
        [COMMANDS.GENERATE_NARRATIVE, () => generateNarrative(state)],
        // TODO: Remove this temporary debug command when narrative generation testing is complete
        [COMMANDS.DEBUG_WIPE_COMMENTS, () => debugWipeComments(state)]
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
            await state.projectManager.createDeveloperAndAddToActiveGroup(devInfo.userName, devInfo.email, devInfo.platform, devInfo.platformUsername);

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
            await projectManager.replaceAnonymousDeveloperWithNewDeveloper(devInfo.userName, devInfo.email, devInfo.platform, devInfo.platformUsername);
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
        const inactiveDevStrings = inactiveDevs.map(dev => formatSingleDeveloper(dev));

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

        const activeDevStrings = activeDevs.map(dev => formatSingleDeveloper(dev));

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
 * Narrative Generation Command
 *****************************************************************************/

/**
 * Generates AI narrative for the current playback
 * PHASE 1: Builds timeline and outputs debug file for inspection
 */
async function generateNarrative(state) {
    //only available when Storyteller is active
    if (!state.isActive) {
        promptAboutStoryteller(true);
        return;
    }

    //get API key from config (will be used in Phase 2)
    const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
    const openaiApiKey = config.get(CONFIG_OPENAI_API_KEY);

    //get the storyteller directory path
    const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const storytellerDirPath = path.join(workspacePath, STORYTELLER_DIR);

    //create a generator to coordinate the narrative generation process
    const generator = new NarrativeGenerator(state.projectManager, openaiApiKey, storytellerDirPath);

    //make sure there is an API key and at least some events to generate a narrative
    const availability = generator.checkAvailability();
    if (!availability.available) {
        vscode.window.showWarningMessage(availability.reason);
        return;
    }

    // Ask for audience level
    const audienceChoice = await vscode.window.showQuickPick([
        {
            label: 'Beginner',
            value: NARRATIVE_CONFIG.AUDIENCE_LEVELS.BEGINNER,
            description: 'New to programming, explain fundamentals'
        },
        {
            label: 'Intermediate',
            value: NARRATIVE_CONFIG.AUDIENCE_LEVELS.INTERMEDIATE,
            description: 'Knows basics, learning patterns and best practices'
        },
        {
            label: 'Advanced',
            value: NARRATIVE_CONFIG.AUDIENCE_LEVELS.ADVANCED,
            description: 'Experienced, focus on sophisticated techniques'
        }
    ], {
        placeHolder: MESSAGES.NARRATIVE_AUDIENCE_PROMPT
    });

    if (!audienceChoice) return; // Cancelled

    // Ask for verbosity level
    const verbosityChoice = await vscode.window.showQuickPick([
        {
            label: 'Verbose',
            value: NARRATIVE_CONFIG.VERBOSITY_LEVELS.VERBOSE.value,
            description: 'More comments, explain smaller steps'
        },
        {
            label: 'High-level',
            value: NARRATIVE_CONFIG.VERBOSITY_LEVELS.HIGH_LEVEL.value,
            description: 'Fewer comments, focus on major concepts'
        }
    ], {
        placeHolder: 'How detailed should the comments be?'
    });

    if (!verbosityChoice) return; // Cancelled

    // Ask for optional author guidance
    const authorGuidance = await vscode.window.showInputBox({
        prompt: MESSAGES.NARRATIVE_GUIDANCE_PROMPT,
        placeHolder: 'e.g., "This code shows how to call a function with reference parameters." (optional)',
        ignoreFocusOut: true
    });

    // Note: authorGuidance can be undefined (cancelled) or empty string (skipped)
    // We treat both cancelled and empty as "no guidance provided"
    if (authorGuidance === undefined) return; // Cancelled

    // Run generation with progress
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: MESSAGES.NARRATIVE_CONFIG_TITLE,
        cancellable: true
    }, async (progress, token) => {
        const result = await generator.generate({
            audienceLevel: audienceChoice.value,
            verbosity: verbosityChoice.value,
            authorGuidance: authorGuidance || null  // Convert empty string to null
        }, progress, token);

        if (result.success) {
            const message = MESSAGES.NARRATIVE_SUCCESS.replace('{count}', result.injectedCount);

            // Offer to view the playback
            const viewChoice = await vscode.window.showInformationMessage(
                message,
                'View in Playback',
                'OK'
            );

            if (viewChoice === 'View in Playback') {
                startPlayback(state, false);
            }
        } else if (result.error !== 'Cancelled') {
            vscode.window.showErrorMessage(`Narrative generation failed: ${result.error}`);
        }
    });
}

/*****************************************************************************
 * TODO: Remove this entire section when narrative generation testing is complete
 * DEBUG: Temporary Commands
 *****************************************************************************/

/**
 * DEBUG: Wipes all comments from the current project (except the first/intro comment)
 * TODO: Remove this temporary command when narrative generation testing is complete
 */
async function debugWipeComments(state) {
    if (!state.isActive) {
        promptAboutStoryteller(true);
        return;
    }

    // Confirm with user
    const confirm = await vscode.window.showQuickPick(
        MESSAGES.YES_NO_OPTIONS,
        { placeHolder: 'DEBUG: Delete all comments (except intro)? This cannot be undone.' }
    );

    if (confirm !== MESSAGES.YES_NO_OPTIONS[0]) {
        return;
    }

    // Ask if they want to keep the intro comment text
    const keepIntroText = await vscode.window.showQuickPick(
        MESSAGES.YES_NO_OPTIONS,
        { placeHolder: 'Keep the existing intro comment text?' }
    );

    if (keepIntroText === undefined) {
        return; // Cancelled
    }

    try {
        const commentManager = state.projectManager.commentManager;
        const allEvents = state.projectManager.getAllEvents();

        if (allEvents.length === 0) {
            vscode.window.showWarningMessage('DEBUG: No events in project.');
            return;
        }

        // Get the first event's ID
        const firstEventId = allEvents[0].id;

        // Collect all comments to delete (except first comment at first event)
        const commentsToDelete = [];
        for (const eventId in commentManager.comments) {
            const commentsAtEvent = commentManager.comments[eventId];
            for (let i = 0; i < commentsAtEvent.length; i++) {
                const comment = commentsAtEvent[i];
                // Keep only the first comment (position 0) at the first event
                const isFirstComment = eventId === firstEventId && i === 0;
                if (!isFirstComment) {
                    commentsToDelete.push(comment);
                }
            }
        }

        // Delete comments using projectManager.deleteComment to clean up media
        for (const comment of commentsToDelete) {
            state.projectManager.deleteComment(comment);
        }

        // Reset intro comment text if user chose not to keep it
        const firstComments = commentManager.comments[firstEventId];
        if (firstComments && firstComments.length > 0 && keepIntroText !== MESSAGES.YES_NO_OPTIONS[0]) {
            const firstComment = firstComments[0];
            firstComment.commentText = 'Enter a playback description.';
            firstComment.commentTitle = '';
            state.projectManager.db.writeCommentInfo(commentManager);
        }

        vscode.window.showInformationMessage(`DEBUG: Wiped ${commentsToDelete.length} comments (kept intro comment).`);
    } catch (err) {
        vscode.window.showErrorMessage(`DEBUG: Failed to wipe comments: ${err.message}`);
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
 * Supports: 'Name', 'Name @username', 'Name @platform:username', 'Name email@example.com'
 * @param {string} devInfoString - Developer info string
 * @returns {Object} Object with userName, email, platform, and platformUsername
 * @throws {Error} If name is missing
 */
function parseDeveloperInfo(devInfoString) {
    const trimmed = devInfoString.trim();
    const parts = trimmed.split(/\s+/);

    if (parts.length === 0 || trimmed === '') {
        throw new Error(MESSAGES.ERROR_USERNAME_REQUIRED);
    }

    const lastPart = parts[parts.length - 1];
    let userName, email = null, platform = null, platformUsername = null;

    // Check if last part is platform username (@username or @platform:username, without dot)
    if (lastPart.startsWith('@') && !lastPart.includes('.')) {
        const platformPart = lastPart.substring(1); // Remove @

        // Check for platform:username format (e.g., @gitlab:username)
        if (platformPart.includes(':')) {
            const [platformName, username] = platformPart.split(':');
            platform = platformName;
            platformUsername = username;
        } else {
            // Default to github
            platform = 'github';
            platformUsername = platformPart;
        }

        parts.pop();
        userName = parts.join(' ');
    }
    // Check if last part is email (contains @ and .)
    else if (lastPart.includes('@') && lastPart.includes('.')) {
        email = lastPart;
        parts.pop();
        userName = parts.join(' ');
    }
    // Otherwise entire input is username
    else {
        userName = trimmed;
    }

    if (!userName) {
        throw new Error(MESSAGES.ERROR_USERNAME_REQUIRED);
    }

    return { userName, email, platform, platformUsername };
}

/**
 * Extracts username from formatted developer string
 * Handles: "Name <email>", "Name (@github)", "Name"
 * @param {string} selection - Formatted developer string
 * @returns {string|null} Username or null if not found
 */
function extractUserNameFromSelection(selection) {
    // Check for email format: "Name <email>"
    const startOfEmail = selection.indexOf('<');
    if (startOfEmail > 0) {
        return selection.substring(0, startOfEmail - 1);
    }

    // Check for GitHub format: "Name (@github)"
    const startOfGitHub = selection.indexOf('(@');
    if (startOfGitHub > 0) {
        return selection.substring(0, startOfGitHub - 1);
    }

    // Just a name
    return selection;
}

/**
 * Formats a single developer for display in QuickPick
 * @param {Object} dev - Developer object
 * @returns {string} Formatted string
 */
function formatSingleDeveloper(dev) {
    if (dev.platformUsername) return `${dev.userName} (@${dev.platformUsername})`;
    if (dev.email) return `${dev.userName} <${dev.email}>`;
    return dev.userName;
}

/**
 * Formats developer array into display string
 * @param {Array} developers - Array of developer objects
 * @returns {string} Formatted string
 */
function formatDeveloperList(developers) {
    return developers.map(dev => {
        if (dev.platformUsername) return `${dev.userName} (@${dev.platformUsername})`;
        if (dev.email) return `${dev.userName} <${dev.email}>`;
        return dev.userName;
    }).join(', ');
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