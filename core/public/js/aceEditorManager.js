//Sets the Ace editor to the correct mode to set correct syntax highlighting
function setEditorMode(thisEditor, filePath) {

    //generates a list of all supported languages for syntax highlighting  
    let modelist = ace.require('ace/ext/modelist');
    //determines the correct mode for the given file type
    let mode = modelist.getModeForPath(filePath).mode;

    //sets the passed Ace editor to the correct mode
    thisEditor.session.setMode(mode);
}

//Returns the correct mode for the passed in filePath
function getEditorModeForFilePath(filePath) {
    const modelist = ace.require("ace/ext/modelist");
    return modelist.getModeForPath(filePath).mode;
}

/*
 * Creates an Ace editor
 */
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
    //sets the font size to the last value selected by the user, or the default
    tempEditor.setFontSize(playbackData.aceFontSize);
    //sets the mode for the editor based on the file it will display
    setEditorMode(tempEditor, filePath);
    //make it possible to scroll past the end of the text
    tempEditor.setOptions({scrollPastEnd: true});
    //remove the cursor
    tempEditor.setOptions({highlightActiveLine: false, highlightGutterLine: false});
    tempEditor.renderer.$cursorLayer.element.style.display = "none";

    //adds editor as a key/value pair to the list of editors using fileId as the key
    playbackData.editors[fileId] = tempEditor;

    return playbackData.editors[fileId];
}
/* 
 * Cleans up ace editor.
 */
function destroyAceEditor(fileId) {
    //clean up
    playbackData.editors[fileId].destroy();
    //remove the editor
    delete playbackData.editors[fileId];
}
/*
 * Adds all of the primary code highlights (selected code) and the secondary context 
 * highlights (lines above and below the selected code).
 */
function addCodeHighlights(commentObject) {
    //row numbers for secondary highlights above and below the selected code
    let smallestRowNumber = Number.MAX_SAFE_INTEGER;
    let largestRowNumber = Number.MIN_SAFE_INTEGER;
    
    //every comment is in one file
    let fileId = commentObject.displayCommentEvent.fileId;
    
    //add primary highlights for the comment
    for (let j = 0; j < commentObject.selectedCodeBlocks.length; j++)
    {
        //get relevant primary code highlight data from the comment 
        fileId = commentObject.selectedCodeBlocks[j].fileId;
        const startRow = commentObject.selectedCodeBlocks[j].startRow
        const startColumn = commentObject.selectedCodeBlocks[j].startColumn;
        const endRow = commentObject.selectedCodeBlocks[j].endRow;
        const endColumn = commentObject.selectedCodeBlocks[j].endColumn;
        
        //add the primary highlight
        addPrimaryCodeHighlight(fileId, startRow, startColumn, endRow, endColumn);

        //if this is the smallest row number with selected code, store it
        if(startRow < smallestRowNumber) {
            smallestRowNumber = startRow;
        }

        //if this is the largest row number with selected code, store it
        if(endRow > largestRowNumber) {
            largestRowNumber = endRow;
        }
    }

    //if there is a need for a secondary highlight
    if(smallestRowNumber !== Number.MAX_SAFE_INTEGER && largestRowNumber !== Number.MIN_SAFE_INTEGER) {
        //get the row numbers above and below
        const secondaryHighlightStartRow = smallestRowNumber - Number(commentObject.linesAbove);
        const secondaryHighlightEndRow = largestRowNumber + Number(commentObject.linesBelow);
        
        //add the secondary highlight
        addSecondaryCodeHighlight(fileId, secondaryHighlightStartRow, secondaryHighlightEndRow);
    }
}
/*
 * Cretes a group of Ace ranges for primary highlights. It goes through a (possible multi-line) range
 * and creates a new range for every line. Each line skips leading and trailing whitespace.
 */
function splitRangeIgnoreLeadingAndTrailingSpaces(editor, startRow, startColumn, endRow, endColumn) {
    //all the line-by-line ranges in a bigger range
    const aceRanges = [];

    //go through all of the rows in a range
    for(let row = startRow;row <= endRow;row++) {
        //get the line of text in the row
        const rowOfText = editor.getSession().getLine(row);
        
        let newStartColumn;
        //if this is the first row of the range
        if(row === startRow) {
            //store the supplied column
            newStartColumn = startColumn;
        } else { //not on the starting row
            //start at the beginning of the row
            newStartColumn = 0;
        }
        //from the beginning, skip whitespace
        for(let i = newStartColumn;i < rowOfText.length;i++) {
            //is it a whitespace?
            if(rowOfText[i] === ' ' || rowOfText[i] === '\t') {
                //move the start of the range forward one
                newStartColumn++;
            } else { //first non-whitespace
                break;
            }
        }

        let newEndColumn;
        //if this is the last row of the range
        if(row === endRow) {
            //store the supplied column minus one (because I will add one when creating a marker)
            newEndColumn = endColumn - 1;
        } else {
            //start at the end of the row
            newEndColumn = rowOfText.length - 1;
        }
        //from the end, skip whitespace
        for(let i = newEndColumn;i >= 0;i--) {
            //is it a whitespace?
            if(rowOfText[i] === '\n' || rowOfText[i] === ' ' || rowOfText[i] === '\t') {
                //move the end of the range backward one
                newEndColumn--;
            } else { //last non-whitespace
                break;
            }
        }
        //create a new range and add it to the collection of all ranges
        aceRanges.push(new AceRange(row, newStartColumn, row, newEndColumn + 1));
    }
    return aceRanges;
}
/*
 * Create a highlight (ace calls these 'markers')
 */
function addPrimaryCodeHighlight(fileId, startRow, startColumn, endRow, endColumn) {
    //get the editor where the highlight will take place
    const editor = playbackData.editors[fileId];
    //if it still exists (editors can be removed when moving in reverse)
    if(editor) {
        //get all the individual line-by-line ranges
        const allRanges = splitRangeIgnoreLeadingAndTrailingSpaces(editor, startRow, startColumn, endRow, endColumn);
        //mark each line
        for(let i = 0;i < allRanges.length;i++) {
            //create a marker in the right range
            const marker = editor.getSession().addMarker(allRanges[i], 'highlight', 'text', true);
            
            //if there is not an entry for this file yet
            if(!playbackData.highlights[fileId]) {
                //create an array to hold ace marker ids
                playbackData.highlights[fileId] = [];
            }
            //add the id of the new marker so it can be cleared later
            playbackData.highlights[fileId].push(marker);
        }
    }
}
/*
 * Create a secondary highlight of all the code that will show up in blog mode.
 */
function addSecondaryCodeHighlight(fileId, startRow, endRow) {
    //get the editor where the highlight will take place
    const editor = playbackData.editors[fileId];
    //if it still exists (editors can be removed when moving in reverse)
    if(editor) {
        //get the last line of text in the range
        const endRowOfText = editor.getSession().getLine(endRow);
        //create a marker in the right range
        const marker = editor.getSession().addMarker(new AceRange(startRow, 0, endRow, endRowOfText.length), 'secondaryHighlight', 'fullLine', true);
        
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
            //get the editor where the highlight will take place
            const editor = playbackData.editors[fileId];
            //get the edit session
            const editSession = editor.getSession();

            //add the new code highlights in this file
            for(let i = 0;i < newCodeMarkers[fileId].length;i++) {
                //get a range to highlight
                const range = newCodeMarkers[fileId][i];

                //get all the individual line-by-line ranges
                const allRanges = splitRangeIgnoreLeadingAndTrailingSpaces(editor, range.startRow, range.startColumn, range.endRow, range.endColumn);
                
                //mark each line
                for(let j = 0;j < allRanges.length;j++) {
                    //create an Ace marker in the right range
                    const marker = editSession.addMarker(allRanges[j], 'newCodeHighlight', 'text', false);
                    
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
function scrollToLine(fileId, lineNumber, column) {
    if(playbackData.editors[fileId]) {
        //scroll the code window to the correct place in the code, and bring the cursor to the correct line
        playbackData.editors[fileId].renderer.scrollCursorIntoView({row: lineNumber, column: column}, 0.5);
        playbackData.editors[fileId].gotoLine(lineNumber + 1)
    }
}
