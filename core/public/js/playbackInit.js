/*
 *
 */
async function initializePlayback()
{
    //call the function to load the playbackData object with data
    loadPlaybackData();
    
    //determines how many non-relevant events there are
    for (let i = 0; i < playbackData.events.length; i++) {
        if (playbackData.events[i].permanentRelevance === "never relevant") {
            playbackData.numNonRelevantEvents++;               
        } else {
            break;
        }
    }

    //set up the slider and move to the first relevant event
    setUpSlider();
    step(playbackData.numNonRelevantEvents);
  
    //add permanent comment tags to searchData
    permanentCommentTags.forEach(tag => {
        allCommentTagsWithCommentId[tag] = [];
    })

    //displays all comments
    displayAllComments();

    //create the blog view of the playback
    displayAllBlogPosts();

    updateQuestionCommentCounts();


    //Sets up the event listeners for html elements on the page
    setupEventListeners();

    //if this is an editable playback
    if(playbackData.isEditable) {
        //grab any existing media from the server and display it in the media control modal
        initImageGallery();        
        document.getElementById("mainAddCommentButton").classList.remove("mainAddCommentButtonNoEdit");
    } else {
        commentsDiv.style.height = "90vh";
    }

    //get the query string params from the url
    const queryStringParams = new URLSearchParams(window.location.search);
    //get the view param (if there is one)
    const defaultView = queryStringParams.get('view');
    //if the user wants to see the playback in blog view OR the screen is small
    if((defaultView && defaultView === 'blog') || (window.screen.availWidth <= 650)) {
        //switch to the blog view
        document.getElementById('blogMode').click();
    } else { //code view
        //update the url for code view
        window.history.replaceState({view: 'code'}, '', '?view=code');
    }

    //change the documents title to the playback title
    document.title = playbackData.playbackTitle;

    //remove 'checked' status from the questionCheckBox
    if ($('input#questionCheckBox').is(':checked')) {
        $('input#questionCheckBox').click();
    }

    console.log('Success Initializing Playback');
}

// Puts together a full comment object to be pushed to the server
function createCommentObject(commentText, dspEvent, selectedCode, imgURLs, vidURLs, audioURLs, linesAbove, linesBelow, currentFilePath, viewableBlogText, commentTags, questionCommentData)
{
    const comment = {
        commentText,
        timestamp: new Date().getTime(),
        displayCommentEvent: dspEvent,
        selectedCodeBlocks: selectedCode,            
        imageURLs: imgURLs,
        videoURLs: vidURLs,
        audioURLs: audioURLs,
        linesAbove: linesAbove,
        linesBelow: linesBelow,
        currentFilePath: currentFilePath,
        viewableBlogText: viewableBlogText,
        commentTags: commentTags,
        questionCommentData: questionCommentData
    };    

    return comment;
}

function setupEventListeners()
{
    //get the controls
    const stepBackOne = document.getElementById("stepBackOne");
    const stepForwardOne = document.getElementById("stepForwardOne");
    const playbackSlider = document.getElementById("playbackSlider");
    const fastForwardButton = document.getElementById("fastForwardButton");
    
    playbackSlider.setAttribute('max', playbackData.numEvents);
    playbackSlider.setAttribute('min', playbackData.numNonRelevantEvents);
    
    //add event handlers for clicking the buttons
    stepBackOne.addEventListener('click', event => {
        step(-1);

        stopAutomaticPlayback();
        removeActiveCommentAndGroup();


        //TODO determine if this will be included or not
        // const sliderValue = Number(slider.noUiSlider.get());
        // //if the slider falls on a comment, click the comment
        // if (document.querySelector(`.codeView [data-commenteventid="ev-${sliderValue - 1}"]`)) {              
        //     document.querySelector(`.codeView [data-commenteventid="ev-${sliderValue - 1}"]`).click();
        // }
    });

    stepForwardOne.addEventListener('click', event => {
        removeActiveCommentAndGroup();
        step(1);

        //TODO determine if this will be included or not
        // const sliderValue = Number(slider.noUiSlider.get());
        // //if the slider falls on a comment, click the comment
        // if (document.querySelector(`.codeView [data-commenteventid="ev-${sliderValue - 1}"]`)) {              
        //     document.querySelector(`.codeView [data-commenteventid="ev-${sliderValue - 1}"]`).click();
        // }
        stopAutomaticPlayback();
    });

    //add event handler to listen for changes to the slider
    playbackSlider.addEventListener('input', event => {

        //take the slider value and subtract the next event's position
        step(Number(playbackSlider.value) - playbackData.nextEventPosition);
        stopAutomaticPlayback();
    });

    //Setup the title buttons and data
    const playbackTitleDiv = document.getElementById('playbackTitleDiv');
    playbackTitleDiv.innerHTML = playbackData.playbackTitle;

    //bold button
    document.querySelector('#boldCommentButton').addEventListener('click', event => {
        //make the selected text bold
        document.execCommand('bold');
    });
    //italics button
    document.querySelector('#italicCommentButton').addEventListener('click', event => {
        //make the selected text italic
        document.execCommand('italic');
    });
    //code button
    document.querySelector('#codeCommentButton').addEventListener('click', event => {
        //make the selected text look like code by using a fixed width font
        document.execCommand('fontName', null, 'Courier');
    });

    $("#URL-Toast").on("show.bs.toast", function() {
        $(this).removeClass("d-none");
    })
    $("#URL-Toast").on("hidden.bs.toast", function() {
        $(this).addClass("d-none");
    })
    
    //make selected text into a clickable link
    let selectedRange = {};
    document.querySelector('#linkCommentButton').addEventListener('click', event => {       

        const selectedTextString = window.getSelection().toString();
        const textWindow = document.querySelector('.storytellerCommentEditable[contenteditable=true]');
        const selectionParent = window.getSelection().anchorNode ? window.getSelection().anchorNode.parentNode : null;
        
        //make sure that these is a selection, and it comes from only the correct place
        if ((selectedTextString && selectionParent) && (selectionParent.contains(textWindow) || textWindow.contains(selectionParent))) {
            const toastDiv = document.getElementById('URL-Toast'); 
            toastDiv.style.position = "absolute";

            //sets the position of the toast to just under the linkCommentButton
            const commentButtonRectangle = document.querySelector('#linkCommentButton').getBoundingClientRect();
            toastDiv.style.top = commentButtonRectangle.y + 20 +'px';
            toastDiv.style.left = commentButtonRectangle.left + 'px';
            
            //add a blue highlight to the selected text
            document.execCommand("BackColor", false, 'LightBlue');
            
            //backup the selected range
            selectedRange = window.getSelection().getRangeAt(0);

            //show and focus the toast
            $('#URL-Toast').toast('show');            
            document.getElementById('URL').focus();
            
            //add a class to body that will disable all clicks except inside the toast
            document.body.classList.add('popup');
        }
    });

    //event listener for when the link is confirmed
    document.querySelector('#URL-Confirm').addEventListener('click', event => {
        const URLInput = document.getElementById('URL').innerText;
        if (URLInput) {
            //restores the original selection
            selectRange(selectedRange);         
            
            //creates the link
            document.execCommand('createLink', null, URLInput);

            //backup the selected range
            selectedRange = window.getSelection().getRangeAt(0);
            
            //handle all close operations
            document.querySelector('#URL-Close').click();
        }
    });  

    document.querySelector('#URL-Close').onclick = function() {

        //clear the inputted link
        document.getElementById('URL').innerHTML = "";

        //restores the original selection
        selectRange(selectedRange);

        //remove the blue highlight
        document.execCommand("removeFormat", false, 'LightBlue');

        document.querySelector('.storytellerCommentEditable[contenteditable=true]').focus();
        window.getSelection().removeAllRanges();
        
        //removes the body class that prevents clicks
        document.body.classList.remove('popup');
    };

    document.getElementById("addCommentTagButton").addEventListener('click', event => {
        //get the new tag
        const tagInput = document.getElementById("tagInput");
        let text = tagInput.value.replace(/ +(?= )/g,'').trim();

        //if there is an entered tag and it's not already included in the tags list
        if (text !== '' && !getAllTagsOnScreen().includes(text)) { 
            text = getFormattedCommentTag(text);

            //if the tag is in the drop down list, remove it 
            let dropDownListTags = [...document.querySelectorAll(".commentTagDropDownItem")]
            const index = dropDownListTags.findIndex(item => item.innerHTML === text);
            if (index !== -1) {
                dropDownListTags[index].remove(); 
            }
           addCommentTagForThisComment(text);
        }
        tagInput.value = '';
    })

    // Prevents menu from closing when clicked inside 
    document.querySelector(".commentTagDropDown").addEventListener('click', function (event) { 
        event.stopPropagation(); 
    }); 

    document.querySelector('#addCommentButton').addEventListener('click', async event => {        
        const commentEditable = document.querySelector('#commentEditable');
        commentEditable.dataset.commentEditable = false;
        stopAutomaticPlayback();
        clearHighlights();

        //if the user entered a tag but forgot to add it, add it now
        document.getElementById("addCommentTagButton").click(); 

        const textCommentTextArea = document.getElementById('textCommentTextArea');    
        
        //getting all video files in order
        const videoFiles = document.getElementsByClassName('video-preview')[0].children;
        const currentVideoOrder = [];
        for (let i = 0; i < videoFiles.length; i++) {
            if (videoFiles[i].classList.contains("card") ) {
                currentVideoOrder.push(videoFiles[i].querySelector('[src]').getAttribute("src"));
            }
        }

        //getting all audio files in order
        const audioFiles = document.getElementsByClassName('audio-preview')[0].children;
        const currentAudioOrder = [];
        for (let i = 0; i < audioFiles.length; i++) {
            if (audioFiles[i].classList.contains("card") ) {
                currentAudioOrder.push(audioFiles[i].querySelector('[src]').getAttribute("src"));
            }
        }

        //getting all image files in order
        const imageFiles = document.getElementsByClassName('image-preview')[0].children;
        const currentImageOrder = [];
        for (let i = 0; i < imageFiles.length; i++) {
            if (imageFiles[i].classList.contains("image-div") ) {
                currentImageOrder.push(imageFiles[i].querySelector('[src]').getAttribute("src"));
            }
        }

        //get all text and html from the comment text box
        const commentText = textCommentTextArea.innerHTML;

        const linesAboveValue = document.getElementById("blogModeExtraAbove").value;
        const linesBelowValue = document.getElementById("blogModeExtraBelow").value;

        //get the active editor
        const editor = playbackData.editors[playbackData.activeEditorFileId] ? playbackData.editors[playbackData.activeEditorFileId] : playbackData.editors[''];

        //get any selected text 
        const ranges = editor.getSession().getSelection().getAllRanges();

        let rangeArray = [];
        for (let i = 0; i < ranges.length; i++) {
            if (editor.getSession().getTextRange(ranges[i]) !== "") {
                let rangeObj = {};
                rangeObj.fileId = playbackData.activeEditorFileId,
                rangeObj.selectedText = editor.getSession().getTextRange(ranges[i]),
                rangeObj.startRow = ranges[i].start.row
                rangeObj.startColumn = ranges[i].start.column;
                rangeObj.endRow = ranges[i].end.row;
                rangeObj.endColumn = ranges[i].end.column;
                rangeArray.push(rangeObj);
            }            
        }  
       
        let viewableBlogText = "";
        if (rangeArray.length) {
            editor.selection.setRange(aceTempRange)
            viewableBlogText = editor.getSelectedText();    
        }
        
        const currentFilePath = document.querySelector(".st-editor-tab.active").title;
        //get the question state
        const questionCommentData = getQuestionCommentData();

        //if there was a question OR no question with comment text or a media file
        if (questionCommentData.questionState === "valid question" || 
           (questionCommentData.questionState === "no question" && (commentText.length > 0 || currentImageOrder.length > 0 || currentVideoOrder.length > 0 || currentAudioOrder.length > 0))) {
            //get the event to playback this comment
            const eventIndex = playbackData.nextEventPosition - 1;
            const commentEvent = playbackData.events[eventIndex];

            const tags = getAllTagsOnScreen();

            //create an object that has all of the comment info
            const comment = createCommentObject(commentText, commentEvent, rangeArray, currentImageOrder, currentVideoOrder, currentAudioOrder, linesAboveValue, linesBelowValue, currentFilePath, viewableBlogText, tags, questionCommentData.questionData);                

            //determine if any comments already exist for this event 
            //if so add the new comment
            //if not create a new array for the comments then add the comments
            if (!playbackData.comments[commentEvent.id]) {
                playbackData.comments[commentEvent.id] = [];
            }

            //send comment to server and recieve back a full comment with id and developerGroup
            const newComment = await sendCommentToServer(comment);        

            buildSearchData(newComment);
            tags.forEach(tag => {
                addCommentTagsToTagObject(tag, newComment)
            });

            playbackData.comments[commentEvent.id].push(newComment);

            //display a newly added comment on the current event
            displayAllComments();
            updateAllCommentHeaderCounts();
            resetAllBlogModeQuestionComments();
            insertBlogPost(newComment);
            updateQuestionCommentCounts();

            //rebuild the slider with the new comment pip
            setUpSliderTickMarks();

            document.getElementById("CancelUpdateButton").click();

            const activeComment = document.querySelector(`.codeView [data-commentid="${newComment.id}"]`);
            document.getElementById("commentContentDiv").scrollTop = activeComment.offsetTop - 100; 
            activeComment.click();            
        } else { //no comment was created
            //display an error message over the add comment button
            var errorMessage = "";
            if(questionCommentData.questionState === "no question") {
                //must be a problem with the comment text or media files
                errorMessage = "You must supply some comment text, a media file, or a question";
            } else if(questionCommentData.questionState === "invalid input") {
                errorMessage = questionCommentData.errorMessage;
            }
            const addCommentButton = document.querySelector('#addCommentButton');
            addCommentButton.setAttribute('data-content', errorMessage);
            $(addCommentButton).popover('enable');
            $(addCommentButton).popover('show');
        
            ranges.forEach(range => {
                editor.selection.setRange(range)
            })
        }
    });

    document.getElementById("CancelUpdateButton").addEventListener('click', event => {
        stopAutomaticPlayback();
        const commentEditable = document.querySelector('#commentEditable');
        commentEditable.dataset.commentEditable = false;
        document.querySelector('.createCommentQuestionCheckbox').classList.remove('hiddenDiv');

        const imagePreviewDiv = document.getElementsByClassName("image-preview")[0];
        const audioPreviewDiv = document.getElementsByClassName("audio-preview")[0];
        const videoPreviewDiv = document.getElementsByClassName("video-preview")[0];
        //reset the comment previews
        audioPreviewDiv.style.display='none';
        audioPreviewDiv.innerHTML = '';
        videoPreviewDiv.style.display='none';
        videoPreviewDiv.innerHTML = ''; 
        imagePreviewDiv.style.display='none';
        imagePreviewDiv.innerHTML = '';

        document.querySelector(".tagsInComment").innerHTML = '';
        //tempTags = []; //reset the list of temporary comment tags
        emptyCommentTagDropDownMenu();
        document.getElementById("tagInput").value = '';

        //clear out the text area
        textCommentTextArea.innerHTML = '';

        document.getElementById("addCommentButton").removeAttribute("style");

        document.getElementById("updateCommentButton").style.display='none';
        document.getElementById("fsViewTabTab").classList.remove("disabled");
        document.getElementById("viewCommentsTab").classList.remove("disabled");
        document.getElementById("searchCommentTab").classList.remove("disabled");
        document.getElementById("viewCommentsTab").click();      

        undoBlogModeHighlight();
        resetQuestionCommentDiv();        
    });

   //When switching to viewCommentsTab, scroll to the active comment
    $('a[id="viewCommentsTab"]').on('shown.bs.tab', function () {
        const activeComment = document.querySelector(".codeView .activeComment");
        if (activeComment) {
            document.getElementById("commentContentDiv").scrollTop = activeComment.offsetTop - 100;
            activeComment.click()
        }
    })

    $('a[id="searchCommentTab"]').on('shown.bs.tab', function () {
        pauseMedia();
        document.getElementById("commentSearchBar").focus();
    })

    document.getElementById('dragBar').addEventListener('mousedown', function (e) {      
        //add listeners for moving and releasing the drag and disable selection of text  
        window.addEventListener('selectstart', disableSelect);
        document.documentElement.addEventListener('mousemove', doDrag, false);
        document.documentElement.addEventListener('mouseup', stopDrag, false);
    });

    //detects key presses 
    document.addEventListener('keydown', function(e) {    
        //prevent keyboard presses within the comment textbox from triggering actions 
        if (e.key !== "Escape" && e.target.id === 'textCommentTextArea' || e.target.id === 'playbackTitleDiv' || e.target.id === 'descriptionHeader' || e.target.id === 'tagInput' || e.target.id === 'commentSearchBar' || e.target.classList.contains('questionCommentInput') || e.target.id === 'commentQuestion') {
            return;
        } else if ($('#imgExpandModal').is(':visible')) {
            if (e.key !== "Escape") {
                return;
            }
        }
       
        const keyPressed = e.key;
        const shiftPressed = e.shiftKey;
        const ctrlPressed = e.ctrlKey;

        if (keyPressed === 'ArrowRight') {
            if (!shiftPressed)
            {
                stopAutomaticPlayback();
                //left and right arrow are step one
                step(1);                
            } else {
                if (ctrlPressed)
                {
                    //shift + control is jump to beginning or end
                    step(playbackData.events.length - playbackData.nextEventPosition);
                } else {
                    //shift + left/right arrow is jump to next comment
                    fastForwardButton.click();
                }
            }
        } else if (keyPressed === 'ArrowLeft') {
            if (!shiftPressed)
            {
                stopAutomaticPlayback();
                //left and right arrow are step one
                step(-1);
            } else {
                if (ctrlPressed)
                {
                    //shift + control is jump to beginning or end
                    step(-playbackData.nextEventPosition);
                } else {
                    //shift + left/right arrow is jump to next comment
                    jumpToPreviousComment();
                }
            }
        } else if (keyPressed === "c" && ctrlPressed) {
            if (playbackData.isEditable) {
                document.getElementById('mainAddCommentButton').click();
            }
        } else if (keyPressed === "Escape") {            
            document.getElementById("CancelUpdateButton").click();
        } else if (e.code === "Space") {
            e.preventDefault();
            const playButton = document.getElementById("continuousPlayButton");
            const pauseButton = document.getElementById("pausePlayButton");
            if (pauseButton.classList.contains("automaticPlaybackInactive")) {
                playButton.click();
            } else {
                pauseButton.click();
            }
        }
    });

    //moves forward in the playback comment by comment
    fastForwardButton.addEventListener('click', event => {
        removeSelectedTextFromPage();
        stopAutomaticPlayback();

        //generate a list of all comment divs
        const allCommentDivs = [...document.querySelectorAll('.codeView [data-commenteventid]:not(#title-card)')];

        //get the currently selected comment div, if any
        const selectedComment = document.getElementsByClassName("activeComment")[0];      
        
        let activeComment;

        //if no comment is selected
        if (!selectedComment) {
            //use the slider position to determine the event number
            let eventNum = Math.round(document.getElementById('slider').noUiSlider.get());        

            let commentBlock;

            //try to find the next event that has a comment block
            while (!commentBlock && eventNum < playbackData.numEvents) {
                commentBlock = playbackData.comments["ev-" + eventNum];

                //if the description doesn't have a comment, ignore it
                if (eventNum++ === 0 && commentBlock.length === 1) {
                    commentBlock = null;
                }
            }

            //if a comment block was found forward of the slider position
            if (commentBlock) {
                //select the first comment in the comment block
                const eventId = commentBlock[0].displayCommentEvent.id;

                //find the next comment
                const indexOfSelected = allCommentDivs.findIndex(item => item.getAttribute("data-commenteventid") === eventId);
                activeComment = allCommentDivs[indexOfSelected];     
            }            
        } else { //if a comment is selected
            //find the current active comment div, and make the next one after it active
            const index = allCommentDivs.findIndex(item => item.classList.contains('activeComment'));;
            activeComment = allCommentDivs[index + 1];
        }                

        if (activeComment) {
            activeComment.click();    
            document.getElementById("commentContentDiv").scrollTop = activeComment.offsetTop - 100;              
        } else { //if activeComment hasn't been assigned, then no comment was found at, or forward of the slider position step to the last event and unselect any selected comment
            step(playbackData.numEvents - playbackData.nextEventPosition);
            removeActiveCommentAndGroup();            
        }      
    });

    //make the 3 media preview folders droppable
    const imageDrop = document.querySelector('.image-preview');
    imageDrop.addEventListener('dragover', event => {
        //prevents image from opening in new tab in Firefox
        document.body.ondrop = function (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        //determining if the item currently being dragged originated in the image-preview div
        const draggable = imageDrop.querySelector('.dragging');
        if (draggable !== null) {
            event.preventDefault();
            const afterElement = getDragAfterElement(imageDrop, event.clientY);
            if (typeof afterElement === 'undefined') {
                imageDrop.appendChild(draggable.parentElement);
            } else {
                imageDrop.insertBefore(draggable.parentElement, afterElement.parentElement);
            }            
        }        
    });
    makeDivDroppable($('.video-preview')[0], false);
    makeDivDroppable($('.audio-preview')[0], false);

    document.getElementById("mainAddCommentButton").addEventListener('click', event => {  
        //indicate that the user is editing a comment
        const commentEditable = document.querySelector('#commentEditable');
        commentEditable.dataset.commentEditable = true;
        
        stopAutomaticPlayback();
        clearHighlights();

        //remove 'checked' status from the questionCheckBox
        if ($('input#questionCheckBox').is(':checked')) {
            $('input#questionCheckBox').click();
        }

        //add all current comment tags to drop down list of tags
        populateCommentTagDropDownList();

        highlightBlogModeVisibleArea();

        document.getElementById("addCommentTab").click();
        document.getElementById('textCommentTextArea').focus();
        document.getElementById("viewCommentsTab").classList.add("disabled");
        document.getElementById("fsViewTabTab").classList.add("disabled");
        document.getElementById("searchCommentTab").classList.add("disabled");
        pauseMedia();
    });
    document.getElementById("saveCodeOnlyButton").addEventListener('click', event => {
        zipAndDownloadCodeOnly();
    });
    document.getElementById("saveCodeAndHistoryButton").addEventListener('click', event => {
        zipCodeWithHistory(false);
    });
    document.getElementById("saveCodeAndHistoryButtonWithComments").addEventListener('click', event => {
        zipCodeWithHistory(true);
    });
    
    // document.getElementById("saveCodeAtCommentsButton").addEventListener('click', event => {
    //     zipAtComments();
    // });

    $('#deleteMediaButton').popover('disable');

    $('#deleteMediaButton').on("hidden.bs.popover", function(e) {
        $('#deleteMediaButton').popover("disable");
    });

    $('#addCommentButton').on("hidden.bs.popover", function() {
        $('#addCommentButton').popover("disable");
    });

    $('#addCommentButton').popover('disable');

    $('#updateCommentButton').on("hidden.bs.popover", function() {
        $('#updateCommentButton').popover("disable");
    });

    $('#updateCommentButton').popover('disable');

    document.getElementById("continuousPlayButton").addEventListener('click', event => {
        removeActiveCommentAndGroup();
        document.getElementById("continuousPlayButton").classList.add("automaticPlaybackInactive");
        document.getElementById("pausePlayButton").classList.remove("automaticPlaybackInactive");

        playbackInterval = setInterval(function() {
            step(1);

            if (playbackData.comments[`ev-${playbackData.nextEventPosition - 1}`]) {   
                //get the comment card associated with the position             
                const currentComment = document.querySelector(`.codeView [data-commenteventid="ev-${playbackData.nextEventPosition - 1}"]`);

                //make it active by clicking it and then scroll to it
                currentComment.click();
                document.getElementById("commentContentDiv").scrollTop = currentComment.offsetTop - 100;    

                //stop the automatic playback
                stopAutomaticPlayback();
            }
        }, playbackData.playbackSpeedMS)
    });

    document.getElementById("pausePlayButton").addEventListener('click', event => {
        stopAutomaticPlayback();
    });

    document.getElementById("helpButton").addEventListener('click', event => {
        $('#optionsModal').modal('show')
    })

    document.getElementById("textSmallerButton").addEventListener('click', event => {
        const editorKeys =  Object.keys(playbackData.editors);  
        playbackData.aceFontSize--;
        
        for (let i = 0; i <editorKeys.length; i++) {
            const currentEditor = playbackData.editors[editorKeys[i]];
            currentEditor.setFontSize(playbackData.aceFontSize);
        }
    })

    document.getElementById("textBiggerButton").addEventListener('click', event => {
        const editorKeys =  Object.keys(playbackData.editors);  
        playbackData.aceFontSize++;

        for (let i = 0; i <editorKeys.length; i++) {            
            const currentEditor = playbackData.editors[editorKeys[i]];
            currentEditor.setFontSize(playbackData.aceFontSize);
        }
    })

    document.getElementById('playbackSpeedDown').addEventListener('click', event => {
        playbackData.playbackSpeedMS += 5;
    })

    document.getElementById('playbackSpeedUp').addEventListener('click', event => {
        playbackData.playbackSpeedMS -= 5;
    })

    //always open the options modal with the first tab selected
    $('#optionsModal').on('show.bs.modal', event => {
        document.getElementById('optionsModal').querySelector('.nav-item').click();
    })    

    $('#imgExpandModal').on('hide.bs.modal', event => {
        //if the modal has a carousel in it
        if (event.currentTarget.querySelector('.carousel-item.active img')){
            const largeModalActiveSrc = event.currentTarget.querySelector('.carousel-item.active img').getAttribute('src');
            const idOfOriginalCarousel = event.currentTarget.querySelector('[data-returnCarouselId]').getAttribute('data-returnCarouselId');
            const originalCarousel = document.getElementById(idOfOriginalCarousel);
            
            //if the active src of the expanded carousel and the active src of the smaller carousel are not the same,
            //set the smaller carousels active image to the same image as the larger one
            if (originalCarousel.querySelector('.carousel-item.active img').getAttribute('src') !== largeModalActiveSrc) {
                originalCarousel.querySelector('.carousel-item.active img').closest('.carousel-item').classList.remove('active');
                originalCarouselImages = [...originalCarousel.querySelectorAll('.carousel-item img')];
                originalCarouselImages[originalCarouselImages.findIndex(item => item.getAttribute('src') === largeModalActiveSrc)].closest('.carousel-item').classList.add('active');
            }
        }

        const img = document.createElement("img");
        img.classList.add("modal-content");
        img.setAttribute('id', 'imgToExpand');

        //reset the modal
        document.querySelector('.imgExpandBody').innerHTML = "";
        document.querySelector('.imgExpandBody').append(img);
    })     

    document.getElementById("blogMode").addEventListener('click', event => {
        if (!playbackData.isInBlogMode) {
            stopAutomaticPlayback();
            pauseMedia();

            document.getElementById("codeMode").classList.remove("activeModeButton");
            document.getElementById("blogMode").classList.add("activeModeButton");

            document.querySelector(".codeView").classList.add('modeFormat');
            document.querySelector(".blogView").classList.remove("modeFormat");            

            document.body.classList.remove("codeViewBody")
            document.body.classList.add("blogModeBody")

            playbackData.isInBlogMode = true;
            
            //update url with blog view
            window.history.replaceState({view: 'blog'}, '', '?view=blog');
        }
    })

    document.getElementById("codeMode").addEventListener('click', event => {
        if (playbackData.isInBlogMode) {
            pauseMedia();

            const commentToMakeActive = document.querySelector(`.codeView [data-commentid="${latestVisableBlogPostID}"]`);
            if (commentToMakeActive) {
                commentToMakeActive.click(); 
                document.getElementById("commentContentDiv").scrollTop =  commentToMakeActive.offsetTop - 100;     
            }            
    
            document.getElementById("blogMode").classList.remove("activeModeButton");
            document.getElementById("codeMode").classList.add("activeModeButton");
    
            document.querySelector(".codeView").classList.remove('modeFormat');
            document.querySelector(".blogView").classList.add("modeFormat");

            document.body.classList.add("codeViewBody");
            document.body.classList.remove("blogModeBody");

            playbackData.isInBlogMode = false;

            //update url with code view
            window.history.replaceState({view: 'code'}, '', '?view=code');
        }
    })

    let timer = null;

    // Set up an event handler for mousedown
    document.querySelector(".blogModeLinesGroup").querySelectorAll(".lineButtonUp").forEach(function(button) {
        button.addEventListener("mousedown", function(event) {
            const buttonParent = button.parentNode.querySelector('input[type=number]');
            buttonParent.stepUp();
            blogModeHighlightHelper();

            timer = setInterval(function() {
                buttonParent.stepUp();
                blogModeHighlightHelper();                
            }, 300);
        });
    }) 

    document.querySelector(".blogModeLinesGroup").querySelectorAll(".lineButtonUp").forEach(function(button) {
        button.addEventListener("mouseup", function() {
            clearInterval(timer);
            blogModeHighlightHelper();            
        })
    }) 

    document.querySelector(".blogModeLinesGroup").querySelectorAll(".lineButtonUp").forEach(function(button) {
       button.addEventListener("mouseleave", function() {
        clearInterval(timer);
        blogModeHighlightHelper();
       })
    });

    // Set up an event handler for mousedown
    document.querySelector(".blogModeLinesGroup").querySelectorAll(".lineButtonDown").forEach(function(button) {
        button.addEventListener("mousedown", function() {
            const buttonParent = button.parentNode.querySelector('input[type=number]');
            buttonParent.stepDown();

            blogModeHighlightHelper();

            timer = setInterval(function() {
                buttonParent.stepDown();
                blogModeHighlightHelper();
            }, 300);
        });
    }) 

    document.querySelector(".blogModeLinesGroup").querySelectorAll(".lineButtonDown").forEach(function(button) {
        button.addEventListener("mouseup", function() {
            clearInterval(timer);
            blogModeHighlightHelper();            
        })
    }) 

    document.querySelector(".blogModeLinesGroup").querySelectorAll(".lineButtonDown").forEach(function(button) {
       button.addEventListener("mouseleave", function() {
        clearInterval(timer);
        blogModeHighlightHelper();
       })
    });

    document.getElementById("tagInput").addEventListener("keydown", event => {
        const keyPressed = event.key;
        if (keyPressed === "Enter") {
            document.getElementById("addCommentTagButton").click();
        }
    })

    document.querySelectorAll(".commentSearchOption").forEach(option => {
        option.addEventListener('click', event=> {
           //handleSearchCriteriaDropdown(event.currentTarget.innerText);   

            document.querySelector(".commentSearchOption.active").classList.remove("active");           
            event.currentTarget.classList.add("active");

            handleCommentSearchDropDownOptions();

            //focus the search bar but dont delete the value
            const searchBar = document.getElementById("commentSearchBar");
            const originalVal = searchBar.value;
            searchBar.focus();           
            searchBar.value = originalVal;
        })
    })

    //clear text input and search results div
    document.getElementById("searchTabClearButton").addEventListener("click", event=> {
        document.getElementById("searchContentDiv").innerHTML = '';
        document.getElementById("commentSearchBar").value = '';
    })

    //conduct a search on the user inputted text using the selected search criteria
    document.getElementById("commentSearchButton").addEventListener("click", function() {

        document.getElementById("searchContentDiv").innerHTML = '';
        const searchValue = document.getElementById("commentSearchBar").value.toLowerCase();
        if (searchValue === '') {
            return;
        }

        const words = getWordsFromText(searchValue);
        const searchType = handleCommentSearchDropDownOptions();

        //maintain a collection of unique commentIds from comments that are matches
        const results = new Set();

        if (searchType !== "All") {
            words.forEach(word => {
                if (wordSearchData[word]) {
                    if(searchType in wordSearchData[word]) {
                        wordSearchData[word][searchType].forEach(commentId => {
                            results.add(commentId);
                        })
                    }
                }
            })
        } else {
            words.forEach(word => {
                if (wordSearchData[word]) { //if the word is found
                    Object.keys(wordSearchData[word]).forEach(key => { //search all the criteria where the word was found
                        wordSearchData[word][key].forEach(commentId => { //add all the commentIds
                            results.add(commentId);
                        })
                    })
                }
            })
        }

        const contentDiv = document.getElementById("searchContentDiv");

        //go through all the comments in the comments div to get the proper order of search results
        getAllComments().forEach(comment => {
            const commentId = comment.getAttribute("data-commentid");
            if (results.has(commentId) && commentId !== "commentId-0") { //skip the description comment

                //clone the comment div to strip out all of its original event listeners
                const clone = document.querySelector(`.codeView [data-commentid="${commentId}"]`).cloneNode(true);
                setUpSearchResultComment(clone);
                contentDiv.append(clone);
            }
        })
    })

    document.getElementById("commentSearchBar").addEventListener('keyup', event=> {
        event.stopPropagation();
        if (event.key === "Enter") {
            document.getElementById("commentSearchButton").click();
        }
    })

    document.getElementById("commentSearchBar").addEventListener('focus', event=> {
        document.getElementById("commentSearchBar").value = '';
    })

    $(window).resize(function() {
        document.getElementById("codePanel").style.width = $(window).width() - ($('#dragBar').offset().left + $('#dragBar').width()) + "px";
        commentsDiv.style.width = $('#dragBar').offset().left  + "px";
    });

    //handler for when the questionCheckBox is checked
    $('input#questionCheckBox').change(function() {
        if ($('input#questionCheckBox').is(':checked')) {
           document.querySelector('.questionComment').classList.remove("hiddenDiv");

           document.getElementById('commentQuestion').focus();
           
           //scroll to the bottom of the div to get all the options in view
           const addCommentPanel = document.getElementById("addCommentPanel");
           addCommentPanel.scrollTop = addCommentPanel.scrollHeight - addCommentPanel.clientHeight;
        } else {
            document.querySelector('.questionComment').classList.add("hiddenDiv");
        }
    })

    document.querySelectorAll(".rightAnswerCheckBox").forEach(checkbox => {
        rightAnswerCheckBoxHandler(checkbox)
    })

    document.getElementById("addAnswerButton").addEventListener('click', function() {
        document.querySelector(".questionCommentContent").append(createAnswerInput());

        //focus the question if it's not filled in
        //or the first question that isn't filled in
        const questionDiv = document.getElementById('commentQuestion');
        if (!questionDiv.innerText.trim().length) {
            questionDiv.focus();
        } else {
            const answerInputs = [...document.querySelectorAll('.questionCommentInput')]
            answerInputs[answerInputs.findIndex(item => item.value === "")].focus();
        }

        //scroll to the bottom of the div to see the new answer
        const addCommentPanel = document.getElementById("addCommentPanel");
        addCommentPanel.scrollTop = addCommentPanel.scrollHeight - addCommentPanel.clientHeight;
    })
}

function setUpSlider() {
    const slider = document.getElementById('slider');
    
    noUiSlider.create(slider, {
        start: playbackData.numNonRelevantEvents,
        step: 1, 
        animate: false,
        keyboardSupport: false,
        range: {
            'min': playbackData.numNonRelevantEvents,
            'max': playbackData.events.length           
        }
    });
    
    slider.noUiSlider.on('slide.one', function () { 
        const sliderValue = Number(slider.noUiSlider.get());
        //take the slider value and subtract the next event's position
        step(sliderValue - playbackData.nextEventPosition);

        //removeActiveCommentAndGroup();   
        stopAutomaticPlayback();

        //TODO Determine if this will be included or not
        // //if the slider falls on a comment, click the comment
        // if (document.querySelector(`.codeView [data-commenteventid="ev-${sliderValue - 1}"]`)) {              
        //     document.querySelector(`.codeView [data-commenteventid="ev-${sliderValue - 1}"]`).click();
        // }
        // else if (document.querySelector(`.codeView [data-commenteventid="ev-${sliderValue}"]`)) {
        //     document.querySelector(`.codeView [data-commenteventid="ev-${sliderValue}"]`).click();
        // }
    });

    setUpSliderTickMarks();
}

function setUpSliderTickMarks() {
    //get the slider
    const slider = document.getElementById ('slider');
    //holds the positions of the tick marks
    const commentPositions = [];

    //go through all of the comment blocks
    for(let commentKey in playbackData.comments) {
        //get an array of comment objects
        const allCommentsAtPoint = playbackData.comments[commentKey];
        //get the first comment in the block (they all have the same display event)
        const firstCommentAtPoint = allCommentsAtPoint[0];       
        
        //if this is not the description comment
        if(firstCommentAtPoint.displayCommentEvent.eventSequenceNumber !== 0) {
            //comment tick marks are numbered to slide into the comment
            commentPositions.push(firstCommentAtPoint.displayCommentEvent.eventSequenceNumber + 1);
        }
    }

    slider.noUiSlider.updateOptions({
        pips: {
            mode: 'values',
            values: commentPositions,
            density: -1,
            stepped: true,
            filter: (function () {return 1;}) 
        }
    })

    setUpClickableTickMarks();
}

/*Adds the ability to click a tickmark on the slider and jump to that comment */
function setUpClickableTickMarks() {
    //In noUiSlider, the pips (the number below the tick mark) has a data-value attribute on all .noUi-value elements with the value of the slider. 
    //the tickmarks do not have this attribute but they do have a matching style as the pip and we use that to find the tickmark that corresponds to the pip

    const pips = document.querySelectorAll('.noUi-value');

    for (let i = 0; i < pips.length; i++) {

        //the style attibute is the 'left' amount of the pip
        const pipStyle = pips[i].getAttribute("style");

        //get the value of the slider at the pip mark
        const pipValue = Math.round(Number(pips[i].getAttribute('data-value'))) - 1;

        //the style of the pip mark is used to find the tick mark with the same style 
        const tickMark = document.querySelector(`.noUi-marker[style="${pipStyle}"]`);

        tickMark.classList.add('clickableTickMark');        
       
        //add the clickable element that will bring us to the comment
        tickMark.addEventListener('click', event => { 
            //click back into comments view 
            document.getElementById("viewCommentsTab").click();

            //determine if the description tick mark was clicked   
            const eventNum = pipValue === playbackData.numNonRelevantEvents - 1 ? 0 : pipValue; 
            
            const comment = document.querySelector(`.codeView [data-commenteventid="ev-${eventNum}"]`);
            document.getElementById("commentContentDiv").scrollTop = comment.offsetTop - 100;    
            comment.click();      
        })               
    }    
}

function stopAutomaticPlayback() {
    document.getElementById("continuousPlayButton").classList.remove("automaticPlaybackInactive")
    document.getElementById("pausePlayButton").classList.add("automaticPlaybackInactive");
    clearInterval(playbackInterval);
}

function jumpToPreviousComment()
{
    stopAutomaticPlayback();
    removeSelectedTextFromPage();

    //generate a list of all comment divs
    const allCommentDivs = [...document.querySelectorAll('.codeView [data-commenteventid]:not(#title-card)')];

    //get the currently selected comment div, if any
    const selectedComment = document.getElementsByClassName("activeComment")[0];      
    
    let activeComment;

    //if no comment is selected
    if (!selectedComment) {
        //use the slider position to determine the event number
        let eventNum = Math.round(document.getElementById('slider').noUiSlider.get()) - 1;        

        let commentBlock;

        //try to find the previous event that has a comment block
        while (!commentBlock && eventNum >= 0) {
            commentBlock = playbackData.comments["ev-" + eventNum--];
        }

        //if a comment block was found behind the slider position
        if (commentBlock) {
            //select the first comment in the comment block
            const eventId = commentBlock[0].displayCommentEvent.id;

            //find the previous comment
            const indexOfSelected = allCommentDivs.reverse().findIndex(item => item.getAttribute("data-commenteventid") === eventId);
            activeComment = allCommentDivs[indexOfSelected];     
        }            
    } else { //if a comment is selected
        //find the current active comment div, and make the previous one active
        const index = allCommentDivs.findIndex(item => item.classList.contains('activeComment'));
        activeComment = allCommentDivs[index - 1];
    }                

    if (activeComment) {
        activeComment.click();   
        document.getElementById("commentContentDiv").scrollTop = activeComment.offsetTop - 100;      
    } else {//if activeComment hasn't been assigned, then no comment was found at, or behind the slider position make the description active
        document.querySelector(`.codeView [data-commenteventid="ev-0"`).click(); 
        document.querySelector(".commentsDivScroll").scrollTop = 0; 
    }      
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.draggable:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {

        //gives us the dimensions of the box
        const box = child.getBoundingClientRect();

        //getting the center of the box
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return {offset: offset, element: child};
        } else {
            return closest;
        }
    },{offset: Number.NEGATIVE_INFINITY}).element
}

//send the comment object to the server and recieve a complete comment back with id and developerGroup
async function sendCommentToServer(comment) {
    let newComment;
    try {
        const fetchConfigData = {
            method: 'POST',
            body: JSON.stringify(comment), 
            headers: {
                'Content-Type': 'application/json'
            }
        };
        const response = await fetch('/comment', fetchConfigData);
        
        //check the response
        if(response.ok) {
            newComment = await response.json();
            console.log('Success');
        } else {
            console.log('Error with the response data');
        }
        
    } catch (error) {
        console.log('Error with the POST');
    }    
    return newComment;
}

//send the comment object to the server
async function updateCommentPositionOnServer(commentPositionObject) {
    try {
        const fetchConfigData = {
            method: 'PUT',
            body: JSON.stringify(commentPositionObject), 
            headers: {
                'Content-Type': 'application/json'
            }
        };
        const response = await fetch('/commentPosition', fetchConfigData);

        //check the response
        if(response.ok) {
           console.log('Success');
        } else {
            console.log('Error with the response data');
        }
        
    } catch (error) {
        console.log('Error with the Position Change');
    }    
}

//delete a comment from the server
async function deleteCommentFromServer(comment) {
    try {
        const fetchConfigData = {
            method: 'DELETE',
            body: JSON.stringify(comment), 
            headers: {
                'Content-Type': 'application/json'
            }
        };
        const response = await fetch('/comment', fetchConfigData);

        //check the response
        if(response.ok) {
           console.log('Success');
        } else {
            console.log('Error with the response data');
        }
        
    } catch (error) {
        console.log('Error with the Deletion');
    }    
}

//send the comment object to the server
async function updateCommentOnServer(commentObject) {
    let newComment;
    try {
        const fetchConfigData = {
            method: 'PUT',
            body: JSON.stringify(commentObject), 
            headers: {
                'Content-Type': 'application/json'
            }
        };
        const response = await fetch('/comment', fetchConfigData);

        //check the response
        if(response.ok) {
            newComment = await response.json();
            console.log('Success');
        } else {
            console.log('Error with the response data');
        }
        
    } catch (error) {
        console.log('Error with the Comment Change');
    } 
    return newComment;   
}

//send the comment object to the server
async function updateTitleOnServer(newTitle) {
    try {
        const fetchConfigData = {
            method: 'PUT',
            body: JSON.stringify({title: newTitle}), 
            headers: {
                'Content-Type': 'application/json'
            }
        };
        const response = await fetch('/project', fetchConfigData);

        //check the response
        if(response.ok) {
            console.log('Success');
        } else {
            console.log('Error with the response data');
        }
        
    } catch (error) {
        console.log('Error with the Comment Change');
    }   
}

function doDrag(event) {    
    const wrapper = dragBar.closest('.wrapper');
    const boxA = wrapper.querySelector('.box');
    const addCommentPanel = document.getElementById('addCommentPanel');

    // Get offset
    const containerOffsetLeft = wrapper.offsetLeft;
    
    // Get x-coordinate of pointer relative to container
    let pointerRelativeXpos = event.clientX - containerOffsetLeft;

    if (pointerRelativeXpos > screen.width * .1 && pointerRelativeXpos < screen.width * .75) {        
        boxA.style.width = event.pageX + 'px';
        boxA.style.flexGrow = 0;
        commentsDiv.style.width = event.pageX + 'px';
        document.getElementById("searchContentDiv").style.width = event.pageX + 'px'; //changing width of searched comment panel
        addCommentPanel.style.width = event.pageX + 'px';
        document.getElementById("fsViewPanel").style.width = event.pageX + 'px';

        // $('#codePanel').css('width', screen.width - pointerRelativeXpos);

        //set the width of codePanel as the position of the dragBar from the right side of the screen
        document.getElementById("codePanel").style.width = $(window).width() - ($('#dragBar').offset().left + $('#dragBar').width()) + "px";
    }
}

function stopDrag(event) {       
    //remove the listeners for dragging movement 
    document.documentElement.removeEventListener('mouseup', stopDrag, false);
    document.documentElement.removeEventListener('mousemove', doDrag, false);  
    window.removeEventListener('selectstart', disableSelect);  

    const editor = playbackData.editors[playbackData.activeEditorFileId] ? playbackData.editors[playbackData.activeEditorFileId] : playbackData.editors[''];
    editor.resize();
}

//disables mouse selection of text
function disableSelect(event) {
    event.preventDefault();
}

async function updateComment() {
    let retVal = true;

    const textCommentTextArea = document.querySelector('#textCommentTextArea');

    const activeComment = document.getElementsByClassName("activeComment")[0];
    const eventId = activeComment.getAttribute("data-commentEventid");
    const commentId = activeComment.getAttribute("data-commentid");

    const commentGroup = playbackData.comments[eventId];
    const index = commentGroup.findIndex(item => item.id === commentId);
    const commentObject = commentGroup[index];

    const linesAboveValue = document.getElementById("blogModeExtraAbove").value;
    const linesBelowValue = document.getElementById("blogModeExtraBelow").value;

    //getting all video files in order
    const videoFiles = document.getElementsByClassName('video-preview')[0].children;
    const currentVideoOrder = [];
    for (let i = 0; i < videoFiles.length; i++) {
        if (videoFiles[i].classList.contains("card") ) {
            currentVideoOrder.push(videoFiles[i].querySelector('[src]').getAttribute("src"));
        }
    }

    //getting all audio files in order
    const audioFiles = document.getElementsByClassName('audio-preview')[0].children;
    const currentAudioOrder = [];
    for (let i = 0; i < audioFiles.length; i++) {
        if (audioFiles[i].classList.contains("card") ) {
            currentAudioOrder.push(audioFiles[i].querySelector('[src]').getAttribute("src"));
        }
    }

    //getting all image files in order
    const imageFiles = document.getElementsByClassName('image-preview')[0].children;
    const currentImageOrder = [];
    for (let i = 0; i < imageFiles.length; i++) {
        if (imageFiles[i].classList.contains("image-div") ) {
            currentImageOrder.push(imageFiles[i].querySelector('[src]').getAttribute("src"));
        }
    }

    //get all text and html from the comment text box
    const commentText = textCommentTextArea.innerHTML;

    //get the active editor
    const editor = playbackData.editors[playbackData.activeEditorFileId] ? playbackData.editors[playbackData.activeEditorFileId] : playbackData.editors[''];

    //get any selected text 
    const ranges = editor.getSession().getSelection().getAllRanges();

    let rangeArray = [];
    for (let i = 0; i < ranges.length; i++) {
        if (editor.getSession().getTextRange(ranges[i]) !== "") {
            let rangeObj = {};
            rangeObj.fileId = playbackData.activeEditorFileId,
            rangeObj.selectedText = editor.getSession().getTextRange(ranges[i]),
            rangeObj.startRow = ranges[i].start.row
            rangeObj.startColumn = ranges[i].start.column;
            rangeObj.endRow = ranges[i].end.row;
            rangeObj.endColumn = ranges[i].end.column;
            rangeArray.push(rangeObj);
        }
    }  

    let viewableBlogText = "";
    if (rangeArray.length) {
        editor.selection.setRange(aceTempRange)
        viewableBlogText = editor.getSelectedText();
    }

    const currentFilePath = document.querySelector(".st-editor-tab.active").title;
    //get the question state
    const questionCommentData = getQuestionCommentData();

    //if there was a question OR no question with comment text or a media file
    if (questionCommentData.questionState === "valid question" || 
       (questionCommentData.questionState === "no question" && (commentText.length > 0 || currentImageOrder.length > 0 || currentVideoOrder.length > 0 || currentAudioOrder.length > 0))) {
        //if the user entered a tag but forgot to add it, add it now
        document.getElementById("addCommentTagButton").click(); 

        const tags = getAllTagsOnScreen();

        //create an object that has all of the comment info
        const comment = createCommentObject(commentText, commentObject.displayCommentEvent, rangeArray, currentImageOrder, currentVideoOrder, currentAudioOrder, linesAboveValue, linesBelowValue, currentFilePath, viewableBlogText, tags, questionCommentData.questionData);
        //add the developer group id to the comment object and its id
        comment.developerGroupId = commentObject.developerGroupId;
        comment.id = commentObject.id;

        //determine if any comments already exist for this event 
        //if so add the new comment
        //if not create a new array for the comments then add the comments
        if (!playbackData.comments[comment.displayCommentEvent.id]) {
            playbackData.comments[comment.displayCommentEvent.id] = [];
        }

        //send comment to server and recieve back a full comment with id and developerGroup
        const newComment = await updateCommentOnServer(comment);

        deleteWordsFromSearchData(commentObject, newComment);
        removeDeletedCommentTagsFromTagObject(commentObject.commentTags, newComment.commentTags, newComment.id);
        buildSearchData(newComment);
        tags.forEach(tag => {
            addCommentTagsToTagObject(tag, newComment)
        });

        //replace the old comment with the new one
        for (let i = 0; i < playbackData.comments[newComment.displayCommentEvent.id].length; i++) {
            if (playbackData.comments[newComment.displayCommentEvent.id][i].id === newComment.id) {
                playbackData.comments[newComment.displayCommentEvent.id].splice(i , 1, newComment);
                break;
            }
        }

        //clear out the text area
        textCommentTextArea.innerHTML = '';

        //display a newly added comment on the current event
        displayAllComments();
        resetAllBlogModeQuestionComments();
        updateBlogPost(newComment);
        updateQuestionCommentCounts();

    
        //reset the comment previews
        $('.audio-preview')[0].style.display='none';
        $('.audio-preview')[0].innerHTML = '';
        $('.video-preview')[0].style.display='none';
        $('.video-preview')[0].innerHTML = '';
        $('.image-preview')[0].style.display='none';
        $('.image-preview')[0].innerHTML = '';

        document.querySelector(".tagsInComment").innerHTML = '';
    } else { //the comment is not updated
        //display an error message over the update comment button
        var errorMessage = "";
        if(questionCommentData.questionState === "no question") {
            //must be a problem with the comment text or media files
            errorMessage = "You must supply some comment text, a media file, or a question";
        } else if(questionCommentData.questionState === "invalid input") {
            errorMessage = questionCommentData.errorMessage;
        }
        const updateCommentButton = document.querySelector('#updateCommentButton');
        updateCommentButton.setAttribute('data-content', errorMessage);
        $(updateCommentButton).popover('enable');
        $(updateCommentButton).popover('show');
        
        retVal = false;
    }

    return retVal;
}

function updateTitle(newTitle) {
    updateTitleOnServer(newTitle);
}
