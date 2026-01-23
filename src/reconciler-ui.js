const vscode = require('vscode');

const { MESSAGES } = require('./constants');

/**
 * Resolves all file system discrepancies through user prompts
 * @param {Object} reconciler - The Reconciler instance
 * @param {Object} projectManager - The ProjectManager instance
 * @returns {string} 'continue' or 'stop'
 */
async function resolveDiscrepancies(reconciler, projectManager) {
    await resolveModified(reconciler, projectManager);
    await resolveUntracked(reconciler, projectManager);
    await resolveMissing(reconciler, projectManager);
    return await promptContinueOrStop();
}

/*****************************************************************************
 * Modified Files
 *****************************************************************************/

/**
 * Handles files that were modified outside of Storyteller
 */
async function resolveModified(reconciler, projectManager) {
    const modifiedFileIds = reconciler.discrepancies.modifiedFileIds;
    const numModified = modifiedFileIds.length;
    
    if (numModified === 0) return;
    
    const selected = await vscode.window.showQuickPick(MESSAGES.MODIFIED_FILES_OPTIONS, {
        placeHolder: `There are ${numModified} modified files. What would you like to do with them?`
    });
    
    // Default to accepting changes if no selection or first option
    const acceptChanges = !selected || selected === MESSAGES.MODIFIED_FILES_OPTIONS[0];
    
    if (acceptChanges) {
        await acceptModifiedFiles(reconciler, modifiedFileIds);
        showModifiedFilesAcceptedMessage(projectManager, modifiedFileIds);
    } else {
        await revertModifiedFiles(reconciler, modifiedFileIds);
        showModifiedFilesRevertedMessage(projectManager, modifiedFileIds);
    }
}

/**
 * Accepts changes made to modified files
 */
async function acceptModifiedFiles(reconciler, fileIds) {
    for (const fileId of fileIds) {
        await reconciler.resolveFileChanges(fileId, 'accept-changes');
    }
}

/**
 * Reverts modified files to their Storyteller state
 */
async function revertModifiedFiles(reconciler, fileIds) {
    for (const fileId of fileIds) {
        await reconciler.resolveFileChanges(fileId, 'recreate');
    }
}

/**
 * Shows message for accepted modified files
 */
function showModifiedFilesAcceptedMessage(projectManager, fileIds) {
    const filePaths = fileIds.map(
        fileId => projectManager.fileSystemManager.allFiles[fileId].currentPath
    );
    vscode.window.showInformationMessage(
        `Accepted changes in ${fileIds.length} files. Files: ${filePaths.join(', ')}`
    );
}

/**
 * Shows message for reverted modified files
 */
function showModifiedFilesRevertedMessage(projectManager, fileIds) {
    const filePaths = fileIds.map(
        fileId => projectManager.fileSystemManager.allFiles[fileId].currentPath
    );
    vscode.window.showInformationMessage(
        `Abandoned changes in ${fileIds.length} files. Files: ${filePaths.join(', ')}`
    );
}

/*****************************************************************************
 * Untracked Files and Directories
 *****************************************************************************/

/**
 * Handles files and directories not being tracked by Storyteller
 */
async function resolveUntracked(reconciler, projectManager) {
    const untrackedDirs = reconciler.discrepancies.fullDirPathsPresentButNotTracked;
    const untrackedFiles = reconciler.discrepancies.fullFilePathsPresentButNotTracked;
    const numUntracked = untrackedDirs.length + untrackedFiles.length;
    
    if (numUntracked === 0) return;
    
    const selected = await vscode.window.showQuickPick(MESSAGES.UNTRACKED_FILES_OPTIONS, {
        placeHolder: `There are ${numUntracked} untracked files and dirs. What would you like to do with them?`
    });
    
    // Default to adding if no selection or first option
    const addToProject = !selected || selected === MESSAGES.UNTRACKED_FILES_OPTIONS[0];
    
    if (addToProject) {
        await addUntrackedToProject(reconciler, untrackedDirs, untrackedFiles);
        showUntrackedAddedMessage(untrackedDirs, untrackedFiles);
    } else {
        await deleteUntrackedFromDisk(reconciler, untrackedDirs, untrackedFiles);
        showUntrackedDeletedMessage(untrackedDirs, untrackedFiles);
    }
}

/**
 * Adds untracked files and directories to the project
 */
async function addUntrackedToProject(reconciler, dirPaths, filePaths) {
    // Add directories first
    for (const dirPath of dirPaths) {
        await reconciler.resolveNewDirectory(dirPath, 'create');
    }
    
    // Then add files
    for (const filePath of filePaths) {
        await reconciler.resolveNewFile(filePath, 'create');
    }
}

/**
 * Deletes untracked files and directories from disk
 */
async function deleteUntrackedFromDisk(reconciler, dirPaths, filePaths) {
    // Delete files first
    for (const filePath of filePaths) {
        await reconciler.resolveNewFile(filePath, 'delete');
    }
    
    // Delete directories from bottom up
    const reversedDirs = [...dirPaths].reverse();
    for (const dirPath of reversedDirs) {
        await reconciler.resolveNewDirectory(dirPath, 'delete');
    }
}

/**
 * Shows message for added untracked items
 */
function showUntrackedAddedMessage(dirPaths, filePaths) {
    const total = dirPaths.length + filePaths.length;
    vscode.window.showInformationMessage(
        `${total} files and dirs are now being tracked. ` +
        `Directories: ${dirPaths.join(', ') || 'none'} ` +
        `Files: ${filePaths.join(', ') || 'none'}`
    );
}

/**
 * Shows message for deleted untracked items
 */
function showUntrackedDeletedMessage(dirPaths, filePaths) {
    const total = dirPaths.length + filePaths.length;
    vscode.window.showInformationMessage(
        `${total} files and dirs were deleted. ` +
        `Directories: ${dirPaths.join(', ') || 'none'} ` +
        `Files: ${filePaths.join(', ') || 'none'}`
    );
}

/*****************************************************************************
 * Missing Files and Directories
 *****************************************************************************/

/**
 * Handles files and directories that are tracked but missing from disk
 */
async function resolveMissing(reconciler, projectManager) {
    const missingDirIds = reconciler.discrepancies.missingDirectoryIds;
    const missingFileIds = reconciler.discrepancies.missingFileIds;
    const numMissing = missingDirIds.length + missingFileIds.length;
    
    if (numMissing === 0) return;
    
    const selected = await vscode.window.showQuickPick(MESSAGES.MISSING_FILES_OPTIONS, {
        placeHolder: `There are ${numMissing} missing files and directories. What would you like to do with them?`
    });
    
    // Default to restoring if no selection or first option
    const restore = !selected || selected === MESSAGES.MISSING_FILES_OPTIONS[0];
    
    if (restore) {
        await restoreMissingItems(reconciler, missingDirIds, missingFileIds);
        showMissingRestoredMessage(projectManager, missingDirIds, missingFileIds);
    } else {
        await acceptMissingDeletions(reconciler, missingDirIds, missingFileIds);
        showMissingAcceptedMessage(projectManager, missingDirIds, missingFileIds);
    }
}

/**
 * Restores missing files and directories to disk
 */
async function restoreMissingItems(reconciler, dirIds, fileIds) {
    // Restore directories first
    for (const dirId of dirIds) {
        await reconciler.resolveDeletedDirectory(dirId, 'recreate');
    }
    
    // Then restore files
    for (const fileId of fileIds) {
        await reconciler.resolveDeletedFile(fileId, 'recreate');
    }
}

/**
 * Accepts that missing items should stay deleted
 */
async function acceptMissingDeletions(reconciler, dirIds, fileIds) {
    // Accept file deletions first
    for (const fileId of fileIds) {
        await reconciler.resolveDeletedFile(fileId, 'accept-delete');
    }
    
    // Then accept directory deletions
    for (const dirId of dirIds) {
        await reconciler.resolveDeletedDirectory(dirId, 'accept-delete');
    }
}

/**
 * Shows message for restored missing items
 */
function showMissingRestoredMessage(projectManager, dirIds, fileIds) {
    const total = dirIds.length + fileIds.length;
    const dirPaths = dirIds.map(
        dirId => projectManager.fileSystemManager.allDirs[dirId].currentPath
    );
    const filePaths = fileIds.map(
        fileId => projectManager.fileSystemManager.allFiles[fileId].currentPath
    );
    
    vscode.window.showInformationMessage(
        `${total} files and dirs have been restored. ` +
        `Directories: ${dirPaths.join(', ') || 'none'} ` +
        `Files: ${filePaths.join(', ') || 'none'}`
    );
}

/**
 * Shows message for accepted missing item deletions
 */
function showMissingAcceptedMessage(projectManager, dirIds, fileIds) {
    const total = dirIds.length + fileIds.length;
    const dirPaths = dirIds.map(
        dirId => projectManager.fileSystemManager.allDirs[dirId].currentPath
    );
    const filePaths = fileIds.map(
        fileId => projectManager.fileSystemManager.allFiles[fileId].currentPath
    );
    
    vscode.window.showInformationMessage(
        `${total} files and dirs will remain deleted. ` +
        `Directories: ${dirPaths.join(', ') || 'none'} ` +
        `Files: ${filePaths.join(', ') || 'none'}`
    );
}

/*****************************************************************************
 * Completion
 *****************************************************************************/

/**
 * Prompts user to continue or stop using Storyteller
 * @returns {string} 'continue' or 'stop'
 */
async function promptContinueOrStop() {
    const selected = await vscode.window.showQuickPick(MESSAGES.CONTINUE_OPTIONS, {
        placeHolder: MESSAGES.RECONCILE_COMPLETE
    });
    
    // Default to continue if no selection or first option
    if (!selected || selected === MESSAGES.CONTINUE_OPTIONS[0]) {
        return 'continue';
    }
    
    return 'stop';
}

module.exports = {
    resolveDiscrepancies
};