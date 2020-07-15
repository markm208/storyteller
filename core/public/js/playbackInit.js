//this is a sample js file that can be served for playback. All js files added
//for playback should be placed in /core/public/js/ and the storyteller server
//will serve these. 

//We can use classes here instead of plain functions

async function initializePlayback()
{
    try {
        const playbackInfo = await Promise.all([
            fetch('/event'),
            fetch('/comment')

        ]);
        

        const results = await Promise.all([
            playbackInfo[0].json(),
            playbackInfo[1].json()
        ]);
       

        playbackData.events = results[0];
        playbackData.comments = results[1];

        //displays all comments
        displayAllComments();

        console.log(playbackData.comments);
        playbackData.numEvents = playbackData.events.length;
        setupEventListeners();

        //grab any existing media from the server and display it in the media control modal
        initImageGallery();
    } catch(err) {
        console.log(`Error retrieving data`);
    } 
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
        //DEBUG
        // console.log(`slide: ${playbackSlider.value}`);
        
        //take the slider value and subtract the next event's position
        step(Number(playbackSlider.value) - playbackData.nextEventPosition);
    });

    //focus in the comment text area
    document.querySelector('#textCommentTextArea').addEventListener('focus', event => {
        //if the default text is in the comment area
        if(event.target.innerHTML.trim() === 'Comment text') {
            //empty out the comment area
            event.target.classList.remove('st-comment-placeholder');
            event.target.innerHTML = '';
        }
    });
    //losing focus in the comment text area
    document.querySelector('#textCommentTextArea').addEventListener('blur', event => {
        //if there isn't anything from the user in the comment area
        if(event.target.innerHTML.trim() === '') {
            //put the placeholder back
            event.target.classList.add('st-comment-placeholder');
            event.target.innerHTML = 'Comment text';
        }
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
    document.querySelector('#linkCommentButton').addEventListener('click', event => {
        //get the url from the input
        const linkURL = document.getElementById('commentLinkInput').value.trim();
        document.getElementById('commentLinkInput').value = '';
        //make the selected text a link
        document.execCommand('createLink', null, linkURL);
    });
    
    document.querySelector('#addCommentButton').addEventListener('click', event =>{        
        
        const textCommentTextArea = document.querySelector('#textCommentTextArea');

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
        
        //get all images associated with this comment
        const commentImages = playbackData.mediaForNewComment[0];

        //get all videos associated with this comment
        const commentVideos = playbackData.mediaForNewComment[1];

        //get all audio files associated with this comment
        const commentAudios = playbackData.mediaForNewComment[2];

        //console.log(playbackData.mediaForNewComment);

        //if there was a comment, or at least one media file
        if (commentText || commentImages.length || commentVideos.length || commentAudios.length)
        {
            //get the event to playback this comment
            let eventIndex = playbackData.nextEventPosition - 1;

            let commentEvent;

            if (eventIndex >= 0)
            {
                commentEvent = playbackData.events[eventIndex];
            }
            else
            {
                commentEvent = {id: 'ev--1', eventSequenceNumber: -1};
            }
          
            //create an object that has all of the comment info
            const comment = {
                commentText,
                timestamp: new Date().getTime(),
                displayCommentEvent: commentEvent,
                selectedCodeBlocks: rangeArray,            
                imageURLs: playbackData.mediaForNewComment[0],
                videoURLs: playbackData.mediaForNewComment[1],
                audioURLs: playbackData.mediaForNewComment[2]
            };        

            //determine if any comments already exist for this event 
            //if so add the new comment
            //if not create a new array for the comments then add the comments
            if (!playbackData.comments[commentEvent.id]){
                playbackData.comments[commentEvent.id] = [];
            }
            playbackData.comments[commentEvent.id].push(comment);
            
            //clear out the text area
            textCommentTextArea.innerHTML = '';
        
            sendCommentToServer(comment);        

            //display a newly added comment on the current event
            displayAllComments();

            //clear out any images uploaded for this comment
            playbackData.mediaForNewComment = [[],[],[]];

            //reset the comment previews
            $('.audio-preview')[0].style.display='none';
            $('.audio-preview')[0].innerHTML = '';
            $('.video-preview')[0].style.display='none';
            $('.video-preview')[0].innerHTML = '';
            $('.image-preview')[0].style.display='none';
            $('.image-preview')[0].innerHTML = '';
        }
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
       
        if (keyPressed === 'ArrowRight'){
            if (!shiftPressed)
            {
                step(1);
            }
        }
        else if (keyPressed === 'ArrowLeft'){
            if (!shiftPressed)
            {
                step(-1);
            }
        }
        else if (keyPressed === '>')
        {
            playPauseButton.click();
        }
        else if (keyPressed === '<')
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
}

//send the comment object to the server
async function sendCommentToServer(comment){
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
           console.log('Success');
        } else {
            console.log('Error with the response data');
        }
        
    } catch (error) {
        console.log('Error with the POST');
    }    
}

function doDrag(e){    
    const wrapper = dragBar.closest('.wrapper');
    const boxA = wrapper.querySelector('.box');

    // Get offset
    const containerOffsetLeft = wrapper.offsetLeft;
    
    // Get x-coordinate of pointer relative to container
    let pointerRelativeXpos = e.clientX - containerOffsetLeft;

    if (pointerRelativeXpos > screen.width * .1 && pointerRelativeXpos < screen.width * .75) {        
        boxA.style.width = e.pageX + 'px';
        boxA.style.flexGrow = 0;
        $('#codePanel').css('width', screen.width - pointerRelativeXpos);
        commentsDiv.style.width = e.pageX + 'px';
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
