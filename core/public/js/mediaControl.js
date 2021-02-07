async function initImageGallery() {
    try {
        //get all of the image, video, and audio urls from the server
        const responses = await Promise.all([
            fetch('/newMedia/image'),
            fetch('/newMedia/video'),
            fetch('/newMedia/audio'),
        ]);

        const results = await Promise.all([
            responses[0].json(),
            responses[1].json(),
            responses[2].json()
        ]);

        //store the info about the media
        const imageInfo = results[0];
        const videoInfo = results[1];
        const audioInfo = results[2];
            
        //add the media to the galleries dynamically
        addImagesToGallery(imageInfo.filePaths, false);
        addVideosToGallery(videoInfo.filePaths, false);
        addAudiosToGallery(audioInfo.filePaths, false);
    } catch(error) {
        console.log(`Error: ${error}`);
    }
}

document.getElementById('addMediaButton').addEventListener('click', event => {
    //show the media control modal (using jquery)
    $('#mediaControlModal').modal('show');
    pauseMedia();
});

document.getElementById('addMediaToCommentButton').addEventListener('click', event => {
    pauseMedia();
    //get the selected urls to add to the comment
    const selectedImageURLs = [];
    const selectedImageElements = document.getElementsByClassName('mediaImage mediaSelected');  
    const selectedVideoElements = document.getElementsByClassName('mediaVideoCard mediaSelected');
    const selectedAudioElements = document.getElementsByClassName('mediaAudioCard mediaSelected');

    //adds the selected media to the comment preview and removes the media selected class
    while(selectedImageElements[0]) {
        const imagePreviewDiv = $(".image-preview")[0];
        $("div.image-preview").show();

        const src = selectedImageElements[0].getAttribute('src');

        //create the preview cards and add them to the preview div
        let imageCard = createMediaControllerCommentImageUI(src , false, false);
        makeDraggable(imageCard);

        addCancelButtonToImage(imageCard, imagePreviewDiv);

        //clear out the selected media class
        selectedImageElements[0].classList.remove('mediaSelected');
    }
    while(selectedVideoElements[0]) {

        const videoPreviewDiv = $(".video-preview")[0];
        $("div.video-preview").show();

        const src = selectedVideoElements[0].querySelector('[src]').getAttribute('src');

        //create the preview cards and add them to the preview div
        let videoCard = createMediaControllerCommentVideoUI(src , false, false); 

        makeDraggable(videoCard);


        //add cancel button to the top of the preview card
        addCancelButtonToCard(videoCard, videoPreviewDiv);        

        //add the preview to the div
        videoPreviewDiv.appendChild(videoCard);

        //clear out the selected media class
        selectedVideoElements[0].classList.remove('mediaSelected');
    }
    while(selectedAudioElements[0]) {
         let audioPreviewDiv = $(".audio-preview")[0];
         $("div.audio-preview").show();

        const src = selectedAudioElements[0].querySelector('[src]').getAttribute('src');

        //create the preview cards and add them to the preview div
        let audioCard = createMediaControllerCommentAudioUI(src, false, false);

        makeDraggable(audioCard);

        //add cancel button to the top of the preview card
        addCancelButtonToCard(audioCard, audioPreviewDiv);

        audioPreviewDiv.appendChild(audioCard);
        
        //clear out the selected media class
        selectedAudioElements[0].classList.remove('mediaSelected');
    }

    //hide the modal (using jquery)
    $('#mediaControlModal').modal('hide');
});

document.getElementById('deleteMediaButton').addEventListener('click', async event => {

    //delete any selected images
    const allImagesDeleted = await deleteSelectedImages();

    //delete any selected videos
    const allVideosDeleted =  await deleteSelectedVideos();

    //delete any selected audios
    const allAudiosDeleted = await deleteSelectedAudios();

    //if one ore more of any of the types of media was in a comment when the user attemped to delete it from the server
    if (!allImagesDeleted || !allVideosDeleted || !allAudiosDeleted) {
       $('#deleteMediaButton').popover('enable');

       $('#deleteMediaButton').popover('show');

       $('.popover-header').css('background-color', 'red');
    }
    
});

window.addEventListener("paste", pasteEvent => {
    // //check to see if the user is pasting an image into a new or editable comment
    // const updateCommentButton = document.getElementById("updateCommentButton");
    // const updateButtonStyle = updateCommentButton.getAttribute("style");
    // //the 'update comment' button's style is 'display: none;' when there is NOT a comment being edited
    // //the 'style' is removed completely when a comment is being edited
    // const addCommentButton = document.getElementById("addCommentButton");
    // const addButtonStyle = addCommentButton.getAttribute("style");
    const commentEditable = document.querySelector('#commentEditable');

    //if there is no 'style' on this button then a comment is being edited
    if(commentEditable.dataset.commentEditable === "true") {
        //whether the paste data has images or not
        let pasteHasImages = false;
        //check for clipboard data
        if(pasteEvent.clipboardData) {
            //acceptable image mime types
            const acceptableImageMimeTypes = ['image/apng', 'image/bmp', 'image/gif', 'image/ico', 'image/jpeg', 'image/png', 'image/svg+xml'];
            //get all of the files on the clipboard
            const files = pasteEvent.clipboardData.files;
            //go through the clipboard files if there are any
            for(let i = 0; i < files.length; i++) {
                //if the clipboard data has any files and they are acceptable images
                if (acceptableImageMimeTypes.includes(files[i].type)) {
                    //indicate that the images will be added to the media pop up
                    pasteHasImages = true;
                    break;
                }
            }
            //if new images will be added to the media pop up
            if(pasteHasImages) {
                //prevent a paste in the comment text box if it has the focus
                pasteEvent.preventDefault();

                //open the media pop up
                document.getElementById('addMediaButton').click();

                //add the files from the clipboard to the media pop up and server
                addImageFiles(pasteEvent.clipboardData.files);
            }
        }
    } //else- no comment being edited
});

document.getElementById('addImageButton').addEventListener('change', async event => {
        //get the selected files and add them to the media pop up and server
        addImageFiles(event.target.files);
});

document.getElementById('addVideoButton').addEventListener('change', async event => {
    try {
        //create some form data
        const formData = new FormData();

        //get the selected files
        const files = event.target.files;

        //go through all of the selected files
        //if there is only one the FormData will add it, if there are many it 
        //will create an array of the files
        for(let i = 0;i < files.length;i++) {
            //add the file to the form data
            formData.append('newVideoFiles', files[i]);
        }

        //post to the server
        const fetchConfigData = {
            method: 'POST',
            body: formData, 
        };
        const response = await fetch('/newMedia/video', fetchConfigData);
    
        //check the response
        if(response.ok) {
            const videoInfo = await response.json();
            
            //add the new videos to the gallery
            addVideosToGallery(videoInfo.filePaths, true);
        } else {
            console.log('Error with the response data');
        }
    } catch(error) {
        console.log('Error with request');
    }
});

document.getElementById('addAudioButton').addEventListener('change', async event => {
    try {
        //create some form data
        const formData = new FormData();

        //get the selected files
        const files = event.target.files;

        //go through all of the selected files
        //if there is only one the FormData will add it, if there are many it 
        //will create an array of the files
        for(let i = 0;i < files.length;i++) {
            //add the file to the form data
            formData.append('newAudioFiles', files[i]);
        }

        //post to the server
        const fetchConfigData = {
            method: 'POST',
            body: formData, 
        };
        const response = await fetch('/newMedia/audio', fetchConfigData);
    
        //check the response
        if(response.ok) {
            const audioInfo = await response.json();
            
            //add the new audios to the gallery
            addAudiosToGallery(audioInfo.filePaths, true);
        } else {
            console.log('Error with the response data');
        }
    } catch(error) {
        console.log('Error with request');
    }
});

async function addImageFiles(files) {
    try {
        //create some form data
        const formData = new FormData();

        //go through all of the selected files
        //if there is only one the FormData will add it, if there are many it 
        //will create an array of the files
        for(let i = 0;i < files.length;i++) {
            //add the file to the form data
            formData.append('newImageFiles', files[i]);
        }

        //post to the server
        const fetchConfigData = {
            method: 'POST',
            body: formData, 
        };
        const response = await fetch('/newMedia/image', fetchConfigData);
    
        //check the response
        if(response.ok) {
            const imageInfo = await response.json();
            
            //add the new images to the gallery
            addImagesToGallery(imageInfo.filePaths, true);
        } else {
            console.log('Error with the response data');
        }
    } catch(error) {
        console.log('Error with request');
    }
}

function addImagesToGallery(filePaths, makeSelected) {
    //go through all of the file paths
    for(let i = filePaths.length - 1;i >= 0;i--) {
        //get the image gallery
        const gallery = document.getElementById('imageGallery');
        
        //create an element with the image
        const newImg = createMediaControllerCommentImageUI(filePaths[i], makeSelected);
        
        //add the image
        gallery.insertBefore(newImg, gallery.firstChild);
    }
}

function addVideosToGallery(filePaths, makeSelected) {
    //go through all of the file paths
    for(let i = filePaths.length - 1;i >= 0;i--) {
        //get the video gallery
        const gallery = document.getElementById('videoGallery');

        //create an element with the video
        const cardDiv = createMediaControllerCommentVideoUI(filePaths[i], makeSelected);

        //add the video
        gallery.insertBefore(cardDiv, gallery.firstChild);
    }
}

function addAudiosToGallery(filePaths, makeSelected) {
    //go through all of the file paths
    for(let i = filePaths.length - 1;i >= 0;i--) {
        //get the audio gallery
        const gallery = document.getElementById('audioGallery');

        //create an element with the audio
        const cardDiv = createMediaControllerCommentAudioUI(filePaths[i], makeSelected);

        //add the audio
        gallery.insertBefore(cardDiv, gallery.firstChild);
    }
}

async function deleteSelectedImages() {
    try {
        const filePaths = [];

        //find all of the images that are selected
        const selectedImages = document.getElementsByClassName('mediaImage mediaSelected');

        const imagesInComments = [...document.getElementsByClassName('carousel-item')];
        let noConflict = true;
        let imagesRemoved =[];

        for(let i = 0;i < selectedImages.length;i++) {
            //get the src and add it to the array of paths to send to the 
            //server to delete from the public dir
            const filePath = selectedImages[i].getAttribute('src');

            //if the filePath does not match an images src that is currently in a comment
            if (imagesInComments.findIndex(image => image.getElementsByTagName('img')[0].getAttribute('src') === filePath) === -1) {
                filePaths.push(filePath);
                imagesRemoved.push(selectedImages[i]);
            } else {
                noConflict = false;
            }
        }

        //delete to the server
        const fetchConfigData = {
            method: 'DELETE',
            body: JSON.stringify(filePaths), 
            headers: {
                'Content-Type': 'application/json'
            }
        };
        const response = await fetch('/newMedia/image', fetchConfigData);

        //check the response
        if(response.ok) {
            //remove the images
            while(imagesRemoved[0]) {
                imagesRemoved[0].parentNode.removeChild(imagesRemoved[0]);
                imagesRemoved.shift();
            }
            return noConflict;
        } else {
            console.log('Error with the response data');
        }
    } catch(error) {
        console.log(error);
    }
}

async function deleteSelectedVideos() {
    try {
        const filePaths = [];

        //find all of the videos that are selected
        const selectedVideos = document.getElementsByClassName('mediaVideoCard mediaSelected');

        const videosInComments = [...document.getElementById("commentContentDiv").querySelectorAll('.mediaResizable[src*="/media/video"]')];
        let videosRemoved = [];
        let noConflict = true;

        for(let i = 0;i < selectedVideos.length;i++) {
            //get the src from the nested card and add it to the array of paths to send to the 
            //server to delete from the public dir
            let filePath = selectedVideos[i].querySelector('[src*="media/videos"]');
            if(filePath) {
                filePath = filePath.getAttribute('src');
                //if the filePath does not match a videos src that is currently in a comment
                if (videosInComments.findIndex(video => video.getAttribute('src') === filePath) === -1) {
                    filePaths.push(filePath);
                    videosRemoved.push(selectedVideos[i]);
                } else {
                    noConflict = false;
                }
            }
        }

        //delete to the server
        const fetchConfigData = {
            method: 'DELETE',
            body: JSON.stringify(filePaths), 
            headers: {
                'Content-Type': 'application/json'
            }
        };
        const response = await fetch('/newMedia/video', fetchConfigData);

        //check the response
        if(response.ok) {
            //remove the videos
            while(videosRemoved[0]) {
                videosRemoved[0].parentNode.removeChild(videosRemoved[0]);
                videosRemoved.shift();
            }
            return noConflict;
        } else {
            console.log('Error with the response data');
        }
    } catch(error) {
        console.log(error);
    }
}

async function deleteSelectedAudios() {
    try {
        const filePaths = [];

        //find all of the audios that are selected
        const selectedAudios = document.getElementsByClassName('mediaAudioCard mediaSelected');

        const audiosInComments = [...document.getElementById("commentContentDiv").querySelectorAll('.mediaResizable[src*="/media/audio"]')];

        let audiosRemoved = [];
        let noConflict = true;

        for(let i = 0;i < selectedAudios.length;i++) {
            //get the src from the nested card and add it to the array of paths to send to the 
            //server to delete from the public dir
            let filePath = selectedAudios[i].querySelector('[src*="media/audios"]');
            if(filePath) {
                filePath = filePath.getAttribute('src');
                //if the filePath does not match an audio src that is currently in a comment
                if (audiosInComments.findIndex(audio => audio.getAttribute('src') === filePath) === -1) {
                    filePaths.push(filePath);
                    audiosRemoved.push(selectedAudios[i]);
                } else {
                    noConflict = false;
                }
            }
        }

        //delete to the server
        const fetchConfigData = {
            method: 'DELETE',
            body: JSON.stringify(filePaths), 
            headers: {
                'Content-Type': 'application/json'
            }
        };
        const response = await fetch('/newMedia/audio', fetchConfigData);

        //check the response
        if(response.ok) {
            //remove the audios
            while(audiosRemoved[0]) {
                audiosRemoved[0].parentNode.removeChild(audiosRemoved[0]);
                audiosRemoved.shift();
            }
            return noConflict;
        } else {
            console.log('Error with the response data');
        }
    } catch(error) {
        console.log(error);
    }
}
