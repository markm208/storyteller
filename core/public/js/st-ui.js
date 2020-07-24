/* 
 * Adds an editor to the playback. 
 */
function createEditor(fileId, filePath) {
    //contentPanel is where newTabLinkTag points to and holds the codeDiv 
    //which is what the Ace editor points to
    const contentPanel = document.createElement('div');
    //what the Ace editor points to
    const codeDiv = document.createElement('div');

    //set up the contentPanel id for future deletion
    contentPanel.setAttribute('id', `${fileId}-editor-container`);
    //adding the tab-pane class so the div can be displayed correctly by the newTabLinkTag
    contentPanel.classList.add('tab-pane');
    contentPanel.classList.add('st-editor-tab-pane');
    //give the codeDiv and unique id so Ace can work with it
    codeDiv.setAttribute('id', `${fileId}-code`);
    //give the codeDiv the playbackWindow class
    codeDiv.classList.add('playbackWindow');

    //attach codeDiv to contentPanel
    contentPanel.appendChild(codeDiv);

    //create a new tab
    createFileTab(fileId, filePath);

    //attach the contentPanel to the tab-content div
    const tabContent = document.getElementById('tabContent');
    tabContent.appendChild(contentPanel);

    //create a new editor pointing to the code div
    createAceEditor(codeDiv, filePath, fileId);
}
/* 
 * Shows a previously hidden editor and its tab.
 */
function showEditor(fileId) {
    //get the editor and show it by removing a class
    const contentPanel = document.getElementById(`${fileId}-editor-container`);
    contentPanel.classList.remove('hiddenFile');

    //show the tab
    showFileTab(fileId);
}
/* 
 * Hide an editor when deleting in the forward direction.
 */
function hideEditor(fileId) {
    //get the editor and hide it with a class
    const contentPanel = document.getElementById(`${fileId}-editor-container`);
    contentPanel.classList.add('hiddenFile');

    //delete the tab
    hideFileTab(fileId);
}
/* 
 * Deletes the empty editor and its tab when create file event is handled in 
 * the backward direction.
 */
function deleteEditor(fileId) {
    //get the editor and remove it
    const contentPanel = document.getElementById(`${fileId}-editor-container`);
    contentPanel.parentNode.removeChild(contentPanel);
    
    //delete the tab
    deleteFileTabRemove(fileId);
}
/*
 * Displays all the comments.
 */
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

        const displayEditCommentButton = (atEventNegOne && commentBlock.length > 2) || !atEventNegOne;
        if (playbackData.isEditable && displayEditCommentButton){
            
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

        //remove the accept button if there are no more comments but leave the title and description
        if (eventID === "ev--1" && commentBlock.length < 3){
            $('#' + "accept" + uniqueNumber).remove();
        }

        //if there are no comments left in the commentBlock, remove the block from it's parent div and delete the block from playbackData
        if (!commentBlock.length){
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

  const editCommentButton = createEditCommentButton(commentObject, "Edit Comment");

  const cardFooter = document.createElement("div");
  cardFooter.classList.add("card-footer", "small", "p-0");


  cardFooter.append(editCommentButton);
  card.append(cardFooter);

}

// function displayAllComments(){
//     //clear comments Div before displaying any comments
//     commentsDiv.innerHTML = '';

//     let commentCount = -2; // because the title and description do not count
//     let currentComment = 1;

//     //convert all string keys into numbers for proper sorting of comment sequence
//     let keysArray = Object.keys(playbackData.comments);
//     for (let i = 0; i < keysArray.length; i++){
//         commentCount += playbackData.comments[keysArray[i]].length;
//         keysArray[i] = Number(keysArray[i].slice(3));
//     }
   
//     //sort by interger key and add each comment to the commentsDiv
//     keysArray.sort((a,b)=> a - b).forEach(function(key){
//         let commentBlock = playbackData.comments[`ev-${key}`];
//         const commentGroupDiv = document.createElement('div');
//         commentGroupDiv.classList.add('border', 'commentGroupSpacing');
        
//         let startingValue = 0;

//         if (`ev-${key}` === 'ev--1')
//         {
//             const titleInfo = commentBlock[0];
//             const descriptionInfo = commentBlock[1];
//             const titleCard = createTitleCard(titleInfo, descriptionInfo);
//             startingValue += 2;
//         }

//         for (let i = startingValue; i < commentBlock.length; i++){
//             const commentObject = commentBlock[i];

//             const returnObject = createCommentCard(commentObject, currentComment, commentCount, i);
//             const commentCard = returnObject.cardObject;
//             currentComment = returnObject.count;

//             //add a tick mark to the slider for the comment group ---DOESN'T WORK
//             var tickmarkObject = document.getElementById('tickmarks');
//             const newTick = document.createElement('option');
//             newTick.setAttribute('value', commentBlock[0].displayCommentEvent.eventSequenceNumber);
//             newTick.classList.add("ui-slider-tick-mark");
//             tickmarkObject.appendChild(newTick);

//             commentGroupDiv.append(commentCard);
//             commentsDiv.append(commentGroupDiv);
//         }
//     })    
// }
/*
 * Creates an image.
 */
function createMediaControllerCommentImageUI(srcPath, makeSelected, returnWithEventistener = true) {
    //create an image and add the required classes
    const newImg = document.createElement('img');
    newImg.setAttribute('src', srcPath);
    //add a bottstrap class and a st class
    newImg.classList.add('img-thumbnail', 'mediaImage', 'contain');
    
    //if this image should be marked as pre-selected
    if(makeSelected) {
        newImg.classList.add('mediaSelected');
    }
    
    if(returnWithEventistener){
        //add an event handler to toggle whether it is selected
        newImg.addEventListener('click', event => {
            //toggle the 'selected' class
            event.target.classList.toggle('mediaSelected');
        });
    }
   
    return newImg;
}
/*
 * Creates a video.
 */
function createMediaControllerCommentVideoUI(srcPath, makeSelected, returnWithEventistener = true){
    //filename of the video
    const fileName = srcPath.substring(srcPath.indexOf('-') + 1);
    //create a card with a body and a footer
    const cardDiv = document.createElement('div');
    //create two bootstrap classes and a st class
    cardDiv.classList.add('card', 'text-center', 'mediaVideoCard');  

    //card body
    const cardBody = document.createElement('div');
    cardBody.classList.add('card-body');
    //card footer
    const cardFooter = document.createElement('div');
    cardFooter.classList.add('card-footer', 'text-muted');

    //create a video and add the required classes
    const newVideo = document.createElement('video');
    newVideo.setAttribute('src', srcPath);
    newVideo.setAttribute('controls', '');
    newVideo.setAttribute('preload', 'metadata');   

    //when a video is played, pause any other media that is playing
    newVideo.onplay = function(){
        pauseMedia();
        newVideo.classList.add("playing");
    }
 
    newVideo.onpause = function(){
        newVideo.classList.remove("playing");
    }
 
    newVideo.onended = function(){
        newVideo.classList.remove("playing");
    }

    if (returnWithEventistener){
        newVideo.classList.add('mediaVideo');
    }        
    else{
        newVideo.classList.add('mediaResizable');
    }       
   
    //add all the pieces together
    cardBody.append(newVideo);
    cardFooter.append(fileName);
    cardDiv.append(cardBody);
    cardDiv.append(cardFooter);

    //if this video should be marked as pre-selected
    if(makeSelected) {
        cardDiv.classList.add('mediaSelected');
    }

    if (returnWithEventistener){
        //add an event handler to toggle whether it is selected
        cardDiv.addEventListener('click', event => {
            //toggle the 'selected' class
            cardDiv.classList.toggle('mediaSelected');
        });
    }

    return cardDiv;
}



/*
 * Creates an audio.
 */
function createMediaControllerCommentAudioUI(srcPath, makeSelected, returnWithEventistener = true) {
    //filename of the audio
    const fileName = srcPath.substring(srcPath.indexOf('-') + 1);
    //create a card with a body and a footer
    const cardDiv = document.createElement('div');
    //create two bootstrap classes and a st class
    cardDiv.classList.add('card', 'text-center', 'mediaAudioCard');

    //card body
    const cardBody = document.createElement('div');
    cardBody.classList.add('card-body');
    cardBody.style.height = 75 +'px';
    //card footer
    const cardFooter = document.createElement('div');
    cardFooter.classList.add('card-footer', 'text-muted');

    //create a audio and add the required classes
    const newAudio = document.createElement('audio');
    newAudio.setAttribute('src', srcPath);
    newAudio.setAttribute('controls', '');
    newAudio.setAttribute('preload', 'metadata');

    newAudio.onplay = function(){
        pauseMedia();
        newAudio.classList.add("playing");
    }

    newAudio.onpause = function(){
        newAudio.classList.remove("playing");
    }

    newAudio.onended = function(){
        newAudio.classList.remove("playing");
    }

    if (returnWithEventistener){
        newAudio.classList.add('mediaAudio');
    }
    else{
        newAudio.classList.add('mediaResizable');
    }
    newAudio.style.height = 40 + 'px';


    //add all the pieces together
    cardBody.append(newAudio);
    cardFooter.append(fileName);
    cardDiv.append(cardBody);
    cardDiv.append(cardFooter);

    //if this audio should be marked as pre-selected
    if(makeSelected) {
        cardDiv.classList.add('mediaSelected');
    }

    if (returnWithEventistener){
        //add an event handler to toggle whether it is selected
        cardDiv.addEventListener('click', event => {
        //toggle the 'selected' class
        cardDiv.classList.toggle('mediaSelected')});
    }
    return cardDiv;
}

function pauseMedia(){
    const playing = document.getElementsByClassName('playing');
 
    if (playing.length){
        playing[0].pause();
        playing[0].classList.remove('playing');
    }
}

function createXButtonForCloseOrCancel(popUpMessage = ""){
    let button = document.createElement('button');
    button.classList.add('close');
    button.setAttribute('aria-label', 'close');
    button.innerHTML ='&times;';
    button.style.color = 'red';
    button.setAttribute('title', popUpMessage);
    return button;
}

function addCancelButtonToImage(image, panelToDeleteFrom){
    let imageDiv = document.createElement('div');
    imageDiv.classList.add('image-div')

    let button = createXButtonForCloseOrCancel("Remove image from comment");
    button.classList.add('imageCancelButton');

    button.addEventListener('click', event =>{
        panelToDeleteFrom.removeChild(imageDiv);
 

        //hides the div if there are none of the media type left
        if (panelToDeleteFrom.classList.contains('hidden')){
            let nodesLeft = false;
            let panelChildren = panelToDeleteFrom.children;
            
            for (let i = 0; i < panelChildren.length; i++){
                if (panelChildren[i].classList.contains('image-div')){
                    nodesLeft = true;
                    break;
                }
            }
            if (!nodesLeft){
                panelToDeleteFrom.style.display = 'none';
            }
        }
    });

    imageDiv.append(image);

    imageDiv.append(button);
    panelToDeleteFrom.append(imageDiv);
}

function addCancelButtonToCard(card, panelToDeleteFrom){
    let button = createXButtonForCloseOrCancel("Remove media from comment");

    //removes the selected media from the preview and from the stored list of selected media
    button.addEventListener('click',event =>{
        panelToDeleteFrom.removeChild(card);

        //hides the div if there are none of the media type left
        if (panelToDeleteFrom.classList.contains('hidden')){
            let nodesLeft = false;
            let panelChildren = panelToDeleteFrom.children;
            
            for (let i = 0; i < panelChildren.length; i++){
                if (panelChildren[i].classList.contains('card')){
                    nodesLeft = true;
                    break;
                }
            }
            if (!nodesLeft){
                panelToDeleteFrom.style.display = 'none';
            }
        }

    });
    card.firstChild.append(button);
}

//TODO global???
//a number that is incremented with each carousel to keep ids unique
let currentCarousel = 0;
/*
 *
 */
function createCarousel(){
    const carouselOuter = document.createElement('div'); 
    carouselOuter.setAttribute('id', 'mycarousel' + currentCarousel++);
    carouselOuter.setAttribute('data-interval','false');
    carouselOuter.setAttribute('data-keyboard', 'false');
    carouselOuter.classList.add('carousel','slide');

    const carouselInner = document.createElement('div');
    carouselOuter.append(carouselInner);
    return carouselOuter;
}
/*
 *
 */
function addImageToCarousel(src, carousel){

    const img = document.createElement('img');
    const imgDiv = document.createElement('div');
    const captionDiv = document.createElement('div');
    const captionText = document.createElement('h5');

    captionDiv.classList.add('carousel-caption', 'd-none', 'd-md-block');
    captionDiv.append(captionText);

    img.src = src;
    img.classList.add('d-block','w-100');

    imgDiv.classList.add('carousel-item');
    imgDiv.append(img);
    imgDiv.append(captionDiv);

    carousel.firstChild.append(imgDiv);

    const allCaptions = carousel.getElementsByClassName('carousel-caption');

    //prevents "1/1" from being displayed on single image carousels
    if (allCaptions.length > 1){
        //updates all captions with the right counts
        for (let i = 0; i < allCaptions.length; i++){
            allCaptions[i].textContent = i + 1 + '/' + allCaptions.length;
        }        
    }

    //sets an image active if none are
    if (!carousel.firstChild.firstChild.classList.value.includes('active')){
        carousel.firstChild.firstChild.classList.add('active');
    }
}
/*
 *
 */
function makeCarouselControls(carousel){
    let right = document.createElement('a');
    let left = document.createElement('a');

    right.classList.add('carousel-control-next');
    left.classList.add('carousel-control-prev');

    right.setAttribute('href','#' + carousel.id);
    left.setAttribute('href','#' + carousel.id);

    right.setAttribute('role','button');
    right.setAttribute('data-slide','next');

    left.setAttribute('role','button');
    left.setAttribute('data-slide','prev');

    let prevSpan = document.createElement('span');
    prevSpan.classList.add('carousel-control-prev-icon');
    prevSpan.setAttribute('aria-hidden', 'true');
    let prevSRSpan = document.createElement('span');
    prevSRSpan.innerHTML='Previous';
    prevSRSpan.classList.add('sr-only');

    let nextSpan = document.createElement('span');
    nextSpan.classList.add('carousel-control-next-icon');
    nextSpan.setAttribute('aria-hidden', 'true');
    let nextSRSpan = document.createElement('span');
    nextSRSpan.innerHTML='Next';
    nextSRSpan.classList.add('sr-only');

    right.append(nextSpan);
    right.append(nextSRSpan);
    left.append(prevSpan);
    left.append(prevSRSpan);

    carousel.append(right);
    carousel.append(left);
}

function makeDraggable(param, key){
    param.setAttribute('draggable', 'true');
    param.classList.add('draggable');

    param.addEventListener('dragstart', () => {
        param.classList.add('dragging');
    })

    param.addEventListener('dragend', () => {       
        if (key !== undefined){           
            //get the original index of the comment
            const oldCommentPosition = playbackData.comments["ev-" + key].findIndex(item => item.id === param.id);

            //get the comment object
            const comment = playbackData.comments["ev-" + key][oldCommentPosition];

            //get an array of all draggable elements in the event target div
            const allDraggableCards = [...event.currentTarget.parentElement.getElementsByClassName("draggable")];

            //find the new position of the dragged card in the array of draggable elements
            const newCommentPosition = allDraggableCards.findIndex(item => item.id === comment.id);
  
            const commentPositionObject = {                
                eventId: comment.displayCommentEvent.id,
                oldCommentPosition,
                newCommentPosition: key === -1 ? newCommentPosition + 2 : newCommentPosition
            };

            //update playbackData with the changes
            playbackData.comments['ev-' + key].splice(oldCommentPosition, 1);
            playbackData.comments['ev-' + key].splice(commentPositionObject.newCommentPosition, 0, comment);

            //update the server with the changes
            updateCommentPositionOnServer(commentPositionObject);  

            updateAllCommentHeaderCounts();
        }  
        param.classList.remove('dragging');
    })    
}

function makeunDraggable(param){
    param.removeAttribute('draggable');
    param.classList.remove('draggable');
}

function makeDivDroppable(div, useID = true){
    //fixes firefox specific issue where images moved open a new tab
    document.body.ondrop = function (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const divDrop = useID ? $('#' + div.id)[0] : div;
    divDrop.addEventListener('dragover', event => {
        const draggable = divDrop.querySelector('.dragging');
        
        //make sure the item being dragged originated in the droppable div
        if (draggable !== null){
            event.preventDefault();
            const afterElement = getDragAfterElement(divDrop, event.clientY);
            if (afterElement === null){
                divDrop.appendChild(draggable);
            }
            else{
                divDrop.insertBefore(draggable, afterElement);
            }            
        }    
    });   
}

function createCommentCard(commentObject, currentComment, commentCount, i)
{
    const cardHeader = document.createElement('div');
    cardHeader.classList.add('card-header', 'text-muted', 'small', 'text-left', 'p-0', "commentCount");
    cardHeader.innerText = currentComment++ + '/' + commentCount;
    
    const cardBody = document.createElement('div');
    cardBody.classList.add('card-body', 'text-left');
    cardBody.innerHTML = commentObject.commentText;

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

        //if there is some highlighted code
        if(commentObject.selectedCodeBlocks.length > 0) {
            //if the highlighted code is not in the active editor
            if(playbackData.activeEditorFileId !== commentObject.selectedCodeBlocks[0].fileId) {
                //bring the file with the highlighted text to the front 
                addFocusToTab(commentObject.selectedCodeBlocks[0].fileId);
            }
            //scroll to the first selected block
            scrollToLine(commentObject.selectedCodeBlocks[0].fileId, commentObject.selectedCodeBlocks[0].startRow);
        }
    });

    let carousel = createCarousel();
    let temp;

    if (commentObject.imageURLs.length > 1){  
        // Get the modal
        let modal = document.getElementById('imgExpandModal');

        // Get the image and insert it inside the modal - use its 'alt' text as a caption
        let img = document.getElementById('myImg');
        let modalImg = document.getElementById('imgToExpand');
        //const captionText = document.getElementById('caption');

        for (let j = 0; j < commentObject.imageURLs.length; j++){
            addImageToCarousel(commentObject.imageURLs[j], carousel);
            makeCarouselControls(carousel);

            carousel.addEventListener('click', event =>{
                //if the carousel is clicked on either the left or right button, dont trigger the enlarged image modal
                if (!event.toElement.className.includes('carousel-control')){   
                    //get the src of the current active image from the carousel that was clicked on                    
                    let src = carousel.querySelector('.carousel-item.active img').getAttribute('src');
                    modal.style.display = 'block';
                    modalImg.src = src;
                }
            });

            // Get the <span> element that closes the modal
            let span = document.getElementsByClassName('modalClose')[0];

            //close the modal
            span.onclick = function() {
                modalImg.removeAttribute('src');
                modal.style.display = 'none';
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
            document.getElementById('imgExpandModal').style.display = 'block';
            document.getElementById('imgToExpand').src = commentObject.imageURLs[0];
        })
        //modal close button
        document.getElementsByClassName('modalClose')[0].onclick = function() {
            document.getElementById('imgToExpand').removeAttribute('src');
            document.getElementById('imgExpandModal').style.display = 'none';
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

    cardFinal.prepend(cardBody);
    const finalDiv = document.createElement('div');
    finalDiv.classList.add('commentBox');

    finalDiv.addEventListener('click', function(e) {
        step(commentObject.displayCommentEvent.eventSequenceNumber - playbackData.nextEventPosition +1); 
        for (let j = 0; j < commentObject.selectedCodeBlocks.length; j++){
            addHighlight(commentObject.selectedCodeBlocks[j].fileId, commentObject.selectedCodeBlocks[j].startRow, commentObject.selectedCodeBlocks[j].startColumn, commentObject.selectedCodeBlocks[j].endRow, commentObject.selectedCodeBlocks[j].endColumn);
        }
    });
    cardFinal.prepend(cardHeader);
    finalDiv.append(cardFinal);

    return {cardObject: finalDiv, count: currentComment, commentID: commentObject.id};
    
}

//Creates the title and description card in the ViewCommentsTab
function createTitleCard(titleInfo, descriptionInfo)
{

    //create the encompassing card object
    const titleCard = document.createElement('div');
    titleCard.classList.add('card');
    titleCard.setAttribute('id', 'title-card');

    titleCard.addEventListener('click', function (e){ 
        //step to the event this comment is at
        step(descriptionInfo.displayCommentEvent.eventSequenceNumber - playbackData.nextEventPosition + 1);
    });

    //create the header for the title card which holds the title text
    const cardHeader = document.createElement('div');
    cardHeader.classList.add('card-header', 'text-center');
    cardHeader.innerHTML = titleInfo.commentText;

    //create the body for the card which holds the description text
    const cardBody = document.createElement('div');
    cardBody.classList.add('card-body', 'text-left');
    
    const bodyParagraph = document.createElement('p');
    bodyParagraph.innerHTML = descriptionInfo.commentText;

    cardBody.append(bodyParagraph);

    //create any media in the description
    if (descriptionInfo.imageURLs.length > 0)
    {
        let carousel = createCarousel();
        for (let i = 0; i < descriptionInfo.imageURLs.length; i++)
        {
            addImageToCarousel(descriptionInfo.imageURLs[i], carousel);
        }

        if (descriptionInfo.imageURLs.length > 1)
        {
            makeCarouselControls(carousel);
        }

        titleCard.append(carousel);
    }

    for (let i = 0; i < descriptionInfo.videoURLs.length; i++){
        let videoElement = createMediaControllerCommentVideoUI(descriptionInfo.videoURLs[i], false, false);       
        //add next media
        titleCard.append(videoElement.firstChild);
        //file names added invisible in case we later want to see them when editing
        videoElement.lastChild.style.display ='none';
        titleCard.append(videoElement.lastChild);     
    }

    for (let i = 0; i < descriptionInfo.audioURLs.length; i++){
        let audioElement = createMediaControllerCommentAudioUI(descriptionInfo.audioURLs[i], false, false); 
        titleCard.append(audioElement.firstChild);

        //file names added invisible in case we later want to see them when editing
        audioElement.lastChild.style.display ='none';
        titleCard.append(audioElement.lastChild);  
    }

    //Create the card footer which holds the edit buttons
    const titleFooter = document.createElement("div");
    titleFooter.classList.add("card-footer","small", "p-0");

    const editTitleButton = document.createElement('button');
    const acceptChangesToTitleButton = document.createElement("button");

    const editDescriptionButton = createEditCommentButton(descriptionInfo, "Edit Description");

    editTitleButton.addEventListener('click', event => {
        cardHeader.setAttribute("contenteditable", "true");

        editTitleButton.style.display = "none";
        editDescriptionButton.style.display = 'none';
        acceptChangesToTitleButton.style.display = "block";
    })

    editTitleButton.classList.add("btn", "btn-outline-dark", "btn-sm");
    editTitleButton.appendChild(document.createTextNode('Edit Title'));

    acceptChangesToTitleButton.style.display = "none";

    acceptChangesToTitleButton.classList.add("btn", "btn-outline-dark", "btn-sm");
    acceptChangesToTitleButton.appendChild(document.createTextNode('Accept Changes'));

    acceptChangesToTitleButton.addEventListener('click', event => {
        const titleData = cardHeader.innerHTML;
        titleInfo.commentText = titleData;
        
        updateTitle(titleInfo);

        cardHeader.setAttribute("contenteditable", "false");

        acceptChangesToTitleButton.style.display = "none";
        editDescriptionButton.style.display = 'block';
        editTitleButton.style.display = "block";

    })
    
    titleFooter.append(acceptChangesToTitleButton);
    titleFooter.append(editTitleButton);
    titleFooter.append(editDescriptionButton);

    //assemble the pieces of the card
    titleCard.append(titleFooter);
    titleCard.prepend(cardBody);
    titleCard.prepend(cardHeader);

    return titleCard;

}
/*
 * Makes a file tab and editor window active (gives them the class 'active' that
 * bootstrap uses).
 */
function addFocusToTab(fileId)
{
    //if a tab other than the active one should get the focus
    if(fileId && (playbackData.activeEditorFileId !== fileId)) {
        //get the current active tab and content 
        const currentActiveTabs = document.getElementsByClassName('st-editor-tab active');
        const currentActiveContents = document.getElementsByClassName('st-editor-tab-pane active');
        
        //if there is an active editor (there should only ever be one of these)
        while(currentActiveTabs[0] && currentActiveContents[0]) {
            //remove active class from the old tab and content pane
            currentActiveTabs[0].classList.remove('active');
            currentActiveContents[0].classList.remove('active');
        }

        //get the tab and content to make active
        const tabToFocus = document.getElementById(`${fileId}-tab`);
        const content = document.getElementById(`${fileId}-editor-container`);
        //add active class to the new tab and content pane
        tabToFocus.classList.add('active');
        content.classList.add('active');
        
        //set the current active file id
        playbackData.activeEditorFileId = fileId;
    }
}
/*
 * Creates a file tab.
 */
function createFileTab(fileId, filePath) {
    //create a new item in the list of tabs 
    const newTabListItem = document.createElement('li');
    //allows use in navigation
    newTabListItem.classList.add('nav-item');
    //link the tab to the file thats its holding
    newTabListItem.setAttribute('id', `${fileId}-tabLI`);

    //sets up a link between the tab and the panel it will display
    const newTabLinkTag = document.createElement('a');
    newTabLinkTag.classList.add('nav-link');
    newTabLinkTag.classList.add('st-editor-tab');

    //setting the id of the tab for future access
    //allows for renaming of tabs in the event of a file name change
    newTabLinkTag.setAttribute('id', `${fileId}-tab`);

    //points this tab to the Ace editor it will display
    //the div that this points to is created below
    newTabLinkTag.href = `#${fileId}-editor-container`;

    newTabLinkTag.setAttribute('role', 'tab');

    //sets the tab text to the fileName of the new file
    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
    newTabLinkTag.innerText = fileName;

    newTabLinkTag.setAttribute('data-placement', 'left');
    newTabLinkTag.setAttribute('title', filePath);

    //switches currently active editor on tab switch
    newTabLinkTag.addEventListener('click', event => {
        //make the tab active
        addFocusToTab(fileId);
        //fixes Ace bug where editors are not updated
        const editor = playbackData.editors[fileId];
        editor.getSession().setValue(editor.getSession().getValue());
    });

    //adds the link to the list item
    newTabListItem.appendChild(newTabLinkTag);
    
    //adds the list item to the page html
    const tabsList = document.getElementById('tabsList');
    tabsList.appendChild(newTabListItem);
}
/*
 * Updates the text and tooltip in a file tab.
 */
function updateFileTab(fileId, filePath) {
    //get the tab with a file name and tooltip with the full path
    const tabToUpdate = document.getElementById(`${fileId}-tab`);
    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1); 
    tabToUpdate.innerText = fileName;
    tabToUpdate.setAttribute('title', filePath);
}
/*
 * Updates all of the tooltips in the tabs affected by a dir move or rename.
 */
function updateFileTabs(dirId) {
    //get all of the files in the directory
    const allFilesInDir = getFilesFromADirectory(dirId, true);

    //update the tabs with their new paths
    for(let i = 0;i < allFilesInDir.length;i++) {
        const fileInfo = allFilesInDir[i];
        updateFileTab(fileInfo.fileId, fileInfo.filePath);
    }
}
/*
 * Shows a previously hidden tab.
 */
function showFileTab(fileId) {
    //show the tab
    let fileTab = document.getElementById(`${fileId}-tabLI`);
    fileTab.classList.remove('hiddenFile');
}
/*
 * Hides a tab.
 */
function hideFileTab(fileId) {
    //hide the tab from tabList
    let fileTab = document.getElementById(`${fileId}-tabLI`);
    fileTab.classList.add('hiddenFile');
}
/*
 * Deletes a tab.
 */
function deleteFileTabRemove(fileId) {
    //delete the tab
    let fileTab = document.getElementById(`${fileId}-tabLI`);
    fileTab.parentNode.removeChild(fileTab); 
}
/*
 * Creates an entry for a file in the file system view.
 *
 * <li id="playbackViewFile-fileId-0" 
 *       data-filePath"="file path" 
 *       data-fileId="file id" 
 *       data-parentDirectoryId="parent dir id" 
 *       class="playbackFileView">
 *     <a class="fileLink">
 *         <span>-</span>
 *         <span>file name</span>
 *     </a>
 * </li>
 */
function createFileSystemFileUI(filePath, fileId, parentDirectoryId) {
    //create a file icon
    const fileIcon = document.createElement('span');
    fileIcon.innerHTML = '-';

    //create a span to display the file name
    const fileNameSpan = document.createElement('span');
    fileNameSpan.innerHTML = filePath.substring(filePath.lastIndexOf('/') + 1);

    //create a link to make the tab for this file active
    const fileAnchor = document.createElement('a');
    fileAnchor.classList.add('fileLink');
    fileAnchor.addEventListener('click', function(event) {
        //make the selected file tab active
        addFocusToTab(fileId);
    });

    //add the icon and file name to the anchor
    fileAnchor.appendChild(fileIcon);
    fileAnchor.appendChild(fileNameSpan);

    //add the anchor to a list item
    const fileLI = document.createElement('li');
    fileLI.setAttribute('id', `playbackViewFile-${fileId}`);
    fileLI.setAttribute('data-fileId', fileId);
    fileLI.setAttribute('data-filePath', filePath);
    fileLI.setAttribute('data-parentDirectoryId', parentDirectoryId);
    fileLI.classList.add('playbackFileView');
    fileLI.appendChild(fileAnchor);

    return fileLI;
}
/*
 * Creates a directory in the file system view.
 *
 * <li id="playbackViewDir-dirId-0" 
 *       data-directoryPath="dir path"
 *       data-directoryId="dir id"
 *       data-parentDirectoryId="parent dir id"
 *       class="playbackDirView">
 *    <span>🗁</span>
 *    <span class="playbackDirNameLabel">dir name</span>
 *    <ul id="dirContents-dirId-0" class="playbackViewFileOrDirList"></ul>
 * </li>
 */
function createFileSystemDirectoryUI(directoryPath, directoryId, parentDirectoryId) {
    //create a directory icon
    const dirIcon = document.createElement('span');
    dirIcon.innerHTML = '&#128449;';

    //create a span to hold the dir name
    const dirNameSpan = document.createElement('span');
    const pathParts = directoryPath.split('/');
    let directoryName = pathParts[pathParts.length - 2];
    //the root dir will have a zero length, account for that here
    if(directoryName.length === 0) {
        directoryName = '/';
    }
    dirNameSpan.innerHTML = directoryName;
    dirNameSpan.classList.add('playbackDirNameLabel');

    //add a new empty unordered list to hold the contents of the directory
    const newList = document.createElement('ul');
    newList.setAttribute('id', `dirContents-${directoryId}`);
    newList.classList.add('playbackViewFileOrDirList');

    //create a li to hold the icon, dir name, and ul for the contents
    const dirLI = document.createElement('li');
    dirLI.setAttribute('id', `playbackViewDir-${directoryId}`);
    dirLI.setAttribute('data-directoryPath', directoryPath);
    dirLI.setAttribute('data-directoryId', directoryId);
    dirLI.setAttribute('data-parentDirectoryId', parentDirectoryId);
    dirLI.classList.add('playbackDirView');
    
    //add the sub-elements
    dirLI.appendChild(dirIcon);
    dirLI.appendChild(dirNameSpan);
    dirLI.appendChild(newList);

    return dirLI;
}
/*
 * Adds an entry in the playback view of the filesystem for a file in alphabetic 
 * order. If the element was previously on the screen and hidden with a delete 
 * then it is made visible.
 */
function addFileToPlaybackViewOfFileSystem(filePath, fileId, parentDirectoryId) {
    //create a list item to hold the file name
    const fileLI = createFileSystemFileUI(filePath, fileId, parentDirectoryId);

    //get the file name of the new file
    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);

    //add the file after all directories and alphabetically among all files
    let afterFileLI = null;
    let found = false;
    
    //get the contents of the ul that holds the contents of the dir (LI's for files and dirs)
    const dirContents = document.getElementById(`dirContents-${parentDirectoryId}`);

    //search through the children for its position in alphabetic order
    for(let i = 0;i < dirContents.children.length;i++) {
        const fsElement = dirContents.children[i];
        
        //if the item is a file and the new name name comes before the current file name
        if(fsElement.classList.contains('playbackFileView')) { 
            const fsElementPath = fsElement.getAttribute('data-filePath');
            const fsElementName = fsElementPath.substring(fsElementPath.lastIndexOf('/') + 1);
            if(fileName < fsElementName) {
                //found the file after where the new file should go
                afterFileLI = fsElement;
                found = true;
                break;
            }
        }
    }

    //add the file in alphabetic order among the other files
    if(found) {
        //add it before the found element
        dirContents.insertBefore(fileLI, afterFileLI);
    } else {
        //add it to the end of the UL
        dirContents.appendChild(fileLI);
    }
}
/*
 * Shows a previously hidden file in the file system view. Removes the deleted 
 * by delete file event id.
 */
function showFileFromPlaybackViewOfFileSystem(eventId) {
    //get the LI for the file that was marked as deleted previously
    const fileLI = document.querySelector(`.playbackFileView[data-deletedByEventId="${eventId}"]`)
    
    //make the file visible
    fileLI.classList.remove('hiddenFile');

    //remove the deleted data as it is no longer deleted
    fileLI.removeAttribute('data-deletedByEventId');
}
/*
 * Hides a file in the fs view by marking it as deleted with the property
 * 'data-deletedByEventId'. The id of the delete file event is stored to
 * distinguish between delete file and delete directory. The event id will
 * be used to recreate it when deleting a file in reverse.
 */
function hideFileFromPlaybackViewOfFileSystem(fileId, eventId) {
    //hide the li that has the file name
    const fileLI = document.getElementById(`playbackViewFile-${fileId}`);
    
    //get the event id if the file has been deleted
    const deletedByEventId = fileLI.getAttribute('data-deletedByEventId');
    
    //if the file is not already deleted
    if(!deletedByEventId) {
        //update the delete count
        fileLI.setAttribute('data-deletedByEventId', eventId);

        //mark the file as hidden with a class
        fileLI.classList.add('hiddenFile');
    } //else- already deleted no need to delete again
}
/*
 * Removes a file element from the fs view.
 */
function deleteFileFromPlaybackViewOfFileSystem(fileId) {
    //remove the li that has the file name
    const fileLI = document.getElementById(`playbackViewFile-${fileId}`);
    fileLI.parentNode.removeChild(fileLI);
}
/*
 * Moves a file in the playback view of the file system. This function works 
 * for file renames too.
 */
function moveFileInPlaybackViewOfFileSystem(filePath, fileId, newParentDirectoryId) {
    //get the LI for the file
    const fileLI = document.getElementById(`playbackViewFile-${fileId}`);

    //remove and store the file system element
    fileLI.parentNode.removeChild(fileLI);

    //create a new one in alphabetic order
    addFileToPlaybackViewOfFileSystem(filePath, fileId, newParentDirectoryId);
}
/*
 * Adds an entry in the playback view of the filesystem for a directory in 
 * alphabetic order and before all files. A previously deleted directory LI 
 * may be passed in to be added back to the fs view on dir renames and moves.
 */
function addDirectoryToPlaybackViewOfFileSystem(directoryPath, directoryId, parentDirectoryId, dirLI) {
    //store the dir name
    const pathParts = directoryPath.split('/');
    let directoryName = pathParts[pathParts.length - 2];
    //the root dir will have a zero length, account for that here
    if(directoryName.length === 0) {
        directoryName = '/';
    }

    //get the contents of the ul that holds the contents of the dir (LI's for files and dirs)
    let dirContents;
    //if there is a non-empty parent id (it is not the root of the filesystem)
    if(parentDirectoryId) {
        //get the ul that holds the contents of the dir
        dirContents = document.getElementById(`dirContents-${parentDirectoryId}`);
    } else { //empty parent id
        //use the topmost ul and set the root dir name
        dirContents = document.getElementById('playbackViewOfFileSystem');
    }

    //if no dirLI is passed in, then create a new one
    if(!dirLI) {
        dirLI = createFileSystemDirectoryUI(directoryPath, directoryId, parentDirectoryId);
    } //else- one is passed in in a move/rename dir operation
    
    //add the directory before all files and alphabetically among directories
    let afterDir = null;
    let found = false;

    //go through the contents of the ul that holds the contents of the dir (LI's for files and dirs)
    for(let i = 0;i < dirContents.children.length;i++) {
        const fsElement = dirContents.children[i];

        //if the item is a file
        if(fsElement.classList.contains('playbackFileView')) {
            //found the dir after where the new dir should go
            afterDir = fsElement;
            found = true;
            break;
        } else if(fsElement.classList.contains('playbackDirView')) { //it is a dir
            const fsElementPath = fsElement.getAttribute('data-directoryPath');
            //store the dir name
            const fsElementPathParts = fsElementPath.split('/');
            let fsElementName = fsElementPathParts[fsElementPathParts.length - 2];
            //if its a dir and the new dir name comes before the current dir name
            if(directoryName < fsElementName) {
                //found the dir after where the new dir should go
                afterDir = fsElement;
                found = true;
                break;
            }
        }
    }

    //if the exact alphabetic order was found
    if(found) {
        //add before the found element
        dirContents.insertBefore(dirLI, afterDir);
    } else {
        //add the list items to the parent
        dirContents.appendChild(dirLI);
    }
}
/*
 * Shows a previously hidden directory from the file system view.
 */
function showDirectoryFromPlaybackViewOfFileSystem(eventId) {
    //get all the files that have been deleted by the delete dir event
    const allFilesDeleted = document.querySelectorAll(`.playbackFileView[data-deletedByEventId="${eventId}"]`);
    for(let i = 0;i < allFilesDeleted.length;i++) {
        //make the file visible
        allFilesDeleted[i].classList.remove('hiddenFile');
        //mark it as no longer deleted
        allFilesDeleted[i].removeAttribute('data-deletedByEventId');
    }
    
    //get all the dirs that have been deleted by the delete dir event
    const allDirectoriesDeleted = document.querySelectorAll(`.playbackDirView[data-deletedByEventId="${eventId}"]`);
    for(let i = 0;i < allDirectoriesDeleted.length;i++) {
        //make the dir visible
        allDirectoriesDeleted[i].classList.remove('hiddenDirectory');
        //mark it as no longer deleted
        allDirectoriesDeleted[i].removeAttribute('data-deletedByEventId');
    }
}
/*
 * Hides a directory from the file system view. Adds a data attribute with the 
 * id of the delete dir event that caused the delete ('data-deletedByEventId').
 * All files and dirs deleted from this get this id and it is used to make
 * a delete dir going backwards visible again.
 */
function hideDirectoryFromPlaybackViewOfFileSystem(directoryId, eventId) {
    //get the LI for the directory
    const dirLI = document.getElementById(`playbackViewDir-${directoryId}`);
    //mark the dir as hidden with a class
    dirLI.classList.add('hiddenDirectory');
    dirLI.setAttribute('data-deletedByEventId', eventId);

    //get all of the files in this dir that have not been deleted
    const allNonDeletedFiles = dirLI.querySelectorAll('.playbackFileView:not([data-deletedByEventId])');
    //mark each file as being deleted
    for(let i = 0;i < allNonDeletedFiles.length;i++) {
        //store the id of the event that deleted the file
        allNonDeletedFiles[i].setAttribute('data-deletedByEventId', eventId);
        //mark the file as hidden with a class
        allNonDeletedFiles[i].classList.add('hiddenFile');
    }
    //get all of the dirs in this dir that have not been deleted
    const allNonDeletedDirs = dirLI.querySelectorAll('.playbackDirView:not([data-deletedByEventId])');
    //mark each file as being deleted
    for(let i = 0;i < allNonDeletedDirs.length;i++) {
        //store the id of the event that deleted the dir
        allNonDeletedDirs[i].setAttribute('data-deletedByEventId', eventId);
        //mark the dir as hidden with a class
        allNonDeletedDirs[i].classList.add('hiddenDirectory');
    }
}
/*
 * Removes a directory from the file system view.
 */
function deleteDirectoryFromPlaybackViewOfFileSystem(directoryId) {
    //remove the li that has the dir name and the ul of dir contents
    const dirLI = document.getElementById(`playbackViewDir-${directoryId}`);
    dirLI.parentNode.removeChild(dirLI);
}
/*
 * Renames a dir in the playback view of the file system
 */
function renameDirectoryInPlaybackViewOfFileSystem(newDirectoryPath, directoryId, parentDirectoryId) {
    //remove and store the dir element
    const dirLI = document.getElementById(`playbackViewDir-${directoryId}`);
    dirLI.parentNode.removeChild(dirLI);

    //get the old dir path
    const oldDirectoryPath = dirLI.getAttribute('data-directoryPath');
    //update the path of the dir
    dirLI.setAttribute('data-directoryPath', newDirectoryPath);

    //store the dir name
    const pathParts = newDirectoryPath.split('/');
    let directoryName = pathParts[pathParts.length - 2];
    //update the name
    dirLI.children[1].innerHTML = directoryName;
    
    //add the dir back in alphabetic order
    addDirectoryToPlaybackViewOfFileSystem(newDirectoryPath, directoryId, parentDirectoryId, dirLI);

    //update the paths of all the files and dirs inside this one
    updatePathOfDirContents(directoryId, oldDirectoryPath, newDirectoryPath);
}
/*
 * Moves a dir in the playback view of the file system.
 */
function moveDirectoryInPlaybackViewOfFileSystem(newDirectoryPath, directoryId, parentDirectoryId) {
    //remove and store the dir element
    const dirLI = document.getElementById(`playbackViewDir-${directoryId}`);
    dirLI.parentNode.removeChild(dirLI);

    //get the old dir path
    const oldDirectoryPath = dirLI.getAttribute('data-directoryPath');
    //update the path and parent dir id of the moved dir 
    dirLI.setAttribute('data-directoryPath', newDirectoryPath);
    dirLI.setAttribute('data-parentDirectoryId', parentDirectoryId);

    //add the dir back in alphabetic order
    addDirectoryToPlaybackViewOfFileSystem(newDirectoryPath, directoryId, parentDirectoryId, dirLI);

    //update the paths of all the files and dirs inside this one
    updatePathOfDirContents(directoryId, oldDirectoryPath, newDirectoryPath);
}
/*
 * Removes the activeFileOrDirectory class from any element that is active
 * in the playback view of the file system.
 */
function removeActiveFileOrDirectoryStyling() {
    //look for the current active file or directory
    const currentActiveFileOrDirectory = document.querySelector('.activeFileOrDirectory');

    //if there is an active file or directory
    if(currentActiveFileOrDirectory) {
        //remove the class that makes it active
        currentActiveFileOrDirectory.classList.remove('activeFileOrDirectory');
    }
}
/*
 * Adds the activeFileOrDirectory class to a file that is active
 * in the playback view of the file system.
 */
function addActiveFileStyling(fileId) {
    //look for the current active file or directory
    const currentActiveFileOrDirectory = document.querySelector('.activeFileOrDirectory');

    //if the active file/dir is different from the passed in file id
    if(currentActiveFileOrDirectory && currentActiveFileOrDirectory.getAttribute('id') !== `playbackViewFile-${fileId}`) {
        //remove the current active file or directory
        removeActiveFileOrDirectoryStyling();
    }
    //get the list item for the file
    const fileListItem = document.querySelector(`#playbackViewFile-${fileId}`);
    if(fileListItem) {
        //make the file active
        fileListItem.classList.add('activeFileOrDirectory');
    }
}
/*
 * Adds the activeFileOrDirectory class to a directory that is active
 * in the playback view of the file system.
 */
function addActiveDirectoryStyling(dirId) {
    //these don't happen very often so just always remove the old and add the new
    //get the list item for the directory
    const dirLi = document.querySelector(`#playbackViewDir-${dirId}`);
    if(dirLi) {
        //remove the current active file or directory
        removeActiveFileOrDirectoryStyling();

        //make the directory active
        dirLi.classList.add('activeFileOrDirectory');
    }
}
/*
 * Updates the paths in a directory as a result of a directory move/rename.
 */
function updatePathOfDirContents(directoryId, oldDirectoryPath, newDirectoryPath) {
    //get the ul that holds the directories contents
    const dirContents = document.getElementById(`dirContents-${directoryId}`);

    //get all the non-deleted files in the directory and go through them
    const fileLIs = dirContents.querySelectorAll('li.playbackFileView:not([data-deletedByEventId])');
    for(let i = 0;i < fileLIs.length;i++) {
        //update the path attribute
        const oldPath = fileLIs[i].getAttribute('data-filePath');
        const newPath = oldPath.replace(oldDirectoryPath, newDirectoryPath);
        fileLIs[i].setAttribute('data-filePath', newPath);
    }

    //get all the non-deleted directories in the directory and go through them
    const dirLIs = dirContents.querySelectorAll('li.playbackDirView:not([data-deletedByEventId])');
    for(let i = 0;i < dirLIs.length;i++) {
        //update the path attribute
        const oldPath = dirLIs[i].getAttribute('data-directoryPath');
        const newPath = oldPath.replace(oldDirectoryPath, newDirectoryPath);
        dirLIs[i].setAttribute('data-directoryPath', newPath);
    }
}
/*
 * Get all of the file info from the file system view in a directory.
 */
function getFilesFromADirectory(dirId) {
    //get the ul that holds the directories contents
    const dirContents = document.getElementById(`dirContents-${dirId}`);

    //holds file info
    let childFiles = [];

    //get the child files that are not deleted
    const fileLIs = dirContents.querySelectorAll('.playbackFileView:not([data-deletedByEventId])');

    //build up info about the files
    for(let i = 0;i < fileLIs.length;i++) {
        const file = {
            fileId: fileLIs[i].getAttribute('data-fileId'),
            filePath: fileLIs[i].getAttribute('data-filePath'),
            parentDirectoryId: fileLIs[i].getAttribute('data-parentDirectoryId')
        };
        childFiles.push(file);
    }

    return childFiles;
}
/*
 * Get all of the dir info from the file system view in a directory.
 */
function getDirectoriesFromADirectory(dirId) {
    //get the ul that holds the directory's contents
    const dirContents = document.getElementById(`dirContents-${dirId}`);

    //holds dir info
    let childDirs = [];

    //get the child dirs that are not deleted
    const dirLIs = dirContents.querySelectorAll('.playbackDirView:not([data-deletedByEventId])');

    //build up info about the dir
    for(let i = 0;i < dirLIs.length;i++) {
        const dir = {
            directoryId: dirLIs[i].getAttribute('data-directoryId'),
            directoryPath: dirLIs[i].getAttribute('data-directoryPath'),
            parentDirectoryId: dirLIs[i].getAttribute('data-parentDirectoryId')
        };
        childDirs.push(dir);
    }

    return childDirs;
}
/*
 * Add change file mmarkers in the tabs and file system view.
 */
function highlightChangedFiles(allChangedFileIds) {
    //go through all of the changed files
    for(let i = 0;i < allChangedFileIds.length;i++) {
        const changedFileId = allChangedFileIds[i];
        //mark the tabs
        const tabToUpdate = document.getElementById(`${changedFileId}-tab`);
        tabToUpdate.classList.add('fileUpdated');

        //mark the files in the fs view
        const fileToUpdate = document.getElementById(`playbackViewFile-${changedFileId}`).querySelector('.fileLink');
        fileToUpdate.classList.add('fileUpdated');
    }
}
/*
 * Clear the changed file markers in the tabs and file system view.
 */
function clearHighlightChangedFiles() {
    //remove any existing changed files
    const allUpdatedFileElements = document.querySelectorAll('.fileUpdated');
    for(let i = 0;i < allUpdatedFileElements.length;i++) {
        allUpdatedFileElements[i].classList.remove('fileUpdated');
    }
}

function createEditCommentButton(commentObject, buttonText){
    const editCommentButton = document.createElement("button");
    editCommentButton.classList.add("btn", "btn-outline-dark", "btn-sm");
    editCommentButton.appendChild(document.createTextNode(buttonText));
    editCommentButton.addEventListener('click', event => {
        pauseMedia();
        document.getElementById("viewCommentsTab").classList.add("disabled");
    
        const addCommentButton =  document.getElementById("addCommentButton");
        const updateCommentButton = document.getElementById("UpdateCommentButton");
        addCommentButton.style.display = "none";
        updateCommentButton.removeAttribute("style");
        //cancelUpdateButton.removeAttribute("style");
    
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
  

        updateCommentButton.addEventListener('click' , event => {
            pauseMedia();
            updateComment(commentObject);

            document.getElementById("CancelUpdateButton").click();
        })
    });
    return editCommentButton;
}


function updateAllCommentHeaderCounts(){
    const drag = document.getElementsByClassName("drag");
    for (let i = 0; i < drag.length; i++){
        drag[i].getElementsByClassName("card-header")[0].firstChild.data = i + 1 + "/" + drag.length;
    }    
}