//this is a sample js file that can be served for playback. All js files added
//for playback should be placed in /core/public/js/ and the storyteller server
//will serve these. 

//We can use classes here instead of plain functions

async function InitializePlayback()
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
        AddEventListeners();
     

        //grab any existing media from the server and display it in the media control modal
        initImageGallery();
    } catch(err) {
        console.log(`Error retrieving data`);
    }
 
}

function AddEventListeners()
{
    //get the controls
    const stepBackOne = document.getElementById("stepBackOne");
    const stepForwardOne = document.getElementById("stepForwardOne");
    const restartButton = document.getElementById("restartButton");
    const playbackSlider = document.getElementById("playbackSlider");
    const highlightButton = document.getElementById("highlightButton");

    //Get references to the tabs and where the tabs get their content
    const tabsList = document.getElementById("tabsList");
    const tabContent = document.getElementById("tabContent");

    playbackSlider.setAttribute("max", playbackData.numEvents);
    
    //add event handlers for clicking the buttons
    stepBackOne.addEventListener("click", event => {
        step(-1);
    });

    stepForwardOne.addEventListener("click", event => {
        step(1);
    });

    //The restart will be depreciated soon
    restartButton.addEventListener("click", event => {
        
        //reset the next event and the slider
        playbackData.nextEventPosition = 0;
        playbackSlider.value = 0;

        //for measuring which approach is faster
        //get the starting timestamp
        const t0 = performance.now();

        editor.setValue("");

        //get the ending timestamp
        const t1 = performance.now();

        //print the duration in ms
        console.log(`Reset took: ${(t1 - t0)} ms`);
    });

    //add event handler to listen for changes to the slider
    playbackSlider.addEventListener("input", event => {
        //DEBUG
        // console.log(`slide: ${playbackSlider.value}`);
        
        //take the slider value and subtract the next event's position
        step(playbackSlider.value - playbackData.nextEventPosition);
    });

    highlightButton.addEventListener("click", event =>{
        //get the selected code
        //const selection = editor.getSession().getSelection().getRange();
        const selections = editor.getSession().getSelection().getAllRanges();

        //clear any existing highlights
        clearHighlights();
        
        for (let i = 0; i < selections.length; i++){
            //add the highlight to the selected code
            addHighlight(selections[i].start.row, selections[i].start.column, selections[i].end.row, selections[i].end.column);
        }
    });

    document.querySelector("#addCommentButton").addEventListener("click", event =>{
        
        var textCommentTextArea = document.querySelector("#textCommentTextArea");

        var commentText = textCommentTextArea.value.trim();

        //get all selected ranges from Ace    
        //builds an array of ranges   
        const ranges = editor.getSession().getSelection().getAllRanges();
        var rangeArray = [];
        for (let i = 0; i < ranges.length; i++){
            var rangeObj = {};
            rangeObj.startRow = ranges[i].start.row
            rangeObj.startColumn = ranges[i].start.column;
            rangeObj.endRow = ranges[i].end.row;
            rangeObj.endColumn = ranges[i].end.column;
            rangeArray.push(rangeObj);
        }

  
        //get all selected text from Ace
        const selectedText = editor.getSelectedText();
        


        //get all images associated with this comment

        //if there was a comment, some selected text, or at least one image
        

        //get the event to playback this comment
        var eventIndex = playbackData.nextEventPosition > 0  ? playbackData.nextEventPosition -1: 0;
        var commentEvent = playbackData.events[eventIndex];

        //create an object that has all of the comment info
        var comment = {
            commentText,
            timestamp: new Date().getTime(),
            displayCommentEvent: commentEvent,
            selectedCodeText: selectedText,
            selectedCodeBlocks: rangeArray,            
            imageURLs: [],
            videoURLs: [],
            audioURLs: []
        };        

        //determine if any comments already exist for this event 
        //if so add the new comment
        //if not create a new array for the comments then add the comments
        if (!playbackData.comments[commentEvent.id]){
            playbackData.comments[commentEvent.id] = [];
        }
        playbackData.comments[commentEvent.id].push(comment);
        
        //clear out the text area
        textCommentTextArea.value = "";
       
        sendCommentToServer(comment);        

        //display a newly added comment on the current event
        displayAllComments();

        //clear out any images uploaded for this comment

    });

    //send the comment object to the server
    async function sendCommentToServer(comment){
        try {
            const fetchConfigData = {
                method: "POST",
                body: JSON.stringify(comment), 
                headers: {
                    "Content-Type": "application/json"
                }
            };
            const response = await fetch("/comment", fetchConfigData);

            //check the response
            if(response.ok) {
               console.log("Success");
            } else {
                console.log("Error with the response data");
            }
            
        } catch (error) {
            
        }    
    }

    document.getElementById("handler").addEventListener('mousedown', function (e){  
        //add listeners for moving and releasing the drag and disable selection of text  
        window.addEventListener('selectstart', disableSelect);
        document.documentElement.addEventListener('mousemove', doDrag, false);
        document.documentElement.addEventListener('mouseup', stopDrag, false);
    });

    function doDrag(e){    
        var wrapper = handler.closest('.wrapper');
        var boxA = wrapper.querySelector('.box');

        // Get offset
        var containerOffsetLeft = wrapper.offsetLeft;
        
        // Get x-coordinate of pointer relative to container
        var pointerRelativeXpos = e.clientX - containerOffsetLeft;

        if (pointerRelativeXpos > screen.width * .1 && pointerRelativeXpos < screen.width * .75) {        
            boxA.style.width = e.pageX + 'px';
            boxA.style.flexGrow = 0;
            $('#codePanel').css("width", screen.width - pointerRelativeXpos);
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

    //detects key presses 
    document.addEventListener('keydown', function(e){
        let keyPressed = e.key;
        let shiftPressed = e.shiftKey;

        if (keyPressed == "ArrowRight"){
            if (shiftPressed){
                
            }
            else{
                step(1);
            }
        }
        else if (keyPressed == "ArrowLeft"){
            if (shiftPressed){
                
            }
            else{
                step(-1);
            }
        }
    });
}