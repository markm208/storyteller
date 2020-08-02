/*
 * Gives the user a link to a zip file to download. The history of the code 
 * is not included in the zip (there is no hidden /.storyteller directory).
 */
function zipAndDownloadCodeOnly() {
    //create a new zip
    const zip = new JSZip();
    //add only the code to the zip
    addCodeToZip(zip);
    //cause the zip to be downloaded
    downloadZip(zip);
}
/*
 * Adds the code in the Ace editors to a zip file.
 */
function addCodeToZip(zip) {
    //get the UL at the top of the fs view
    const playbackViewOfFileSystem = document.getElementById('playbackViewOfFileSystem');
    
    //the root dir be the one child of the UL, playbackViewOfFileSystem
    if(playbackViewOfFileSystem.children.length === 1) {
        //get the root dir LI
        const dirLI = playbackViewOfFileSystem.children[0];
        //get the dir id
        const dirId = dirLI.getAttribute('data-directoryId');

        //get all the active directories in the root (recursively)
        const allDirs = getDirectoriesFromADirectory(dirId);

        //create an entry in the zip for each dir (including empty dirs)
        for(let i = 0;i < allDirs.length;i++) {
            //get the dir path (JSZip doesn't like the leading / in paths so remove it)
            const dir = allDirs[i];
            const dirPath = dir.directoryPath.substr(1);
            //add an entry for the dir (this is to preserve empty dirs)
            zip.folder(dirPath);
        }
        
        //get all the active files in the root (recursively)
        const allFiles = getFilesFromADirectory(dirId);

        //retrieve the text from the files and add an entry in the zip
        for(let i = 0;i < allFiles.length;i++) {
            //get the file path (JSZip doesn't like the leading / in paths so remove it)
            const file = allFiles[i];
            const editor = playbackData.editors[file.fileId];
            
            //get the file path and the text in the editor and add the file to the zip
            const fileContents = editor.getSession().getValue();
            const filePath = file.filePath.substr(1);
            zip.file(filePath, fileContents);
        }
    }
}
/*
 * Creates a zip file and a toast to display a download link.
 */
async function downloadZip(zip) {
    //set the status of creating the zip message
    const zipStatus = document.getElementById('zipStatus');
    zipStatus.innerHTML = 'building zip file, this may take a while...';

    //timing for debug purposes
    const t0 = performance.now();
    
    //create a blob representation of the zip
    const blobbedZip = await zip.generateAsync({
        type:'blob',
        compression: 'DEFLATE',
        compressionOptions: {
            level: 9
        }
    });
    const t1 = performance.now();
    console.log(`zip took: ${t1-t0} ms`);
    
    //clear out the zip status message
    zipStatus.innerHTML = '';

    //create a filename
    let zipFileName = 'st.zip';

    //create a downloadable blob
    const blob = new Blob([blobbedZip], {type: 'application/zip'});
    //create a url that holds the zip
    const url = window.URL.createObjectURL(blob);

    //create a link the user can click to download the code
    const zipLink = document.getElementById('zipLink');
    zipLink.innerHTML = zipFileName;
    zipLink.href = url;
    zipLink.download = zipFileName;

    //create a toast to show the zip link download
    const zipLinkToast = document.getElementById('zipLinkToast');
    zipLinkToast.removeAttribute('style');
    zipLinkToast.style.position = 'absolute';
    zipLinkToast.style.zIndex = '100';

    //sets the position of the toast to be under the download button
    const codeDownloadButtonRectangle = document.getElementById('codeDownloadMenuButton').getBoundingClientRect();
    zipLinkToast.style.top = codeDownloadButtonRectangle.y + codeDownloadButtonRectangle.height + 5 +'px';
    zipLinkToast.style.left = codeDownloadButtonRectangle.left + 'px';
    zipLinkToast.style.width = codeDownloadButtonRectangle.width + 'px';

    //set a handler when the toast is closed
    $('#zipLinkToast').on('hidden.bs.toast', function () {
        //give back the resources for the zip in memory
        window.URL.revokeObjectURL(url);
    });

    //show the toast
    $('#zipLinkToast').toast('show');
}
/*
 * Recreates a storyteller project (with or without comments) and gives the 
 * user a link to a zip file to download.
 */
async function zipAndDownloadCodeWithHistory(withComments) {
    //create a new zip
    const zip = new JSZip();
    //add only the code to the zip
    addCodeToZip(zip);
    //add the data required to make this a storyeller project
    await addStorytellerProjectHistoryToZip(zip, withComments);
    //cause the zip to be downloaded
    downloadZip(zip);
}
/*
 * Adds the required data to make this zip a true storyteller project that can 
 * added to. 
 */
async function addStorytellerProjectHistoryToZip(zip, withComments) {
    //add the required directories for a storyteller project
    zip.folder('.storyteller');
    zip.folder('.storyteller/comments');
    zip.folder('.storyteller/comments/media');
    zip.folder('.storyteller/comments/media/.tmp');
    zip.folder('.storyteller/comments/media/audios');
    zip.folder('.storyteller/comments/media/images');
    zip.folder('.storyteller/comments/media/videos');
    zip.folder('.storyteller/devs');
    zip.folder('.storyteller/events');
    zip.folder('.storyteller/events/intermediate');
    zip.folder('.storyteller/fs');
    zip.folder('.storyteller/project');

    //data collected from the events up to the pause point
    const stData = {
        comments: {},
        commentImageURLs: {},
        commentVideoURLs: {},
        commentAudioURLs: {},
        devGroups: {},
        devs: {},
        latestDevGroupId: '',
        events: [],
        allFiles: {},
        textFileContents: {},
        allDirs: {},
        pathToFileIdMap: {},
        pathToDirIdMap: {},
        project: {
            title: '',
            branchId: ''
        }
    };

    //move through the events up to the pause point and collect only the data
    //that has been used so far
    collectDataAboutEvents(stData);

    //get the comments up to this point in the playback and store in the comments dir
    await createCommentsFile(stData, zip, withComments);

    //get the devs up to this point in the playback and store in the devs dir
    createDevsFile(stData, zip);
    
    //get the fs data up to this point in the playback and store in the fs dir
    createFSFile(stData, zip);

    //get the events up to this point in the playback and store in the events dir
    createEventsFile(stData, zip);
    
    //get the project data up to this point in the playback and store in the project dir
    createProjectFile(stData, zip);
}
/*
 * March through the events from the beginning until the pause point and collect
 * information from the events. 
 */
function collectDataAboutEvents(stData) {
    //store the description comment block
    storeCommentData(playbackData.comments['ev--1'], 'ev--1', stData);

    //start at the beginning and move until the pause point in the playback
    for(let i = 0;i < playbackData.nextEventPosition;i++) {
        //grab the next event
        nextEvent = playbackData.events[i];

        //is there a comment associated with this event
        if(playbackData.comments[nextEvent.id]) {
            //add the comment data to the st data
            storeCommentData(playbackData.comments[nextEvent.id], nextEvent.id, stData);
        }
        
        //if this is a new dev group
        if(!stData.devGroups[nextEvent.createdByDevGroupId]) {
            //store the dev group
            stData.devGroups[nextEvent.createdByDevGroupId] = playbackData.developerGroups[nextEvent.createdByDevGroupId];
        }
        //the latest event's dev group id to set the current dev group 
        stData.latestDevGroupId = nextEvent.createdByDevGroupId;

        //update the fs 
        updateFileSystem(nextEvent, stData);

        //add the event
        stData.events.push(nextEvent);
    }

    //now add all of the developers in the dev groups collected so far
    for(let devGroupId in stData.devGroups) {
        const memberIds = stData.devGroups[devGroupId].memberIds;
        for(let i = 0;i < memberIds.length;i++) {
            const memberId = memberIds[i];
            stData.devs[memberId] = playbackData.developers[memberId];
        }
    }

    //store the project title and branch id
    stData.project.title = playbackData.title;
    stData.project.branchId = playbackData.branchId; //TODO change this for every new download???
    
    //store the project data
    stData.project.title = playbackData.playbackTitle;
    stData.project.branchId = playbackData.branchId;
}
/*
 * Update the file system based on the event.
 */
function updateFileSystem(nextEvent, stData) {
    if(nextEvent.type === 'CREATE FILE') {
        //add an entry for the file
        stData.allFiles[nextEvent.fileId] = {
            parentDirectoryId: nextEvent.parentDirectoryId,
            currentPath: nextEvent.filePath,
            isDeleted: 'false',
            id: nextEvent.fileId,
            lastModifiedDate: nextEvent.timestamp,
            textFileInsertEvents: []
        };
        //create an entry for the path to id map
        stData.pathToFileIdMap[nextEvent.filePath] = nextEvent.fileId;

        //add an entry for the file contents
        stData.textFileContents[nextEvent.fileId] = []; 
    } else if(nextEvent.type === 'DELETE FILE') {
        //mark the file as deleted
        stData.allFiles[nextEvent.fileId].isDeleted = 'true';
        //remove the path to id mapping
        delete stData.pathToFileIdMap[nextEvent.filePath];
        //remove the file contents
        delete stData.textFileContents[nextEvent.fileId];
    } else if(nextEvent.type === 'RENAME FILE') {
        //update the file's path
        stData.allFiles[nextEvent.fileId].currentPath = nextEvent.newFilePath;
        //adjust the path to id mapping
        const fileId = stData.pathToFileIdMap[nextEvent.oldFilePath];
        stData.pathToFileIdMap[nextEvent.newFilePath] = fileId;
        delete stData.pathToFileIdMap[nextEvent.oldFilePath];
    } else if(nextEvent.type === 'MOVE FILE') {
        //update the file's path
        stData.allFiles[nextEvent.fileId].currentPath = nextEvent.newFilePath;
        stData.allFiles[nextEvent.fileId].parentDirectoryId = nextEvent.newParentDirectoryId;
        //adjust the path to id mapping
        const fileId = stData.pathToFileIdMap[nextEvent.oldFilePath];
        stData.pathToFileIdMap[nextEvent.newFilePath] = fileId;
        delete stData.pathToFileIdMap[nextEvent.oldFilePath];
    } else if(nextEvent.type === 'CREATE DIRECTORY') {
        //add an entry for the directory
        stData.allDirs[nextEvent.directoryId] = {
            parentDirectoryId: nextEvent.parentDirectoryId,
            currentPath: nextEvent.directoryPath,
            isDeleted: 'false',
            id: nextEvent.directoryId
        };
        //create an entry for the path to id map
        stData.pathToDirIdMap[nextEvent.directoryPath] = nextEvent.directoryId;
    } else if(nextEvent.type === 'DELETE DIRECTORY') {
        //mark the directory as deleted
        stData.allDirs[nextEvent.directoryId].isDeleted = 'true';
        //remove the path to id mapping
        delete stData.pathToDirIdMap[nextEvent.directoryPath];
    } else if(nextEvent.type === 'RENAME DIRECTORY') {
        //update the directory's path
        stData.allDirs[nextEvent.directoryId].currentPath = nextEvent.newDirectoryPath;
        //adjust the path to id mapping
        const directoryId = stData.pathToDirIdMap[nextEvent.oldDirectoryPath];
        stData.pathToDirIdMap[nextEvent.newDirectoryPath] = directoryId;
        delete stData.pathToDirIdMap[nextEvent.oldDirectoryPath];
    } else if(nextEvent.type === 'MOVE DIRECTORY') {
        //update the directory's path
        stData.allDirs[nextEvent.directoryId].currentPath = nextEvent.newDirectoryPath;
        stData.allDirs[nextEvent.directoryId].parentDirectoryId = nextEvent.newParentDirectoryId;
        //adjust the path to id mapping
        const directoryId = stData.pathToDirIdMap[nextEvent.oldDirectoryPath];
        stData.pathToDirIdMap[nextEvent.newDirectoryPath] = directoryId;
        delete stData.pathToDirIdMap[nextEvent.oldDirectoryPath];
    } else if(nextEvent.type === 'INSERT') {
        //insert the character
        addInsertEventByPos(stData.textFileContents[nextEvent.fileId], nextEvent.id, nextEvent.character, nextEvent.lineNumber - 1, nextEvent.column - 1);
    } else if(nextEvent.type === 'DELETE') {
        //remove the character
        removeInsertEventByPos(stData.textFileContents[nextEvent.fileId], nextEvent.lineNumber - 1, nextEvent.column - 1);
    }
}

/*
 * Adds the comment data.
 */
function storeCommentData(comments, eventId, stData) {
    //store the comment to be added to the zip
    stData.comments[eventId] = comments;
    //collect the media URLs from the comments
    for(let i = 0;i < comments.length;i++) {
        const comment = comments[i];
        //store the media URLs in the comments (use an object so there are no repeats)
        if(comment.imageURLs.length > 0) {
            comment.imageURLs.forEach(imageURL => stData.commentImageURLs[imageURL] = imageURL);
        }
        if(comment.videoURLs.length > 0) {
            comment.videoURLs.forEach(videoURL => stData.commentVideoURLs[videoURL] = videoURL);
        }
        if(comment.audioURLs.length > 0) {
            comment.audioURLs.forEach(audioURL => stData.commentAudioURLs[audioURL] = audioURL);
        }
    }
}
/*
 * Create the comments.json file in the zip.
 */
async function createCommentsFile(stData, zip, withComments) {
    const commentsObject = {
        comments: {},
        commentAutoGeneratedId: 0
    };

    if(withComments) {
        commentsObject.comments = stData.comments;
        commentsObject.commentAutoGeneratedId = Object.keys(stData.comments).length;
        
        //now add the comment media (images, videos, audios)
        await createCommentMedia(Object.keys(stData.commentImageURLs), zip);
        await createCommentMedia(Object.keys(stData.commentVideoURLs), zip);
        await createCommentMedia(Object.keys(stData.commentAudioURLs), zip);
    }
    zip.file('.storyteller/comments/comments.json', JSON.stringify(commentsObject));
}
/*
 * Create the devs.json file in the zip.
 */
function createDevsFile(stData, zip) {
    const devsObject = {
        systemDeveloper: playbackData.developers['devId-0'],
        anonymousDeveloper: playbackData.developers['devId-1'],
        systemDeveloperGroup: playbackData.developerGroups['devGroupId-0'],
        anonymousDeveloperGroup: playbackData.developerGroups['devGroupId-1'],
        allDevelopers: playbackData.developers,
        allDeveloperGroups: playbackData.developerGroups,
        currentDeveloperGroupId: stData.latestDevGroupId,
        developerAutoGeneratedId: Object.keys(playbackData.developers).length,
        developerGroupAutoGeneratedId: Object.keys(playbackData.developerGroups).length
    };

    //add the dev data to the zip
    zip.file('.storyteller/devs/devs.json', JSON.stringify(devsObject));
}
/*
 * Create the fs file.
 */
function createFSFile(stData, zip) {
    Object.values(stData.allFiles).forEach(file => {
        file['textFileInsertEvents'] = stData.textFileContents[file.id];
    });

    const fsObject = {
        allFiles: stData.allFiles,
        allDirs: stData.allDirs,
        pathToFileIdMap: stData.pathToFileIdMap,
        pathToDirIdMap: stData.pathToDirIdMap,
        fileAutoGeneratedId: Object.keys(stData.pathToFileIdMap).length,
        directoryAutoGeneratedId: Object.keys(stData.pathToDirIdMap).length
    };

    //add the fs data to the zip
    zip.file('.storyteller/fs/filesAndDirs.json', JSON.stringify(fsObject));
}
/*
 * Create the events file.
 */
function createEventsFile(stData, zip) {
    const eventsObject = {
        events: stData.events,
        eventAutoGeneratedId: stData.events.length 
    };

    //add the event data to the zip
    zip.file('.storyteller/events/events.json', JSON.stringify(eventsObject));
}
/*
 * Create the project file.
 */
function createProjectFile(stData, zip) {
    const projectObject = {
        title: stData.project.title,
        branchId: stData.project.branchId
    };
    //add the event data to the zip
    zip.file('.storyteller/project/project.json', JSON.stringify(projectObject));
}
/*
 * Fetch each media element and store it in the zip
 */
async function createCommentMedia(commentMediaURLs, zip) {
    //fetch the media and turn them into blobs
    const mediaResults = await Promise.all(commentMediaURLs.map(url => fetch(url)));
    const mediaBlobs = await Promise.all(mediaResults.map(mediaResult => mediaResult.blob()));

    //add the blobs to the zip
    for(let i = 0;i < mediaBlobs.length;i++) {
        zip.file(`.storyteller/comments${commentMediaURLs[i]}`, mediaBlobs[i]);
    }
}
/*
 *
 */
function zipAndDownloadCodeOnlyWithHistoryAtComments() {

}

/*
 * Creates a minimal insert event and adds it in its correct position in 
 * the file. 
 */
function addInsertEventByPos(textFileInsertEvents, eventId, eventCharacter, row, col) {
    //create a minimal insert event from the full event
    const event = {
        id: eventId,
        character: eventCharacter
    };
        
    //if this is the first insert on a new row (underneath the current last row)
    if(row === textFileInsertEvents.length) { 
        //create a new row at the bottom with the new event
        textFileInsertEvents.push([event]);
    } else { //the insert is in an existing row
        //insert somewhere in the middle
        textFileInsertEvents[row].splice(col, 0, event);
    }
    
    //if the new character was a newline character
    if(eventCharacter === 'NEWLINE' || eventCharacter === 'CR-LF') {
        //get the rest of the line after the newline character
        const restOfLine = textFileInsertEvents[row].splice(col + 1, textFileInsertEvents[row].length - col);
        
        //add a new row that the newline created with the end of the current line
        textFileInsertEvents.splice(row + 1, 0, restOfLine); 
    }
}

/*
 * Removes a minimal event from the 2D collection when something is 
 * deleted.
 */
function removeInsertEventByPos(textFileInsertEvents, row, col) {
    //if we are removing a newline character
    if(textFileInsertEvents[row][col].character === 'NEWLINE' || textFileInsertEvents[row][col].character === 'CR-LF') {
        //remove the newline character from its line
        textFileInsertEvents[row].splice(col, 1);

        //if there is a 'next' row, move all the elements up to this row
        if(row + 1 < textFileInsertEvents.length) {
            //get the next row (it may be an empty row)
            const copyElements = textFileInsertEvents[row + 1].splice(0);

            //add the elements to the current row
            for(let i = 0;i < copyElements.length;i++) {
                textFileInsertEvents[row].push(copyElements[i]);                
            }
            
            //remove the row that we copied all of the elements over
            textFileInsertEvents.splice(row + 1, 1);
        } //else- this is the last row in the file- there is not another row after this one to copy over            
    } else { //removing a non-newline
        //remove the id
        textFileInsertEvents[row].splice(col, 1);
    }
    
    //if there is nothing left on the row
    if(textFileInsertEvents[row].length === 0) {
        //remove the row
        textFileInsertEvents.splice(row, 1);
    }
}
function getText(textFileInsertEvents) {
    //text in the file
    let text = '';

    //go through the entire 2D array of events
    for(let line = 0;line < textFileInsertEvents.length;line++) {
        for(let column = 0;column < textFileInsertEvents[line].length;column++) {
            if(textFileInsertEvents[line][column].character === 'NEWLINE' || textFileInsertEvents[line][column].character === 'CR-LF') {
                text += '\n';
            } else if(textFileInsertEvents[line][column].character === 'TAB') {
                text += '\t';
            } else {
                //append the code character to a string
                text += textFileInsertEvents[line][column].character;
            }
        }
    }

    return text;
}