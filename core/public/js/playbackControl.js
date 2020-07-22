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

            commentGroupDiv.append(titleCard);

            startingValue += 2;
        }

        //give each commentGroup a unique id 
        commentGroupDiv.setAttribute('id','CG' + uniqueCommentGroupID);
        
        //create an outer group to hold the edit button
        //this keeps the dragging of cards from changing the position of the button
        let outerCommentGroup = document.createElement('div');
        outerCommentGroup.classList.add('commentGroupSpacing');

        let uniqueNumBackup = uniqueCommentGroupID;
        for (let i = startingValue; i < commentBlock.length; i++){

            const commentObject = commentBlock[i];

            const returnObject = createCommentCard(commentObject, currentComment, commentCount, i);
            const commentCard = returnObject.cardObject;
            currentComment = returnObject.count;

            commentGroupDiv.append(commentCard);
            


            if (playbackData.isEditable){
               //gives each card a class to later access it
               commentCard.classList.add('drag');
               commentCard.setAttribute('id',commentObject.id );

               addEditButtonsToCard(commentCard, commentObject.displayCommentEvent.id ,returnObject.commentID,commentBlock, uniqueNumBackup, commentObject);
            }

            //add a tick mark to the slider for the comment group ---DOESN'T WORK
            var tickmarkObject = document.getElementById('tickmarks');
            const newTick = document.createElement('option');
            newTick.setAttribute('value', commentBlock[0].displayCommentEvent.eventSequenceNumber);
            newTick.classList.add("ui-slider-tick-mark");
            tickmarkObject.appendChild(newTick);

            commentGroupDiv.append(commentCard);
        }

        outerCommentGroup.append(commentGroupDiv);
        commentsDiv.append(outerCommentGroup);

        const atEventNegOne = `ev-${key}` === 'ev--1';
        if (playbackData.isEditable){
            
            //create the edit Comment button
            const editCommentBlockButton = document.createElement('button');
            editCommentBlockButton.classList.add("btn", "btn-outline-primary", "btn-sm");
            editCommentBlockButton.appendChild(document.createTextNode('Edit Comment Block'));
            editCommentBlockButton.setAttribute("id", "edit" + uniqueCommentGroupID);

            //go to every card marked 'drag' in the div where editCommentBlockButton was clicked, and make each draggable
            editCommentBlockButton.addEventListener('click', event => {  
                //for each element with class "drag", make draggable as long as there is more than 1 comment in the comment block   
                if ((atEventNegOne && commentBlock.length > 3 ) || (!atEventNegOne && commentBlock.length > 1)){
                    $('.drag', "#" + commentGroupDiv.id).each(function(){                    
                        makeDraggable(this, key);
                    });
                }

                $('.deleteComment', "#" + commentGroupDiv.id).each(function(){
                   this.style.display = "block";
                });

                toggleEditAcceptButtons("edit", uniqueNumBackup);
            });

            //create the accept changes button
            const acceptChangesButton = document.createElement('button');
            acceptChangesButton.classList.add("button", "btn-outline-danger", "btn-sm");
            acceptChangesButton.appendChild(document.createTextNode("Accept Changes")); //TODO change this text to something better
            acceptChangesButton.setAttribute("id", "accept" + uniqueCommentGroupID);
            //initially hidden
            acceptChangesButton.setAttribute("style", "display:none");

            acceptChangesButton.addEventListener('click', event => {           
                //make each draggable element undraggable
                $('.drag', "#" + commentGroupDiv.id).each(function(){
                    makeunDraggable(this);
                });
 
                //changes the accept button back to edit
                toggleEditAcceptButtons("accept", uniqueNumBackup);

                //hides the delete comment buttons
                $('.deleteComment', "#" + commentGroupDiv.id).each(function(){
                    this.style.display = "none";
                });
            });

            outerCommentGroup.setAttribute('style', 'text-align: right');
            outerCommentGroup.append(editCommentBlockButton);
            outerCommentGroup.append(acceptChangesButton);

            makeDivDroppable(commentGroupDiv, false);
        }   
        uniqueCommentGroupID++;
    })    
    updateAllCommentHeaderCounts();
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

function addEditButtonsToCard(card, eventID, commentID, commentBlock, uniqueNumber, commentObject){
  //find the card header in the card to add the buttons to  
  const header = card.querySelector(".card-header");

  const buttonGroup = document.createElement("div");
  //buttonGroup.classList.add("btn-group");
  buttonGroup.setAttribute("style", "float:right");
  
  const deleteButton = document.createElement("button");
  deleteButton.setAttribute("title", "Remove comment");
  deleteButton.setAttribute("style", "border:none");
  deleteButton.style.backgroundColor = "transparent";
  deleteButton.style.color = "red";
  deleteButton.style.display = "none";
  deleteButton.classList.add("deleteComment");
  deleteButton.appendChild(document.createTextNode('x'));  

  deleteButton.addEventListener('click', event => {
        let comment;
        //find the comment object associated with the card being deleted
        for (let indexToDelete = 0; indexToDelete < playbackData.comments[eventID].length; indexToDelete++){
            if (playbackData.comments[eventID][indexToDelete].id === commentID){
                comment = playbackData.comments[eventID][indexToDelete];  

                //remove the comment from the commentBlock
                commentBlock.splice(indexToDelete,1);               
                break;
            }
        }
        
        if (!commentBlock.length){
            //if there are no comments left in the commentBlock, remove the block from it's parent div and delete the block from playbackData
            card.parentElement.parentElement.remove();
            delete playbackData.comments[eventID];
        }
        else{
            //if there are other comments left in the commentBlock, only remove the deleted comment
            card.remove();
        }
        deleteCommentFromServer(comment);
        updateAllCommentHeaderCounts();
    });

  buttonGroup.append(deleteButton);

  header.append(buttonGroup);


  const editCommentButton = document.createElement("button");
  editCommentButton.classList.add("btn", "btn-outline-dark", "btn-sm");
  editCommentButton.appendChild(document.createTextNode('Edit Comment'));
  editCommentButton.addEventListener('click', event => {

    document.getElementById("viewCommentsTab").classList.add("disabled");

    const addCommentButton =  document.getElementById("addCommentButton");
    const updateCommentButton = document.getElementById("UpdateCommentButton");
    const cancelUpdateButton = document.getElementById("CancelUpdateButton");
    addCommentButton.style.display = "none";
    updateCommentButton.removeAttribute("style");
    cancelUpdateButton.removeAttribute("style");

    document.getElementById("addCommentTab").click();
    
    const textArea = document.getElementById("textCommentTextArea");
    textArea.innerHTML = commentObject.commentText;

    const imagePreviewDiv = document.getElementsByClassName("image-preview")[0];
    const audioPreviewDiv = document.getElementsByClassName("audio-preview")[0];
    const videoPreviewDiv = document.getElementsByClassName("video-preview")[0];

    if (commentObject.imageURLs.length){
        for (let i = 0; i < commentObject.imageURLs.length; i++){
            const imageCard = createMediaControllerCommentImageUI(commentObject.imageURLs[i], false, false);
            makeDraggable(imageCard);
    
            addCancelButtonToImage(imageCard,imagePreviewDiv );
        }
        imagePreviewDiv.removeAttribute("style");

    }

    if (commentObject.audioURLs.length){
        for (let i = 0; i < commentObject.audioURLs.length; i++){
            const audioCard = createMediaControllerCommentAudioUI(commentObject.audioURLs[i], false, false);
            makeDraggable(audioCard);
            addCancelButtonToCard(audioCard, audioPreviewDiv);
            audioPreviewDiv.append(audioCard);
        }
        audioPreviewDiv.removeAttribute("style");
    }

    if (commentObject.videoURLs.length){
        for (let i = 0; i < commentObject.videoURLs.length; i++){
            const videoCard = createMediaControllerCommentVideoUI(commentObject.videoURLs[i], false, false);
            makeDraggable(videoCard);
            addCancelButtonToCard(videoCard, videoPreviewDiv);
            videoPreviewDiv.append(videoCard);
        }
        videoPreviewDiv.removeAttribute("style");
    }

    cancelUpdateButton.addEventListener('click', event => {

        //reset the comment previews
        audioPreviewDiv.style.display='none';
        audioPreviewDiv.innerHTML = '';
        videoPreviewDiv.style.display='none';
        videoPreviewDiv.innerHTML = '';
        imagePreviewDiv.style.display='none';
        imagePreviewDiv.innerHTML = '';

        textArea.innerHTML = "";

        addCommentButton.removeAttribute("style");


        updateCommentButton.style.display='none';
        cancelUpdateButton.style.display='none';
        document.getElementById("viewCommentsTab").classList.remove("disabled");

        document.getElementById("viewCommentsTab").click();

    });

    updateCommentButton.addEventListener('click' , event => {
        updateComment(commentObject);

        cancelUpdateButton.click();
    })
  });

  



  const cardFooter = document.createElement("div");
  cardFooter.classList.add("card-footer", "small", "p-0");


  cardFooter.append(editCommentButton);
  card.append(cardFooter);

}

