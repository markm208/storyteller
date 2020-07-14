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
        playbackSlider.value = playbackData.nextEventPosition-1;
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
    //convert all string keys into numbers for proper sorting of comment sequence
    let keysArray = Object.keys(playbackData.comments);    
    for (let i = 0; i < keysArray.length; i++){
        keysArray[i] = Number(keysArray[i].slice(3));
    }

    //sort by interger key and add each comment to the commentsDiv
    keysArray.sort((a,b)=> a - b).forEach(function(key){
        let commentBlock = playbackData.comments[`ev-${key}`];
        const commentGroupDiv = document.createElement('div');
        commentGroupDiv.classList.add('border', 'commentGroupSpacing');
        
        for (let i = 0; i < commentBlock.length; i++){
            const textAreaHeader = document.createElement('div');
            //TODO should this be a card header??
            textAreaHeader.classList.add('card-header');
            textAreaHeader.innerHTML = commentBlock[i].commentText;

            //add a tick mark to the slider for the comment group ---DOESN'T WORK
            var tickmarkObject = document.getElementById('tickmarks');
            const newTick = document.createElement('option');
            newTick.setAttribute('value', commentBlock[0].displayCommentEvent.eventSequenceNumber);
            newTick.classList.add("ui-slider-tick-mark");
            tickmarkObject.appendChild(newTick);

            //TODO get height working on large comments in textareaheader
          
            const commentObject = commentBlock[i];
                
            let cardFinal = document.createElement('div');
            cardFinal.classList.add('card', 'text-center');

            //allows us to send a click event to this card in order to jump to it in the playback
            cardFinal.setAttribute('id', `${commentObject.displayCommentEvent.id}-${i}`)

            //if this is not here the play button does not work, because the card will have no functionality
            cardFinal.addEventListener('click', function (e){ 
                //step to the event this comment is at
                step(commentObject.displayCommentEvent.eventSequenceNumber - playbackData.nextEventPosition + 1);

                //add highlights for the comment
                for (let j = 0; j < commentObject.selectedCodeBlocks.length; j++)
                {
                    addHighlight(commentObject.selectedCodeBlocks[j].fileId, commentObject.selectedCodeBlocks[j].startRow, commentObject.selectedCodeBlocks[j].startColumn, commentObject.selectedCodeBlocks[j].endRow, commentObject.selectedCodeBlocks[j].endColumn);
                }
            });

            let carousel = createCarousel();
            let temp;

            if (commentObject.imageURLs.length > 1){  
                // Get the modal
                let modal = document.getElementById("imgExpandModal");

                // Get the image and insert it inside the modal - use its "alt" text as a caption
                let img = document.getElementById("myImg");
                let modalImg = document.getElementById("imgToExpand");
                //var captionText = document.getElementById("caption");

                for (let j = 0; j < commentObject.imageURLs.length; j++){
                    addImageToCarousel(commentObject.imageURLs[j], carousel);
                    makeCarouselControls(carousel);

                    carousel.addEventListener('click', event =>{
                        //if the carousel is clicked on either the left or right button, dont trigger the enlarged image modal
                        if (!event.toElement.className.includes('carousel-control')){   
                            //get the src of the current active image from the carousel that was clicked on                    
                            let src = carousel.querySelector('.carousel-item.active img').getAttribute('src');
                            modal.style.display = "block";
                            modalImg.src = src;
                        }
                    });
    
                    // Get the <span> element that closes the modal
                    let span = document.getElementsByClassName("modalClose")[0];
    
                    //close the modal
                    span.onclick = function() {
                        modalImg.removeAttribute('src');
                        modal.style.display = "none";
                    }
                    //add carousel
                    cardFinal.append(carousel);
                }
            }
            //creates a carousel without controls to keep consistency among single images and images in carousels
            else if (commentObject.imageURLs.length === 1){
                addImageToCarousel(commentObject.imageURLs[0], carousel);

                carousel.addEventListener('click',event => {
                    //add image to the modal
                    document.getElementById("imgExpandModal").style.display = "block";
                    document.getElementById("imgToExpand").src = commentObject.imageURLs[0];
                })
                //modal close button
                document.getElementsByClassName("modalClose")[0].onclick = function() {
                    document.getElementById("imgToExpand").removeAttribute('src');
                    document.getElementById("imgExpandModal").style.display = "none";
                }
                cardFinal.append(carousel);
            }         

            for (let j = 0; j < commentObject.videoURLs.length; j++){
                temp = createMediaControllerCommentVideoUI(commentObject.videoURLs[j], false, false);       
                //add next media
                cardFinal.append(temp.firstChild);
                //file names added invisible in case we later want to see them when editing
                temp.lastChild.style.display ='none';
                cardFinal.append(temp.lastChild);     
            }

            for (let j = 0; j < commentObject.audioURLs.length; j++){
                temp = createMediaControllerCommentAudioUI(commentObject.audioURLs[j], false, false); 
                cardFinal.append(temp.firstChild);

                //file names added invisible in case we later want to see them when editing
                temp.lastChild.style.display ='none';
                cardFinal.append(temp.lastChild);  
            }

            cardFinal.prepend(textAreaHeader);
            const finalDiv = document.createElement('div');
            finalDiv.classList.add('commentBox');

            let comment = playbackData.comments[`ev-${key}`][i];
            finalDiv.addEventListener('click', function(e) {
                step(comment.displayCommentEvent.eventSequenceNumber - playbackData.nextEventPosition +1); 
                for (let j = 0; j < comment.selectedCodeBlocks.length; j++){
                    addHighlight(comment.selectedCodeBlocks[j].fileId, comment.selectedCodeBlocks[j].startRow, comment.selectedCodeBlocks[j].startColumn, comment.selectedCodeBlocks[j].endRow, comment.selectedCodeBlocks[j].endColumn);
                }
            });

            finalDiv.append(cardFinal);
            commentGroupDiv.append(finalDiv);
            commentsDiv.append(commentGroupDiv);
        }
    })    
}

