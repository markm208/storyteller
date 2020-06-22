//Sets the Ace editor to the correct mode to set correct syntax highlighting
function setEditorMode(thisEditor, filePath){

    //generates a list of all supported languages for syntax highlighting  
    let modelist = ace.require("ace/ext/modelist");
    //determines the correct mode for the given file type
    let mode = modelist.getModeForPath(filePath).mode;

    //sets the passed Ace editor to the correct mode
    thisEditor.session.setMode(mode);
}

function CreateAceEditor(codeDiv, filePath, fileId)
{
    //creates a new Ace editor pointing to the passed codeDiv
    const tempEditor = ace.edit(codeDiv);
    //disables edits from the browser
    tempEditor.setReadOnly(true);
    //sets the theme for the editor
    //maybe add support for user adjustment later
    tempEditor.setTheme("ace/theme/monokai");
    //set font size
    tempEditor.setFontSize(16);
    //removes the 80 character limit horizontal line from the editor
    tempEditor.setShowPrintMargin(false);

    //sets the mode for the editor based on the file it will display
    setEditorMode(tempEditor, filePath);
    
    //adds editor as a key/value pair to the list of editors using fileId as the key
    allEditors[fileId] = tempEditor;

    return allEditors[fileId];
}

/*
* Create a highlight (ace calls these 'markers')
*/
function addHighlight(startRow, startColumn, endRow, endColumn) {
    //create a marker in the right range
    const marker = editor.getSession().addMarker(new Range(startRow, startColumn, endRow, endColumn), 'highlight', 'text', true);
    
    //add the id of the new marker so it can be cleared later
    allHighlights.push(marker);
}

/*
* Function to clear all the highlights.
*/
function clearHighlights() {
    //go through the collection of marker ids
    for(let i = 0;i < allHighlights.length;i++) {
        //remove the marker
        editor.getSession().removeMarker(allHighlights[i]);
    }
    //empty the collection of marker ids
    allHighlights = [];
}