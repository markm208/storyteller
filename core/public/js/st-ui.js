function createMediaControllerCommentImageUI(srcPath, makeSelected) {
    //create an image and add the required classes
    const newImg = document.createElement('img');
    newImg.setAttribute('src', srcPath);
    //add a bottstrap class and a st class
    newImg.classList.add('img-thumbnail', 'mediaImage');
    
    //if this image should be marked as pre-selected
    if(makeSelected) {
        newImg.classList.add('mediaSelected');
    }
    
    //add an event handler to toggle whether it is selected
    newImg.addEventListener('click', event => {
        //toggle the 'selected' class
        event.target.classList.toggle('mediaSelected')}
    );
    return newImg;
}

function createMediaControllerCommentVideoUI(srcPath, makeSelected) {
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

    //add an event handler to toggle whether it is selected
    cardDiv.addEventListener('click', event => {
        //toggle the 'selected' class
        cardDiv.classList.toggle('mediaSelected')}
    );

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