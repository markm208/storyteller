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
 *
 */
function zipAndDownloadCodeWithHistory() {

}
/*
 *
 */
function zipAndDownloadCodeOnlyWithHistoryAtComments() {

}
/*
 *
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
    //create a temp invisible anchor and add it to the page
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.setAttribute('style', 'display: none');

    //create a downloadable blob
    const blob = new Blob([blobbedZip], {type: 'application/zip'});

    //create a url that holds the zip
    const url = window.URL.createObjectURL(blob);

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