function step(numSteps) {

    //move forward
    if(numSteps > 0) {

        stepForward(numSteps);
        
    } else if(numSteps < 0) { //move backward

        stepBackward(-numSteps);
    } //else- no need to move at all

    //update the position of the slider
    playbackSlider.value = playbackData.nextEventPosition;
}

function stepForward(numSteps) {
    //if there is room to move in the forward direction
    if(playbackData.nextEventPosition < playbackData.numEvents) {
        //holds the next event to animate
        let nextEvent;

        //timing for debug purposes
        //const t0 = performance.now();

        //go through the requested number of steps
        for(let i = 0;i < numSteps;i++) {
            //grab the next event to animate
            nextEvent = playbackData.events[playbackData.nextEventPosition];

            //check the event type and call the corresponding function for that event type
            switch (nextEvent.type)
            {
                case 'INSERT':
                //call the insertEvent function found in playbackEventFunctions.js
                insertEvent(nextEvent);
                break;

                case 'DELETE':
                //call the deleteEvent function found in playbackEventFunctions.js
                deleteEvent(nextEvent);
                break;

                case 'CREATE FILE':
                //call the createFileEvent function found in playbackEventFunctions.js
                createFileEvent(nextEvent);
                break;
            }
            
            //move the next event
            playbackData.nextEventPosition++;

            //if we played the last event
            if(playbackData.nextEventPosition === playbackData.events.length) {
                pausePlayback();
                break;
            }
        }

        //const t1 = performance.now();
        //console.log(`step forward took: ${t1-t0} ms`);
    }
}

function stepBackward(numSteps) {
    //if there is room to move backwards
    if(playbackData.nextEventPosition > 0) {
        //holds the next event to animate
        let nextEvent;

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
                //call the deleteEvent function found in playbackEventFunctions.js
                deleteEvent(nextEvent);
                break;

                case 'DELETE':
                //call the insertEvent function found in playbackEventFunctions.js
                insertEvent(nextEvent);
                break;

                case 'CREATE FILE':
                //call the deleteFileEvent function found in playbackEventFunctions.js
                deleteFileEvent(nextEvent);
                break;
            }

            //move to the previous event
            playbackData.nextEventPosition--;

            //if we just played back the first event and then decremented
            if(playbackData.nextEventPosition < 0) {
                break;
            }
        }

        //after moving backwards, account for the fact that this
        //always refers to the next index to animate in the forward
        //direction
        playbackData.nextEventPosition++;
    }
}

function displayAllComments(){
    //clear comments Div before displaying any comments
    commentsDiv.innerHTML = "";
    //convert all string keys into numbers for proper sorting of comment sequence
    var keysArray = Object.keys(playbackData.comments);    
    for (let i = 0; i < keysArray.length; i++){
        keysArray[i] = Number(keysArray[i].slice(3));
    }

    //sort by interger key and add each comment to the commentsDiv
    keysArray.sort((a,b)=> a - b).forEach(function(key){
        let commentBlock = playbackData.comments[`ev-${key}`];
        const eventGroupDiv = document.createElement("div");
        eventGroupDiv.classList.add("border");
        eventGroupDiv.classList.add("commentBox");

        let subId = 0;
        for (let j = 0; j < commentBlock.length; j++){
            const newCommentHTML = document.createElement("div");
            const formatElement = document.createElement("p");
            formatElement.innerHTML = commentBlock[j].commentText;
            newCommentHTML.classList.add("border");
            newCommentHTML.classList.add("commentBox");
            formatElement.classList.add("border");
            formatElement.classList.add("commentBox");

            newCommentHTML.appendChild(formatElement);

            newCommentHTML.id = `${commentBlock[j].displayCommentEvent.id}-${subId}`;
            subId++;
            newCommentHTML.addEventListener('click', function (e){  
                pausePlayback();
                step(commentBlock[j].displayCommentEvent.eventSequenceNumber - playbackData.nextEventPosition + 1);

                clearHighlights();

                for (let i = 0; i < commentBlock[j].selectedCodeBlocks.length; i++)
                {
                    addHighlight(commentBlock[j].selectedCodeBlocks[i].startRow, commentBlock[j].selectedCodeBlocks[i].startColumn, commentBlock[j].selectedCodeBlocks[i].endRow, commentBlock[j].selectedCodeBlocks[i].endColumn);
                }
            });
            
            eventGroupDiv.appendChild(newCommentHTML);
        }
        commentsDiv.appendChild(eventGroupDiv);
    })
    
}

function pausePlayback(){
    if (isPlaying){
        playPauseButton.click();
    }
}

