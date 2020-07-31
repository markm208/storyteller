//this is a sample js file that can be served for playback. All js files added
//for playback should be placed in /core/public/js/ and the storyteller server
//will serve these. 

//We can use classes here instead of plain functions

async function initializePlayback()
{
    try {
        const playbackInfo = await Promise.all([
            fetch('/event'),
            fetch('/comment'),
            fetch('/playbackEditable'),
            fetch('/developer'),
            fetch('/developerGroup'),
            fetch('/project')

        ]);
        

        const results = await Promise.all([
            playbackInfo[0].json(),
            playbackInfo[1].json(),
            playbackInfo[2].json(),
            playbackInfo[3].json(),
            playbackInfo[4].json(),
            playbackInfo[5].json()
        ]);       

        playbackData.events = results[0];
        playbackData.comments = results[1];
        playbackData.numEvents = playbackData.events.length;
        playbackData.isEditable = results[2].editable;
        playbackData.developers = results[3];
        playbackData.developerGroups = results[4];
        playbackData.playbackTitle = results[5].title;

        if (!playbackData.comments['ev--1'])
        {
            const newDescription = createCommentObject('Insert DESCRIPTION here.', {id: 'ev--1', eventSequenceNumber: -1}, [], [], [], []);

            const descrFromServer = await sendCommentToServer(newDescription);

            playbackData.comments['ev--1'] = [];
            playbackData.comments['ev--1'].push(descrFromServer);

        }

        console.log(playbackData.comments);

        //displays all comments
        displayAllComments();

        //Sets up the event listeners for html elements on the page
        setupEventListeners();

        //grab any existing media from the server and display it in the media control modal
        initImageGallery();

        console.log('Success Initializing Playback');

    } catch(err) {
        console.log(`Error retrieving data`);
    } 
}

// Puts together a full comment object to be pushed to the server
function createCommentObject(commentText, dspEvent, selectedCode, imgURLs, vidURLs, audioURLs)
{
    const comment = {
        commentText,
        timestamp: new Date().getTime(),
        displayCommentEvent: dspEvent,
        selectedCodeBlocks: selectedCode,            
        imageURLs: imgURLs,
        videoURLs: vidURLs,
        audioURLs: audioURLs
    };    

    return comment;
}

function setupEventListeners()
{
    //get the controls
    const stepBackOne = document.getElementById("stepBackOne");
    const stepForwardOne = document.getElementById("stepForwardOne");
    const playbackSlider = document.getElementById("playbackSlider");
    const playPauseButton = document.getElementById("playPauseButton");

    const topBar = document.getElementById('top-bar');

    //Get references to the tabs and where the tabs get their content
    const tabsList = document.getElementById('tabsList');
    const tabContent = document.getElementById('tabContent');

    playbackSlider.setAttribute('max', playbackData.numEvents);
    playbackSlider.setAttribute('min', 0);
    
    //add event handlers for clicking the buttons
    stepBackOne.addEventListener('click', event => {
        step(-1);
    });

    stepForwardOne.addEventListener('click', event => {
        step(1);
    });

    //add event handler to listen for changes to the slider
    playbackSlider.addEventListener('input', event => {

        //take the slider value and subtract the next event's position
        step(Number(playbackSlider.value) - playbackData.nextEventPosition);
    });

    //Setup the title buttons and data
    const playbackTitleDiv = document.getElementById('playbackTitleDiv');
    playbackTitleDiv.innerHTML = playbackData.playbackTitle;
    const editTitleButton = document.getElementById('editTitleButton');

    editTitleButton.classList.add("btn", "btn-outline-dark", "btn-sm");

    const acceptTitleChanges = document.getElementById('acceptTitleChanges');
    acceptTitleChanges.classList.add("btn", "btn-outline-dark", "btn-sm");
    acceptTitleChanges.style.display = "none";

    editTitleButton.addEventListener('click', event => {
        playbackTitleDiv.setAttribute("contenteditable", "true");

        editTitleButton.style.display = "none";
        acceptTitleChanges.style.display = "inline-block";
    });

    acceptTitleChanges.addEventListener('click', event => {

        const titleData = playbackTitleDiv.innerHTML;

        updateTitle(titleData);

        playbackData.playbackTitle = titleData;

        const titleCardHeader = document.getElementById('descriptionHeader');
        titleCardHeader.innerHTML = playbackData.playbackTitle;

        playbackTitleDiv.setAttribute("contenteditable", "false");

        acceptTitleChanges.style.display = "none";
        editTitleButton.style.display = "inline-block";

    });

    if (!playbackData.isEditable)
    {
        editTitleButton.style.display = 'none';
        acceptTitleChanges.style.display = 'none';
    }

    //bold button
    document.querySelector('#boldCommentButton').addEventListener('click', event => {
        //make the selected text bold
        document.execCommand('bold');
    });
    //italics button
    document.querySelector('#italicCommentButton').addEventListener('click', event => {
        //make the selected text italic
        document.execCommand('italic');
    });
    //code button
    document.querySelector('#codeCommentButton').addEventListener('click', event => {
        //make the selected text look like code by using a fixed width font
        document.execCommand('fontName', null, 'Courier');
    });

    //add a link
    let selectedRange = {};
    document.querySelector('#linkCommentButton').addEventListener('click', event => {       
        const textArea = $('#textCommentTextArea')[0].firstChild;
        const selectedText = window.getSelection();
        const tempRange =  selectedText.getRangeAt(0);
        const selectedTextString = selectedText.toString();
        selectedRange = tempRange.cloneRange();       

        //check to make sure there is selected text and it is in the textArea
        if ((selectedText.anchorNode.parentElement.parentElement.id === 'textCommentTextArea' || selectedText.containsNode(textArea)) && selectedTextString){
            const toastDiv = document.getElementById('URL-Toast'); 

            //removes style="display: none"
            toastDiv.removeAttribute('style');

            toastDiv.style.position = "absolute";
            toastDiv.style.zIndex = "100";
            toastDiv.style.width = 500 + 'px';
    
            //sets the position of the toast to just under the linkCommentButton
            const commentButtonRectangle = document.querySelector('#linkCommentButton').getBoundingClientRect();
            toastDiv.style.top = commentButtonRectangle.y + 20 +'px';
            toastDiv.style.left = commentButtonRectangle.left + 'px';
            
            //show and focus the toast
            $('.toast').toast('show');
            document.getElementById('URL').focus();
        }
    });

    //event listener for when the toast to add a link is confirmed
    document.querySelector('#URL-Confirm').addEventListener('click', event => {
        const URLInput = document.getElementById('URL').innerText;
        if (URLInput){

            //hide the toast
            $('.toast').toast('hide');
            const windowSelection = window.getSelection();

            //restores the original selection
            windowSelection.removeAllRanges();
            windowSelection.addRange(selectedRange);
            
            //creates the link
            document.execCommand('createLink', null, URLInput);

            windowSelection.removeAllRanges();
            //clear the toast for next use
            URLInput.innerHTML = "";
        }
    });  

    document.querySelector('#URL-Close').onclick = function(){
        //cancel. so clear the toast
        document.getElementById('URL').innerHTML = "";
    };

    document.querySelector('#addCommentButton').addEventListener('click', async event =>{        
        
        const textCommentTextArea = document.getElementById('textCommentTextArea');
        
        //getting all video files in order
        const videoFiles = document.getElementsByClassName('video-preview')[0].children;
        const currentVideoOrder = [];
        for (let i = 0; i < videoFiles.length; i++){
            if (videoFiles[i].classList.contains("card") ){
                currentVideoOrder.push(videoFiles[i].querySelector('[src]').getAttribute("src"));
            }
        }

        //getting all audio files in order
        const audioFiles = document.getElementsByClassName('audio-preview')[0].children;
        const currentAudioOrder = [];
        for (let i = 0; i < audioFiles.length; i++){
            if (audioFiles[i].classList.contains("card") ){
                currentAudioOrder.push(audioFiles[i].querySelector('[src]').getAttribute("src"));
            }
        }

        //getting all image files in order
        const imageFiles = document.getElementsByClassName('image-preview')[0].children;
        const currentImageOrder = [];
        for (let i = 0; i < imageFiles.length; i++){
            if (imageFiles[i].classList.contains("image-div") ){
                currentImageOrder.push(imageFiles[i].querySelector('[src]').getAttribute("src"));
            }
        }

        //get all text and html from the comment text box
        const commentText = textCommentTextArea.innerHTML;

        //get the active editor
        const editor = playbackData.editors[playbackData.activeEditorFileId] ? playbackData.editors[playbackData.activeEditorFileId] : playbackData.editors[''];

        //get any selected text 
        const ranges = editor.getSession().getSelection().getAllRanges();

        let rangeArray = [];
        for (let i = 0; i < ranges.length; i++){
            let rangeObj = {};
            rangeObj.fileId = playbackData.activeEditorFileId,
            rangeObj.selectedText = editor.getSession().getTextRange(ranges[i]),
            rangeObj.startRow = ranges[i].start.row
            rangeObj.startColumn = ranges[i].start.column;
            rangeObj.endRow = ranges[i].end.row;
            rangeObj.endColumn = ranges[i].end.column;
            rangeArray.push(rangeObj);
        }  
       
        //if there was a comment, or at least one media file
        if (commentText || currentImageOrder.length || currentVideoOrder.length || currentAudioOrder.length)
        {
            //get the event to playback this comment
            let eventIndex = playbackData.nextEventPosition - 1;

            let commentEvent;

            //accounts for comments at event -1
            if (eventIndex >= 0)
            {
                commentEvent = playbackData.events[eventIndex];
            }
            else
            {
                commentEvent = {id: 'ev--1', eventSequenceNumber: -1};
            }
          
            //create an object that has all of the comment info
            const comment = createCommentObject(commentText, commentEvent, rangeArray, currentImageOrder, currentVideoOrder, currentAudioOrder)

            //determine if any comments already exist for this event 
            //if so add the new comment
            //if not create a new array for the comments then add the comments
            if (!playbackData.comments[commentEvent.id]){
                playbackData.comments[commentEvent.id] = [];
            }

            //send comment to server and recieve back a full comment with id and developerGroup
            const newComment = await sendCommentToServer(comment);        

            playbackData.comments[commentEvent.id].push(newComment);
            //display a newly added comment on the current event
            displayAllComments();
            updateAllCommentHeaderCounts();
            document.getElementById("CancelUpdateButton").click();
        }
    });

    document.getElementById("CancelUpdateButton").addEventListener('click', event => {


        const imagePreviewDiv = document.getElementsByClassName("image-preview")[0];
        const audioPreviewDiv = document.getElementsByClassName("audio-preview")[0];
        const videoPreviewDiv = document.getElementsByClassName("video-preview")[0];
        //reset the comment previews
        audioPreviewDiv.style.display='none';
        audioPreviewDiv.innerHTML = '';
        videoPreviewDiv.style.display='none';
        videoPreviewDiv.innerHTML = '';
        imagePreviewDiv.style.display='none';
        imagePreviewDiv.innerHTML = '';

        //clear out the text area
        textCommentTextArea.innerHTML = '';

        document.getElementById("addCommentButton").removeAttribute("style");


        document.getElementById("UpdateCommentButton").style.display='none';
        document.getElementById("fsViewTabTab").classList.remove("disabled");
        document.getElementById("viewCommentsTab").classList.remove("disabled");

        document.getElementById("viewCommentsTab").click();      
    });

    document.getElementById('dragBar').addEventListener('mousedown', function (e){  
    
        //add listeners for moving and releasing the drag and disable selection of text  
        window.addEventListener('selectstart', disableSelect);
        document.documentElement.addEventListener('mousemove', doDrag, false);
        document.documentElement.addEventListener('mouseup', stopDrag, false);
    });

    //detects key presses 
    document.addEventListener('keydown', function(e){    

        if (e.target.id === 'textCommentTextArea' || e.target.id === 'playbackTitleDiv'){
            //prevent keyboard presses within the comment textbox from triggering actions 
            return;
        }
       
        let keyPressed = e.key;
        let shiftPressed = e.shiftKey;
        let ctrlPressed = e.ctrlKey;
       
        if (keyPressed === 'ArrowRight'){
            if (!shiftPressed)
            {
                if (ctrlPressed)
                {
                    //ctrl right is jump to end of playback
                    playPauseButton.click();
                }
                else
                {
                    //right arrow steps forward one event
                    step(1);
                }
            }
            else
            {
                if (ctrlPressed)
                {
                    step(playbackData.events.length - playbackData.nextEventPosition);
                }
            }
        }
        else if (keyPressed === 'ArrowLeft'){
            if (!shiftPressed)
            {
                if (ctrlPressed)
                {
                    //ctrl left is jump to the beginning of the playback
                    jumpToPreviousComment();
                }
                else
                {
                    //left arrow steps back one event
                    step(-1);
                }
            }
            else
            {
                if (ctrlPressed)
                {
                    step(-playbackData.nextEventPosition);
                }
            }
        }

    });

    playPauseButton.addEventListener('click', event =>{
        //generate a list of all commentCards
        const allCommentCards = [...document.getElementsByClassName("commentCard")];

        //get the currently selected card, if any
        const selectedComment = document.getElementsByClassName("activeComment")[0];

        let eventNum = Number(playbackSlider.value) - 1;
        let commentBlock;

        //try to find the commentBlock of the event. if one does not exist, try to find the comment block of the next event that has one
        while (!commentBlock && eventNum < playbackData.numEvents){
            commentBlock = playbackData.comments["ev-" + eventNum];
            if (eventNum++ === -1 && commentBlock.length === 1){
                commentBlock = null;
            }
        }
        
        let activeComment;

        //if no comment is selected
        if (commentBlock && !selectedComment){
            const eventId = commentBlock[0].displayCommentEvent.id;
            const indexOfSelected = allCommentCards.findIndex(item => item.id.includes(eventId));
            activeComment = allCommentCards[indexOfSelected];     
        }
        //if a comment was selected
        else if (commentBlock && selectedComment){
            //find the current active card, and make the next one after it active
            const index = allCommentCards.findIndex(item => item.classList.contains('activeComment'));;
            activeComment = allCommentCards[index + 1];
        }                

        if (activeComment){
            activeComment.click();

            //scroll to the active comment
            document.getElementById("commentContentDiv").scrollTop = activeComment.offsetTop - 100;
        }
        //if activeComment hasn't been assigned, then no comment was found at, or forward of the slider position
        //step to the last event and unselect any selected comment
        else{
            step(playbackData.numEvents - playbackData.nextEventPosition);
            removeActiveCommentAndGroup();            
        }      
    });

    //make the 3 media preview folders droppable
    const imageDrop = document.querySelector('.image-preview');
    imageDrop.addEventListener('dragover', event => {
        //prevents image from opening in new tab in Firefox
        document.body.ondrop = function (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        //determining if the item currently being dragged originated in the image-preview div
        const draggable = imageDrop.querySelector('.dragging');
        if (draggable !== null){
            event.preventDefault();
            const afterElement = getDragAfterElement(imageDrop, event.clientY);
            if (typeof afterElement === 'undefined'){
                imageDrop.appendChild(draggable.parentElement);
            }
            else{
                imageDrop.insertBefore(draggable.parentElement, afterElement.parentElement);
            }            
        }        
    });
    makeDivDroppable($('.video-preview')[0], false);
    makeDivDroppable($('.audio-preview')[0], false);

    document.getElementById("mainAddCommentButton").addEventListener('click', event => {        
        document.getElementById("addCommentTab").click();
        document.getElementById('textCommentTextArea').focus();
        document.getElementById("viewCommentsTab").classList.add("disabled");
        document.getElementById("fsViewTabTab").classList.add("disabled");
        pauseMedia();
    });
    document.getElementById("saveCodeOnlyButton").addEventListener('click', event => {
        zipAndDownloadCodeOnly();
    });
    document.getElementById("saveCodeAndHistoryButton").addEventListener('click', event => {
        zipAndDownloadCodeWithHistory();
    });
    document.getElementById("saveCodeAtCommentsButton").addEventListener('click', event => {
        zipAndDownloadCodeOnlyWithHistoryAtComments();
    });

    $('#deleteMediaButton').popover('disable')


    $('#deleteMediaButton').on("hidden.bs.popover", function(e){
        $('#deleteMediaButton').popover("disable");
    });
}

function jumpToPreviousComment()
{
    //generate a list of all commentCards
    const allCommentCards = [...document.getElementsByClassName("commentCard")];

    //get the currently selected card, if any
    const selectedComment = document.getElementsByClassName("activeComment")[0];

    let eventNum = Number(playbackSlider.value) - 1;
    let commentBlock;

    //try to find the commentBlock of the event. if one does not exist, try to find the comment block of the next event that has one
    while (!commentBlock && eventNum >= 0){
        commentBlock = playbackData.comments["ev-" + eventNum--];
    }
    
    let activeComment;

    //if no comment is selected
    if (commentBlock && !selectedComment){
        const eventId = commentBlock[0].displayCommentEvent.id;
        const indexOfSelected = allCommentCards.reverse().findIndex(item => item.id.includes(eventId));
        activeComment = allCommentCards[indexOfSelected];     
    }
    //if a comment was selected
    else if (commentBlock && selectedComment){
        //find the current active card, and make the previous one active
        const index = allCommentCards.findIndex(item => item.classList.contains('activeComment'));;
        activeComment = allCommentCards[index - 1];
    }                

    if (activeComment){
        activeComment.click();

        //scroll to the active comment
        document.getElementById("commentContentDiv").scrollTop = activeComment.offsetTop - 100;
    }
    //if activeComment hasn't been assigned, then no comment was found at, or forward of the slider position
    //step to the last event and unselect any selected comment
    else{
        step(-playbackData.nextEventPosition);
        removeActiveCommentAndGroup();            
    }      
}

function getDragAfterElement(container, y){
    const draggableElements = [...container.querySelectorAll('.draggable:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {

        //gives us the dimensions of the box
        const box = child.getBoundingClientRect();

        //getting the center of the box
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset){
            return {offset: offset, element: child};
        }
        else{
            return closest;
        }
    },{offset: Number.NEGATIVE_INFINITY}).element
}

//send the comment object to the server and recieve a complete comment back with id and developerGroup
async function sendCommentToServer(comment){
    let newComment;
    try {
        const fetchConfigData = {
            method: 'POST',
            body: JSON.stringify(comment), 
            headers: {
                'Content-Type': 'application/json'
            }
        };
        const response = await fetch('/comment', fetchConfigData);
        
        //check the response
        if(response.ok) {
            newComment = await response.json();
            console.log('Success');
        } else {
            console.log('Error with the response data');
        }
        
    } catch (error) {
        console.log('Error with the POST');
    }    
    return newComment;
}

//send the comment object to the server
async function updateCommentPositionOnServer(commentPositionObject){
    try {
        const fetchConfigData = {
            method: 'PUT',
            body: JSON.stringify(commentPositionObject), 
            headers: {
                'Content-Type': 'application/json'
            }
        };
        const response = await fetch('/commentPosition', fetchConfigData);

        //check the response
        if(response.ok) {
           console.log('Success');
        } else {
            console.log('Error with the response data');
        }
        
    } catch (error) {
        console.log('Error with the Position Change');
    }    
}

//delete a comment from the server
async function deleteCommentFromServer(comment){
    try {
        const fetchConfigData = {
            method: 'DELETE',
            body: JSON.stringify(comment), 
            headers: {
                'Content-Type': 'application/json'
            }
        };
        const response = await fetch('/comment', fetchConfigData);

        //check the response
        if(response.ok) {
           console.log('Success');
        } else {
            console.log('Error with the response data');
        }
        
    } catch (error) {
        console.log('Error with the Deletion');
    }    
}

//send the comment object to the server
async function updateCommentOnServer(commentObject){
    let newComment;
    try {
        const fetchConfigData = {
            method: 'PUT',
            body: JSON.stringify(commentObject), 
            headers: {
                'Content-Type': 'application/json'
            }
        };
        const response = await fetch('/comment', fetchConfigData);

        //check the response
        if(response.ok) {
            newComment = await response.json();
            console.log('Success');
        } else {
            console.log('Error with the response data');
        }
        
    } catch (error) {
        console.log('Error with the Comment Change');
    } 
    return newComment;   
}

//send the comment object to the server
async function updateTitleOnServer(newTitle){
    try {
        const fetchConfigData = {
            method: 'PUT',
            body: JSON.stringify({title: newTitle}), 
            headers: {
                'Content-Type': 'application/json'
            }
        };
        const response = await fetch('/project', fetchConfigData);

        //check the response
        if(response.ok) {
            console.log('Success');
        } else {
            console.log('Error with the response data');
        }
        
    } catch (error) {
        console.log('Error with the Comment Change');
    }   
}

function doDrag(event){    
    const wrapper = dragBar.closest('.wrapper');
    const boxA = wrapper.querySelector('.box');
    const addCommentPanel = document.getElementById('addCommentPanel');

    // Get offset
    const containerOffsetLeft = wrapper.offsetLeft;
    
    // Get x-coordinate of pointer relative to container
    let pointerRelativeXpos = event.clientX - containerOffsetLeft;

    if (pointerRelativeXpos > screen.width * .1 && pointerRelativeXpos < screen.width * .75) {        
        boxA.style.width = event.pageX + 'px';
        boxA.style.flexGrow = 0;
        $('#codePanel').css('width', screen.width - pointerRelativeXpos);
        commentsDiv.style.width = event.pageX + 'px';
        addCommentPanel.style.width = event.pageX + 'px';
        document.getElementById("fsViewPanel").style.width = event.pageX + 'px';
    }
}

function stopDrag(event){       
    //remove the listeners for dragging movement 
    document.documentElement.removeEventListener('mouseup', stopDrag, false);
    document.documentElement.removeEventListener('mousemove', doDrag, false);  
    window.removeEventListener('selectstart', disableSelect);  
}

//disables mouse selection of text
function disableSelect(event) {
    event.preventDefault();
}

async function updateComment(commentObject){
    const textCommentTextArea = document.querySelector('#textCommentTextArea');

    //getting all video files in order
    const videoFiles = document.getElementsByClassName('video-preview')[0].children;
    const currentVideoOrder = [];
    for (let i = 0; i < videoFiles.length; i++){
        if (videoFiles[i].classList.contains("card") ){
            currentVideoOrder.push(videoFiles[i].querySelector('[src]').getAttribute("src"));
        }
    }

    //getting all audio files in order
    const audioFiles = document.getElementsByClassName('audio-preview')[0].children;
    const currentAudioOrder = [];
    for (let i = 0; i < audioFiles.length; i++){
        if (audioFiles[i].classList.contains("card") ){
            currentAudioOrder.push(audioFiles[i].querySelector('[src]').getAttribute("src"));
        }
    }

    //getting all image files in order
    const imageFiles = document.getElementsByClassName('image-preview')[0].children;
    const currentImageOrder = [];
    for (let i = 0; i < imageFiles.length; i++){
        if (imageFiles[i].classList.contains("image-div") ){
            currentImageOrder.push(imageFiles[i].querySelector('[src]').getAttribute("src"));
        }
    }

    //get all text and html from the comment text box
    const commentText = textCommentTextArea.innerHTML;

    //get the active editor
    const editor = playbackData.editors[playbackData.activeEditorFileId] ? playbackData.editors[playbackData.activeEditorFileId] : playbackData.editors[''];

    //get any selected text 
    const ranges = editor.getSession().getSelection().getAllRanges();

    let rangeArray = [];
    for (let i = 0; i < ranges.length; i++){
        let rangeObj = {};
        rangeObj.fileId = playbackData.activeEditorFileId,
        rangeObj.selectedText = editor.getSession().getTextRange(ranges[i]),
        rangeObj.startRow = ranges[i].start.row
        rangeObj.startColumn = ranges[i].start.column;
        rangeObj.endRow = ranges[i].end.row;
        rangeObj.endColumn = ranges[i].end.column;
        rangeArray.push(rangeObj);
    }  
   
    //if there was a comment, or at least one media file
    if (commentText || currentImageOrder.length || currentVideoOrder.length || currentAudioOrder.length)
    {     
      
        //create an object that has all of the comment info
        const comment = createCommentObject(commentText, commentObject.displayCommentEvent, rangeArray, currentImageOrder, currentVideoOrder, currentAudioOrder)
        //add the developer group id to the comment object and its id
        comment.developerGroupId = commentObject.developerGroupId;
        comment.id = commentObject.id;

        //determine if any comments already exist for this event 
        //if so add the new comment
        //if not create a new array for the comments then add the comments
        if (!playbackData.comments[comment.displayCommentEvent.id]){
            playbackData.comments[comment.displayCommentEvent.id] = [];
        }

        //send comment to server and recieve back a full comment with id and developerGroup
        const newComment = await updateCommentOnServer(comment);        


        for (let i = newComment.displayCommentEvent.id === -1 ? 2 : 0; i < playbackData.comments[newComment.displayCommentEvent.id].length; i++){
            if (playbackData.comments[newComment.displayCommentEvent.id][i].id === newComment.id){
                playbackData.comments[newComment.displayCommentEvent.id].splice(i , 1, newComment);
                break;
            }
        }

        //clear out the text area
        textCommentTextArea.innerHTML = '';
    

        //display a newly added comment on the current event
        displayAllComments();
      
        //reset the comment previews
        $('.audio-preview')[0].style.display='none';
        $('.audio-preview')[0].innerHTML = '';
        $('.video-preview')[0].style.display='none';
        $('.video-preview')[0].innerHTML = '';
        $('.image-preview')[0].style.display='none';
        $('.image-preview')[0].innerHTML = '';
    }

}


function updateTitle(newTitle){
    updateTitleOnServer(newTitle);
}