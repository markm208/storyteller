//On insert event, insert the new character into the Ace editor at the correct position
function insertEvent(nextEvent){
    //If the character is not a '\n' or '\r' 
    if(nextEvent.character.length == 1){
        //get the Ace editor that the insert will go into and insert at the row/column of the event
        allEditors[nextEvent.fileId].getSession().insert({row: nextEvent.lineNumber -1,column: nextEvent.column -1}, nextEvent.character);
    }    
    //If the character is a '\n', insert a new line 
    else if (nextEvent.character == "NEWLINE"){
        //get the Ace editor the new line will go into and insert at the row/column of the event
        allEditors[nextEvent.fileId].getSession().insert({row: nextEvent.lineNumber -1,column: nextEvent.column -1}, '\n');
    }                       
}

//On delete event, delete the character from the Ace editor at the correct position
function deleteEvent(nextEvent){
    if (nextEvent.character == "NEWLINE"){
        //create a new Range from the end of the starting line to the beginning of the next line
        //remove characters in that range from the Ace editor
        allEditors[nextEvent.fileId].getSession().remove(new Range(nextEvent.lineNumber-1, nextEvent.column-1,nextEvent.lineNumber, 0));
    }
    else if (nextEvent.character.length == 1){
        //create a new Range from the index of the character to the index + 1
        //remove takes a range with an inclusive start and non-inclusive end
        //remove that range from the Ace editor
        allEditors[nextEvent.fileId].getSession().remove(new Range(nextEvent.lineNumber-1, nextEvent.column-1,nextEvent.lineNumber-1, nextEvent.column));
    }
}

//when a createFileEvent is encountered while stepping forward
//or a deleteFileEvent is encountered while stepping backwards
//this function is called to handle all necessary operations
function createFileEvent(nextEvent){
    //console.log(`adding to file to the ${numFilesCreated} existing files`);
    
    //if this event is the first create file event encountered
    //there is no need to create a new tab or Ace editor because the page is created with one
    if (numFilesCreated == 0)
    {        
        //sets the Ace editor to the correct mode based on the language of the file
        setEditorMode(editor, nextEvent.filePath);

        //adds editor to the list of editors with the file id as the key
        allEditors[nextEvent.fileId] = editor;

        //set the text of the tab to the file path of the file created
        document.getElementById("FirstTabLabel").innerHTML = nextEvent.filePath;
    }
    //if the current create file event is not the first encounted
    else
    {
        //Create a new tab
        //create a new item in the list of tabs 
        const newListItem = document.createElement('li');
        //allows use in navigation
        newListItem.classList.add("nav-item");
        //link the tab to the file thats its holding
        newListItem.id = nextEvent.fileId;     

        //sets up a link between the tab and the panel it will display
        const newLinkTag = document.createElement('a');
        newLinkTag.classList.add("nav-link");

        //setting the id of the tab for future access
        //allows for renaming of tabs in the event of a file name change
        newLinkTag.id = `${nextEvent.fileId}-text`;

        //points this tab to the Ace editor it will display
        //the div that this points to is created below
        newLinkTag.href = `#${nextEvent.fileId}-content`;
        newLinkTag.setAttribute("role", "tab");
        newLinkTag.setAttribute("data-toggle", "tab");

        //sets the tab text to the filePath of the new file
        newLinkTag.innerText = nextEvent.filePath;

        //adds the link to the list item
        newListItem.appendChild(newLinkTag);
        //adds the list item to the page html
        tabsList.appendChild(newListItem);

        //create new divs to go in the new tab
        //contentPanel is where newLinkTag points to and holds the codeDiv 
        //which is what the Ace editor points to
        const contentPanel = document.createElement('div');
        //what the Ace editor points to
        const codeDiv = document.createElement('div');

        //set up the contentPanel id for future deletion
        contentPanel.id = `${nextEvent.fileId}-content`;
        //adding the tab-pane class so the div can be displayed correctly by the newLinkTag
        contentPanel.classList.add("tab-pane");
        //give the codeDiv and unique id so Ace can work with it
        codeDiv.id = `${nextEvent.fileId}-code`;
        //give the codeDiv the playbackWindow class
        //this is a style that specifies the height of the div
        //which is necessary for Ace to display code
        codeDiv.classList.add('playbackWindow');

        //attach codeDiv to contentPanel
        contentPanel.appendChild(codeDiv);
        //attach the contentPanel to the tab-content div
        tabContent.appendChild(contentPanel);

        //create a new editor pointing to the code div
        CreateAceEditor(codeDiv, nextEvent.filePath, nextEvent.fileId);

        addFocusToTab(document.getElementById(`${nextEvent.fileId}-text`), document.getElementById(`${nextEvent.fileId}-content`));
    }
    //increment the total number of files that have been created
    numFilesCreated++;
    //console.log(`there are now ${numFilesCreated} files`);
}

//when a createFileEvent is encountered while stepping backwards
//or a deleteFileEvent is encountered while stepping forwards
function deleteFileEvent(nextEvent){
    //console.log(`deleting one of ${numFilesCreated} files`);
    if (numFilesCreated != 1)
    {
        //delete the editor that is no longer being used
        delete allEditors[nextEvent.fileId];

        //Delete the div in tabContent
        let tabPane = document.getElementById(`${nextEvent.fileId}-content`);
        tabPane.parentNode.removeChild(tabPane);

        //delete the tab from tabList
        let fileTab = document.getElementById(nextEvent.fileId);
        fileTab.parentNode.removeChild(fileTab);

        addFocusToTab(document.getElementById(`FirstTabLabel`), document.getElementById(`Playback`));
    }
    //decrement the total number of files that have been created
    numFilesCreated--;
    //console.log(`there are ${numFilesCreated} files left`);
}

function addFocusToTab(tabToFocus, content)
{
    //remove active class from the old tab and content pane
    currentActiveTab.classList.remove("active");
    currentActiveContent.classList.remove("active");

    //add active class to the new tab and content pane
    tabToFocus.classList.add("active");
    content.classList.add("active");

    //update our global which stores the currently active tab and content pane
    currentActiveTab = tabToFocus;
    currentActiveContent = content;

}