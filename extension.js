const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

const { STORYTELLER_DIR, STATUS_BAR, STARTUP_DELAY_MS, CONFIG_NAMESPACE, CONFIG_OPENAI_API_KEY, IGNORE_FILE_DEBOUNCE_MS } = require('./src/constants');
const { registerCommands } = require('./src/commands');
const { initializeFileWatcher } = require('./src/file-watcher');
const { initializeClipboard, disposeClipboard } = require('./src/clipboard');
const { updateStatusBar } = require('./src/status-bar');

const ProjectManager = require('./core/project/ProjectManager');
const Reconciler = require('./core/project/Reconciler');

/**
 * Shared state accessible by all modules
 */
const state = {
    extensionContext: null,
    projectManager: null,
    reconciler: null,
    isActive: false,
    ignoreFileWatcher: null,
    ignoreFileChangeNotified: false,
    ignoreFileDebounceTimer: null
};

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    state.extensionContext = context;
    
    //register all commands
    registerCommands(context, state);

    //check if workspace has an existing Storyteller project
    if (vscode.workspace.workspaceFolders) {
        const pathToStorytellerDir = path.join(
            vscode.workspace.workspaceFolders[0].uri.fsPath, 
            STORYTELLER_DIR
        );
        
        if (fs.existsSync(pathToStorytellerDir)) {
            //existing project found
            updateStatusBar(STATUS_BAR.STARTING);
            //calling this in an async way to avoid blocking activation
            setTimeout(() => resumeExistingProject(), STARTUP_DELAY_MS);
        } else {
            //workspace open but no Storyteller project
            updateStatusBar(STATUS_BAR.READY_TO_START);
            promptAboutStoryteller(false);
        }
    } else {
        //no workspace open
        updateStatusBar(STATUS_BAR.READY_TO_START);
        promptAboutStoryteller(true);
    }
}

/**
 * Watch for changes to st-ignore.json and notify user once per session (debounced)
 */
function initializeIgnoreFileWatcher() {
    const ignoreFilePattern = new vscode.RelativePattern(
        vscode.workspace.workspaceFolders[0],
        'st-ignore.json'
    );

    const watcher = vscode.workspace.createFileSystemWatcher(
        ignoreFilePattern,
        false, // don't ignore creates
        false, // don't ignore changes
        false  // don't ignore deletes
    );

    const notifyDebounced = () => {
        //clear any existing timer
        if (state.ignoreFileDebounceTimer) {
            clearTimeout(state.ignoreFileDebounceTimer);
        }

        //start a new timer
        state.ignoreFileDebounceTimer = setTimeout(async () => {
            if (!state.ignoreFileChangeNotified) {
                state.ignoreFileChangeNotified = true;

                const selection = await vscode.window.showInformationMessage(
                    'st-ignore.json changed. Restart Storyteller to apply new ignore rules.',
                    'Remind Me Again If This File Changes',
                );

                if (selection === 'Remind Me Again If This File Changes') {
                    state.ignoreFileChangeNotified = false;
                }
            }
        }, IGNORE_FILE_DEBOUNCE_MS);
    };

    state.extensionContext.subscriptions.push(watcher.onDidCreate(notifyDebounced));
    state.extensionContext.subscriptions.push(watcher.onDidChange(notifyDebounced));
    state.extensionContext.subscriptions.push(watcher.onDidDelete(notifyDebounced));
    state.extensionContext.subscriptions.push(watcher);

    state.ignoreFileWatcher = watcher;
}

/**
 * Resume an existing Storyteller project
 */
async function resumeExistingProject() {
    try {
        state.isActive = true;
        
        const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
        const openaiApiKey = config.get(CONFIG_OPENAI_API_KEY);
        const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const extensionVersion = state.extensionContext.extension.packageJSON.version;

        //initialize project manager
        state.projectManager = new ProjectManager(
            workspacePath,
            STORYTELLER_DIR,
            extensionVersion,
            openaiApiKey
        );
        await state.projectManager.startStoryteller(false);

        //check for discrepancies
        state.reconciler = new Reconciler(state.projectManager);
        
        if (state.reconciler.areDiscrepanciesPresent()) {
            const { resolveDiscrepancies } = require('./src/reconciler-ui');
            
            vscode.window.showInformationMessage(
                "There were some changes to the project when Storyteller wasn't active. " +
                "In a moment you will be prompted to resolve the discrepancies."
            );
            
            const action = await resolveDiscrepancies(state.reconciler, state.projectManager);
            
            if (action === 'stop') {
                state.projectManager.stopStoryteller();
                state.isActive = false;
                updateStatusBar(STATUS_BAR.READY_TO_START);
                return;
            }
        }

        //start watching for changes and clipboard
        initializeFileWatcher(state.extensionContext, state);
        initializeClipboard(state.extensionContext, state);
        initializeIgnoreFileWatcher();

        //update UI
        updateStatusBar(STATUS_BAR.ACTIVE);
        showCurrentState();

    } catch (err) {
        console.error("Error resuming project:", err);
        vscode.window.showErrorMessage(`Storyteller couldn't resume the project. ${err.message}`);
        state.isActive = false;
        updateStatusBar(STATUS_BAR.READY_TO_START);
    }
}

/**
 * Start tracking a new project
 */
async function startNewProject() {
    try {
        state.isActive = true;
        
        const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
        const openaiApiKey = config.get(CONFIG_OPENAI_API_KEY);
        const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const extensionVersion = state.extensionContext.extension.packageJSON.version;

        //initialize project manager
        state.projectManager = new ProjectManager(
            workspacePath,
            STORYTELLER_DIR,
            extensionVersion,
            openaiApiKey
        );
        await state.projectManager.startStoryteller(true);

        //check for existing files to add
        state.reconciler = new Reconciler(state.projectManager);
        
        if (state.reconciler.areDiscrepanciesPresent()) {
            await state.reconciler.addExistingFilesDirs();
        }

        //start watching for changes and clipboard
        initializeFileWatcher(state.extensionContext, state);
        initializeClipboard(state.extensionContext, state);
        initializeIgnoreFileWatcher();

        //prompt for developer info
        const { createFirstDeveloper } = require('./src/commands');
        await createFirstDeveloper(state.projectManager);

        //update UI
        updateStatusBar(STATUS_BAR.ACTIVE);

    } catch (err) {
        console.error("Error starting new project:", err);
        vscode.window.showErrorMessage(`Storyteller couldn't start tracking. ${err.message}`);
        state.isActive = false;
        updateStatusBar(STATUS_BAR.READY_TO_START);
    }
}

/**
 * Stop tracking the current project
 */
function stopTracking() {
    if (state.isActive && state.projectManager) {
        state.projectManager.stopStoryteller();
    }

    //clean up clipboard overrides
    disposeClipboard();

    //clean up ignore file watcher
    if (state.ignoreFileWatcher) {
        state.ignoreFileWatcher.dispose();
        state.ignoreFileWatcher = null;
    }
    if (state.ignoreFileDebounceTimer) {
        clearTimeout(state.ignoreFileDebounceTimer);
        state.ignoreFileDebounceTimer = null;
    }
    state.ignoreFileChangeNotified = false;

    state.isActive = false;
    state.projectManager = null;
    state.reconciler = null;

    updateStatusBar(STATUS_BAR.READY_TO_START);
    promptAboutStoryteller(false);
}

/**
 * Show current Storyteller state
 */
function showCurrentState() {
    if (!state.isActive || !state.projectManager) {
        promptAboutStoryteller(true);
        return;
    }

    try {
        const activeDevs = state.projectManager.getActiveDevelopers();
        const devStrings = activeDevs.map(dev => {
            if (dev.platformUsername) return `${dev.userName} (@${dev.platformUsername})`;
            if (dev.email) return `${dev.userName} <${dev.email}>`;
            return dev.userName;
        });
        const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;

        vscode.window.showInformationMessage(
            `Storyteller is active. Active developers: ${devStrings.join(', ')}`
        );
    } catch (err) {
        console.error('Error in showCurrentState:', err);
    }
}

/**
 * Prompt user about how to use Storyteller
 */
function promptAboutStoryteller(requiresOpenFolder) {
    let message = "You can use Storyteller by selecting 'Storyteller: Start Tracking This Project' " +
                  "from the command palette or clicking the 'Start Storyteller' button below.";
    
    if (requiresOpenFolder) {
        message = 'You must open a folder to use Storyteller. ' + message;
    }
    
    vscode.window.showInformationMessage(message);
}

/**
 * Called when the extension is deactivated
 */
function deactivate() {
    stopTracking();
}

module.exports = {
    activate,
    deactivate,
    //exported for use by command handlers
    state,
    startNewProject,
    stopTracking,
    showCurrentState,
    promptAboutStoryteller
};