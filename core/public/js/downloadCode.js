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
            const dirPath = dir.directoryPath.substring(1);
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
            const filePath = file.filePath.substring(1);
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
async function zipCodeWithHistory(withComments) {
    //create a new zip
    const zip = new JSZip();
    //add only the code to the zip
    addCodeToZip(zip);
    //add the data required to make this a storyeller project
    await addStorytellerProjectHistoryToZip(playbackData.events.slice(0, playbackData.nextEventPosition), zip, withComments);
    //cause the zip to be downloaded
    downloadZip(zip);
}
/*
 * Adds the required data to make this zip a true storyteller project that can 
 * added to. 
 */
async function addStorytellerProjectHistoryToZip(events, zip, withComments) {
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
    collectDataAboutEvents(events, stData);

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
function collectDataAboutEvents(events, stData) {
    //store the description comment block
    storeCommentData(playbackData.comments['ev--1'], 'ev--1', stData);

    //start at the beginning and move until the pause point in the playback
    for(let i = 0;i < events.length;i++) {
        //grab the next event
        nextEvent = events[i];

        //is there a comment associated with this event
        if(playbackData.comments[nextEvent.id]) {
            //add the comment data to the st data
            storeCommentData(playbackData.comments[nextEvent.id], nextEvent.id, stData);
        }
        
        //if this is a new dev group add it and all the devs in the group
        if(!stData.devGroups[nextEvent.createdByDevGroupId]) {
            storeDevData(nextEvent.createdByDevGroupId, stData)
        }

        //the latest event's dev group id to set the current dev group 
        stData.latestDevGroupId = nextEvent.createdByDevGroupId;

        //update the fs 
        updateFileSystem(nextEvent, stData);

        //add the event
        stData.events.push(nextEvent);
    }

    //store the project title and branch id
    stData.project.title = playbackData.playbackTitle;
    stData.project.branchId = playbackData.branchId; //TODO change this for every new download???
}
/*
 * Stores info about a dev group and devs that are encountered.
 */
function storeDevData(devGroupId, stData) {
    //get the dev group
    const newDevGroup = playbackData.developerGroups[devGroupId];
    //store the dev group
    stData.devGroups[devGroupId] = newDevGroup;

    //add the members of the new group if they are not already present
    const memberIds = newDevGroup.memberIds;
    for(let i = 0;i < memberIds.length;i++) {
        const memberId = memberIds[i];
        if(!stData.devs[memberId]) {
            stData.devs[memberId] = playbackData.developers[memberId];
        }
    }
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
        //adjust the path to id mappings and the current paths of the files/dirs affected by the dir rename
        updateFileAndDirPaths(stData, nextEvent.oldDirectoryPath, nextEvent.newDirectoryPath);
    } else if(nextEvent.type === 'MOVE DIRECTORY') {
        //update the directory's parent dir id
        stData.allDirs[nextEvent.directoryId].parentDirectoryId = nextEvent.newParentDirectoryId;
        //adjust the path to id mappings and the current paths of the files/dirs affected by the dir move
        updateFileAndDirPaths(stData, nextEvent.oldDirectoryPath, nextEvent.newDirectoryPath);
    } else if(nextEvent.type === 'INSERT') {
        //insert the character
        addInsertEventByPos(stData.textFileContents[nextEvent.fileId], nextEvent.id, nextEvent.character, nextEvent.lineNumber - 1, nextEvent.column - 1);
        //printInsertEvents(stData.textFileContents[nextEvent.fileId]);
    } else if(nextEvent.type === 'DELETE') {
        //remove the character
        removeInsertEventByPos(stData.textFileContents[nextEvent.fileId], nextEvent.lineNumber - 1, nextEvent.column - 1);
        //printInsertEvents(stData.textFileContents[nextEvent.fileId]);
    }
}
/*
 * Updates the current paths in allFiles and allDirs and values in the path to 
 * id mapping objects when a dir is moved or renamed.
 */
function updateFileAndDirPaths(stData, oldDirectoryPath, newDirectoryPath) {
    //path to id mapping
    //update all of the files that have the moved/renamed dir as part of the path
    for(let filePath in stData.pathToFileIdMap) {
        //if the file is somewhere within the old dir
        if(filePath.startsWith(oldDirectoryPath)) {
            //create a new path with the old dir path replaced with the new one
            const newFilePath = `${newDirectoryPath}${filePath.substring(oldDirectoryPath.length)}`;
            //add a new entry and remove the old one
            const fileId = stData.pathToFileIdMap[filePath];
            stData.pathToFileIdMap[newFilePath] = fileId;
            delete stData.pathToFileIdMap[filePath];
        }
    }
    //update all of the subdirectories that have the moved/renamed dir as part of the path
    for(let dirPath in stData.pathToDirIdMap) {
        //if the dir is somewhere within the old dir
        if(dirPath.startsWith(oldDirectoryPath)) {
            //create a new path with the old dir path replaced with the new one
            const newDirPath = `${newDirectoryPath}${dirPath.substring(oldDirectoryPath.length)}`;
            //add a new entry and remove the old one
            const dirId = stData.pathToDirIdMap[dirPath];
            stData.pathToDirIdMap[newDirPath] = dirId;
            delete stData.pathToDirIdMap[dirPath];
        }
    }

    //all files/dirs
    //update all of the current paths
    for(let fileId in stData.allFiles) {
        //get the file and its current path
        const file = stData.allFiles[fileId];
        const filePath = file.currentPath;
        //if the file is somewhere within the old dir
        if(filePath.startsWith(oldDirectoryPath)) {
            //replace the old current path with a new one
            file.currentPath = `${newDirectoryPath}${filePath.substring(oldDirectoryPath.length)}`;
        }
    }
    //update all of the current paths
    for(let dirId in stData.allDirs) {
        //get the dir and its current path
        const dir = stData.allDirs[dirId];
        const dirPath = dir.currentPath;
        //if the dir is somewhere within the old dir
        if(dirPath.startsWith(oldDirectoryPath)) {
            //replace the old current path with a new one
            dir.currentPath = `${newDirectoryPath}${dirPath.substring(oldDirectoryPath.length)}`;
        }
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
async function zipAtComments() {
    //holds all of the events where some of the events from playbackData.events may be thrown out
    const allEvents = [];
    //holds the state of the files
    const textFileContents = {};

    //by file collection of fresh inserts
    let freshInserts = {};

    //groups of events in between comment points
    let eventsBetweenComments = [];

    //get the first event's event sequence number
    let eventSequenceNumber = playbackData.events[0].eventSequenceNumber;

    //go through all of the events up to the pause point stopping at comments
    for(let i = 0;i < playbackData.nextEventPosition;i++) {
        //copy the event since it may be changed for the zip (don't want to mess up the current playback)
        let nextEvent = Object.assign({}, playbackData.events[i]);
        
        //if there is a comment at this event or it is the last one
        if(playbackData.comments[nextEvent.id] || i === (playbackData.nextEventPosition - 1)) {
            //add the non-insert events first
            eventsBetweenComments.forEach(event => allEvents.push(event));

            //get only the events that were not inserted and then deleted in between comments
            const updatedInsertEvents = updateFreshInsertEvents(eventsBetweenComments, textFileContents, freshInserts, eventSequenceNumber);
            //add the (possibly) smaller set of (possibly altered) events to the group that will be written to the playback
            updatedInsertEvents.forEach(event => allEvents.push(event));
            
            //add the current event ?????
            allEvents.push(nextEvent);
            
            //if the pause event is a comment event
            if(playbackData.comments[nextEvent.id]) {
                for(let j = 0;j < playbackData.comments[nextEvent.id].length;j++) {
                    const comment = playbackData.comments[nextEvent.id][j];
                    comment.displayCommentEvent = nextEvent;
                }
            }
            
            //update the event sequence number 
            eventSequenceNumber += updatedInsertEvents.length;
            
            //clear these out for the next group
            freshInserts = {};
            eventsBetweenComments = [];
        } 

        //all inserts are handled at the end of a comment grouping
        if(nextEvent.type === 'INSERT') {
            //if this is the first fresh insert in a file
            if(!freshInserts[nextEvent.fileId]) {
                freshInserts[nextEvent.fileId] = {};
            }
            //store the fresh insert event 
            freshInserts[nextEvent.fileId][nextEvent.id] = nextEvent;

            //insert the event
            const minimalEvent = addInsertEventByPos(textFileContents[nextEvent.fileId], nextEvent.id, nextEvent.character, nextEvent.lineNumber - 1, nextEvent.column - 1);
            //mark the minimal event as fresh
            minimalEvent.isFresh = true;
        } else if(nextEvent.type === 'DELETE') { 
            //remove the previous neighbor insert
            removeInsertEventByPos(textFileContents[nextEvent.fileId], nextEvent.lineNumber - 1, nextEvent.column - 1);

            //if it is NOT a delete of a fresh insert, there is a comment on this event, or it is the last event
            // if((freshInserts[nextEvent.fileId] && !freshInserts[nextEvent.fileId][nextEvent.previousNeighborId]) || 
            //    playbackData.comments[nextEvent.id] || 
            //    i === (playbackData.nextEventPosition - 1)) {
            //     //update the event sequence number
            //     nextEvent.eventSequenceNumber = eventSequenceNumber++;
            //     //add the event to the latest group
            //     eventsBetweenComments.push(nextEvent);
            // }
        } else { //all fs event types
            //if a new file is being created
            if(nextEvent.type === 'CREATE FILE') {
                //create an entry for the new file
                textFileContents[nextEvent.fileId] = [];
            } else if(nextEvent.type === 'DELETE FILE') {
                //delete the entry for the new file
                delete textFileContents[nextEvent.fileId];
            }
            //update the event sequence number
            nextEvent.eventSequenceNumber = eventSequenceNumber++;
            //add the event to the latest group
            eventsBetweenComments.push(nextEvent);
        }
    }

    //create a new zip
    const zip = new JSZip();
    //add only the code to the zip
    addCodeToZip(zip);
    //add the data required to make this a storyeller project
    await addStorytellerProjectHistoryToZip(allEvents, zip, true);
    //cause the zip to be downloaded
    downloadZip(zip);
}
function updateFreshInsertEvents(eventsBetweenComments, textFileContents, freshInserts, eventSequenceNumber) {
    //only fresh events with the previous neighbor id and line number and column updated
    const events = [];

    //go through only files with fresh inserts
    for(let fileId in freshInserts) {
        //get the minimal file representation
        const textFileContent = textFileContents[fileId];

        //for previous neighbors
        let previousNeighborId = 'none';
        //go through the file left to right, top to bottom
        for(let row = 0;row < textFileContent.length;row++) {
            for(let col = 0;col < textFileContent[row].length;col++) {
                //if this is a fresh insert
                if(textFileContent[row][col].isFresh) {
                    //get the latest full event at the corresponding position in the file
                    const eventId = textFileContent[row][col].id;
                    const updatedEvent = freshInserts[fileId][eventId];

                    //update the full insert event
                    updatedEvent.previousNeighborId = previousNeighborId;
                    updatedEvent.lineNumber = row + 1;
                    updatedEvent.column = col + 1;
                    updatedEvent.eventSequenceNumber = eventSequenceNumber++;

                    events.push(updatedEvent);
                    
                    textFileContent[row][col].isFresh = false;
                }

                //update the previous neeighbor before moving on to the next event
                previousNeighborId = textFileContent[row][col].id;
            }
        }
    }
    return events;
}
// /*
//  *
//  */
// async function zipAtComments() {
//     //holds all of the events where some of the events from playbackData.events may be thrown out
//     const allEvents = [];
//     //holds the state of the files
//     const textFileContents = {};
//     const lineLengths = {};
//     //by file collection of fresh inserts
//     let freshInserts = {};
//     //files that have had a fresh insert deleted
//     let filesRequiringEventAdjustment = {};
//     //groups of events in between comment points
//     let eventsBetweenComments = [];

//     //go through all of the events up to the pause point stopping at comments
//     for(let i = 0;i < playbackData.nextEventPosition;i++) {
//         //copy the event since it may be changed for the zip (don't want to mess up the current playback)
//         let nextEvent = Object.assign({}, playbackData.events[i]);

//         //capture all new inserts in this block
//         if(nextEvent.type === 'INSERT') {
//             //if this is the first fresh insert in a file
//             if(!freshInserts[nextEvent.fileId]) {
//                 freshInserts[nextEvent.fileId] = {};
//             }
//             //store the fresh insert event 
//             freshInserts[nextEvent.fileId][nextEvent.id] = nextEvent;
//         } else if(nextEvent.type === 'DELETE') { 
//             //if a fresh insert has been deleted 
//             if(freshInserts[nextEvent.fileId][nextEvent.previousNeighborId]) {
//                 //indicate that the insert events in this file need to be adjusted 
//                 filesRequiringEventAdjustment[nextEvent.fileId] = true;

//                 //mark the previously encountered fresh insert event as deleted
//                 freshInserts[nextEvent.fileId][nextEvent.previousNeighborId].isDeleted = true;
//                 //mark this delete event as well since it won't be needed
//                 nextEvent.isDeleted = true;
//             }
//         }
//         //add the event to the latest group
//         eventsBetweenComments.push(nextEvent);

//         //if there is a comment at this event or it is the last one
//         if(playbackData.comments[nextEvent.id] || i === (playbackData.nextEventPosition - 1)) {
//             //get only the events that were not inserted and then deleted in between comments
//             const noDeletedEvents = getEventsWithoutDeletes(eventsBetweenComments, textFileContents, lineLengths, filesRequiringEventAdjustment);
//             //add the (possibly) smaller set of (possibly altered) events to the group that will be written to the playback
//             noDeletedEvents.forEach(event => allEvents.push(event));

//             // //if the latest event is a delete that removes a fresh delete
//             // if(nextEvent.type === 'DELETE' && nextEvent.isDeleted) {
//             //     //move the comment at this event to the last event not deleted
//             //     for(let j = i;j >= 0;j--) {
//             //         if()
//             //     }
//             // }
//             //reset these for the next group
//             //freshInserts = {};
//             for(let freshFileId in freshInserts) {
//                 freshInserts[freshFileId] = null;
//             }
//             filesRequiringEventAdjustment = {};
//             eventsBetweenComments = [];
//         } 
//     }

//     //create a new zip
//     const zip = new JSZip();
//     //add only the code to the zip
//     addCodeToZip(zip);
//     //add the data required to make this a storyeller project
//     await addStorytellerProjectHistoryToZip(allEvents, zip, true);
//     //cause the zip to be downloaded
//     downloadZip(zip);
// }
/*
 *
 */
function getEventsWithoutDeletes(eventsBetweenComments, textFileContents, lineLengths, filesRequiringEventAdjustment) {
    //all events with the recently inserted and then deleted inserts removed
    const minimalEvents = [];

    //go through the events in between the comments
    for(let i = 0;i < eventsBetweenComments.length;i++) {
        const nextEvent = eventsBetweenComments[i];
        //do not add events that were added and then deleted in between comments
        //(insert events or deletes of recent inserts)
        if(!nextEvent.isDeleted) {
            minimalEvents.push(nextEvent);
        }

        //if a new file is being created
        if(nextEvent.type === 'CREATE FILE') {
            //create an entry for the new file- insert events and line lengths
            textFileContents[nextEvent.fileId] = [];
            lineLengths[nextEvent.fileId] = [];
        } else if(nextEvent.type === 'INSERT') {
            //insert the event
            const minimalEvent = addInsertEventByPos(textFileContents[nextEvent.fileId], nextEvent.id, nextEvent.character, nextEvent.lineNumber - 1, nextEvent.column - 1);
            
            //if this is an insert that was deleted before the comment point
            if(nextEvent.isDeleted) {
                //mark the minimal event as deleted
                minimalEvent.isDeleted = true;
            } else { //plain old insert
                //if this file has had some fresh inserts that were deleted
                if(filesRequiringEventAdjustment[nextEvent.fileId]) {
                    //adjust the previous neighbor, line number, and column
                    adjustInsertEvent(nextEvent, textFileContents[nextEvent.fileId], lineLengths[nextEvent.fileId]);
                } //else- it is not necessary to go through the expensive adjustment process

                //increase the line length 
                if(lineLengths[nextEvent.fileId][nextEvent.lineNumber - 1]) {
                    lineLengths[nextEvent.fileId][nextEvent.lineNumber - 1]++;
                } else {
                    lineLengths[nextEvent.fileId].push(1);
                }
            }
        } else if(nextEvent.type === 'DELETE') {
            //remove the insert
            removeInsertEventByPos(textFileContents[nextEvent.fileId], nextEvent.lineNumber - 1, nextEvent.column - 1);

            //adjustDeleteEvent(nextEvent, textFileContents[nextEvent.fileId], lineLengths[nextEvent.fileId])
            //update the line lengths
            //if this event removed an old, non-deleted insert
            if(nextEvent.isDeleted === false) {
                //decrease the line length by one
                lineLengths[nextEvent.fileId][nextEvent.lineNumber - 1]--;
            }
            //if the delete was of a newline (deleted or not)
            if(nextEvent.character === 'NEWLINE' || nextEvent.character === 'CR-LF') {
                //add the line length of the line underneath to this one
                lineLengths[nextEvent.fileId][nextEvent.lineNumber - 1] += lineLengths[nextEvent.fileId][nextEvent.lineNumber];
                lineLengths[nextEvent.fileId].splice(nextEvent.lineNumber, 1);
            }
        }
    }

    return minimalEvents;
}
/*
 *
 */
function adjustInsertEvent(nextEvent, textFileInsertEvents, lineLengths) {
    //get the position of the previous insert event that is not deleted
    let position = moveBackAnEvent(nextEvent.lineNumber - 1, nextEvent.column - 1, textFileInsertEvents);
    
    //while we are not at the beginning of the file and there is a deleted insert
    while(position.atBeginningOfFile === false && textFileInsertEvents[position.row][position.col].isDeleted) {
        //move backward again
        position = moveBackAnEvent(position.row, position.col, textFileInsertEvents);
    }

    //if we have moved back to the beginning of the file
    if(position.atBeginningOfFile) {
        //prev neighbor id of first character in a file
        nextEvent.previousNeighborId = 'none';
        nextEvent.lineNumber = 1;
        nextEvent.column = 1;
    } else {
        //store the event id as the new previous neighbor
        nextEvent.previousNeighborId = textFileInsertEvents[position.row][position.col].id;

        // if(nextEvent.character === 'CR-LF') {
        //     printInsertEvents(textFileInsertEvents);
        // }
        //nextEvent.lineNumber = position.row + 1;
        //nextEvent.column = position.col + 2 ;
        //adjustColumn(nextEvent, textFileInsertEvents);
        //adjustRow(nextEvent, lineLengths);

        //if its a newline
        // if(textFileInsertEvents[position.row][position.col].character === 'NEWLINE' || textFileInsertEvents[position.row][position.col].character === 'CR-LF') {
        //     nextEvent.lineNumber = position.row + 2;
        //     nextEvent.column = 1;
        // } else { //not a newline
        //     nextEvent.lineNumber = position.row + 1;
        //     nextEvent.column = position.col + 2;
        // }
    }
}
/*
 *
 */
function adjustDeleteEvent(nextEvent, textFileInsertEvents, lineLengths) {
    adjustColumn(nextEvent, textFileInsertEvents);
    adjustRow(nextEvent, lineLengths);
}
/*
 *
 */
function adjustColumn(nextEvent, textFileInsertEvents) {
    for(let i = nextEvent.column - 1;i >= 0;i--) {
        if(textFileInsertEvents[nextEvent.lineNumber - 1][i].isDeleted) {
            nextEvent.column--;
        }
    }
}
/*
 *
 */
function adjustRow(nextEvent, lineLengths) {
    for(let i = nextEvent.lineNumber - 1;i >= 0;i--) {
        if(lineLengths[i] === 0) {
            nextEvent.lineNumber--;
        }
    }
}
/*
 * Moves one event backwards in a file based on a row and col.
 */
function moveBackAnEvent(row, col, textFileInsertEvents) {
    //if the current row and col are the at the beginning of the file
    let atBeginningOfFile = false;

    //if not at the beginning of a line
    if(col > 0) {
        //move back one event in the row
        col--;
    } else { //beginning of a line
        //if not on the first line
        if(row > 0) {
            //move up a line
            row--;
            //go to the end of the previous line
            col = textFileInsertEvents[row].length - 1;
        } else { //row 0, col 0, no room to move backward
            atBeginningOfFile = true;
        }
    }
    //return info about the previous position
    return {row, col, atBeginningOfFile};
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
        if(!textFileInsertEvents[row]) {
            printInsertEvents(textFileInsertEvents);
        }
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

    return event;
}

/*
 * Removes a minimal event from the 2D collection when something is 
 * deleted.
 */
function removeInsertEventByPos(textFileInsertEvents, row, col) {
    if(!textFileInsertEvents[row]) {
        printInsertEvents(textFileInsertEvents);
    }
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
function printInsertEvents(textFileInsertEvents) {
    let outputString = '';
    for(let row = 0;row < textFileInsertEvents.length;row++) {
        for(let col = 0;col < textFileInsertEvents[row].length;col++) {
            if(textFileInsertEvents[row][col].isDeleted) {
                outputString += `[${textFileInsertEvents[row][col].character}-r:${row}c:${col}] `;
            } else {
                outputString += `.${textFileInsertEvents[row][col].character}-r:${row}c:${col}. `;
            }
        }
        outputString += '\n';
    }
    console.log(outputString);
    console.log();
}
/*
 * Get the text from the file.
 */
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