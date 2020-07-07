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
    var keysArray = Object.keys(playbackData.orderedMedia);    
    for (let i = 0; i < keysArray.length; i++){
        keysArray[i] = Number(keysArray[i].slice(3));
    }

    //sort by interger key and add each comment to the commentsDiv
    keysArray.sort((a,b)=> a - b).forEach(function(key){
        let commentBlock = playbackData.orderedMedia[`ev-${key}`];
        const commentDiv = document.createElement('div');
        
        for (let i = 0; i < commentBlock.length; i++){
             const textAreaHeader = document.createElement('textarea');
            textAreaHeader.classList.add('card-header');
            textAreaHeader.classList.add('form-control', 'comment-text');

            textAreaHeader.disabled = true;
            textAreaHeader.value = commentBlock[i].commentText;

            //add a tick mark to the slider for the comment group
            var tickmarkObject = document.getElementById('tickmarks');
            const newTick = document.createElement('option');
            newTick.setAttribute('value', commentBlock[0].displayCommentEvent.eventSequenceNumber);
            newTick.classList.add("ui-slider-tick-mark");
            tickmarkObject.appendChild(newTick);

            //TODO get height working on large comments in textareaheader
          
            const commentObject = commentBlock[i];
                
            let cardFinal = document.createElement('div');
            cardFinal.classList.add('card', 'text-center');

            for (let k = 0; k < commentObject.mediaURLs.length; k++){
                const strippedSrc = commentObject.mediaURLs[k].replace('/media/', '');
                const mediaType = strippedSrc.substring(0,strippedSrc.indexOf('/'));

                let temp;
                switch (mediaType) {
                    case "audios":
                        temp = createMediaControllerCommentAudioUI(commentObject.mediaURLs[k], false, false);  
                        break;
                    case "videos":
                        temp= createMediaControllerCommentVideoUI(commentObject.mediaURLs[k], false, false);                           
                        break;   
                    default:
                        break;
                }               
                //add next media
                cardFinal.append(temp.firstChild);

                //file names added invisible in case we later want to see them when editing
                temp.lastChild.style.display ='none';
                cardFinal.append(temp.lastChild);

            }
            cardFinal.prepend(textAreaHeader);
            const finalDiv = document.createElement('div');
            finalDiv.classList.add('commentBox','border');

            let comment = playbackData.comments[`ev-${key}`][i];
            finalDiv.addEventListener('click', function(e) {
                step(comment.displayCommentEvent.eventSequenceNumber - playbackData.nextEventPosition +1); //TODO should this be +1?
                clearHighlights();
                for (let j = 0; j < comment.selectedCodeBlocks.length; j++){
                    addHighlight(comment.selectedCodeBlocks[j].startRow, comment.selectedCodeBlocks[j].startColumn, comment.selectedCodeBlocks[j].endRow, comment.selectedCodeBlocks[j].endColumn);
                }
            });

            finalDiv.append(cardFinal);
            commentsDiv.append(finalDiv);
        }

        // cardBody.classList.add('card-body');


        // playbackData.orderedMedia[`ev-${key}`].mediaURLs.pop();

        // let test2 = playbackData.orderedMedia[`ev-${key}`];
        // cardBody.append(textArea);
        // let test = test2.substring(test2.lastInstanceOf('.'), test2.length);


        

        // let commentBlock = playbackData.comments[`ev-${key}`];
        // const eventGroupDiv = document.createElement("div");
        // eventGroupDiv.classList.add("border");
        // eventGroupDiv.classList.add("commentBox");

        // //add a tick mark to the slider for the comment group
        // var tickmarkObject = document.getElementById('tickmarks');
        // const newTick = document.createElement('option');
        // newTick.setAttribute('value', commentBlock[0].displayCommentEvent.eventSequenceNumber);
        // newTick.classList.add("ui-slider-tick-mark");
        // tickmarkObject.appendChild(newTick);
        // //console.log(commentBlock[0].eventSequenceNumber);

        // let subId = 0;
        // for (let j = 0; j < commentBlock.length; j++){
        //     const newCommentHTML = document.createElement("div");
        //     const formatElement = document.createElement("p");
        //     formatElement.innerHTML = commentBlock[j].commentText;
        //     newCommentHTML.classList.add("border");
        //     newCommentHTML.classList.add("commentBox");
        //     formatElement.classList.add("border");
        //     formatElement.classList.add("commentBox");

        //     newCommentHTML.appendChild(formatElement);

        //     for (let m = 0; m < commentBlock[j].imageURLs.length; m++)
        //     {
        //         let imageTag = document.createElement("img");

        //         imageTag.src = commentBlock[j].imageURLs[m];
        //         imageTag.width = 200;
        //         imageTag.height = 200;

        //         imageTag.classList.add("border");
        //         imageTag.classList.add("commentBox");

        //         newCommentHTML.appendChild(imageTag);
        //     }

        //     for (let m = 0; m < commentBlock[j].videoURLs.length; m++)
        //     {
        //         let videoTag = document.createElement("video");
        //         //Extract the file extension from the input file
        //         var fileExtension = commentBlock[j].videoURLs[m].split('.').pop().toLowerCase();
        //         var MIMEtype = createMimeString(fileExtension);
                
        //         videoTag.width = 200;
        //         videoTag.height = 200;
        //         videoTag.controls = true;

        //         videoTag.classList.add("border");
        //         videoTag.classList.add("commentBox");

        //         let videoSource = document.createElement("source");
        //         videoSource.src = commentBlock[j].videoURLs[m];
        //         videoSource.type = MIMEtype;

        //         videoTag.appendChild(videoSource);
        //         newCommentHTML.appendChild(videoTag);
        //     }

        //     for (let m = 0; m < commentBlock[j].audioURLs.length; m++)
        //     {
        //         let audioTag = document.createElement("audio");
        //         //Extract the file extension from the input file
        //         var fileExtension = commentBlock[j].audioURLs[m].split('.').pop().toLowerCase();
        //         var MIMEtype = createMimeString(fileExtension);
                
        //         audioTag.style.width = '200px';
        //         audioTag.style.height = '200px';
        //         audioTag.controls = true;
        //         audioTag.style.width = '200px';
        //         audioTag.classList.add("border");
        //         audioTag.classList.add("commentBox");

        //         let audioSource = document.createElement("source");
        //         audioSource.src = commentBlock[j].audioURLs[m];
        //         audioSource.type = MIMEtype;

        //         audioTag.appendChild(audioSource);
        //         newCommentHTML.appendChild(audioTag);
        //     }

        //     newCommentHTML.id = `${commentBlock[j].displayCommentEvent.id}-${subId}`;
        //     subId++;
        //     newCommentHTML.addEventListener('click', function (e){  
        //         step(commentBlock[j].displayCommentEvent.eventSequenceNumber - playbackData.nextEventPosition + 1);

        //         clearHighlights();

        //         for (let i = 0; i < commentBlock[j].selectedCodeBlocks.length; i++)
        //         {
        //             addHighlight(commentBlock[j].selectedCodeBlocks[i].startRow, commentBlock[j].selectedCodeBlocks[i].startColumn, commentBlock[j].selectedCodeBlocks[i].endRow, commentBlock[j].selectedCodeBlocks[i].endColumn);
        //         }
        //     });
            
        //     eventGroupDiv.appendChild(newCommentHTML);
        // }
        // commentsDiv.appendChild(eventGroupDiv);
    })
    
}

