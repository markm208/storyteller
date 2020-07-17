function step(numSteps) {
    //clear any existing comment and new code highlights
    clearHighlights();
    clearNewCodeHighlights();
    clearInsertLineNumbers();
    clearDeleteLineNumbers();

    //move forward
    if(numSteps > 0) {
        stepForward(numSteps);
        
        //update the position of the slider
        playbackSlider.value = playbackData.nextEventPosition;
    } else if(numSteps < 0) { //move backward
        stepBackward(-numSteps);

        //update the position of the slider
        playbackSlider.value = playbackData.nextEventPosition;
    } //else- no need to move at all

}

function stepForward(numSteps) {
    //if there is room to move in the forward direction
    if(playbackData.nextEventPosition < playbackData.numEvents) {
        //holds the next event to animate
        let nextEvent;
        
        //the id of the file to make active
        let activeFileId = 'no-file-id';
        
        //timing for debug purposes
        //const t0 = performance.now();

        //only in the forward direction create an object to track and highlight new changes
        const newCodeMarkers = new NewCodeMarkerGenerator();

        //go through the requested number of steps
        for(let i = 0;i < numSteps;i++) {
            //grab the next event to animate
            nextEvent = playbackData.events[playbackData.nextEventPosition];

            //check the event type and call the corresponding function for that event type
            switch (nextEvent.type)
            {
                case 'INSERT':
                //set the active file
                activeFileId = nextEvent.fileId;
                //mark the new code
                newCodeMarkers.insert(nextEvent);
                //call the insertEvent function found in playbackEventFunctions.js
                insertEvent(nextEvent);
                break;

                case 'DELETE':
                //set the active file
                activeFileId = nextEvent.fileId;
                //mark the new code
                newCodeMarkers.delete(nextEvent);
                //call the deleteEvent function found in playbackEventFunctions.js
                deleteEvent(nextEvent);
                break;

                case 'CREATE FILE':
                //set the active file
                activeFileId = nextEvent.fileId;
                //call the createFileEvent function found in playbackEventFunctions.js
                createFileEvent(nextEvent);
                break;

                case 'DELETE FILE':
                //set the active file
                activeFileId = 'no-file-id';
                //call the deleteFileEventFunction found in playbackEventFunctions.js
                deleteFileEvent(nextEvent);
                break;
            }
            
            //move the next event
            playbackData.nextEventPosition++;

            //if we played the last event
            if(playbackData.nextEventPosition === playbackData.events.length) {
                break;
            }
        }

        //make the correct editor active
        addFocusToTab(activeFileId);

        //highlight the new code
        highlightNewCode(newCodeMarkers.getAllNewCodeMarkers());
        highlightInsertLineNumbers(newCodeMarkers.getAllInsertLineNumbers());
        highlightDeleteLineNumbers(newCodeMarkers.getAllDeleteLineNumbers());
        
        //const t1 = performance.now();
        //console.log(`step forward took: ${t1-t0} ms`);
    }
}

function stepBackward(numSteps) {
    //if there is room to move backwards
    if(playbackData.nextEventPosition > 0) {
        //holds the next event to animate
        let nextEvent;

        //the id of the file to make active
        let activeFileId = 'no-file-id';
        
        //to account for the fact that nextEventPosition always 
        //refers to the next event to animate in the forward 
        //direction I move it back by one position
        playbackData.nextEventPosition--;

        //go through the requested number of steps
        for(let i = 0;i < numSteps;i++) {
            //grab the next event to de-animate
            nextEvent = playbackData.events[playbackData.nextEventPosition];

            //check the event type and call the corresponding function for that event type
            switch (nextEvent.type)
            {
                case 'INSERT':
                //set the active file
                activeFileId = nextEvent.fileId;
                //call the deleteEvent function found in playbackEventFunctions.js
                deleteEvent(nextEvent);
                break;

                case 'DELETE':
                //set the active file
                activeFileId = nextEvent.fileId;
                //call the insertEvent function found in playbackEventFunctions.js
                insertEvent(nextEvent);
                break;

                case 'CREATE FILE':
                //set the active file
                activeFileId = 'no-file-id';
                //call the deleteFileEvent function found in playbackEventFunctions.js
                deleteFileEvent(nextEvent);
                break;

                case 'DELETE FILE':
                //set the active file
                activeFileId = nextEvent.fileId;
                //call the deleteFileEventFunction found in playbackEventFunctions.js
                createFileEvent(nextEvent);
                break;
            }

            //move to the previous event
            playbackData.nextEventPosition--;

            //if we just played back the first event and then decremented
            if(playbackData.nextEventPosition < 0) {
                break;
            }
        }

        //make the correct editor active
        addFocusToTab(activeFileId);

        //after moving backwards, account for the fact that this
        //always refers to the next index to animate in the forward
        //direction
        playbackData.nextEventPosition++;
    }
}

function displayAllComments(){
    //clear comments Div before displaying any comments
    commentsDiv.innerHTML = '';

    let commentCount = -2; // because the title and description do not count
    let currentComment = 1;    

    //convert all string keys into numbers for proper sorting of comment sequence
    let keysArray = Object.keys(playbackData.comments);  
    for (let i = 0; i < keysArray.length; i++){
        commentCount += playbackData.comments[keysArray[i]].length;
        keysArray[i] = Number(keysArray[i].slice(3));        
    }
   
    //sort by interger key and add each comment to the commentsDiv
    keysArray.sort((a,b)=> a - b).forEach(function(key){
        let commentBlock = playbackData.comments[`ev-${key}`];
        const commentGroupDiv = document.createElement('div');
        commentGroupDiv.classList.add('border', 'commentGroupSpacing');
        
        let startingValue = 0;

        if (`ev-${key}` === 'ev--1')
        {
            const titleInfo = commentBlock[0];
            const descriptionInfo = commentBlock[1];
            const titleCard = createTitleCard(titleInfo, descriptionInfo);

            startingValue += 2;
        }

        for (let i = startingValue; i < commentBlock.length; i++){

            const commentObject = commentBlock[i];

            const returnObject = createCommentCard(commentObject, currentComment, commentCount, i);
            const commentCard = returnObject.cardObject;
            currentComment = returnObject.count;

            //add a tick mark to the slider for the comment group ---DOESN'T WORK
            var tickmarkObject = document.getElementById('tickmarks');
            const newTick = document.createElement('option');
            newTick.setAttribute('value', commentBlock[0].displayCommentEvent.eventSequenceNumber);
            newTick.classList.add("ui-slider-tick-mark");
            tickmarkObject.appendChild(newTick);

            commentGroupDiv.append(commentCard);
            commentsDiv.append(commentGroupDiv);
        }
    })    
}

