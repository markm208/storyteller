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
            fetch('/editComment')

        ]);
        

        const results = await Promise.all([
            playbackInfo[0].json(),
            playbackInfo[1].json(),
            playbackInfo[2].json()
        ]);
       

        playbackData.events = results[0];
        playbackData.comments = results[1];
        playbackData.numEvents = playbackData.events.length;
        playbackData.isEditable = results[2].editable;

        if (!playbackData.comments['ev--1'])
        {
            const newTitle = createCommentObject('Insert TITLE here.', {id: 'ev--1', eventSequenceNumber: -1}, [], [], [], []);
            const newDescription = createCommentObject('Insert DESCRIPTION here.', {id: 'ev--1', eventSequenceNumber: -1}, [], [], [], []);

            const titleFromServer = sendCommentToServer(newTitle);
            const descrFromServer = sendCommentToServer(newDescription);

            playbackData.comments['ev--1'] = [];
            playbackData.comments['ev--1'].push(titleFromServer);
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
            toastDiv.toast('show');
            document.getElementById('URL').focus();
        }
    });

    //event listener for when the toast to add a link is confirmed
    document.querySelector('#URL-Confirm').addEventListener('click', event => {
        const URLInput = document.getElementById('URL').innerText;
        if (URLInput){

            //hide the toast
            document.getElementById('URL-Toast').toast('hide');
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
                currentVideoOrder.push(videoFiles[i].firstChild.firstChild.getAttribute("src"));
            }
        }

        //getting all audio files in order
        const audioFiles = document.getElementsByClassName('audio-preview')[0].children;
        const currentAudioOrder = [];
        for (let i = 0; i < audioFiles.length; i++){
            if (audioFiles[i].classList.contains("card") ){
                currentAudioOrder.push(audioFiles[i].firstChild.firstChild.getAttribute("src"));
            }
        }

        //getting all image files in order
        const imageFiles = document.getElementsByClassName('image-preview')[0].children;
        const currentImageOrder = [];
        for (let i = 0; i < imageFiles.length; i++){
            if (imageFiles[i].classList.contains("image-div") ){
                currentImageOrder.push(imageFiles[i].firstChild.getAttribute("src"));
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

        if (e.target.id === 'textCommentTextArea'){
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
                    step(playbackData.events.length - playbackData.nextEventPosition);
                }
                else
                {
                    //right arrow steps forward one event
                    step(1);
                }
            }
            else
            {
                playPauseButton.click();
            }
        }
        else if (keyPressed === 'ArrowLeft'){
            if (!shiftPressed)
            {
                if (ctrlPressed)
                {
                    //ctrl left is jump to the beginning of the playback
                    step(-playbackData.nextEventPosition);
                }
                else
                {
                    //left arrow steps back one event
                    step(-1);
                }
            }
            else
            {
                jumpToPreviousComment();
            }
        }
        else if (keyPressed === '>')
        {
            playPauseButton.click();
        }
        else if (keyPressed === '<')
        {
            jumpToPreviousComment();
        }
    });

    const playPauseInterval = null;
    playPauseButton.addEventListener('click', event =>{
        //find next event that has a comment
        let targetEvent = -1;
        let commentPositions = Object.keys(playbackData.comments);
        for (let i = playbackData.nextEventPosition; i < playbackData.events.length; i++)
        {
            
            for (let j = 0; j < commentPositions.length; j++)
            {
                if (playbackData.events[i].id === commentPositions[j])
                {
                    targetEvent = playbackData.events[i].id;
                    break;
                }
            }

            if (targetEvent != -1)
                break;
        }

        if (targetEvent < 0)
        {
            targetEvent = playbackData.events[playbackData.events.length-1].eventSequenceNumber;
            
            clearHighlights();
            step(targetEvent - playbackData.nextEventPosition + 1);
        }
        else{

            const commentClickEvent = new MouseEvent('click',{

            });
            let commentToLoad = document.getElementById(`${targetEvent}-0`);

            commentToLoad.dispatchEvent(commentClickEvent);
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
        pauseMedia();
    });

}

function jumpToPreviousComment()
{
    //find next event that has a comment
    let targetEvent = -1;
    let commentPositions = Object.keys(playbackData.comments);
    for (let i = playbackData.nextEventPosition-2; i >= 0; i--)
    {
        
        for (let j = 0; j < commentPositions.length; j++)
        {
            if (playbackData.events[i].id === commentPositions[j])
            {
                targetEvent = playbackData.events[i].id;
                break;
            }
        }

        if (targetEvent != -1)
            break;
    }

    if (targetEvent < 0)
    {
        targetEvent = 0;

        clearHighlights();
        step(targetEvent - playbackData.nextEventPosition + 1);
    }
    else{

        const commentClickEvent = new MouseEvent('click',{

        });
        let commentToLoad = document.getElementById(`${targetEvent}-0`);

        commentToLoad.dispatchEvent(commentClickEvent);
    }
    //console.log(`currentEvent = ${playbackData.nextEventPosition-1}, targetevent = ${targetEvent}`);
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
            currentVideoOrder.push(videoFiles[i].firstChild.firstChild.getAttribute("src"));
        }
    }

    //getting all audio files in order
    const audioFiles = document.getElementsByClassName('audio-preview')[0].children;
    const currentAudioOrder = [];
    for (let i = 0; i < audioFiles.length; i++){
        if (audioFiles[i].classList.contains("card") ){
            currentAudioOrder.push(audioFiles[i].firstChild.firstChild.getAttribute("src"));
        }
    }

    //getting all image files in order
    const imageFiles = document.getElementsByClassName('image-preview')[0].children;
    const currentImageOrder = [];
    for (let i = 0; i < imageFiles.length; i++){
        if (imageFiles[i].classList.contains("image-div") ){
            currentImageOrder.push(imageFiles[i].firstChild.getAttribute("src"));
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


function updateTitle(titleObject){
    updateCommentOnServer(titleObject);
}