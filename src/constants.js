/**
 * Directory and Path Constants
 */
const STORYTELLER_DIR = '.storyteller';

/**
 * Server Configuration
 */
const PLAYBACK_SERVER_PORT = 53140;
const PLAYBACK_URL = `http://localhost:${PLAYBACK_SERVER_PORT}`;
const PLAYBACK_INDEX_URL = `${PLAYBACK_URL}/index.html`;
const PLAYBACK_COMMENT_URL = `${PLAYBACK_URL}/playback.html?comment=true`;

/**
 * Timing Constants (in milliseconds)
 */
const MOVE_DETECTION_WINDOW_MS = 50;
const STATUS_BAR_MESSAGE_TIMEOUT_MS = 5000;
const STARTUP_DELAY_MS = 1;
const IGNORE_FILE_DEBOUNCE_MS = 3000;

/**
 * File Names
 */
const PROJECT_ZIP_NAME = 'stProject.zip';
const PLAYBACK_ZIP_NAME = 'playbackOnly.zip';

/**
 * Documentation URLs
 */
const IGNORE_FILE_DOCS_URL = 'https://github.com/markm208/storyteller/wiki/Ignoring-files';

/**
 * Extension Configuration Keys
 */
const CONFIG_NAMESPACE = 'storyteller';
const CONFIG_OPENAI_API_KEY = 'openaiApiKey';

/**
 * Command Identifiers
 */
const COMMANDS = {
    START: 'storyteller.startStoryteller',
    STOP: 'storyteller.stopStoryteller',
    PLAYBACK_NO_COMMENT: 'storyteller.startPlaybackNoComment',
    PLAYBACK_TO_COMMENT: 'storyteller.startPlaybackToMakeAComment',
    STATE: 'storyteller.storytellerState',
    CURRENT_DEVELOPERS: 'storyteller.currentActiveDevelopers',
    CREATE_DEVELOPER: 'storyteller.createNewDeveloper',
    ADD_DEVELOPERS: 'storyteller.addDevelopersToActiveGroup',
    REMOVE_DEVELOPERS: 'storyteller.removeDevelopersFromActiveGroup',
    ZIP_PROJECT: 'storyteller.zipProject',
    ZIP_PLAYBACK: 'storyteller.zipViewablePlayback',
    PREVIEW_PERFECT: 'storyteller.previewPerfectProgrammer',
    REPLACE_PERFECT: 'storyteller.replaceWithPerfectProgrammer',
    PLAYBACK_SELECTED: 'storyteller.playbackSelectedText',
    CREATE_IGNORE_FILE: 'storyteller.createIgnoreFile',
    DELETE_FILE_HISTORY: 'storyteller.deleteFileHistory'
};

/**
 * Status Bar Configuration
 */
const STATUS_BAR = {
    ALIGNMENT: 'left',
    PRIORITY: 10,
    
    STARTING: {
        text: 'Starting Storyteller $(sync~spin)',
        tooltip: 'Starting Storyteller - please do not edit any files or dirs until this is complete',
        command: COMMANDS.STATE
    },
    READY_TO_START: {
        text: '$(circle-outline) Start Storyteller',
        tooltip: 'Start using Storyteller in this workspace',
        command: COMMANDS.START
    },
    ACTIVE: {
        text: '$(record) Start Playback',
        tooltip: 'Start a Storyteller playback in the browser',
        command: COMMANDS.PLAYBACK_NO_COMMENT
    },
    RECORDING: {
        text: '$(pulse) Storyteller Recording',
        tooltip: 'Storyteller is recording changes',
        command: COMMANDS.PLAYBACK_NO_COMMENT
    }
};

/**
 * User-Facing Messages
 */
const MESSAGES = {
    // Info messages
    OPEN_FOLDER_REQUIRED: 'You must open a folder to use Storyteller.',
    HOW_TO_START: "You can use Storyteller by selecting 'Storyteller: Start Tracking This Project' from the command palette or clicking the 'Start Storyteller' button below.",
    PLAYBACK_SERVER_STARTED: `Storyteller Playback Server at localhost:${PLAYBACK_SERVER_PORT}/playback`,
    RECONCILE_NEEDED: "There were some changes to the project when Storyteller wasn't active. In a moment you will be prompted to resolve the discrepancies.",
    RECONCILE_COMPLETE: 'Reconcile complete. Do you want to continue using Storyteller?',
    
    // Prompts
    DEVELOPER_PROMPT: "Enter developer info: 'Name' or 'Name @github-username' or 'Name email@example.com'",

    // Error messages
    ERROR_USERNAME_REQUIRED: 'A developer display name is required',
    ERROR_NO_DEVELOPER_CHOSEN: 'No developer was chosen',
    ERROR_NO_INACTIVE_DEVELOPERS: 'There are no inactive developers to add',
    ERROR_CANNOT_REMOVE_LAST_DEVELOPER: 'Cannot remove from a dev group with one developer',
    ERROR_UNSUPPORTED_PLATFORM: 'Unsupported platform',
    
    // Reconciliation options
    MODIFIED_FILES_OPTIONS: [
        'Add the changes in the files to the history of this project',
        'Ignore the changes to the files'
    ],
    UNTRACKED_FILES_OPTIONS: [
        'Add the new files/dirs to the project',
        'Delete the new files/dirs'
    ],
    MISSING_FILES_OPTIONS: [
        'Add the missing files/dirs back to the project',
        'Leave the missing files/dirs out of the project'
    ],
    CONTINUE_OPTIONS: [
        'Continue using Storyteller',
        'Stop using Storyteller'
    ],
    YES_NO_OPTIONS: ['Yes', 'No']
};

/**
 * Platform Commands for Opening Browser
 */
const BROWSER_COMMANDS = {
    darwin: 'open',
    win32: 'explorer.exe',
    linux: 'xdg-open'
};

/**
 * Zip Compression Settings
 */
const ZIP_OPTIONS = {
    streamFiles: true,
    compression: 'DEFLATE',
    compressionOptions: {
        level: 9
    }
};

module.exports = {
    STORYTELLER_DIR,
    PLAYBACK_SERVER_PORT,
    PLAYBACK_URL,
    PLAYBACK_INDEX_URL,
    PLAYBACK_COMMENT_URL,
    MOVE_DETECTION_WINDOW_MS,
    STATUS_BAR_MESSAGE_TIMEOUT_MS,
    STARTUP_DELAY_MS,
    IGNORE_FILE_DEBOUNCE_MS,
    PROJECT_ZIP_NAME,
    PLAYBACK_ZIP_NAME,
    CONFIG_NAMESPACE,
    CONFIG_OPENAI_API_KEY,
    COMMANDS,
    STATUS_BAR,
    MESSAGES,
    BROWSER_COMMANDS,
    ZIP_OPTIONS,
    IGNORE_FILE_DOCS_URL
};