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

function addCancelButtonToImage(image, src, panelToDeleteFrom){
    let imageDiv = document.createElement('div');
    imageDiv.classList.add('image-div')
    let button = document.createElement('button');
    button.classList.add('close', 'imageCancelButton');
    button.setAttribute('aria-label', 'close');
    button.innerHTML ='&times;';
    button.style.color = 'red';
    button.setAttribute('title',"Remove image from comment");

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

function addCancelButtonToCard(card, src, panelToDeleteFrom){
    let button = document.createElement('button');
    button.classList.add('close');
    button.setAttribute('aria-label', 'close');
    button.innerHTML ='&times;';
    button.style.color = 'red';
    button.setAttribute('title',"Remove media from comment");
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
    let carouselOuter = document.createElement('div');
 
    carouselOuter.setAttribute('id', 'mycarousel' + currentCarousel++);
    carouselOuter.setAttribute('data-ride', 'carousel');
    carouselOuter.setAttribute('data-interval','false');
    carouselOuter.classList.add('carousel','slide');
    let carouselInner = document.createElement('div');
    carouselOuter.append(carouselInner);
    return carouselOuter;
}

function addImageToCarousel(src, carousel){
    let img = document.createElement('img');
    let imgDiv = document.createElement('div');
    imgDiv.classList.add('carousel-item');
    img.src = src;
    img.classList.add('d-block','w-100');
    imgDiv.append(img);
    carousel.firstChild.append(imgDiv);
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

function makeDraggable(param, dropFolder){
    param.setAttribute('draggable', 'true');
    param.classList.add('draggable');

    param.addEventListener('dragstart', () => {
        param.classList.add('dragging');
    })

    param.addEventListener('dragend', () => {
        param.classList.remove('dragging');
    })    
}

function createCommentCard(commentObject, currentComment, commentCount)
{
    const cardHeader = document.createElement('div');
    cardHeader.classList.add('card-header', 'text-muted', 'text-left', 'p-0');
    cardHeader.innerHTML = currentComment++ + '/' + commentCount;
    
    const cardBody = document.createElement('div');
    cardBody.classList.add('card-body');
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

    return finalDiv;
    
}

function createTitleCard(titleInfo, descriptionInfo)
{

}
