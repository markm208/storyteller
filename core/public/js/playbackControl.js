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
   
    let uniqueCommentGroupID = 0;
    //sort by interger key and add each comment to the commentsDiv
    keysArray.sort((a,b)=> a - b).forEach(function(key){
        let commentBlock = playbackData.comments[`ev-${key}`];
        const commentGroupDiv = document.createElement('div');
        
        let startingValue = 0;        

        if (`ev-${key}` === 'ev--1')
        {
            const titleInfo = commentBlock[0];
            const descriptionInfo = commentBlock[1];
            const titleCard = createTitleCard(titleInfo, descriptionInfo);

            startingValue += 2;
        }

        //give each commentGroup a unique id 
        commentGroupDiv.setAttribute('id','CG' + uniqueCommentGroupID);
        
        //create an outer group to hold the edit button
        //this keeps the dragging of cards from changing the position of the button
        let outerCommentGroup = document.createElement('div');
        outerCommentGroup.classList.add('commentGroupSpacing');

        for (let i = startingValue; i < commentBlock.length; i++){

            const commentObject = commentBlock[i];

            const returnObject = createCommentCard(commentObject, currentComment, commentCount, i);
            const commentCard = returnObject.cardObject;
            currentComment = returnObject.count;

            commentGroupDiv.append(commentCard);
            let tempNum = uniqueCommentGroupID;


            if (playbackData.isEditable){
               //gives each card a class to later access it
               commentCard.classList.add('drag');

               addEditButtonsToCard(commentCard, commentObject.displayCommentEvent.id ,returnObject.commentID,commentBlock, tempNum);
            }

            //add a tick mark to the slider for the comment group ---DOESN'T WORK
            var tickmarkObject = document.getElementById('tickmarks');
            const newTick = document.createElement('option');
            newTick.setAttribute('value', commentBlock[0].displayCommentEvent.eventSequenceNumber);
            newTick.classList.add("ui-slider-tick-mark");
            tickmarkObject.appendChild(newTick);

            outerCommentGroup.append(commentGroupDiv);
            commentsDiv.append(outerCommentGroup);
        }     

        //determine if the editCommentBlockButton should be displayed
        const atEventNegOne = `ev-${key}` === 'ev--1';
        const displayEditCommentButton = (commentBlock.length > 3 && atEventNegOne) || (commentBlock.length > 1 && !atEventNegOne)  ? true : false;
        if (playbackData.isEditable && displayEditCommentButton){
            
            //create the edit Comment button
            const editCommentBlockButton = document.createElement('button');
            editCommentBlockButton.classList.add("btn", "btn-outline-dark", "btn-sm");
            editCommentBlockButton.appendChild(document.createTextNode('Edit Comment Block'));
            editCommentBlockButton.setAttribute("id", "edit" + uniqueCommentGroupID);

            //go to every card marked 'drag' in the div where editCommentBlockButton was clicked, and make each draggable
            editCommentBlockButton.addEventListener('click', event => {
                toggleEditAcceptButtons("edit", tempNum);
                $('.drag', "#" + commentGroupDiv.id).each(function(){
                    makeDraggable(this);
                });
            });

            //create the accept changes button
            const acceptChangesButton = document.createElement('button');
            acceptChangesButton.classList.add("button", "btn-outline-danger", "btn-sm");
            acceptChangesButton.appendChild(document.createTextNode("Accept Changes"));
            acceptChangesButton.setAttribute("id", "accept" + uniqueCommentGroupID);
            //initially hidden
            acceptChangesButton.setAttribute("style", "display:none");

            acceptChangesButton.addEventListener('click', event => {
                toggleEditAcceptButtons("accept", tempNum);
                //TODO write this function
            });

            outerCommentGroup.setAttribute('style', 'text-align: right');
            outerCommentGroup.append(editCommentBlockButton);
            outerCommentGroup.append(acceptChangesButton);

            makeDivDroppable(commentGroupDiv, false);
            uniqueCommentGroupID++;
        }   
    })    
}

//determines which button is currently displayed, and switches to the other 
function toggleEditAcceptButtons(currentButtonType, id){
    if (currentButtonType === "edit"){
        $('#' + "edit" + id)[0].style.display = "none";
        $('#' + "accept" + id)[0].removeAttribute("style");
    }
    else if (currentButtonType === "accept"){
        $('#' + "accept" + id)[0].style.display = "none";
        $('#' + "edit" + id)[0].removeAttribute("style");
    }
}

function addEditButtonsToCard(card, eventID, commentID, commentBlock, uniqueNumber){


  const header = card.querySelector(".card-header");

  const buttonGroup = document.createElement("div");
  buttonGroup.classList.add("btn-group");
  buttonGroup.setAttribute("style", "float:right");

  
  const deleteButton = document.createElement("button");
  //deleteButton.classList.add("text-muted");
  deleteButton.setAttribute("title", "Remove comment");
  deleteButton.setAttribute("style", "border:none");
  deleteButton.style.backgroundColor = "transparent";
  deleteButton.style.color = "red";
  //deleteButton.setAttribute("id", "delete" + uniqueIDNumber);
  deleteButton.appendChild(document.createTextNode('x'));

  let comment;
  let indexToDelete;
  for (let i = 0; i < playbackData.comments[eventID].length; i++){
    if (playbackData.comments[eventID][i].id === commentID){
      comment = playbackData.comments[eventID][i];
      indexToDelete = i;
      break;
    }
  }

  deleteButton.addEventListener('click', event => {
    card.remove();

    commentBlock.splice(indexToDelete,1); 

    const atEventNegOne = eventID === 'ev--1';
    const displayEditCommentButton = (commentBlock.length > 3 && atEventNegOne) || (commentBlock.length > 1 && !atEventNegOne)  ? true : false;
    if (!displayEditCommentButton){
        //remove the edit button if there aren't enough comments in the comment block left
        $('#' + "edit" + uniqueNumber).remove();
    }

    //TODO remove comment from server
  });

  const addMediaButton = document.createElement("button");
  addMediaButton.setAttribute("title", "Add media to comment");
  addMediaButton.setAttribute("style", "border:none");
  addMediaButton.style.backgroundColor = "transparent";
  addMediaButton.appendChild(document.createTextNode('+'));

  buttonGroup.append(addMediaButton);
  buttonGroup.append(deleteButton);

  header.append(buttonGroup);




}

