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
            event.target.classList.toggle('mediaSelected')
        });
    }
   
    return newImg;
}

function createMediaControllerCommentVideoUI(srcPath, makeSelected, returnWithEventistener = true){
    //filename of the video
    const fileName = srcPath.substring(srcPath.indexOf('-') + 1);
    //create a card with a body and a footer
    const cardDiv = document.createElement('div');
    //create two bootstrap classes and a st class
    cardDiv.classList.add('card', 'text-center','mediaVideoCard');  

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
    newVideo.classList.add('mediaVideo');
   
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
            cardDiv.classList.toggle('mediaSelected')
        });
    }

    return cardDiv;
}

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
    newAudio.classList.add('mediaAudio');
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
    button.addEventListener("click",event =>{
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

//a number that is incremented with each carousel to keep ids unique
let currentCarousel = 0;

function createCarousel(){
    const carouselOuter = document.createElement('div');
 
    carouselOuter.setAttribute('id', 'mycarousel' + currentCarousel++);
    carouselOuter.setAttribute('data-ride', 'carousel');
    carouselOuter.setAttribute('data-interval','false');
    carouselOuter.setAttribute('keyboard', 'false');
    carouselOuter.classList.add('carousel','slide');
    const carouselInner = document.createElement('div');
    carouselOuter.append(carouselInner);
    return carouselOuter;
}

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
    if (!carousel.firstChild.firstChild.classList.value.includes("active")){
        carousel.firstChild.firstChild.classList.add('active');
    }
}

function makeCarouselControls(carousel){
    let right = document.createElement('a');
    let left = document.createElement('a');

    right.classList.add("carousel-control-next");
    left.classList.add("carousel-control-prev");

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
                //bring the file with the highlighted text to the front by simulating a click
                const fileIdTab = document.getElementById(`${commentObject.selectedCodeBlocks[0].fileId}-tab`);
                if (fileIdTab !== null){
                    fileIdTab.click();
                }
                
                
                //record the active editor
                playbackData.activeEditorFileId = commentObject.selectedCodeBlocks[0].fileId;
            }
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

function createEditCommentButton(commentObject, buttonText){
    const editCommentButton = document.createElement("button");
    editCommentButton.classList.add("btn", "btn-outline-dark", "btn-sm");
    editCommentButton.appendChild(document.createTextNode(buttonText));
    editCommentButton.addEventListener('click', event => {
  
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