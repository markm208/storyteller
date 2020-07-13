//On insert event, insert the new character into the Ace editor at the correct position
function insertEvent(nextEvent){
    //If the character is not a '\n' or '\r' 
    if(nextEvent.character.length === 1){
        //get the Ace editor that the insert will go into and insert at the row/column of the event
        playbackData.editors[nextEvent.fileId].getSession().insert({row: nextEvent.lineNumber -1,column: nextEvent.column -1}, nextEvent.character);
    }    
    //If the character is a '\n', insert a new line 
    else if (nextEvent.character === 'NEWLINE'){
        //get the Ace editor the new line will go into and insert at the row/column of the event
        playbackData.editors[nextEvent.fileId].getSession().insert({row: nextEvent.lineNumber -1,column: nextEvent.column -1}, '\n');
    }
}

//On delete event, delete the character from the Ace editor at the correct position
function deleteEvent(nextEvent){
    if (nextEvent.character === 'NEWLINE'){
        //create a new AceRange from the end of the starting line to the beginning of the next line
        //remove characters in that range from the Ace editor
        playbackData.editors[nextEvent.fileId].getSession().remove(new AceRange(nextEvent.lineNumber-1, nextEvent.column-1,nextEvent.lineNumber, 0));
    }
    else if (nextEvent.character.length === 1){
        //create a new AceRange from the index of the character to the index + 1
        //remove takes a range with an inclusive start and non-inclusive end
        //remove that range from the Ace editor
        playbackData.editors[nextEvent.fileId].getSession().remove(new AceRange(nextEvent.lineNumber-1, nextEvent.column-1,nextEvent.lineNumber-1, nextEvent.column));
    }
}

//when a createFileEvent is encountered while stepping forward
//or a deleteFileEvent is encountered while stepping backwards
//this function is called to handle all necessary operations
function createFileEvent(nextEvent){
    //Create a new tab
    //create a new item in the list of tabs 
    const newListItem = document.createElement('li');
    //allows use in navigation
    newListItem.classList.add('nav-item');
    //link the tab to the file thats its holding
    newListItem.setAttribute('id', nextEvent.fileId);     

    //sets up a link between the tab and the panel it will display
    const newLinkTag = document.createElement('a');
    newLinkTag.classList.add('nav-link');
    newLinkTag.classList.add('st-editor-tab');

    //setting the id of the tab for future access
    //allows for renaming of tabs in the event of a file name change
    newLinkTag.setAttribute('id', `${nextEvent.fileId}-tab`);

    //points this tab to the Ace editor it will display
    //the div that this points to is created below
    newLinkTag.href = `#${nextEvent.fileId}-editor-container`;
    newLinkTag.setAttribute('role', 'tab');
    newLinkTag.setAttribute('data-toggle', 'tab');

    //sets the tab text to the filePath of the new file
    newLinkTag.innerText = nextEvent.filePath;

    //switches currently active editor on tab switch
    newLinkTag.addEventListener('click', event => {
        //store the active editor file id
        playbackData.activeEditorFileId = nextEvent.fileId;
    });

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
    contentPanel.setAttribute('id', `${nextEvent.fileId}-editor-container`);
    //adding the tab-pane class so the div can be displayed correctly by the newLinkTag
    contentPanel.classList.add('tab-pane');
    contentPanel.classList.add('st-editor-tab-pane');
    //give the codeDiv and unique id so Ace can work with it
    codeDiv.setAttribute('id', `${nextEvent.fileId}-code`);
    //give the codeDiv the playbackWindow class
    //this is a style that specifies the height of the div
    //which is necessary for Ace to display code
    codeDiv.classList.add('playbackWindow');

    //attach codeDiv to contentPanel
    contentPanel.appendChild(codeDiv);
    //attach the contentPanel to the tab-content div
    tabContent.appendChild(contentPanel);

    //create a new editor pointing to the code div
    createAceEditor(codeDiv, nextEvent.filePath, nextEvent.fileId);
}

//when a createFileEvent is encountered while stepping backwards
//or a deleteFileEvent is encountered while stepping forwards
function deleteFileEvent(nextEvent){
    //delete the editor that is no longer being used
    delete playbackData.editors[nextEvent.fileId];

    //Delete the div in tabContent
    let tabPane = document.getElementById(`${nextEvent.fileId}-editor-container`);
    tabPane.parentNode.removeChild(tabPane);

    //delete the tab from tabList
    let fileTab = document.getElementById(nextEvent.fileId);
    fileTab.parentNode.removeChild(fileTab);;
}

function addFocusToTab(fileId)
{
    //if a tab other than the active one should get the focus
    if(playbackData.activeEditorFileId !== fileId) {
        //get the current active tab and content 
        const currentActiveTabs = document.getElementsByClassName('st-editor-tab active');
        const currentActiveContents = document.getElementsByClassName('st-editor-tab-pane active');
        //if there is an active editor (there should only ever be one of these)
        while(currentActiveTabs[0] && currentActiveContents[0]) {
            //remove active class from the old tab and content pane
            currentActiveTabs[0].classList.remove('active');
            currentActiveContents[0].classList.remove('active');
        }

        //get the tab and content to make active
        const tabToFocus = document.getElementById(`${fileId}-tab`);
        const content = document.getElementById(`${fileId}-editor-container`);
        //add active class to the new tab and content pane
        tabToFocus.classList.add('active');
        content.classList.add('active');

        //set the current active file id
        playbackData.activeEditorFileId = fileId;
    }
}