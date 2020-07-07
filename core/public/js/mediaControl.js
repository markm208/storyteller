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
});

document.getElementById('addMediaToCommentButton').addEventListener('click', event => {
    //get the selected urls to add to the comment
    const selectedImageURLs = [];
    const selectedImageElements = document.getElementsByClassName('mediaImage mediaSelected');  
    const selectedVideoElements = document.getElementsByClassName('mediaVideoCard mediaSelected');
    const selectedAudioElements = document.getElementsByClassName('mediaAudioCard mediaSelected');

    //adds the selected media to the comment preview and removes the media selected class
    while(selectedImageElements[0]) {
        //create the preview cards and add them to the preview div
        let imageCard = createMediaControllerCommentImageUI(selectedImageElements[0].getAttribute('src') , false);
        previewPanel.appendChild(imageCard);

        //store the url
        selectedImageURLs.push(selectedImageElements[0].getAttribute('src'));

        //clear out the selected media class
        selectedImageElements[0].classList.remove('mediaSelected');
    }
    while(selectedVideoElements[0]) {

        const videoPreviewDiv = $(".video-preview")[0];
        $("div.video-preview").show();

        const src = selectedVideoElements[0].children[0].children[0].getAttribute('src');

        //create the preview cards and add them to the preview div
        let videoCard = createMediaControllerCommentVideoUI(src , false); 

        //add cancel button to the top of the preview card
        addCancelButtonToCard(videoCard, src, playbackData.mediaForNewComment[1], videoPreviewDiv);

        //add the preview to the div
        videoPreviewDiv.appendChild(videoCard);

        //store the url
         playbackData.mediaForNewComment[1].push(src);

        //clear out the selected media class
        selectedVideoElements[0].classList.remove('mediaSelected');
    }
    while(selectedAudioElements[0]) {
        const audioPreviewDiv = $(".audio-preview")[0];
        $("div.audio-preview").show();

        const src = selectedAudioElements[0].children[0].children[0].getAttribute('src');

        //create the preview cards and add them to the preview div
        let audioCard = createMediaControllerCommentAudioUI(src, false);

        //add cancel button to the top of the preview card
        addCancelButtonToCard(audioCard, src, playbackData.mediaForNewComment[2], audioPreviewDiv);

        audioPreviewDiv.appendChild(audioCard);

        //store the url
        playbackData.mediaForNewComment[2].push(src);
        
        //clear out the selected media class
        selectedAudioElements[0].classList.remove('mediaSelected');
    }

    //hide the modal (using jquery)
    $('#mediaControlModal').modal('hide');
});

function addCancelButtonToCard(card, src, folderToDeleteFrom, panelToDeleteFrom){
    const previewPanel = document.getElementById("commentPreview");

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

        const index = folderToDeleteFrom.indexOf(src);
        folderToDeleteFrom.splice(index, 1);
    });
    card.firstChild.append(button);
}

document.getElementById('deleteMediaButton').addEventListener('click', async event => {
    //delete any selected images
    deleteSelectedImages();
    //delete any selected videos
    deleteSelectedVideos();
    //delete any selected audios
    deleteSelectedAudios();
});

document.getElementById('addImageButton').addEventListener('change', async event => {
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

function addImagesToGallery(filePaths, makeSelected) {
    //go through all of the file paths
    for(let i = 0;i < filePaths.length;i++) {
        //get the image gallery
        const gallery = document.getElementById('imageGallery');
        
        //create an element with the image
        const newImg = createMediaControllerCommentImageUI(filePaths[i], makeSelected);
        
        //add the image
        gallery.appendChild(newImg);
    }
}

function addVideosToGallery(filePaths, makeSelected) {
    //go through all of the file paths
    for(let i = 0;i < filePaths.length;i++) {
        //get the video gallery
        const gallery = document.getElementById('videoGallery');

        //create an element with the video
        const cardDiv = createMediaControllerCommentVideoUI(filePaths[i], makeSelected);

        //add the video
        gallery.appendChild(cardDiv);
    }
}

function addAudiosToGallery(filePaths, makeSelected) {
    //go through all of the file paths
    for(let i = 0;i < filePaths.length;i++) {
        //get the audio gallery
        const gallery = document.getElementById('audioGallery');

        //create an element with the audio
        const cardDiv = createMediaControllerCommentAudioUI(filePaths[i], makeSelected);

        //add the audio
        gallery.appendChild(cardDiv);
    }
}

async function deleteSelectedImages() {
    try {
        const filePaths = [];

        //find all of the images that are selected
        const selectedImages = document.getElementsByClassName('mediaImage mediaSelected');
        for(let i = 0;i < selectedImages.length;i++) {
            //get the src and add it to the array of paths to send to the 
            //server to delete from the public dir
            const filePath = selectedImages[i].getAttribute('src');
            filePaths.push(filePath);
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
            while(selectedImages[0]) {
                selectedImages[0].parentNode.removeChild(selectedImages[0]);
            }
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
        for(let i = 0;i < selectedVideos.length;i++) {
            //get the src from the nested card and add it to the array of paths to send to the 
            //server to delete from the public dir
            const filePath = selectedVideos[i].children[0].children[0].getAttribute('src');
            filePaths.push(filePath);
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
            while(selectedVideos[0]) {
                selectedVideos[0].parentNode.removeChild(selectedVideos[0]);
            }
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
        for(let i = 0;i < selectedAudios.length;i++) {
            //get the src from the nested card and add it to the array of paths to send to the 
            //server to delete from the public dir
            const filePath = selectedAudios[i].children[0].children[0].getAttribute('src');
            filePaths.push(filePath);
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
            while(selectedAudios[0]) {
                selectedAudios[0].parentNode.removeChild(selectedAudios[0]);
            }
        } else {
            console.log('Error with the response data');
        }
    } catch(error) {
        console.log(error);
    }
}

//Takes the file extension to be uploaded and generates the MIME Type String
function createMimeString(fileExt)
{
    //Instantiate the string to be returned
    let mimeType;

    //create the correct string depending on the file extension
    switch (fileExt)
    {
        // Video Formats
        case 'mp4':
            mimeType = 'video/mp4';
            break;

        case 'mov':
            mimeType = 'video/quicktime';
            break;

        case 'flv':
            mimeType = 'video/x-flv';
            break;

        case 'avi':
            mimeType = 'video/x-msvideo';
            break;

        //Audio Formats
        case 'mp3':
            mimeType = 'audio/mp3';
            break;

        case 'wav':
            mimeType = 'audio/wav';
            break;

        // If no matching file extension was found throw an error
        default:
            console.log('Error creating MIME Type: Unknown File Format.');

    }

    //return the finished MIME Type string
    return mimeType;

}