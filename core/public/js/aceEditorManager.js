//Sets the Ace editor to the correct mode to set correct syntax highlighting
function setEditorMode(thisEditor, filePath){

    //generates a list of all supported languages for syntax highlighting  
    let modelist = ace.require('ace/ext/modelist');
    //determines the correct mode for the given file type
    let mode = modelist.getModeForPath(filePath).mode;

    //sets the passed Ace editor to the correct mode
    thisEditor.session.setMode(mode);
}

function createAceEditor(codeDiv, filePath, fileId)
{
    //creates a new Ace editor pointing to the passed codeDiv
    const tempEditor = ace.edit(codeDiv);
    //disables edits from the browser
    tempEditor.setReadOnly(true);
    //sets the theme for the editor
    //maybe add support for user adjustment later
    tempEditor.setTheme('ace/theme/monokai');
    //set font size
    tempEditor.setFontSize(16);
    //removes the 80 character limit horizontal line from the editor
    tempEditor.setShowPrintMargin(false);

    //sets the mode for the editor based on the file it will display
    setEditorMode(tempEditor, filePath);

    //adds editor as a key/value pair to the list of editors using fileId as the key
    playbackData.editors[fileId] = tempEditor;

    return playbackData.editors[fileId];
}

/*
* Create a highlight (ace calls these 'markers')
*/
function addHighlight(fileId, startRow, startColumn, endRow, endColumn) {
    //get the editor where the highlight will take place
    const editor = playbackData.editors[fileId];
    //if it still exists (editors can be removed when moving in reverse)
    if(editor) {
        //create a marker in the right range
        const marker = editor.getSession().addMarker(new AceRange(startRow, startColumn, endRow, endColumn), 'highlight', 'text', true);
        
        //if there is not an entry for this file yet
        if(!playbackData.highlights[fileId]) {
            //create an array to hold ace marker ids
            playbackData.highlights[fileId] = [];
        }
        //add the id of the new marker so it can be cleared later
        playbackData.highlights[fileId].push(marker);
    }
}

/*
* Function to clear all the highlights.
*/
function clearHighlights() {
    //go through the files that have a recent highlight
    for(let fileId in playbackData.highlights) {
        //get the editor where the highlight is
        const editor = playbackData.editors[fileId];

        //if it still exists (editors can be removed when moving in reverse)
        if(editor) {
            //get the array of ace marker ids
            const highlightMarkerIds = playbackData.highlights[fileId];
            
            //go through the collection of marker ids
            for(let i = 0;i < highlightMarkerIds.length;i++) {
                //remove the marker
                editor.getSession().removeMarker(highlightMarkerIds[i]);
            }
        }
        //get rid of the highlights for this file
        delete playbackData.highlights[fileId];
    }
}
/*
 * Adds a new code highlight to any code added since the last pause point.
 * There is a new code marker created for only the files that have changed
 * since the last pause point. 
 */
function highlightNewCode(newCodeMarkers) {
    //go through all of the new code markers (one per changed file)
    for(let fileId in newCodeMarkers) {
        //if the editor is still present (files and associated editors can get removed by moving backwards)
        if(playbackData.editors[fileId]) {
            //get the edit session
            const editSession = playbackData.editors[fileId].getSession();

            //add the new code highlights in this file
            for(let i = 0;i < newCodeMarkers[fileId].length;i++) {
                //get a range to highlight
                const range = newCodeMarkers[fileId][i];
                //create an Ace marker in the right range
                const marker = editSession.addMarker(new AceRange(range.startRow, range.startColumn, range.endRow, range.endColumn), 'newCodeHighlight', 'text', false);            
                
                //if an array of markers does not exist for the file in the global playbackData object
                if(!playbackData.newCodeHighlights[fileId]) {
                    //create an array to hold markers for this file
                    playbackData.newCodeHighlights[fileId] = [];
                }
                //add the id of the new marker so it can be cleared later
                playbackData.newCodeHighlights[fileId].push(marker);
            }
        }
    }
}

/*
 * Function to clear all the new code highlights.
 */
function clearNewCodeHighlights() {
    //go through the latest new code highlight markers
    for(let fileId in playbackData.newCodeHighlights) {
        //if the editor is still present (files and associated editors can get removed by moving backwards)
        if(playbackData.editors[fileId]) {
            //get the edit session
            const editSession = playbackData.editors[fileId].getSession();

            //go through the collection of new code marker ids
            for(let i = 0;i < playbackData.newCodeHighlights[fileId].length;i++) {
                //remove the marker
                editSession.removeMarker(playbackData.newCodeHighlights[fileId][i]);
            }
        }
        //empty the collection of marker ids
        playbackData.newCodeHighlights[fileId] = [];
    }
}

/*
 * Adds a highlight to the line number gutter for every line that has an insert.
 */
function highlightInsertLineNumbers(lineNumbers) {
    //go through each file with with an insert
    for(let fileId in lineNumbers) {
        //if the editor is still present (files and associated editors can get removed by moving backwards)
        if(playbackData.editors[fileId]) {
            //get the edit session
            const editSession = playbackData.editors[fileId].getSession();

            //go through all of the line numbers
            for(let i = 0;i < lineNumbers[fileId].length;i++) {
                //add the gutter decoration to the lines with inserts
                editSession.addGutterDecoration(lineNumbers[fileId][i], 'insertOnLine');
            }
            //add the line numbers to the global object to remove them later
            playbackData.insertGutterHighlights[fileId] = lineNumbers[fileId];
        }
    }
}

/*
 * Adds a highlight to the line number gutter for every line that has a delete.
 */
function highlightDeleteLineNumbers(lineNumbers) {
    //go through each file with a delete
    for(let fileId in lineNumbers) {
        //if the editor is still present (files and associated editors can get removed by moving backwards)
        if(playbackData.editors[fileId]) {
            //get the edit session
            const editSession = playbackData.editors[fileId].getSession();

            //go through all of the line numbers
            for(let i = 0;i < lineNumbers[fileId].length;i++) {
                //add the gutter decoration to the lines with deletes
                editSession.addGutterDecoration(lineNumbers[fileId][i], 'deleteOnLine');
            }
            //add the line numbers to the global object to remove them later
            playbackData.deleteGutterHighlights[fileId] = lineNumbers[fileId];
        }
    }
}

function clearInsertLineNumbers() {
    //go through the most recent insert line number highlights
    for(let fileId in playbackData.insertGutterHighlights) {
        //if the editor is still present (files and associated editors can get removed by moving backwards)
        if(playbackData.editors[fileId]) {
            const session = playbackData.editors[fileId].getSession();

            //get the file's line numbers and remove the highlights
            const lineNumbers = playbackData.insertGutterHighlights[fileId];
            for(let i = 0;i < lineNumbers.length;i++) {
                session.removeGutterDecoration(lineNumbers[i], 'insertOnLine');
            }
        }
        delete playbackData.insertGutterHighlights[fileId];
    }
}
function clearDeleteLineNumbers() {
    //go through the most recent delete line number highlights
    for(let fileId in playbackData.deleteGutterHighlights) {
        //if the editor is still present (files and associated editors can get removed by moving backwards)
        if(playbackData.editors[fileId]) {
            const session = playbackData.editors[fileId].getSession();
            
            //get the file's line numbers and remove the highlights
            const lineNumbers = playbackData.deleteGutterHighlights[fileId];
            for(let i = 0;i < lineNumbers.length;i++) {
                session.removeGutterDecoration(lineNumbers[i], 'deleteOnLine');
            }
        }
        delete playbackData.deleteGutterHighlights[fileId];
    }
}
