function step(numSteps) {

    clearHighlights();

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
            const textAreaHeader = document.createElement('textarea');
            textAreaHeader.classList.add('card-header');
            textAreaHeader.classList.add('form-control', 'comment-text');

            textAreaHeader.disabled = true;
            textAreaHeader.value = commentBlock[i].commentText;

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
            let temp;

            if (commentObject.imageURLs.length){
                let carousel = createCarousel();

                // Get the modal
                let modal = document.getElementById("imgExpandModal");

                // Get the image and insert it inside the modal - use its "alt" text as a caption
                let img = document.getElementById("myImg");
                let modalImg = document.getElementById("imgToExpand");
                //var captionText = document.getElementById("caption");

                for (let j = 0; j < commentObject.imageURLs.length; j++){
                   // temp = createMediaControllerCommentImageUI(commentObject.imageURLs[j], false, false); 
                    addImageToCarousel(commentObject.imageURLs[j], carousel);
                    makeCarouselControls(carousel);


                    carousel.addEventListener('click', event =>{
                        //if the carousel is clicked on either the left or right button, dont trigger the modal
                        if (!event.toElement.className.includes('carousel-control')){                            
                            let src = carousel.querySelector('.carousel-item.active img').getAttribute('src');
                            modal.style.display = "block";
                            modalImg.src = src;
                        }
                    });
    
                    // Get the <span> element that closes the modal
                    let span = document.getElementsByClassName("modalClose")[0];
    
                    // When the user clicks on <span> (x), close the modal
                    span.onclick = function() {
                        modalImg.removeAttribute('src');
                        modal.style.display = "none";
                    }
                    // carousel.firstChild.firstChild.classList.add('active');
                    //add next media
                    cardFinal.append(carousel);

               

                 }

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
                    addHighlight(comment.selectedCodeBlocks[j].startRow, comment.selectedCodeBlocks[j].startColumn, comment.selectedCodeBlocks[j].endRow, comment.selectedCodeBlocks[j].endColumn);
                }
            });

            finalDiv.append(cardFinal);
            commentGroupDiv.append(finalDiv);
            commentsDiv.append(commentGroupDiv);
        }

    })
    
}

