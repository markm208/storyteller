const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');

const { STORYTELLER_DIR, PROJECT_ZIP_NAME, PLAYBACK_ZIP_NAME, ZIP_OPTIONS } = require('./constants');

/**
 * Creates a zip file of the entire Storyteller project
 * @param {Object} state - Shared extension state
 */
async function zipProject(state) {
    if (!state.isActive) return;
    
    const destinationFolder = await promptForDestination('Save ' + PROJECT_ZIP_NAME);
    if (!destinationFolder) return;
    
    const projectDirPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const zipPath = path.join(destinationFolder, PROJECT_ZIP_NAME);
    
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Creating Storyteller project zip',
        cancellable: true
    }, async (progress, token) => {
        try {
            progress.report({ message: 'Scanning files...' });
            
            if (token.isCancellationRequested) return;
            
            const zip = new JSZip();
            
            progress.report({ message: 'Adding files to archive...' });
            
            zipProjectHelper(projectDirPath, zip, state.projectManager, token);
            
            if (token.isCancellationRequested) return;
            
            progress.report({ message: 'Compressing...' });
            
            await writeZipToDisk(zip, zipPath);
            
            vscode.window.showInformationMessage(`Created ${PROJECT_ZIP_NAME} in ${destinationFolder}. You can share this file with others.`);
        } catch (err) {
            console.error('Error creating project zip:', err);
            vscode.window.showErrorMessage(`Failed to create zip: ${err.message}`);
        }
    });
}

/**
 * Creates a zip file containing only the playback viewer files
 * @param {Object} state - Shared extension state
 */
async function zipViewablePlayback(state) {
    if (!state.isActive) return;
    
    const destinationFolder = await promptForDestination('Save ' + PLAYBACK_ZIP_NAME);
    if (!destinationFolder) return;
    
    const projectDirPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const zipPath = path.join(destinationFolder, PLAYBACK_ZIP_NAME);
    
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Creating playback zip',
        cancellable: true
    }, async (progress, token) => {
        try {
            progress.report({ message: 'Preparing playback files...' });
            
            if (token.isCancellationRequested) return;
            
            const zip = new JSZip();
            
            zipPlaybackHelper(projectDirPath, zip, state.projectManager, token);
            
            if (token.isCancellationRequested) return;
            
            progress.report({ message: 'Compressing...' });
            
            await writeZipToDisk(zip, zipPath);
            
            vscode.window.showInformationMessage(
                `Created ${PLAYBACK_ZIP_NAME} in ${destinationFolder}. You can share this file with others.`
            );
        } catch (err) {
            console.error('Error creating playback zip:', err);
            vscode.window.showErrorMessage(`Failed to create zip: ${err.message}`);
        }
    });
}

/*****************************************************************************
 * Project Zip Helpers
 *****************************************************************************/

/**
 * Recursively adds project files and directories to the zip
 * @param {string} dirPath - Directory to process
 * @param {JSZip} zip - JSZip instance
 * @param {Object} projectManager - ProjectManager instance
 * @param {Object} token - Cancellation token
 */
function zipProjectHelper(dirPath, zip, projectManager, token) {
    if (token && token.isCancellationRequested) return;
    
    const entries = fs.readdirSync(dirPath);
    
    for (const entry of entries) {
        if (token && token.isCancellationRequested) return;
        
        const fullPath = path.join(dirPath, entry);
        const stats = fs.statSync(fullPath);
        
        if (stats.isFile()) {
            addFileToZip(fullPath, zip, projectManager);
        } else if (stats.isDirectory()) {
            addDirectoryToZip(fullPath, zip, projectManager);
            zipProjectHelper(fullPath, zip, projectManager, token);
        }
    }
}

/**
 * Adds a file to the zip with normalized path
 */
function addFileToZip(fullPath, zip, projectManager) {
    let normalizedPath = projectManager.pathHelper.normalizeFilePath(fullPath);
    // JSZip doesn't like leading slashes
    normalizedPath = normalizedPath.substring(1);
    
    const contents = fs.readFileSync(fullPath);
    zip.file(normalizedPath, contents);
}

/**
 * Adds a directory to the zip with normalized path
 */
function addDirectoryToZip(fullPath, zip, projectManager) {
    let normalizedPath = projectManager.pathHelper.normalizeDirPath(fullPath);
    // JSZip doesn't like leading slashes
    normalizedPath = normalizedPath.substring(1);
    
    zip.folder(normalizedPath);
}

/*****************************************************************************
 * Playback Zip Helpers
 *****************************************************************************/

/**
 * Adds all files needed for standalone playback viewing
 * @param {string} projectDirPath - Project directory path
 * @param {JSZip} zip - JSZip instance
 * @param {Object} projectManager - ProjectManager instance
 * @param {Object} token - Cancellation token
 */
function zipPlaybackHelper(projectDirPath, zip, projectManager, token) {
    if (token && token.isCancellationRequested) return;
    
    // Add the public directory (viewer files)
    const publicDirPath = path.join(__dirname, '..', 'core', 'public');
    zipPublicHelper(publicDirPath, zip, token);
    
    if (token && token.isCancellationRequested) return;
    
    // Add the playback data
    const loadPlaybackDataString = projectManager.getPlaybackData(false);
    zip.file('js/loadPlayback.js', loadPlaybackDataString);
    
    // Add media files
    addMediaToZip(projectDirPath, 'images', zip);
    addMediaToZip(projectDirPath, 'videos', zip);
    addMediaToZip(projectDirPath, 'audios', zip);
}

/**
 * Adds the public directory files to the zip
 * @param {string} dirPath - Directory to process
 * @param {JSZip} zip - JSZip instance
 * @param {Object} token - Cancellation token
 */
function zipPublicHelper(dirPath, zip, token) {
    if (token && token.isCancellationRequested) return;
    
    const publicDirPath = path.join(__dirname, '..', 'core', 'public');
    const entries = fs.readdirSync(dirPath);
    
    for (const entry of entries) {
        if (token && token.isCancellationRequested) return;
        
        const fullPath = path.join(dirPath, entry);
        const relativePath = fullPath.substring(publicDirPath.length + 1).split('\\').join('/');
        const stats = fs.statSync(fullPath);
        
        if (stats.isFile()) {
            let contents = fs.readFileSync(fullPath);
            
            // Fix script paths for file system viewing
            if (fullPath.endsWith('index.html')) {
                const html = contents.toString();
                contents = html.replace(/<script src="\/js\//g, '<script src="js/');
            }
            
            zip.file(relativePath, contents);
        } else if (stats.isDirectory()) {
            zip.folder(relativePath);
            zipPublicHelper(fullPath, zip, token);
        }
    }
}

/**
 * Adds media files from comments to the zip
 * @param {string} projectDirPath - Project directory path
 * @param {string} mediaType - Type of media ('images', 'videos', 'audios')
 * @param {JSZip} zip - JSZip instance
 */
function addMediaToZip(projectDirPath, mediaType, zip) {
    const mediaPath = path.join(
        projectDirPath, 
        STORYTELLER_DIR, 
        'comments', 
        'media', 
        mediaType
    );
    
    // Skip if directory doesn't exist
    if (!fs.existsSync(mediaPath)) return;
    
    const files = fs.readdirSync(mediaPath);
    
    for (const fileName of files) {
        const fullPath = path.join(mediaPath, fileName);
        const contents = fs.readFileSync(fullPath);
        zip.file(`media/${mediaType}/${fileName}`, contents);
    }
}

/*****************************************************************************
 * Utility Functions
 *****************************************************************************/

/**
 * Prompts user to select a destination folder
 * @param {string} buttonLabel - Label for the save button
 * @returns {string|null} Selected folder path or null if cancelled
 */
async function promptForDestination(buttonLabel) {
    const folders = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: vscode.workspace.workspaceFolders[0].uri,
        openLabel: buttonLabel,
        title: 'Choose a folder to store the zip file'
    });
    
    if (!folders || folders.length === 0) {
        return null;
    }
    
    return folders[0].fsPath;
}

/**
 * Writes the zip to disk using async API
 * @param {JSZip} zip - JSZip instance
 * @param {string} zipPath - Destination path
 */
async function writeZipToDisk(zip, zipPath) {
    const buffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: ZIP_OPTIONS.compression,
        compressionOptions: ZIP_OPTIONS.compressionOptions
    });
    
    fs.writeFileSync(zipPath, buffer);
}

module.exports = {
    zipProject,
    zipViewablePlayback
};