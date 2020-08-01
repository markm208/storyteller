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
        files: {},
        dirs: {},
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

    //get the media up to this point in the playback and store in the media dir
    //await createCommentMedia(stData, zip);

    //get the devs up to this point in the playback and store in the devs dir
    createDevsFile(stData, zip);
    
    //get the events up to this point in the playback and store in the events dir
    //get the fs data up to this point in the playback and store in the fs dir
    //get the project data up to this point in the playback and store in the project dir
}
/*
 * March through the events from the beginning until the pause point and collect
 * information from the events. 
 */
function collectDataAboutEvents(stData) {
    //store the description comment
    stData.comments['ev--1'] = playbackData.comments['ev--1'];

    //start at the beginning and move until the pause point in the playback
    for(let i = 0;i < playbackData.nextEventPosition;i++) {
        //grab the next event
        nextEvent = playbackData.events[i];

        //is there a comment associated with this event
        if(playbackData.comments[nextEvent.id]) {
            const comments = playbackData.comments[nextEvent.id];
            //store the comment to be added to the zip
            stData.comments[nextEvent.id] = comments;
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
        
        //if this is a new dev group
        if(!stData.devGroups[nextEvent.createdByDevGroupId]) {
            //store the dev group
            stData.devGroups[nextEvent.createdByDevGroupId] = playbackData.developerGroups[nextEvent.createdByDevGroupId];
        }
        //the latest event's dev group id to set the current dev group 
        stData.latestDevGroupId = nextEvent.createdByDevGroupId;

        //add the event
        stData.events.push(nextEvent);

        //TODO files and dirs
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

    


    // //get the unique web urls of the images in the comments so far
    // const commentImageURLs = Object.keys(stData.commentImageURLs);
    
    // //fetch the images and turn them into blobs
    // const imageResults = await Promise.all(commentImageURLs.map(url => fetch(url)));
    // const imageBlobs = await Promise.all(imageResults.map(imageResult => imageResult.blob()));

    // //add the blobs to the zip
    // for(let i = 0;i < imageBlobs.length;i++) {
    //     zip.file(`.storyteller/comments${commentImageURLs[i]}`, imageBlobs[i]);
    // }


    // //get the unique web urls of the videos in the comments so far
    // const commentVideoURLs = Object.keys(stData.commentVideoURLs);

    // //fetch the videos and turn them into blobs
    // const videoResults = await Promise.all(commentVideoURLs.map(url => fetch(url)));
    // const videBlobs = await Promise.all(videoResults.map(videoResult => videoResult.blob()));

    // //add the blobs to the zip
    // for(let i = 0;i < videBlobs.length;i++) {
    //     zip.file(`.storyteller/comments${commentVideoURLs[i]}`, videBlobs[i]);
    // }
    
    // //get the unique web urls of the audios in the comments so far
    // const commentAudioURLs = Object.keys(stData.commentAudioURLs);

    // //fetch the audios and turn them into blobs
    // const audioResults = await Promise.all(commentAudioURLs.map(url => fetch(url)));
    // const audioBlobs = await Promise.all(audioResults.map(audioResult => audioResult.blob()));

    // //add the blobs to the zip
    // for(let i = 0;i < audioBlobs.length;i++) {
    //     zip.file(`.storyteller/comments${commentAudioURLs[i]}`, audioBlobs[i]);
    // }

}
/*
 *
 */
function zipAndDownloadCodeOnlyWithHistoryAtComments() {

}
