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


/* THIS SECTION RELATES TO DISPLAYING COMMENTS
 *
 * Displays all the comments.
 */
let firstTimeThrough = true;
function displayAllComments() {
    const activeComment = document.querySelector(`.codeView .activeComment`);

    //clear comments Div before displaying any comments
    commentsDiv.innerHTML = '';

    let commentCount = -1; // because the description does not count
    let currentComment = 1;    

    //convert all string keys into numbers for proper sorting of comment sequence
    let keysArray = Object.keys(playbackData.comments);  
    for (let i = 0; i < keysArray.length; i++) {
        commentCount += playbackData.comments[keysArray[i]].length;
        keysArray[i] = Number(keysArray[i].slice(3));        
    }
   
    let uniqueCommentGroupID = 0;
    //sort by interger key and add each comment to the commentsDiv
    keysArray.sort((a,b)=> a - b).forEach(function(key) {
        let commentBlock = playbackData.comments[`ev-${key}`];
        const commentGroupDiv = document.createElement('div');
        commentGroupDiv.classList.add('commentBlockBackground');

        let startingValue = 0;        

        if (`ev-${key}` === 'ev-0')
        {
            const descriptionInfo = commentBlock[0];
            const titleCard = createTitleCard(descriptionInfo);

            commentGroupDiv.append(titleCard);

            if (firstTimeThrough) {            
                commentBlock.forEach(comment => {
                    buildSearchData(comment)               

                    comment.commentTags.forEach(tag => {
                        addCommentTagsToTagObject(tag, comment)
                    })                   
                })
            }

            startingValue += 1;
        } else {
            commentGroupDiv.classList.add('commentBlockPadding');
        }

        //give each commentGroup a unique id 
        commentGroupDiv.setAttribute('id','CG' + uniqueCommentGroupID);
        
        //create an outer group to hold the edit button
        //this keeps the dragging of cards from changing the position of the button
        const outerCommentGroup = document.createElement('div');
        outerCommentGroup.classList.add('commentGroupSpacing');

        outerCommentGroup.addEventListener('click', event => {
            stopAutomaticPlayback();
            
            //the eventListener should not work when a child of outerCommentGroup is clicked
            if (!event.currentTarget.classList.contains("commentGroupSpacing")) {
              return;
            }

            //if the active comment is not in this comment group, make the first comment in this div active
            if (!outerCommentGroup.classList.contains("activeGroup")) {
                if (outerCommentGroup.getElementsByClassName("commentCard")[0]) {
                    outerCommentGroup.getElementsByClassName("commentCard")[0].click();
                }
            }
        });

        let uniqueNumBackup = uniqueCommentGroupID;
        for (let i = startingValue; i < commentBlock.length; i++) {

            const commentObject = commentBlock[i];
            
            if (firstTimeThrough) {                
                buildSearchData(commentObject)
                
                commentObject.commentTags.forEach(tag => {
                    addCommentTagsToTagObject(tag, commentObject)
                })   
            }

            const returnObject = createCommentCard(commentObject, currentComment, commentCount, i);
            const commentCard = returnObject.cardObject;
            currentComment = returnObject.count;

            commentGroupDiv.append(commentCard);

            if (playbackData.isEditable) {
               //gives each card a class to later access it
               commentCard.classList.add('drag');
               commentCard.setAttribute('id',commentObject.id );

               addEditButtonsToCard(commentCard, commentObject.displayCommentEvent.id ,returnObject.commentID,commentBlock, uniqueNumBackup, commentObject);
            }
            
            commentGroupDiv.append(commentCard);
        }

        outerCommentGroup.append(commentGroupDiv);
        commentsDiv.append(outerCommentGroup);

        const isDescriptionComment = `ev-${key}` === 'ev-0';

        const displayEditCommentButton = (isDescriptionComment && commentBlock.length > 1) || !isDescriptionComment;
        if (playbackData.isEditable && displayEditCommentButton) {
            
            //create the edit Comment button
            const editCommentBlockButton = document.createElement('button');
            editCommentBlockButton.classList.add("btn", "btn-outline-primary", "btn-sm", "commentBlockIcon");
            editCommentBlockButton.title = "Reorder or delete comments";

            editCommentBlockButton.setAttribute("id", "edit" + uniqueCommentGroupID);

            //go to every card marked 'drag' in the div where editCommentBlockButton was clicked, and make each draggable
            editCommentBlockButton.addEventListener('click', event => {  
                stopAutomaticPlayback();

                //for each element with class "drag", make draggable as long as there is more than 1 comment in the comment block   
                if ((isDescriptionComment && commentBlock.length > 2 ) || (!isDescriptionComment && commentBlock.length > 1)) {
                    $('.drag', "#" + commentGroupDiv.id).each(function() {                    
                        makeDraggable(this, key);
                    });
                }

                $('.deleteComment', "#" + commentGroupDiv.id).each(function() {
                   this.style.display = "block";
                });

                toggleEditAcceptButtons("edit", uniqueNumBackup);
            });

            //create the accept changes button
            const acceptChangesButton = document.createElement('button');
            acceptChangesButton.classList.add("button", "btn-outline-danger", "btn-sm");
            acceptChangesButton.appendChild(document.createTextNode("Accept Changes")); 
            acceptChangesButton.setAttribute("id", "accept" + uniqueCommentGroupID);
            //initially hidden
            acceptChangesButton.setAttribute("style", "display:none");

            acceptChangesButton.addEventListener('click', event => {           
                //make each draggable element undraggable
                $('.drag', "#" + commentGroupDiv.id).each(function() {
                    makeunDraggable(this);
                });
 
                //changes the accept button back to edit
                toggleEditAcceptButtons("accept", uniqueNumBackup);

                //hides the delete comment buttons
                $('.deleteComment', "#" + commentGroupDiv.id).each(function() {
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
    firstTimeThrough = false;

    if (activeComment) {
        const activeId = activeComment.getAttribute("data-commentid");
        const newActiveDiv = document.querySelector(`.codeView [data-commentid=${activeId}]`);
        newActiveDiv.click()
        document.getElementById("commentContentDiv").scrollTop = newActiveDiv.offsetTop - 100; 
    }

}

/* CREATE COMMENT CARD
    Creates the ui cards for each comment in the playback
    and adds them to the appropriate spot on the page
*/
function createCommentCard(commentObject, currentComment, commentCount, i)
{
    const cardHeader = document.createElement('div');
    cardHeader.classList.add('text-muted', 'small', 'text-left', 'commentCardHeaderColor', 'p-0', "commentCount");
    //get the developers who authored the comment
    const commentAuthorGroup = getDevelopersInADevGroup(commentObject.developerGroupId);
    //create a div to hold the author info
    const commentAuthorsDiv = getDevImages(commentAuthorGroup, 40);
    //create a span to display how far along in the comments this one is
    const progressSpan = document.createElement('span');
    progressSpan.classList.add('progressSpan');
    progressSpan.innerText = currentComment++ + '/' + commentCount;
    
    //add the author images and the progress in comments
    cardHeader.append(commentAuthorsDiv);
    cardHeader.append(progressSpan);
    
    const cardBody = document.createElement('div');
    cardBody.classList.add('text-left', 'commentCardBodyColor');
    cardBody.innerHTML = commentObject.commentText;

    addQuestionCommentToDiv(cardBody, commentObject, "commentView");


    let cardFinal = createCardDiv(commentObject);
    cardFinal.classList.add('text-center');

    //allows us to send a click event to this card in order to jump to it in the playback
    cardFinal.setAttribute('id', `${commentObject.displayCommentEvent.id}-${i}`)

    //if this is not here the play button does not work, because the card will have no functionality
    cardFinal.addEventListener('click', function () { 
        
        stopAutomaticPlayback();
        //step to the event this comment is at
        step(commentObject.displayCommentEvent.eventSequenceNumber - playbackData.nextEventPosition + 1);

        updateActiveComment(cardFinal);
        cardFinal.classList.add("activeCommentBorder");

        //add the code highlights for the comment (primary and secondary)
        addCodeHighlights(commentObject);

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

    addMediaToCommentDiv(cardFinal, commentObject);

    cardFinal.prepend(cardBody);

    cardFinal.prepend(cardHeader);
    //finalDiv.append(cardFinal);

    return {cardObject: cardFinal, count: currentComment, commentID: commentObject.id};
    
}

/* CREATE TITLE CARD
 * Creates the title and description card in the ViewCommentsTab
*/
function createTitleCard(descriptionInfo)
{

    //create the encompassing card object
    let titleCard = createCardDiv(descriptionInfo);
    titleCard.setAttribute('id', 'title-card');

    titleCard.addEventListener('click', function (e) { 
        //step back to the first relevant event
        step(playbackData.numNonRelevantEvents - playbackData.nextEventPosition);

        updateActiveComment(titleCard);
    });

    //create the header for the title card which holds the title text
    const cardHeader = document.createElement('div');
    cardHeader.setAttribute('id', 'descriptionHeader');
    cardHeader.classList.add('text-center', 'titleCardHeaderStyle');
    cardHeader.innerHTML = playbackData.playbackTitle;

    if (playbackData.isEditable) {
        const editTitleButton = document.createElement('button');
        editTitleButton.classList.add("editTitleButton", "btn", "btn-outline-dark", "btn-sm");
    
        const acceptTitleChanges = document.createElement('button');
        acceptTitleChanges.classList.add("acceptTitleButton", "btn", "btn-outline-dark", "btn-sm", "titleButtonNonActive");
    
        
        editTitleButton.addEventListener('click', event => {
            stopAutomaticPlayback();
            const titleDiv = document.getElementById('descriptionHeader');
            titleDiv.setAttribute("contenteditable", "true");
            titleDiv.focus();
    
            //editTitleButton.style.display = "none";
           // acceptTitleChanges.style.display = "inline-block";
           editTitleButton.classList.add("titleButtonNonActive");
           acceptTitleChanges.classList.remove("titleButtonNonActive");
    
           titleDiv.addEventListener('keydown', function(e) {
                if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation(); //TODO figure out why this is triggering twice
                    acceptTitleChanges.click();
                    document.activeElement.blur();
                }
            })
    
        });      
        
        acceptTitleChanges.addEventListener('click', event => {
    
            const titleDiv = document.getElementById('descriptionHeader');
            const titleData = titleDiv.textContent;
    
            updateTitle(titleData);
    
            playbackData.playbackTitle = titleData;
    
            //const titleCardHeader = document.getElementById('descriptionHeader');
           // titleCardHeader.textContent = playbackData.playbackTitle;
    
           titleDiv.setAttribute("contenteditable", "false");
    
            //acceptTitleChanges.style.display = "none";
            //editTitleButton.style.display = "inline-block";
    
            acceptTitleChanges.classList.add("titleButtonNonActive");
            editTitleButton.classList.remove("titleButtonNonActive");
            
            document.getElementById("playbackTitleDiv").innerHTML = titleData;
            document.querySelector('.blogTitle').innerHTML = titleData;
    
        });    
    
        editTitleButton.setAttribute("title", "Edit title");
        acceptTitleChanges.setAttribute("title", "Confirm changes");
    
        cardHeader.append(editTitleButton);
        cardHeader.append(acceptTitleChanges);    
    } 

    //create the body for the card which holds the description text
    const cardBody = document.createElement('div');
    cardBody.classList.add('card-body', 'text-left', 'titleCardBodyStyle');
    
    const bodyParagraph = document.createElement('p');
    bodyParagraph.innerHTML = descriptionInfo.commentText;

    cardBody.append(bodyParagraph);

    //create any media in the description
    addMediaToCommentDiv(titleCard, descriptionInfo)

    //Create the card footer which holds the edit buttons
    const descriptionFooter = document.createElement("div");
    descriptionFooter.classList.add("card-footer","small", "p-0", "commentCardBodyColor");
    descriptionFooter.style.textAlign = "right";

    //only if the playback is editable should the edit button show up 
    if(playbackData.isEditable) {
        const editDescriptionButton = createEditCommentButton(descriptionInfo, "Edit Description");
        descriptionFooter.append(editDescriptionButton);
    }

    //assemble the pieces of the card
    titleCard.append(descriptionFooter);
    titleCard.prepend(cardBody);
    titleCard.prepend(cardHeader);

    return titleCard;

}


/*
 * Direct helper functions for creating the ui elements for comments 
*/

function createCardDiv(commentObject)
{
    const cardObject = document.createElement('div');
    cardObject.classList.add('card');
    
    cardObject.setAttribute("data-commentEventid", commentObject.displayCommentEvent.id);
    cardObject.setAttribute("data-commentid", commentObject.id);

    return cardObject;
}

//Adds media to the comment
function addMediaToCommentDiv(commentDivToAddTo, commentObject)
{
    const carousel = createCarousel();
    const modalImg = document.getElementById('imgToExpand');

    for (let j = 0; j < commentObject.imageURLs.length; j++) {
        addImageToCarousel(commentObject.imageURLs[j], carousel, true);

        if (commentObject.imageURLs.length > 1) {
            makeCarouselControls(carousel);
        }
        
        commentDivToAddTo.append(carousel);        
    }
    
    for (let i = 0; i < commentObject.videoURLs.length; i++) {
        const videoElement = createMediaControllerCommentVideoUI(commentObject.videoURLs[i], false, false);       
        //add next media
        commentDivToAddTo.append(videoElement.firstChild);
        //file names added invisible in case we later want to see them when editing
        videoElement.lastChild.style.display ='none';
        commentDivToAddTo.append(videoElement.lastChild);     
    }

    for (let i = 0; i < commentObject.audioURLs.length; i++) {
        const audioElement = createMediaControllerCommentAudioUI(commentObject.audioURLs[i], false, false); 
        commentDivToAddTo.append(audioElement.firstChild);

        //file names added invisible in case we later want to see them when editing
        audioElement.lastChild.style.display ='none';
        commentDivToAddTo.append(audioElement.lastChild);  
    }
}

//used in the comment div event listeners to update the active comment
//handle which comment and which comment group is currently active
function updateActiveComment(commentToMakeActive)
{
    let commentAlreadyActive = false;
    let groupAlreadyActive = false;    
    let activeComment = document.getElementsByClassName("activeComment");

    //if a comment is already active
    if (activeComment.length) {
        activeComment = activeComment[0];
        
        if (commentToMakeActive !== activeComment) {            
            //determine if the new active comment is in an already active group
            groupAlreadyActive = commentToMakeActive.closest(".activeGroup") === activeComment.closest(".activeGroup");
            
            activeComment.closest(".activeGroup").classList.remove("activeGroup");
            activeComment.classList.remove("activeCommentBorder")
            activeComment.classList.remove("activeComment");
        } else {
            commentAlreadyActive = true;
        }
    }
    commentToMakeActive.classList.add("activeComment");

    commentToMakeActive.closest(".commentGroupSpacing").classList.add("activeGroup"); 

    //add activeCarousel class to all images in this comment
    commentToMakeActive.querySelectorAll('.carousel-item').forEach(img => {
        img.classList.remove('nonActiveCarousel');
        img.classList.add('activeCarousel')
    })

    //if we're in code view, scroll blog mode to the new active comment
    if (!playbackData.isInBlogMode) {
        //scroll to the comment in blogView
        document.querySelector(".blogView").scrollTop = document.querySelector(`.blogView [data-commentid="${commentToMakeActive.getAttribute("data-commentid")}"]`).offsetTop - 100;
    }
}

//Creates the edit button at the bottom of each card
function createEditCommentButton(commentObject, buttonText) {
    stopAutomaticPlayback();

    const editCommentButton = document.createElement("button");
    editCommentButton.classList.add("btn", "btn-outline-dark", "btn-sm", "editCommentButton");
    editCommentButton.title = buttonText;

    editCommentButton.addEventListener('click', event => {
        //prevents the edit button from triggering the event listeners of its parent divs
        event.preventDefault();
        event.stopPropagation();
        const commentEditable = document.querySelector('#commentEditable');
        commentEditable.dataset.commentEditable = true;


        if (commentObject.id === "commentId-0") {
            document.querySelector('.createCommentQuestionCheckbox').classList.add('hiddenDiv');
        }
        
        stopAutomaticPlayback();

        if (event.target.closest(".drag")) {
            event.target.closest(".drag").click();        
        }

        pauseMedia();

        if (commentObject.questionCommentData && commentObject.questionCommentData.allAnswers.length > 0) {
            document.getElementById('questionCheckBox').click();

            const extraQuestions = commentObject.questionCommentData.allAnswers.length - 2;
            const extraQuestionButton = document.getElementById("addAnswerButton");
            for (let i = 0; i < extraQuestions; i++) {
                extraQuestionButton.click();
            }

            document.getElementById('commentQuestion').innerText = commentObject.questionCommentData["question"];

            const answerFields = [...document.querySelectorAll('.questionCommentInput:not([id="commentQuestion"])')];
            for (let i = 0; i < answerFields.length; i++) {
                const currentAnswer = commentObject.questionCommentData.allAnswers[i];
                answerFields[i].value = currentAnswer;

                if (currentAnswer === commentObject.questionCommentData.correctAnswer) {
                    answerFields[i].parentNode.querySelector('.rightAnswerCheckBox').click();
                }
            }
        }

        document.getElementById("viewCommentsTab").classList.add("disabled");
        document.getElementById("fsViewTabTab").classList.add("disabled");
        document.getElementById("searchCommentTab").classList.add("disabled");
        document.getElementById("blogModeExtraAbove").value = commentObject.linesAbove;
        document.getElementById("blogModeExtraBelow").value = commentObject.linesBelow;

        //reselect in ace all highlighted code from the original comment
        for (let i = 0; i < commentObject.selectedCodeBlocks.length; i++) {
            const selectedBlock = commentObject.selectedCodeBlocks[i];

            //create a new ace range object from the comments highlighted code
            const newRange = new ace.Range(selectedBlock.startRow, selectedBlock.startColumn, selectedBlock.endRow, selectedBlock.endColumn);           
            
            //get the current active editor
            const editor = playbackData.editors[playbackData.activeEditorFileId] ? playbackData.editors[playbackData.activeEditorFileId] : playbackData.editors[''];

            //select in ace the comments highlighted code
            editor.getSession().selection.addRange(newRange);          
        };

        //add all current comment tags to comment tag drop down menu
        //excluding any tags in this comment
        populateCommentTagDropDownList(commentObject.commentTags);

        //populate this comments tags list
        commentObject.commentTags.forEach(tag => addCommentTagForThisComment(tag));    

        const addCommentButton =  document.getElementById("addCommentButton");
        const updateCommentButton = document.getElementById("updateCommentButton");
        addCommentButton.style.display = "none";
        updateCommentButton.removeAttribute("style");
        //cancelUpdateButton.removeAttribute("style");
    
        document.getElementById("addCommentTab").click();
        
        const textArea = document.getElementById("textCommentTextArea");
        textArea.innerHTML = commentObject.commentText;
    
        const imagePreviewDiv = document.getElementsByClassName("image-preview")[0];
        const audioPreviewDiv = document.getElementsByClassName("audio-preview")[0];
        const videoPreviewDiv = document.getElementsByClassName("video-preview")[0];
    
        if (commentObject.imageURLs.length) {
            for (let i = 0; i < commentObject.imageURLs.length; i++) {
                const imageCard = createMediaControllerCommentImageUI(commentObject.imageURLs[i], false, false);
                makeDraggable(imageCard);
        
                addCancelButtonToImage(imageCard,imagePreviewDiv );
            }
            imagePreviewDiv.removeAttribute("style");    
        }
    
        if (commentObject.audioURLs.length) {
            for (let i = 0; i < commentObject.audioURLs.length; i++) {
                const audioCard = createMediaControllerCommentAudioUI(commentObject.audioURLs[i], false, false);
                makeDraggable(audioCard);
                addCancelButtonToCard(audioCard, audioPreviewDiv);
                audioPreviewDiv.append(audioCard);
            }
            audioPreviewDiv.removeAttribute("style");
        }
    
        if (commentObject.videoURLs.length) {
            for (let i = 0; i < commentObject.videoURLs.length; i++) {
              const videoCard = createMediaControllerCommentVideoUI(commentObject.videoURLs[i], false, false);
              makeDraggable(videoCard);
              addCancelButtonToCard(videoCard, videoPreviewDiv);
              videoPreviewDiv.append(videoCard);
            }
          videoPreviewDiv.removeAttribute("style");
        }
  
        updateCommentButton.addEventListener( 'click' ,async event => {
            event.stopImmediatePropagation();
            const commentEditable = document.querySelector('#commentEditable');
            commentEditable.dataset.commentEditable = false;
    
            pauseMedia();
            //get the active editor
            const editor = playbackData.editors[playbackData.activeEditorFileId] ? playbackData.editors[playbackData.activeEditorFileId] : playbackData.editors[''];

            //get any selected text 
            const ranges = editor.getSession().getSelection().getAllRanges();

            if (await updateComment()) {
                document.getElementById("CancelUpdateButton").click();
                const activeComment = document.querySelector(`.codeView .activeComment`);
                document.getElementById("commentContentDiv").scrollTop = activeComment.offsetTop - 100;    
            } else {
                ranges.forEach(range => {
                    editor.selection.setRange(range)
                })
            }
        })

        highlightBlogModeVisibleArea();
    });
    return editCommentButton;
}

/*
 * Carousel Functions
*/

//TODO global???
//a number that is incremented with each carousel to keep ids unique
let currentCarousel = 0;

// CREATE CAROUSEL creates the image carousels for the comments
function createCarousel() {
    const carouselOuter = document.createElement('div'); 
    carouselOuter.setAttribute('id', 'mycarousel' + currentCarousel++);
    carouselOuter.setAttribute('data-interval','false');
    carouselOuter.setAttribute('data-keyboard', 'false');
    carouselOuter.classList.add('carousel','slide');
    carouselOuter.setAttribute('data-ride', 'carousel');

    const carouselInner = document.createElement('div');
    carouselInner.classList.add("carousel-inner");
    carouselOuter.append(carouselInner);
    return carouselOuter;
}

/*
 *
 */
function addImageToCarousel(src, carousel, giveEventListener) {

    const img = document.createElement('img');
    const imgDiv = document.createElement('div');
    const captionDiv = document.createElement('div');
    const captionText = document.createElement('h5');

    captionDiv.classList.add('carousel-caption', 'd-none', 'd-md-block');
    captionDiv.append(captionText);   

    img.src = src;
    img.classList.add('d-block','w-100');

    let test = document.createElement("div")
    test.append(img)

    imgDiv.classList.add('carousel-item', 'nonActiveCarousel');
    imgDiv.append(test);
    imgDiv.append(captionDiv);

    carousel.firstChild.append(imgDiv);

    const allCaptions = carousel.getElementsByClassName('carousel-caption');

    //prevents "1/1" from being displayed on single image carousels
    if (allCaptions.length > 1) {
        //updates all captions with the right counts
        for (let i = 0; i < allCaptions.length; i++) {
            allCaptions[i].textContent = i + 1 + '/' + allCaptions.length;
        }        
    }

    //sets an image active if none are
    if (!carousel.firstChild.firstChild.classList.value.includes('active') && giveEventListener) {
        carousel.firstChild.firstChild.classList.add('active');
    }

    //if the image will be part of a comment carousel, and not an expanded one
    if (giveEventListener) {
        img.addEventListener('click', function() {
            const expandedCarousel = createCarousel();
            expandedCarousel.setAttribute('data-returnCarouselId', carousel.getAttribute('id'));
            const activeSRC = carousel.querySelector('.carousel-item.active img').getAttribute('src');

            //add all images from the small carousel to the larger one
            carousel.querySelectorAll('.carousel-item img').forEach(img => {
                addImageToCarousel(img.getAttribute('src'),expandedCarousel, false);
            })
            //set the active img of the new carousel to the same image as the small one.
            const newCarouselImages = [...expandedCarousel.querySelectorAll('.carousel-item img')];
            const indexToMakeActive = newCarouselImages.findIndex(item => item.getAttribute("src") === activeSRC);
            newCarouselImages[indexToMakeActive].closest('.carousel-item').classList.add('active');

            //if there is more than one image the expanded carousel needs controls
            if(newCarouselImages.length > 1) {
                makeCarouselControls(expandedCarousel);
            }
            
            document.querySelector(".imgExpandBody").append(expandedCarousel);
            $('#imgExpandModal').modal('show');
        })
    }
}

/*
 *
 */
function makeCarouselControls(carousel) {
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

//determines which button is currently displayed, and switches to the other 
function toggleEditAcceptButtons(currentButtonType, id) {
    if (currentButtonType === "edit") {
        $('#' + "edit" + id)[0].style.display = "none";
        $('#' + "accept" + id)[0].removeAttribute("style");
    } else if (currentButtonType === "accept") {
        $('#' + "accept" + id)[0].style.display = "none";
        $('#' + "edit" + id)[0].removeAttribute("style");
    }
}

//adds the edit buttons to the normal comments
function addEditButtonsToCard(card, eventID, commentID, commentBlock, uniqueNumber, commentObject) {
  //find the card header in the card to add the buttons to  
  const header = card.querySelector(".commentCount");

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
        //dont trigger the click handler of the parentElement of deleteButton
        event.stopPropagation();

        let comment;
        //find the comment object associated with the card being deleted
        for (let indexToDelete = 0; indexToDelete < playbackData.comments[eventID].length; indexToDelete++) {
            if (playbackData.comments[eventID][indexToDelete].id === commentID) {
                comment = playbackData.comments[eventID][indexToDelete];  

                //remove the comment from the commentBlock
                commentBlock.splice(indexToDelete,1);               
                break;
            }
        }

        //TODO might not need this anymore
        //remove the accept button if there are no more comments but leave description
        if (eventID === "ev-0" && commentBlock.length < 2) {
            $('#' + "accept" + uniqueNumber).remove();
        }

        //if there are no comments left in the commentBlock, remove the block from it's parent div and delete the block from playbackData
        if (!commentBlock.length) {
            card.parentElement.parentElement.remove();
            delete playbackData.comments[eventID];
        } else {
            //if there are other comments left in the commentBlock, only remove the deleted comment
            card.remove();
        }
        deleteBlogPost(comment);
        removeDeletedCommentTagsFromTagObject(comment.commentTags, [], comment.id);
        deleteCommentFromSearchData(comment);
        deleteCommentFromServer(comment);

        //rebuild the slider with the new comment pip
        document.getElementById('slider').noUiSlider.destroy();
        setUpSlider();
        
        updateAllCommentHeaderCounts();
        updateQuestionCommentCounts();
        updateCommentQuestionsRunningCounts();
    });

  buttonGroup.append(deleteButton);

  header.append(buttonGroup);

  const editCommentButton = createEditCommentButton(commentObject, "Edit Comment");

  const cardFooter = document.createElement("div");
  cardFooter.classList.add("small", "p-0", "commentCardBodyColor");
  cardFooter.style.textAlign = "right";



  cardFooter.append(editCommentButton);
  card.append(cardFooter);

}

/*
 * CREATE THE UI ELEMENTS FOR MEDIA
*/

/*
 * Creates the ui representation of an image to be put inside of a comment
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
    
    if(returnWithEventistener) {
        //add an event handler to toggle whether it is selected
        newImg.addEventListener('click', event => {
            //toggle the 'selected' class
            event.target.classList.toggle('mediaSelected');
        });
    }
   
    return newImg;
}

/*
 * Creates the ui representation of a video to be put inside of a comment
 */
function createMediaControllerCommentVideoUI(srcPath, makeSelected, returnWithEventistener = true) {
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
    newVideo.onplay = function() {
        pauseMedia();

        if (newVideo.closest(".commentCard")) {
            //make the comment the video is in active
            newVideo.closest(".commentCard").click();
        }
        newVideo.classList.add("playing");
    };
 
    $(newVideo).on('pause ended', function() {
        newVideo.classList.remove("playing");
    });

    if (returnWithEventistener) {
        newVideo.classList.add('mediaVideo');
    } else {
        newVideo.classList.add('mediaResizable');
    }       

    const speedControlDiv = createSpeedControlButtonDivForMedia(newVideo);
   
    //add all the pieces together
    cardBody.append(speedControlDiv);
    cardFooter.append(fileName);
    cardDiv.append(cardBody);
    cardDiv.append(cardFooter);

    //if this video should be marked as pre-selected
    if(makeSelected) {
        cardDiv.classList.add('mediaSelected');
    }

    if (returnWithEventistener) {
        //add an event handler to toggle whether it is selected
        cardDiv.addEventListener('click', event => {
            //toggle the 'selected' class
            cardDiv.classList.toggle('mediaSelected');
        });
    }

    return cardDiv;
}

/*
 * Creates the ui representation of an audio element to be put inside of a comment
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

    //pause any media that is playing
    newAudio.onplay = function() {
        pauseMedia();

        if (newAudio.closest(".commentCard")) {
            //make the comment the audio is in active
            newAudio.closest(".commentCard").click();
        }        
        newAudio.classList.add("playing");
    }

    //removes the playing class from a media file
    $(newAudio).on('pause ended', function() {
        newAudio.classList.remove("playing");
    })    

    
    if (returnWithEventistener) {
        newAudio.classList.add('mediaAudio');
    } else {
        newAudio.classList.add('mediaResizable');
        cardBody.classList.add("textLeft");
    }

    newAudio.style.height = 40 + 'px';

    const speedControlDiv = createSpeedControlButtonDivForMedia(newAudio);

    //add all the pieces together
    cardBody.append(speedControlDiv);
    cardFooter.append(fileName);
    cardDiv.append(cardBody);
    cardDiv.append(cardFooter);

    //if this audio should be marked as pre-selected
    if(makeSelected) {
        cardDiv.classList.add('mediaSelected');
    }

    if (returnWithEventistener) {
        //add an event handler to toggle whether it is selected
        cardDiv.addEventListener('click', event => {
        //toggle the 'selected' class
        cardDiv.classList.toggle('mediaSelected')});
    }
    return cardDiv;
}

//pauses any currently playing videos or audio
function pauseMedia() {
    const playing = document.querySelector('.playing');
 
    if (playing) {
        playing.pause();
        playing.classList.remove('playing');
    }
}

/*creates and returns a div holding buttons for '1.0x' and '1.5x' playback speed */
function createSpeedControlButtonDivForMedia(media) {
    const buttonGroup = document.createElement("div");
    buttonGroup.classList.add("btn-group-vertical", "speedGroup");

    const speedUpButton = document.createElement("button");
    speedUpButton.classList.add("btn", "btn-sm",'speedButton');
    speedUpButton.appendChild(document.createTextNode('1.5x'));

    speedUpButton.addEventListener('click', event => {
        media.playbackRate = 1.5;
    });

    const defaultSpeedButton = document.createElement("button");
    defaultSpeedButton.classList.add("btn",  "btn-sm", 'speedButton');
    defaultSpeedButton.appendChild(document.createTextNode('1.0x'));

    defaultSpeedButton.addEventListener('click', event => {
        media.playbackRate = 1;
    });

    buttonGroup.append(defaultSpeedButton);
    buttonGroup.append(speedUpButton);

    const outerSpeedDiv = document.createElement("div");
    outerSpeedDiv.append(media);
    outerSpeedDiv.append(buttonGroup);

    return outerSpeedDiv;
}

function createXButtonForCloseOrCancel(popUpMessage = "") {
    let button = document.createElement('button');
    button.classList.add('close', 'mediaCancelButton');
    button.setAttribute('aria-label', 'close');
    button.innerHTML ='&times;';
    button.setAttribute('title', popUpMessage);
    return button;
}

function addCancelButtonToImage(image, panelToDeleteFrom) {
    let imageDiv = document.createElement('div');
    imageDiv.classList.add('image-div')

    let button = createXButtonForCloseOrCancel("Remove image from comment");
    button.classList.add('imageCancelButton');

    button.addEventListener('click', event => {
        panelToDeleteFrom.removeChild(imageDiv);
 

        //hides the div if there are none of the media type left
        if (panelToDeleteFrom.classList.contains('hidden')) {
            let nodesLeft = false;
            let panelChildren = panelToDeleteFrom.children;
            
            for (let i = 0; i < panelChildren.length; i++) {
                if (panelChildren[i].classList.contains('image-div')) {
                    nodesLeft = true;
                    break;
                }
            }
            if (!nodesLeft) {
                panelToDeleteFrom.style.display = 'none';
            }
        }
    });

    imageDiv.append(image);

    imageDiv.append(button);
    panelToDeleteFrom.append(imageDiv);
}

function addCancelButtonToCard(card, panelToDeleteFrom) {
    let button = createXButtonForCloseOrCancel("Remove media from comment");

    //removes the selected media from the preview and from the stored list of selected media
    button.addEventListener('click',event => {
        panelToDeleteFrom.removeChild(card);

        //hides the div if there are none of the media type left
        if (panelToDeleteFrom.classList.contains('hidden')) {
            let nodesLeft = false;
            let panelChildren = panelToDeleteFrom.children;
            
            for (let i = 0; i < panelChildren.length; i++) {
                if (panelChildren[i].classList.contains('card')) {
                    nodesLeft = true;
                    break;
                }
            }
            if (!nodesLeft) {
                panelToDeleteFrom.style.display = 'none';
            }
        }

    });
    card.closest(".card").prepend(button);
}

function makeDraggable(param, key) {
    param.setAttribute('draggable', 'true');
    param.classList.add('draggable');

    param.addEventListener('dragstart', () => {
        param.classList.add('dragging');
    })

    param.addEventListener('dragend', () => {       
        if (key !== undefined) {           
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
                newCommentPosition: key === 0 ? newCommentPosition + 2 : newCommentPosition
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

function makeunDraggable(param) {
    param.removeAttribute('draggable');
    param.classList.remove('draggable');
}

function makeDivDroppable(div, useID = true) {
    //fixes firefox specific issue where images moved open a new tab
    document.body.ondrop = function (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const divDrop = useID ? $('#' + div.id)[0] : div;
    divDrop.addEventListener('dragover', event => {
        const draggable = divDrop.querySelector('.dragging');
        
        //make sure the item being dragged originated in the droppable div
        if (draggable !== null) {
            event.preventDefault();
            const afterElement = getDragAfterElement(divDrop, event.clientY);
            if (afterElement === null) {
                divDrop.appendChild(draggable);
            } else {
                divDrop.insertBefore(draggable, afterElement);
            }            
        }    
    });   
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
        stopAutomaticPlayback();

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

function updateAllCommentHeaderCounts() {
    const drag = document.querySelectorAll(".commentsDivScroll .drag");
    for (let i = 0; i < drag.length; i++) {
       drag[i].getElementsByClassName("commentCount")[0].getElementsByClassName("progressSpan")[0].firstChild.data = i + 1 + "/" + drag.length;       
    }    
}

function getDevelopersInADevGroup(devGroupId) {
    //dev objects in the developer group
    const devs = [];
    //get the dev group object
    const developerGroup = playbackData.developerGroups[devGroupId];
    //if the dev group was found
    if(developerGroup) {
        //get the members of the dev group
        const devIds = developerGroup.memberIds;
        for(let i = 0;i < devIds.length;i++) {
            const dev = playbackData.developers[devIds[i]];
            if(dev) {
                devs.push(dev);
            }
        } 
    }
    return devs;
}
function getDevImages(devs, sizeInPixels) {
    const allDevImages = document.createElement('div');
    allDevImages.classList.add('devImages');

    for(let i = 0;i < devs.length;i++) {
        const dev = devs[i];
        const developerImage = document.createElement('img');
        developerImage.setAttribute('src', `${dev.avatarURL}?s=${sizeInPixels}&d=identicon`);
        developerImage.classList.add('devImage');
        developerImage.classList.add('rounded-circle');
        developerImage.classList.add('img-thumbnail');
        developerImage.title = `${dev.userName} ${dev.email}`;
        allDevImages.append(developerImage);
    }
    return allDevImages;
}
function updateCurrentDeveloperGroupAvatars(devGroupId) {
    //if this is a different developer group than the currently recognized one
    if(playbackData.currentDeveloperGroupId !== devGroupId) {
        //get the developers in the group
        const activeDevs = getDevelopersInADevGroup(devGroupId);
        
        //get the div that holds the active devs
        const currentDevsDiv = document.getElementById('currentDevsDiv');
        
        //remove the old images and add new ones 20px height
        currentDevsDiv.innerHTML = '';
        currentDevsDiv.append(getDevImages(activeDevs, 40));
    }
}

function removeActiveCommentAndGroup() {
    const activeComment = document.querySelector('.codeView .activeComment');
    if (activeComment) {        
        activeComment.closest('.activeGroup').classList.remove('activeGroup');
        activeComment.classList.remove('activeCommentBorder');
        activeComment.classList.remove('activeComment');

        //remove active class from all images in the active comment
        activeComment.querySelectorAll('.activeCarousel').forEach(img => {
            img.classList.remove('activeCarousel');
            img.classList.add('nonActiveCarousel');    
        })
    }
}

function selectRange(rangeToSelect) {
    const windowSelection = window.getSelection();
    windowSelection.removeAllRanges();
    windowSelection.addRange(rangeToSelect);
}

//creates and displays the blog mode title, description, and all blog posts
function displayAllBlogPosts() {
    const blogDiv = document.querySelector(".blogViewContent");
    blogDiv.innerHTML = "";

    const allComments = getAllComments();

    const titleDivOuter = document.createElement('div');
    titleDivOuter.classList.add("h1", "blogTitle");
    const titleTextDiv = document.createElement('div');
    titleTextDiv.innerHTML = playbackData.playbackTitle;
    titleDivOuter.append(titleTextDiv)
    blogDiv.append(titleDivOuter);
    
    const outerDeveloperDiv = document.createElement('div');
    outerDeveloperDiv.classList.add("blogDevelopersDiv");
    blogDiv.append(outerDeveloperDiv);
    updateBlogPostDevelopersDiv();
  
    for (let i = 0; i < allComments.length; i++) {
        const eventID = allComments[i].getAttribute('data-commenteventid');

        const indexOfComment = playbackData.comments[eventID].findIndex(item => item.id === allComments[i].getAttribute('data-commentid'))
        const comment = playbackData.comments[eventID][indexOfComment];

        blogDiv.append(createBlogPost(comment));
    }
}

//update the blog mode list of authors who have contributed to a comment
function updateBlogPostDevelopersDiv() {
    const outerDevDiv = document.querySelector(".blogDevelopersDiv");
    outerDevDiv.innerHTML = "";
    //get all unique contributing developerGroupIDs from the comments
    let developerGroupIDs = new Set();
    for (const comment in playbackData.comments) {
        for (let i = 0; i < playbackData.comments[comment].length; i++) {
            developerGroupIDs.add(playbackData.comments[comment][i].developerGroupId);
        }
    }

    //get all unique members of all the contributing groups
    let developerIDs = new Set();
    developerGroupIDs.forEach(developerGroupID => {
        const groupMembers = playbackData.developerGroups[developerGroupID].memberIds;
        groupMembers.forEach(memberId => developerIDs.add(memberId));
    })
    
    //create a developer div for each developer
    let tempDeveloperGroup = [];    
    developerIDs.forEach(developerID => {
        if (playbackData.developers[developerID].userName === "Anonymous Developer") {
            return;
        }

        tempDeveloperGroup.push(playbackData.developers[developerID]);
        const developerDiv = getDevImages(tempDeveloperGroup, 30);
        developerDiv.classList.add('blogDeveloperDiv');
        developerDiv.firstChild.classList.add("blogDevImage");
        
        const devUserName = document.createElement('div');
        devUserName.classList.add("blogUserName");
        devUserName.innerHTML = playbackData.developers[developerID].userName;

        developerDiv.append(devUserName);

        //allows an author to not include their email
        if (playbackData.developers[developerID].email !== "") {
            const devEmail = document.createElement('a');
            devEmail.setAttribute('href', `mailto:${playbackData.developers[developerID].email}`);
            devEmail.classList.add("devEmail");
            devEmail.title = "Click to send email";
            devEmail.innerHTML = playbackData.developers[developerID].email;      
            developerDiv.append(devEmail);
        }        
        
        outerDevDiv.append(developerDiv);
        
        tempDeveloperGroup = [];        
    })

    const separater = document.createElement('hr');
    separater.classList.add("devDescriptionSeparater");
    outerDevDiv.append(separater);
}

let latestVisableBlogPostID; //the id of the last blog post that has been scrolled to. helpful when switching back to code mode

//create a single blog post from a comment
function createBlogPost(commentToAdd) {
    const blogPost = document.createElement("div");
    blogPost.classList.add("blogStyle");


    if (commentToAdd.displayCommentEvent.id === "ev-0") { 
        blogPost.classList.add("descriptionBlogPost");       
    }

    const textDiv = document.createElement('div');
    textDiv.classList.add("blogCommentText");
    textDiv.innerHTML = commentToAdd.commentText;

    //create an observer that will detect when the comment text is fully on the screen
    //it will then make the equivalent comment active in comment mode and scroll to it
    const observer = new IntersectionObserver(function(entries) {
        if(playbackData.isInBlogMode && entries[0].isIntersecting === true) {
            latestVisableBlogPostID = commentToAdd.id;          
        }           
    }, { threshold: [1] });
    
    observer.observe(textDiv);

    blogPost.setAttribute("data-commentEventid", commentToAdd.displayCommentEvent.id);
    blogPost.setAttribute("data-commentid", commentToAdd.id);


    blogPost.append(textDiv);
    addQuestionCommentToDiv(blogPost, commentToAdd, "blog");

    if (commentToAdd.videoURLs.length) {
        for (let i = 0; i < commentToAdd.videoURLs.length; i++) {
            //create a video and add the required classes
            const newVideo = document.createElement('video');
            newVideo.setAttribute('src', commentToAdd.videoURLs[i]);
            newVideo.setAttribute('controls', '');
            newVideo.setAttribute('preload', 'metadata');   

            //when a video is played, pause any other media that is playing
            newVideo.onplay = function() {
                pauseMedia();

                if (newVideo.closest(".commentCard")) {
                    //make the comment the video is in active
                    newVideo.closest(".commentCard").click();
                }
                newVideo.classList.add("playing");
            };
        
            $(newVideo).on('pause ended', function() {
                newVideo.classList.remove("playing");
            });
            
            newVideo.classList.add('mediaResizable');                

            const speedControlDiv = createSpeedControlButtonDivForMedia(newVideo);

            speedControlDiv.querySelector(".speedGroup").classList.add("blogAudioGroup")

            speedControlDiv.querySelector(".speedGroup").classList.remove("speedGroup");
            speedControlDiv.classList.add("blogVideoFile");

            blogPost.append(speedControlDiv);
        }
    }

    if (commentToAdd.audioURLs.length) {
        for (let i = 0; i < commentToAdd.audioURLs.length; i ++) {
            //create an audio and add the required classes
            const newAudio = document.createElement('audio');
            newAudio.setAttribute('src', commentToAdd.audioURLs[i]);
            newAudio.setAttribute('controls', '');
            newAudio.setAttribute('preload', 'metadata');

            //pause any media that is playing
            newAudio.onplay = function() {
                pauseMedia();

                if (newAudio.closest(".commentCard")) {
                    //make the comment the audio is in active
                    newAudio.closest(".commentCard").click();
                }        
                newAudio.classList.add("playing");
            }

            //removes the playing class from a media file
            $(newAudio).on('pause ended', function() {
                newAudio.classList.remove("playing");
            })                
         
            newAudio.classList.add('mediaResizable');
            newAudio.style.height = 40 + 'px';

            const speedControlDiv = createSpeedControlButtonDivForMedia(newAudio);

            speedControlDiv.querySelector(".speedGroup").classList.add("blogAudioGroup")

            speedControlDiv.querySelector(".speedGroup").classList.remove("speedGroup");
            speedControlDiv.classList.add("blogAudioFile");
            blogPost.append(speedControlDiv);
        }       
    } 



    if (commentToAdd.viewableBlogText && commentToAdd.viewableBlogText.length) {
        const editor = playbackData.editors[playbackData.activeEditorFileId] ? playbackData.editors[playbackData.activeEditorFileId] : playbackData.editors[''];

        editor.session.selection.clearSelection()

        const blogPostEditor = document.createElement('div')
        blogPostEditor.classList.add("blogEditorDiv") 

        let blogPostCodeEditor = ace.edit(blogPostEditor);

        const blogPostFileNameDiv = document.createElement('div');
        blogPostFileNameDiv.classList.add("blogPostFileName")
        blogPostFileNameDiv.innerText = commentToAdd.currentFilePath;
        
        //determining how big to make the new editor
        let startRow = commentToAdd.selectedCodeBlocks[0].startRow - Number(commentToAdd.linesAbove) > 0 ? commentToAdd.selectedCodeBlocks[0].startRow - Number(commentToAdd.linesAbove) : 0;
        
        blogPostCodeEditor.setValue(commentToAdd.viewableBlogText);

        editor.session.selection.clearSelection();
        blogPostCodeEditor.session.selection.clearSelection();

        //for each primary comment highlight
        for (let i = 0; i < commentToAdd.selectedCodeBlocks.length; i++) {
            //get a selection from the comment
            const selection = commentToAdd.selectedCodeBlocks[i];
            //convert the selection into a line-by-line group of ranges accounting for the limited amount of code on the screen
            const allRanges = splitRangeIgnoreLeadingAndTrailingSpaces(blogPostCodeEditor, selection.startRow - startRow, selection.startColumn, selection.endRow - startRow, selection.endColumn);

            //go through the ranges and highlight them
            for(let j = 0;j < allRanges.length;j++) {
                //create a marker in the right range
                blogPostCodeEditor.getSession().addMarker(allRanges[j], 'highlight', 'text', true);
            }
        }

        blogPostCodeEditor.setOptions({
            readOnly: true,
            theme: 'ace/theme/monokai',
            maxLines: blogPostCodeEditor.session.getLength(),
            fontSize: 16,
            firstLineNumber: startRow + 1,
            highlightActiveLine: false,
            highlightGutterLine: false,
            showPrintMargin: false
        });
        blogPostCodeEditor.renderer.$cursorLayer.element.style.display = "none";
        
        blogPostCodeEditor.session.setOptions({
            mode: getEditorModeForFilePath(commentToAdd.currentFilePath),
            useWorker: false
        });
        blogPostEditor.append(blogPostCodeEditor);
        blogPost.append(blogPostFileNameDiv);
        blogPost.append(blogPostEditor);       
       
    }    


    if (commentToAdd.imageURLs.length) {
        let imagesDiv = document.createElement('div');
        imagesDiv.classList.add("blogModeImageDiv");

        for (let i = 0; i < commentToAdd.imageURLs.length; i++) {
            const imgDiv = document.createElement('div');
            imgDiv.classList.add("blogImageDiv");
            const img = document.createElement('img');
            img.classList.add("blogImage");
            img.src = commentToAdd.imageURLs[i];

            img.addEventListener('load', function() {
                imgDiv.style.height = img.height > 500 ? "500px" : img.height + "px";
            });

            img.addEventListener('click', function() {
                document.getElementById('imgToExpand').src = img.src;
                $('#imgExpandModal').modal('show');      
            });       

            imgDiv.append(img);
            imagesDiv.append(imgDiv);     
        }    
        blogPost.append(imagesDiv);        
    }
 
    return blogPost;
}

//delete a blog post from blog mode
function deleteBlogPost(commentToDelete) {
    const allBlogPosts = getAllBlogPosts();
    const indexToDelete = allBlogPosts.findIndex(item => item.getAttribute("data-commentid") === commentToDelete.id);
    allBlogPosts[indexToDelete].remove();    
    updateBlogPostDevelopersDiv();
}

//add a blog post to blog blog mode
function insertBlogPost(commentToInsert) {
    const allPostedComments = getAllComments();
    const allBlogPosts = getAllBlogPosts();
    const indexOfInsertion = allPostedComments.findIndex(item => item.getAttribute("data-commentid") === commentToInsert.id)

    if (indexOfInsertion !== allPostedComments.length - 1) {
        allBlogPosts[0].parentNode.insertBefore(createBlogPost(commentToInsert), allBlogPosts[indexOfInsertion]);
    } else {
        allBlogPosts[0].parentNode.appendChild(createBlogPost(commentToInsert));
    }
    updateBlogPostDevelopersDiv();
}

//edit a blog post
function updateBlogPost(commentToEdit) {
    const allBlogPosts = getAllBlogPosts();
    const indexOfEdit = allBlogPosts.findIndex(item => item.getAttribute('data-commentid') === commentToEdit.id);
    allBlogPosts[indexOfEdit].parentNode.replaceChild(createBlogPost(commentToEdit), allBlogPosts[indexOfEdit]);
    //updateBlogPostDevelopersDiv();
}

//handles the highlighting of a blog mode preview selection by mouse dragging or by shift+arrow
function highlightBlogModeVisibleArea() {
    clearNewCodeHighlights();
    
    blogModeHighlightHelper();

    const codePanel = document.querySelector(".codePanel");
    codePanel.addEventListener('keyup', blogModeHighlightHelperShiftArrow);    
    codePanel.addEventListener('mouseup', waitToGetSelection);
}

//handles selection of text using shift+arrow 
function blogModeHighlightHelperShiftArrow(event) {
    if (event.shiftKey && (event.key === "ArrowRight" || event.key === "ArrowLeft" || event.key === "ArrowDown" || event.key === "ArrowUp")) {
        aceTempRanges = [];
        waitToGetSelection();
    }
}

//without a small wait, the selection isn't updated fast enough
function waitToGetSelection() {
    setTimeout(blogModeHighlightHelper, 5);
}

let aceTempMarker;
let aceTempRange;
//helper function to assist in the highligting of a blog mode preview
function blogModeHighlightHelper() {    
    const editor = playbackData.editors[playbackData.activeEditorFileId] ? playbackData.editors[playbackData.activeEditorFileId] : playbackData.editors[''];
    
    const selection = editor.getSelectedText();

    if (selection !== "") {
        const numbersAbove = Number(blogModeNumberAboveSelector.value);
        const numbersBelow = Number(blogModeNumberBelowSelector.value);       

        const totalLines = editor.session.getLength() - 1

        const ranges = editor.getSession().getSelection().getAllRanges();

        editor.session.removeMarker(aceTempMarker);

        const startRow = ranges[0].start.row - numbersAbove; 
        let endRow = ranges[ranges.length - 1].end.row + numbersBelow;
        endRow = ranges[ranges.length - 1].end.column === 0 ? endRow - 1 : endRow;
        const endCol = editor.session.getLine(endRow).length;

        blogModeNumberAboveSelector.max = ranges[0].start.row;
        blogModeNumberAboveSelector.value =  blogModeNumberAboveSelector.max > numbersAbove ? numbersAbove : blogModeNumberAboveSelector.max;
        blogModeNumberBelowSelector.max =  ranges[ranges.length - 1].end.column === 0 ? totalLines - ranges[ranges.length - 1].end.row + 1 : totalLines - ranges[ranges.length - 1].end.row; //TODO clean this up
        blogModeNumberBelowSelector.value =  blogModeNumberBelowSelector.max > numbersBelow ? numbersBelow : blogModeNumberBelowSelector.max;

        const higlightedRange = new ace.Range(startRow, 0, endRow, endCol); 
        aceTempRange = higlightedRange;

        aceTempMarker = editor.session.addMarker(higlightedRange, 'highlight', 'text', true);
    } else {
        editor.session.removeMarker(aceTempMarker);
        clearHighlights();

        blogModeNumberAboveSelector.max = 50;
        blogModeNumberBelowSelector.max = 50;
    }
}

//clears any blog mode preview highlights or selections
//removes any event listeners added to the editor for selection
//resets the line above/below buttons to their default states
function undoBlogModeHighlight() {
    const editor = playbackData.editors[playbackData.activeEditorFileId] ? playbackData.editors[playbackData.activeEditorFileId] : playbackData.editors[''];

    editor.session.removeMarker(aceTempMarker)
    editor.clearSelection();

    const codePanel = document.querySelector(".codePanel");
    codePanel.removeEventListener('keyup', blogModeHighlightHelperShiftArrow);    
    codePanel.removeEventListener('mouseup', waitToGetSelection);

    blogModeNumberAboveSelector.max = 50; 
    blogModeNumberBelowSelector.max = 50;
    blogModeNumberAboveSelector.value = 3;
    blogModeNumberBelowSelector.value = 3;
}

function getAllComments() {
    return [...document.querySelectorAll('.codeView [data-commentid]')];
}

function getAllBlogPosts() {
    return [...document.querySelectorAll(".blogView [data-commentid]")];
}

//empty the drop down list of comment tags
function emptyCommentTagDropDownMenu() {
    document.querySelectorAll('.commentTagDropDownItem').forEach(option => option.remove()); 
}

//build the drop down list of comment tags when adding or editing a comment
function populateCommentTagDropDownList(tagsToExclude) {    
    emptyCommentTagDropDownMenu();

    getAllSortedCommentTags().forEach(tag => {
        //if the current tag is meant to be excluded from the dropdown list
        if (tagsToExclude && tagsToExclude.includes(tag)) {
            return;
        }

        const newTag = document.createElement("a");
        newTag.classList.add("dropdown-item", "commentTagDropDownItem");
        newTag.href = "#";
        newTag.appendChild(document.createTextNode(tag));
    
        newTag.addEventListener("click", function() {
            addCommentTagForThisComment(tag);
            newTag.remove();
        })
        document.querySelector(".commentTagDropDown").appendChild(newTag);
    })
}

//format tags as lower case with dashes connecting words
function getFormattedCommentTag(commentTag) {
    return commentTag.toLowerCase().replaceAll(' ', '-')
}

//returns a sorted list of all tags
function getAllSortedCommentTags() {
    return Object.keys(allCommentTagsWithCommentId).sort();
}

//adds a new tag to the tag search data
function addCommentTagsToTagObject(commentTag, commentObject) {
    commentTag = getFormattedCommentTag(commentTag);

    if (!allCommentTagsWithCommentId[commentTag]) {
        allCommentTagsWithCommentId[commentTag] = [commentObject.id] 
    } else if (!allCommentTagsWithCommentId[commentTag].includes(commentObject.id)) {    
        allCommentTagsWithCommentId[commentTag].push(commentObject.id)
    }
}

//remove a deleted tag from the search data
function removeDeletedCommentTagsFromTagObject(oldTagsList, newTagsList, commentId) {
     oldTagsList.forEach(tag => {
        if (!newTagsList.includes(tag)) {
            const index = allCommentTagsWithCommentId[tag].indexOf(commentId)
            allCommentTagsWithCommentId[tag].splice(index, 1);

            if (allCommentTagsWithCommentId[tag].length === 0 && !permanentCommentTags.includes(tag)) {
                delete allCommentTagsWithCommentId[tag];
            }
        }
    })
}

//add a new tag to a comments tag list when adding or editing a comment
function addCommentTagForThisComment(commentTag) {
    if (getAllTagsOnScreen().includes(commentTag)) {
        return;
    }

    const tagDiv = document.createElement("div");
    tagDiv.classList.add("alert", "alert-dismissible", "fade", "show", "commentTagDiv")
    tagDiv.innerText = commentTag;

    const deleteButton = document.createElement("button");
    deleteButton.classList.add("close")
    deleteButton.setAttribute('aria-label', 'close');
    deleteButton.innerHTML ='&times;';
    deleteButton.title = "Remove tag from comment";
    tagDiv.append(deleteButton);

    deleteButton.addEventListener("click", function() {
        tagDiv.remove();

        //rebuild the drop down menu with the deleted tag
        populateCommentTagDropDownList(getAllTagsOnScreen());
    })

    document.querySelector(".tagsInComment").append(tagDiv);
}

//formats the cloned comment div for the search results
function setUpSearchResultComment(commentDiv) {
    const commentId = commentDiv.getAttribute("data-commentid");

    //remove any active classes from the original comment
    commentDiv.classList.remove("activeComment");
    commentDiv.classList.remove("activeCommentBorder");

    //get the comment from playbackData
    let commentObject = playbackData.comments[commentDiv.getAttribute("data-commenteventid")][playbackData.comments[commentDiv.getAttribute("data-commenteventid")].findIndex(item => item.id == commentDiv.getAttribute("data-commentid"))]; //TODO multiple lines

    //remove any carousels because the original event listeners wont work
    const carousel = commentDiv.querySelector(".carousel")
    if (carousel) {
        while (carousel.firstChild)
        carousel.removeChild(carousel.firstChild)
    }

    //remove any audio divs because the original event listeners wont work
    const audioDiv = commentDiv.querySelectorAll(".textLeft")
    if (audioDiv.length) {
        audioDiv.forEach(audio => {
            audio.remove()
        })
    }

    [...commentDiv.querySelectorAll(".card-body")].forEach(video =>
        video.remove())
    addMediaToCommentDiv(commentDiv, commentObject);

    commentDiv.addEventListener('click', function() {
        document.querySelector(`.codeView [data-commentid="${commentId}"]`).click();

        //remove active classes from the comment and the images in the comment
        const activeComment = document.querySelector(".activeSearchResultComment");
        if (activeComment) {
            activeComment.querySelectorAll(".activeCarousel").forEach(img => {
                img.classList.remove("activeCarousel")
            })

            activeComment.classList.remove("activeSearchResultComment");
        }

        //add the active class to the comment and the images in the comment
        this.classList.add("activeSearchResultComment");
        this.querySelectorAll(".carousel-item").forEach(img => {
            img.classList.add("activeCarousel")
        })
    })
}

//get all comment tags that are currently on screen for a comment
function getAllTagsOnScreen() { 
    const tagDivs = [...document.querySelectorAll(".commentTagDiv")];
    let retVal = [];
    tagDivs.forEach(tagDiv => {
        let tag = tagDiv.textContent.substring(0, tagDiv.textContent.length - 1)
        retVal.push(tag)});
    return retVal;
}

//builds up wordSearchData to later search by words
function buildSearchData(commentObject) {    
    //comment text
    getWordsFromText(commentObject.commentText).forEach(word => {
        buildSearchDataHelper(word, "commentText", commentObject.id)
    })
    
    //comment tags
    if (commentObject.commentTags.length) {
        commentObject.commentTags.forEach(tag => {
            tag = tag.replaceAll('-', ' ');
            words = tag.split(' ');

            words.forEach(word => {
                buildSearchDataHelper(word, "commentTags", commentObject.id)
            })
        })
    }

    //highlighted code
    if (commentObject.selectedCodeBlocks.length) {
        commentObject.selectedCodeBlocks.forEach(block => {
            getWordsFromText(block.selectedText, true).forEach(word => {
                buildSearchDataHelper(word, "highlightedCode", commentObject.id)
            })
        })
    }
}

//delete words from the search data after a comment is edited 
function deleteWordsFromSearchData(oldComment, newComment) {
    //commentText
    if (oldComment.commentText !== newComment.commentText) {
        const oldWords = getWordsFromText(oldComment.commentText)

        const newWords = getWordsFromText(newComment.commentText)
        const deletedWords = [...new Set(oldWords.filter(oldWord => !newWords.includes(oldWord)))]; //array of words that were in the oldComment but not in the newComment

        deletedWords.forEach(word => {            
            deleteWordsFromSearchDataHelper(word, "commentText", oldComment.id);
        })
    }

    //commentTags

    //determining if any tags have been deleted
    const deletedTags = [...new Set(oldComment.commentTags.filter(oldTag => !newComment.commentTags.includes(oldTag)))];

    if (deletedTags.length) { 
        deletedTags.forEach(tag => {
            tag = tag.replaceAll("-", " ");
            //split the tag into an array of words
            const tagWords = tag.split(/[\s ]+/); 

            tagWords.forEach(tagWord => {
                deleteWordsFromSearchDataHelper(tagWord, "commentTags", oldComment.id)
            })
        })
    }

    //hilighted code

    //build a list of the old selected words for this comment, and the new
    //then compare the two lists to determine if any words need to be removed from the search data
    const oldSelectedTextWords = [];
    oldComment.selectedCodeBlocks.forEach(block => {
        //const fullText = getWordsFromText(block.selectedText)
        const words = getWordsFromText(block.selectedText, true)

        words.forEach(word => {
            oldSelectedTextWords.push(word);
        })       
    })

    const newSelectedTextWords = [];
    newComment.selectedCodeBlocks.forEach(block => {
        //const fullText = getWordsFromText(block.selectedText)
        const words = getWordsFromText(block.selectedText, true)

        words.forEach(word => {
            newSelectedTextWords.push(word);
        })
    })

    oldSelectedTextWords.forEach(oldWord => {
        if (!newSelectedTextWords.includes(oldWord)) {
            deleteWordsFromSearchDataHelper(oldWord, "highlightedCode", oldComment.id)
        }
    })    
}

//when a comment is deleted and all of it's data has to be removed from the search data
function deleteCommentFromSearchData(comment) {
    //commentText
    getWordsFromText(comment.commentText).forEach(oldWord => {
        deleteWordsFromSearchDataHelper(oldWord, "commentText", comment.id);
    })

    //commentTags
    comment.commentTags.forEach(tag => {
        tag = tag.replaceAll('-', ' ');
        const oldTags = tag.split(/[\s ]+/);
        oldTags.forEach(oldTag => {
            deleteWordsFromSearchDataHelper(oldTag, "commentTags", comment.id)
        })
    })

    //highlighted code
    comment.selectedCodeBlocks.forEach(block => {
        getWordsFromText(block.selectedText).forEach(word => {
            deleteWordsFromSearchDataHelper(word, "highlightedCode", comment.id)
        })
    })
}

//generic deleter that can be called for any search criteria
function deleteWordsFromSearchDataHelper(word, criteriaType, commentId) {
    if (!wordSearchData[word] || !wordSearchData[word][criteriaType] || !wordSearchData[word][criteriaType].includes(commentId)) {
        return
    }

    const index = wordSearchData[word][criteriaType].indexOf(commentId);
    wordSearchData[word][criteriaType].splice(index, 1); //delete the word

    if (wordSearchData[word][criteriaType].length === 0) { //if this word doesn't appear in the criteria anymore
        delete wordSearchData[word][criteriaType];
        if (Object.keys(wordSearchData[word]).length === 0) { //if this word doesn't appear in any criteria anymore
            delete wordSearchData[word];
        }
    }            
}

//generic helper function that can build any criteria
function buildSearchDataHelper(word, criteriaType, commentId) {
    word = word.toLowerCase();
    if (word.length > 1 || criteriaType === "highlightedCode") { //words from highlighted code can be any length
        if (wordSearchData[word]) {//if the word already exists in the object
            if (wordSearchData[word][criteriaType]) {//if the word exists for the criteria
                if (!wordSearchData[word][criteriaType].includes(commentId)) {//if the commentId doesn't exist
                    wordSearchData[word][criteriaType].push(commentId);
                }
            } else {//create a new array for the current word at the current criteria
                wordSearchData[word][criteriaType] = [commentId];
            }
        } else {//add the word/criteria type/commentId to the object
            wordSearchData[word] = {[criteriaType]: [commentId]};
        }
    }
}

//returns an array of words with all special characters removed
function getWordsFromText(stringToStrip, isCode) {
    //remove all html from text that isn't highlighted code
    //the highlighted code html might be something somebody wants to search for
    if (!isCode) { 
        stringToStrip = stringToStrip.replace(/(<([^>]+)>)/gi, "");
    }
    const retVal =  [...new Set(stringToStrip.replace(/[^a-zA-Z ]/g, " ").split(/[\s ]+/))]
    if (retVal.indexOf("") !== -1) {
        retVal.splice(retVal.indexOf(""), 1)
    }
    return retVal;
}

//TODO this can be changed/deleted because it's not very useful right now
//a single place to handle the values of the drop down menu
function handleCommentSearchDropDownOptions() {
    activeOption = document.querySelector(".commentSearchOption.active").text;
    retVal = 'All';
    switch (activeOption) {
        case "Comment Tags":
            document.getElementById("commentSearchBar").placeholder = "Search Comment Tags";
            retVal = "commentTags"
            break;
        case "Comment Text":
            document.getElementById("commentSearchBar").placeholder = "Search Comment Text";
            retVal = "commentText"
            break   
        case "Highlighted Code":
            document.getElementById("commentSearchBar").placeholder = "Search Highlighted Code";
            retVal = "highlightedCode";
            break;
        default:
            document.getElementById("commentSearchBar").placeholder = "Search All Attributes";
            break;
    }
    return retVal;
}

//only allow one right answer check box to be checked at a time in question comments
function rightAnswerCheckBoxHandler(checkbox) {
    checkbox.addEventListener('click', function(event) {
        const checkedBoxes = document.querySelectorAll('.rightAnswerCheckBox:checked');       
        checkedBoxes.forEach(checkbox => {
            if (checkbox.id !== event.target.id) {
                checkbox.checked = false;
            }
        })        
    })
}

//builds and returns the divs for adding question comment data
function createAnswerInput() {
    const outerDiv = document.createElement('div');
    outerDiv.classList.add('form-group', 'extraQuestion');

    const answerInput = document.createElement('input');
    answerInput.setAttribute('type', 'text');
    answerInput.setAttribute('value', '');
    answerInput.setAttribute('autocomplete', 'off');
    answerInput.placeholder = 'Answer';
    answerInput.classList.add("form-control", "questionCommentInput");

    const innerDiv = document.createElement('div');
    innerDiv.classList.add("form-check", "mb-2");

    const rightAnswerCheckBox = document.createElement('input');
    rightAnswerCheckBox.classList.add("form-check-input", "rightAnswerCheckBox");
    rightAnswerCheckBox.type = "checkbox";
    
    //get the last id so we know what hte next id will be
    const rightAnswerCheckBoxes = document.querySelectorAll('.rightAnswerCheckBox');
    const lastId = rightAnswerCheckBoxes[rightAnswerCheckBoxes.length - 1].id;
    const nextId = parseInt(lastId.substring(lastId.lastIndexOf('-') + 1)) + 1;

    rightAnswerCheckBox.setAttribute('id', "checkBox-" + nextId); 
    rightAnswerCheckBoxHandler(rightAnswerCheckBox);

    const label = document.createElement("label");
    label.classList.add("form-check-label");
    label.setAttribute("for", "checkBox-" + nextId);
    label.innerHTML = "Correct Answer";

    const removeAnswerButton = document.createElement("button");
    removeAnswerButton.classList.add("btn", "btn-outline-secondary", "removeAnswerButton");
    removeAnswerButton.setAttribute("type", "button");

    removeAnswerButton.addEventListener('click', function(event) {
        event.target.closest(".extraQuestion").remove();
    })

    //add a class that will highlight the border of the answer that will be deleted by pressing the removeAnswerButton
    removeAnswerButton.addEventListener('mouseover', function(event) {
        event.target.closest(".extraQuestion").querySelector(".questionCommentInput").classList.add("answerToDelete");
    })

    removeAnswerButton.addEventListener('mouseout', function(event) {
        event.target.closest(".extraQuestion").querySelector(".questionCommentInput").classList.remove("answerToDelete");
    })

    removeAnswerButton.appendChild(document.createTextNode('Remove Answer'));  

    innerDiv.append(rightAnswerCheckBox);
    innerDiv.append(label);
    innerDiv.append(removeAnswerButton);

    outerDiv.append(answerInput);
    outerDiv.append(innerDiv);

    return outerDiv;
}

//returns the question comment question, answers, and right answer
function getQuestionCommentData() {
    const retVal = {
        questionData: {
            allAnswers: [], 
            correctAnswer: "",
            question: ""
        },
        questionState: "no question",
        errorMessage: ""
    };

    var question;
    var allAnswers = [];
    var correctAnswer;
    var emptyAnswers = 0;

    //if the user checked the box to ask a question
    if (document.getElementById("questionCheckBox").checked) {
        //assume there is invalid input until I know otherwise
        retVal.questionState = "invalid input";

        //grab the question text
        question = document.getElementById("commentQuestion").innerText.trim();
        
        //if there is some question text
        if (question.length > 0) {
            //get the users supplied answers
            const questionCommentInputs = document.querySelectorAll('.questionCommentInput');

            //collect the answers
            for(let i = 0; i < questionCommentInputs.length;i++) {
                const questionCommentInput = questionCommentInputs[i];
                const answerText = questionCommentInput.value.trim();

                //if there is some answer text, store it
                if (answerText.length > 0) {
                    allAnswers.push(answerText);
                } else { 
                    //count how many empty answers there are
                    emptyAnswers++;
                }
            }
            //if there are no empty answers
            if(emptyAnswers === 0) {
                //if there are enough filled answers
                if (allAnswers.length >= 2) {
                    const rightAnswerCheckBox = document.querySelector('.rightAnswerCheckBox:checked');
                    //if a correct answer was chosen
                    if (rightAnswerCheckBox) {
                        correctAnswer = rightAnswerCheckBox.closest('.form-group').querySelector('.questionCommentInput').value;
                        
                        //all the data is good, store it in the return object     
                        retVal.questionState = "valid question";
                        retVal.questionData.correctAnswer = correctAnswer;
                        retVal.questionData.question = question;
                        retVal.questionData.allAnswers = allAnswers;
                    } else { //must select one answer as correct
                        retVal.errorMessage = "One correct answer must be selected";
                    }
                } else { //can't have less than two answers
                    retVal.errorMessage = "At least two answers must be entered";
                }
            } else { //can't have an empty answer
                retVal.errorMessage = "An answer field cannot be empty";
            }
        } else { //can't have an empty question
            retVal.errorMessage = "Question field cannot be empty";
        }
    } //user did not choose to add a question  
    return retVal;
}

//reset the question comment input div
function resetQuestionCommentDiv() {
    document.querySelectorAll('.extraQuestion').forEach(question => {
        question.remove();
    })

    document.querySelectorAll('.questionCommentInput').forEach(input => {
        input.value = '';
    })

    const questionDiv = document.getElementById("commentQuestion");
    questionDiv.innerText = '';
    questionDiv.style.height = '100px';

    const rightAnswerCheckBox = document.querySelector('.rightAnswerCheckBox:checked');
    if (rightAnswerCheckBox) {
        rightAnswerCheckBox.checked = false;
    }

    const checkbox = document.getElementById('questionCheckBox');
    if (checkbox.checked) {
        checkbox.click();
    }
}

//add question comment data to a div
function addQuestionCommentToDiv(divToAddTo, commentObject, source) {
    if (commentObject.questionCommentData && commentObject.questionCommentData.allAnswers.length > 0) {
        const HR = document.createElement("HR");
        HR.classList.add("questionCommentHR");

        const questionAnswerDiv = document.createElement('div');
        questionAnswerDiv.classList.add("questionAnswerDiv");

        const questionNumberDiv = document.createElement('div');
        questionNumberDiv.innerHTML = " ";

        questionNumberDiv.classList.add('questionNumberDiv');

        const questionDiv = document.createElement('div');

        questionNumberDiv.appendChild(questionDiv);

        questionDiv.innerHTML = commentObject.questionCommentData.question;
        questionDiv.classList.add("questionDiv");

        divToAddTo.append(HR);
        divToAddTo.append(questionNumberDiv);
        divToAddTo.append(questionAnswerDiv);

        for (let i = 0; i < commentObject.questionCommentData.allAnswers.length; i++) {
            const outerDiv = document.createElement('div');
            outerDiv.classList.add('form-check');
        
            const input = document.createElement('input');
            input.classList.add('form-check-input');
            input.setAttribute('type', 'radio');    
            input.setAttribute('id', commentObject.id + '*' + source + '*' + i);

            input.addEventListener('click', function(event) {
                const parentDiv = event.target.closest('.questionAnswerDiv');
                parentDiv.querySelectorAll('.form-check-input:checked').forEach(input => {
                    if (event.target.id !== input.id) {
                        input.checked = false;
                    }
                })
            })
        
            const label = document.createElement('label');
            label.classList.add('form-check-label', 'commentQuestionAnswer');
            label.setAttribute('for', commentObject.id + '*' + source + '*' + i);
            label.innerHTML = commentObject.questionCommentData.allAnswers[i];
            
            const iconDiv = document.createElement('div')
            iconDiv.classList.add('iconDiv')
        
            outerDiv.append(input);
            outerDiv.append(label);
            outerDiv.append(iconDiv);
            questionAnswerDiv.append(outerDiv);
        }

        const checkAnswerButton = document.createElement('button');
        checkAnswerButton.classList.add("btn", "btn-dark", "checkAnswerButton");
        checkAnswerButton.appendChild(document.createTextNode('Check Answer'));  

        checkAnswerButton.setAttribute('id', commentObject.id + "*" + source + "*check");

        checkAnswerButton.addEventListener('click', function(event) {
            const parentDiv = event.target.parentNode;

            if (parentDiv.querySelector('.form-check-input:checked')) {
                const checkedAnswer = parentDiv.querySelector('.form-check-input:checked');
                const selectedAnswer = checkedAnswer.nextSibling.innerText;

                if (selectedAnswer === commentObject.questionCommentData.correctAnswer) {
                    checkedAnswer.parentNode.querySelector('.commentQuestionAnswer').classList.add('rightAnswer');
                    checkedAnswer.parentNode.querySelector('.iconDiv').classList.add('rightAnswerCheck');
                } else {
                    checkedAnswer.parentNode.querySelector('.commentQuestionAnswer').classList.add('wrongAnswer');
                    checkedAnswer.parentNode.querySelector('.iconDiv').classList.add('wrongAnswerX');

                    parentDiv.querySelectorAll('.commentQuestionAnswer').forEach(answer => {
                        if (answer.innerText === commentObject.questionCommentData.correctAnswer) {
                            answer.classList.add('rightAnswer');
                            answer.parentNode.querySelector('.iconDiv').classList.add('rightAnswerCheck');
                        }
                    });
                }

                parentDiv.querySelectorAll('.form-check-input').forEach(input => {
                    input.disabled = true;
                })
                checkAnswerButton.classList.add('hiddenQuestionButton');
                clearAnswerButton.classList.remove('hiddenQuestionButton');
                updateCommentQuestionsRunningCounts();
                synchronizeCheckAnswerButtonBetweenModes(event);
            }
        })

        const clearAnswerButton = document.createElement('button');
        clearAnswerButton.classList.add("btn", "btn-dark", "clearAnswerButton", "hiddenQuestionButton");
        clearAnswerButton.appendChild(document.createTextNode('Clear Answer'));  
        clearAnswerButton.setAttribute('id', commentObject.id + "*" + source + "*clear");

        clearAnswerButton.addEventListener('click', function(event) {

            const parentDiv = event.target.parentNode;

            parentDiv.querySelectorAll('.form-check-label').forEach(label => {
                label.classList.remove("rightAnswer", "wrongAnswer");

                const iconDiv = label.parentNode.querySelector('.iconDiv');
                iconDiv.classList.remove('wrongAnswerX', 'rightAnswerCheck');
                iconDiv.innerHTML = '';
            })

            parentDiv.querySelectorAll('.form-check-input').forEach(input => {
                input.disabled = false;
            })

            parentDiv.querySelector('.form-check-input:checked').checked = false;

            checkAnswerButton.classList.remove('hiddenQuestionButton');
            clearAnswerButton.classList.add('hiddenQuestionButton');

            updateCommentQuestionsRunningCounts();
            synchronizeClearAnswerButtonBetweenModes(event);
        })

        divToAddTo.append(checkAnswerButton);
        divToAddTo.append(clearAnswerButton);
    }
}

//update the numbers that display after selecting an answer in a question comment
function updateCommentQuestionsRunningCounts() {
    const attempts = document.querySelectorAll('.codeView .clearAnswerButton:not(.hiddenQuestionButton)').length;
    const rightAnswers = document.querySelectorAll('.codeView .rightAnswer').length - document.querySelectorAll('.codeView .wrongAnswer').length;

    document.querySelectorAll('.rightAnswerCheck').forEach(answer => {
        answer.innerHTML = rightAnswers +'/'+attempts;
    })
}

//on press of checkAnswerButton in either mode (blog or code), ensure the same question is in the same state in the other mode 
function synchronizeCheckAnswerButtonBetweenModes(event) {
    const selectedAnswerId  = event.target.parentNode.querySelector('.form-check-input:checked').id;

    const idParts = selectedAnswerId.split('*');
    const modeToChangeTo = idParts[1] === "blog" ? "commentView" : "blog"; 

    const newId = selectedAnswerId.replace(idParts[1], modeToChangeTo);

    const optionInOtherMode = document.getElementById(newId);

    const newButtonId = idParts[0] + "*" + modeToChangeTo + "*check";
    const checkButtonInOtherMode = document.getElementById(newButtonId);

    if (!checkButtonInOtherMode.classList.contains("hiddenQuestionButton")) {
        optionInOtherMode.click();
        checkButtonInOtherMode.click();
    }
}

//on press of clearAnswerButton in either mode (blog or code), ensure the same question is in the same state in the other mode 
function synchronizeClearAnswerButtonBetweenModes(event) {
    const buttonId = event.target.id;
    const idParts = buttonId.split('*');
    const modeToChangeTo = idParts[1] === "blog" ? "commentView" : "blog"; 

    const newButtonId = idParts[0] + "*" + modeToChangeTo + "*clear";
    const clearButtonInOtherMode = document.getElementById(newButtonId);

    if (!clearButtonInOtherMode.classList.contains("hiddenQuestionButton")) {
        clearButtonInOtherMode.click();
    }
}

//when a comment is added or edited, displayAllComments is called to rebuild codeView, resetting all comments and questions back to their default states. 
//blogMode will only add or edit the one comment so any previously answered questions will stay in their answered state.
//this function resets all of those questions back to their default state to match codeView
function resetAllBlogModeQuestionComments() {
    [...document.querySelectorAll('.blogView .clearAnswerButton:not(.hiddenQuestionButton)')].forEach(clearButton => {
        clearButton.click();
    })
}

//update the question numbers in question comments in both modes (code and blog)
function updateQuestionCommentCounts() {
    const allQuestionsCode = document.querySelectorAll('.codeView .questionNumberDiv');
    const allQuestionsBlog = document.querySelectorAll('.blogView .questionNumberDiv');

    for (let i = 0; i < allQuestionsCode.length; i++) {        
        allQuestionsCode[i].childNodes[0].nodeValue = i + 1 + '.';
        allQuestionsBlog[i].childNodes[0].nodeValue = i + 1 + '.';
    }
}

//Removes any selected text in the page.
function removeSelectedTextFromPage() {
    if (window.getSelection) {
        if (window.getSelection().empty) {  // Chrome
            window.getSelection().empty();
        } else if (window.getSelection().removeAllRanges) {  // Firefox
            window.getSelection().removeAllRanges();
        }
    }
}