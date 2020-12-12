/*
 * Insert the new character into the Ace editor at the correct position.
 */
function insertEvent(nextEvent) {
    //If the character is not a '\n' (NEWLINE), \r\n (CR-LF) or '\t' (TAB)
    if(nextEvent.character.length === 1) {
        //get the Ace editor that the insert will go into and insert at the row/column of the event
        playbackData.editors[nextEvent.fileId].getSession().insert({row: nextEvent.lineNumber -1,column: nextEvent.column -1}, nextEvent.character);
    } else if (nextEvent.character === 'NEWLINE' || nextEvent.character === 'CR-LF') { //If the character is a '\n' or '\r\n', insert a new line 
        //get the Ace editor the new line will go into and insert at the row/column of the event
        playbackData.editors[nextEvent.fileId].getSession().insert({row: nextEvent.lineNumber -1,column: nextEvent.column -1}, '\n');
    } else if (nextEvent.character === 'TAB') {//If the character is a '\t', insert a tab 
        //get the Ace editor the new line will go into and insert at the row/column of the event
        playbackData.editors[nextEvent.fileId].getSession().insert({row: nextEvent.lineNumber -1,column: nextEvent.column -1}, '\t');
    }
}
/*
 * Insert in reverse deletes the character in the Ace editor at the correct position.
 */
function insertEventReverse(nextEvent) {
    //delete the text
    deleteEvent(nextEvent);
}

/*
 * Deletes the character from the Ace editor at the correct position.
 */
function deleteEvent(nextEvent) {
    if (nextEvent.character === 'NEWLINE' || nextEvent.character === 'CR-LF') {
        //create a new AceRange from the end of the starting line to the beginning of the next line
        //remove characters in that range from the Ace editor
        playbackData.editors[nextEvent.fileId].getSession().remove(new AceRange(nextEvent.lineNumber-1, nextEvent.column-1,nextEvent.lineNumber, 0));
    } else if (nextEvent.character.length === 1) {
        //create a new AceRange from the index of the character to the index + 1
        //remove takes a range with an inclusive start and non-inclusive end
        //remove that range from the Ace editor
        playbackData.editors[nextEvent.fileId].getSession().remove(new AceRange(nextEvent.lineNumber-1, nextEvent.column-1,nextEvent.lineNumber-1, nextEvent.column));
    }
}
/*
 * Delete in reverse inserts a character at the correct position.
 */
function deleteEventReverse(nextEvent) {
    //insert the text
    insertEvent(nextEvent);
}

/*
 * When a create file event is encountered while stepping forward create the 
 * editor and the tab and show the file in the file system view.
 */
function createFileEvent(nextEvent) {
    //create the editor and tab
    createEditor(nextEvent.fileId, nextEvent.filePath);
    
    //update the file system UI
    addFileToPlaybackViewOfFileSystem(nextEvent.filePath, nextEvent.fileId, nextEvent.parentDirectoryId);
}
/*
 * When a create file event is encountered in reverse then the file must be 
 * completely empty and can be removed.
 */
function createFileEventReverse(nextEvent) {
    //destroy the Ace editor and delete the editor and the tab
    destroyAceEditor(nextEvent.fileId);
    deleteEditor(nextEvent.fileId);

    //delete the fs view
    deleteFileFromPlaybackViewOfFileSystem(nextEvent.fileId);
}

/*
 * When a delete file event is encountered while stepping forward hide the
 * editor in its final state instead of deleting it. If the user moves backwards
 * the file can be shown in its final state.
 */
function deleteFileEvent(nextEvent) {
    //hide the editor and tab before marking the file as deleted
    hideEditor(nextEvent.fileId);

    //hide the fs view
    hideFileFromPlaybackViewOfFileSystem(nextEvent.fileId, nextEvent.id);
}
/*
 * When a delete file event is encountered while stepping backward make 
 * the previously hidden element visible.
 */
function deleteFileEventReverse(nextEvent) {
    //make the fs view visible again
    showFileFromPlaybackViewOfFileSystem(nextEvent.id);

    //make the file and tab visible again after marking as NOT deleted
    showEditor(nextEvent.fileId);
}

/*
 * When a move file event is encountered while stepping forwards update the UI.
 */
function moveFileEvent(nextEvent) {
    //update the tabs
    updateFileTab(nextEvent.fileId, nextEvent.newFilePath);

    //update the file system UI
    moveFileInPlaybackViewOfFileSystem(nextEvent.newFilePath, nextEvent.fileId, nextEvent.newParentDirectoryId);
}
/*
 * When a move file event is encountered while stepping backwards recreate
 * an event with the old and new values reversed and use the other function.
 */
function moveFileEventReverse(nextEvent) {
    //create a copy of the event with the new and old reversed
    const reverseMoveFileEvent = {};
    Object.assign(reverseMoveFileEvent, nextEvent);
    reverseMoveFileEvent['newParentDirectoryId'] = nextEvent.oldParentDirectoryId;
    reverseMoveFileEvent['oldParentDirectoryId'] = nextEvent.newParentDirectoryId;
    reverseMoveFileEvent['newFilePath'] = nextEvent.oldFilePath;
    reverseMoveFileEvent['oldFilePath'] = nextEvent.newFilePath;
    
    //use the forward function
    moveFileEvent(reverseMoveFileEvent);
}

/*
 * When a rename file event is encountered while stepping forwards update the UI.
 */
function renameFileEvent(nextEvent) {
    //update the tabs
    updateFileTab(nextEvent.fileId, nextEvent.newFilePath);

    //update the file system UI (reuse the move func since it does the same as rename)
    moveFileInPlaybackViewOfFileSystem(nextEvent.newFilePath, nextEvent.fileId, nextEvent.parentDirectoryId);
}
/*
 * When a rename file event is encountered while stepping backwards recreate
 * an event with the old and new values reversed and use the other function.
 */
function renameFileEventReverse(nextEvent) {
    //create a copy of the event with the new and old reversed
    const reverseRenameFileEvent = {};
    Object.assign(reverseRenameFileEvent, nextEvent);
    reverseRenameFileEvent['newFilePath'] = nextEvent.oldFilePath;
    reverseRenameFileEvent['oldFilePath'] = nextEvent.newFilePath;
    
    //use the forward function
    renameFileEvent(reverseRenameFileEvent);
}

/*
 * When a create directory event is encountered while stepping forwards update 
 * the file system view.
 */
function createDirectoryEvent(nextEvent) {
    //add a directory to the file system UI
    addDirectoryToPlaybackViewOfFileSystem(nextEvent.directoryPath, nextEvent.directoryId, nextEvent.parentDirectoryId);
}
/*
 * When a create directory event is encountered while stepping backwards it is
 * empty and can be removed in the UI.
 */
function createDirectoryEventReverse(nextEvent) {
    //delete the dir from fs view
    deleteDirectoryFromPlaybackViewOfFileSystem(nextEvent.directoryId);
}

/*
 * When a delete directory event is encountered while stepping forward hide the
 * directory and the tabs it instead of deleting. If the user moves backwards
 * the directory can be shown in its final state.
 */
function deleteDirectoryEvent(nextEvent) {
    //hide all of the file tabs in the deleted directory before marking them as deleted
    const allFilesInDir = getFilesFromADirectory(nextEvent.directoryId);
    for(let i = 0;i < allFilesInDir.length;i++) {
        hideFileTab(allFilesInDir[i].fileId);
    }

    //hide the file system UI
    hideDirectoryFromPlaybackViewOfFileSystem(nextEvent.directoryId, nextEvent.id);
}
/*
 * When a delete directory event is encountered while stepping backwards show
 * the tabs and file system view that were hidden while going forward.
 */
function deleteDirectoryEventReverse(nextEvent) {
    //show the file system view
    showDirectoryFromPlaybackViewOfFileSystem(nextEvent.id);

    //show all of the tabs in the deleted directory after they have been marked as NOT deleted
    const allFilesInDir = getFilesFromADirectory(nextEvent.directoryId);
    for(let i = 0;i < allFilesInDir.length;i++) {
        showFileTab(allFilesInDir[i].fileId);
    }
}

/*
 * When a move directory event is encountered while stepping forwards update the UI.
 */
function moveDirectoryEvent(nextEvent) {
    //update the file system UI
    moveDirectoryInPlaybackViewOfFileSystem(nextEvent.newDirectoryPath, nextEvent.directoryId, nextEvent.newParentDirectoryId);
    
    //update the tabs in the directory
    updateFileTabs(nextEvent.directoryId);
}
/*
 * When a move directory event is encountered while stepping backwards create
 * a new event with the new and old reversed and use the other function.
 */
function moveDirectoryEventReverse(nextEvent) {
    //create a copy of the event with the new and old reversed
    const reverseMoveDirectoryEvent = {};
    Object.assign(reverseMoveDirectoryEvent, nextEvent);
    reverseMoveDirectoryEvent['newParentDirectoryId'] = nextEvent.oldParentDirectoryId;
    reverseMoveDirectoryEvent['oldParentDirectoryId'] = nextEvent.newParentDirectoryId;
    reverseMoveDirectoryEvent['newDirectoryPath'] = nextEvent.oldDirectoryPath;
    reverseMoveDirectoryEvent['oldDirectoryPath'] = nextEvent.newDirectoryPath;
    
    //use the forward function
    moveDirectoryEvent(reverseMoveDirectoryEvent);
}

/*
 * When a rename directory event is encountered while stepping forwards update the UI.
 */
function renameDirectoryEvent(nextEvent) {
    //update the file system UI
    renameDirectoryInPlaybackViewOfFileSystem(nextEvent.newDirectoryPath, nextEvent.directoryId, nextEvent.parentDirectoryId);

    //update the tabs in the directory
    updateFileTabs(nextEvent.directoryId);
}
/*
 * When a rename directory event is encountered while stepping backwards create
 * a new event with the new and old reversed and use the other function.
 */
function renameDirectoryEventReverse(nextEvent) {
    //create a copy of the event with the new and old reversed
    const reverseRenameDirectoryEvent = {};
    Object.assign(reverseRenameDirectoryEvent, nextEvent);
    reverseRenameDirectoryEvent['newDirectoryPath'] = nextEvent.oldDirectoryPath;
    reverseRenameDirectoryEvent['oldDirectoryPath'] = nextEvent.newDirectoryPath;
    
    renameDirectoryEvent(reverseRenameDirectoryEvent);
}
