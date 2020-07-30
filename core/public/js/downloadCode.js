/*
 * Creates a zip file with only the code in the browser. The history of the code 
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
 * Adds the code in the Ace editors to a zip file
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
 * Causes a zip file to be downloaded.
 */
async function downloadZip(zip) {
    //get the current date/time
    const fileCreationDate = new Date();

    //append the date/time in iso format and add a zip extension
    let zipFileName = 'st.zip';

    //create a blob representation of the zip
    const blobbedZip = await zip.generateAsync({
        type:'blob',
        compression: "DEFLATE",
        compressionOptions: {
            level: 9
        }
    });

    //create a downloadable blob
    const blob = new Blob([blobbedZip], {type: 'application/zip'});
    //create a url that holds the zip
    const url = window.URL.createObjectURL(blob);

    //create a temp invisible anchor and add it to the page
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.setAttribute('style', 'display: none');

    //assign the new with zip data url to the anchor
    a.href = url;
    //add a name to the zip
    a.download = zipFileName;
    //simulate a click of the button
    a.click();

    //clean up the resources for the url
    window.URL.revokeObjectURL(url);
    //remove the anchor
    a.remove();
}
/*
 *
 */
function zipAndDownloadCodeWithHistory() {
    //create a new zip
    const zip = new JSZip();
    //add only the code to the zip
    addCodeToZip(zip);
    //add the data required to make this a storyeller project
    addStorytellerProjectHistoryToZip(zip);
    //cause the zip to be downloaded
    downloadZip(zip);
}
/*
 * Adds the required data to make this zip a true storyteller project that can 
 * added to. 
 */
function addStorytellerProjectHistoryToZip(zip) {
    //add the required directories for a storyteller project
    zip.folder('.storyteller');
    zip.folder('.storyteller/.tmp');
    zip.folder('.storyteller/comments');
    zip.folder('.storyteller/devs');
    zip.folder('.storyteller/events');
    zip.folder('.storyteller/events/intermediate');
    zip.folder('.storyteller/fs');
    zip.folder('.storyteller/project');
    zip.folder('.storyteller/public');
    zip.folder('.storyteller/public/css');
    zip.folder('.storyteller/public/js');
    zip.folder('.storyteller/public/js/ext');
    zip.folder('.storyteller/public/media');
    zip.folder('.storyteller/public/media/audios');
    zip.folder('.storyteller/public/media/images');
    zip.folder('.storyteller/public/media/videos');

    const stData = {
        comments: {},
        devGroups: {},
        devs: {},
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
    //get the devs up to this point in the playback and store in the devs dir
    //get the events up to this point in the playback and store in the events dir
    //get the fs data up to this point in the playback and store in the fs dir
    //get the project data up to this point in the playback and store in the project dir
    //get the js code and store in the js dir
    //get the media up to this point in the playback and store in the media dir
}
function collectDataAboutEvents(stData) {
    //start at the beginning and move until the pause point in the playback
    for(let i = 0;i < playbackData.nextEventPosition;i++) {
        //grab the next event
        nextEvent = playbackData.events[i];

        //is there a comment associated with this event
        if(playbackData.comments[nextEvent.id]) {
            //store the comment to be added to the zip
            stData.comments[nextEvent.id] = playbackData.comments[nextEvent.id];
        }
        
        //if this is a new dev group
        if(!stData.devGroups[nextEvent.developerGroupId]) {
            //store the dev group
            stData.devGroups[nextEvent.developerGroupId] = playbackData.developerGroups[nextEvent.developerGroupId];
        }

        //add the event
        stData.events.push(nextEvent);

        //TODO files and dirs
    }

    //now add all of the developers in the dev groups collected so far
    const devGroupIds = Object.keys(stData.devGroups);
    for(let devGroupId in devGroupIds) {
        const memberIds = stData.devGroups[devGroupId].memberIds;
        for(let memberId in memberIds) {
            stData.devs[memberId] = playbackData.developers[memberId];
        }
    }

    //store the project title and branch id
    stData.project.title = playbackData.title;
    stData.project.branchId = playbackData.branchId; //TODO change this for every new download???
}
/*
 *
 */
function zipAndDownloadCodeOnlyWithHistoryAtComments() {

}