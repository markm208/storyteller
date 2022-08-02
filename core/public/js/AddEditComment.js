class AddEditComment extends HTMLElement {
  constructor(playbackEngine, editedComment) {
    super();

    this.playbackEngine = playbackEngine;
    //when used for updating a comment (not a brand new comment)
    this.editedComment = editedComment;
    //hold the number of lines in the file getting a new/edited comment
    this.numLinesInFile = 0;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        #commentTextContainer {
          margin: 2px 5px;
        }

        #commentTitle {
          background-color: inherit;
          color: lightgrey;
          outline: 0px solid transparent;
          border: 1px solid grey;
          padding: 5px 10px;
          margin: 5px;
          width: calc(100% - 32px);
        }

        #commentTitle::placeholder {
          color: lightgray;
          background-color: transparent;
          font-style: italic;
        }
        #controlButtons {
          display: flex;
          justify-content: space-between;
          padding: 0px 10px 25px 10px;
        }
        .controlButton {
          color: white;
          padding: 8px 10px;
          border: none;
          cursor: pointer;
          border-radius: .25rem;
          font-size: 1.20rem;
          opacity: .8;
        }
        .controlButton:hover {
          opacity: 1;
        }
        #cancelButton {
          background-color: red;
          margin-left: 5px;
        }
        #submitButton {
          background-color: #3B4C62;
          width: 100%;
        }

        .inactive {
          display: none;
        }

        #errorMessages {
          padding: 12px;
          color: red;
        }

        #surroundingText {
          display: flex;
          justify-content: space-around;
          flex-direction: column;
          padding: 5px 0px;
        }

        #addEditContainer {
          height: 100%;
          overflow-y: auto;
          word-wrap: break-word;
          scrollbar-width: thin;
        }
        #addEditContainer::-webkit-scrollbar {
          width: .65em;
          background-color: inherit;
        }
        #addEditContainer::-webkit-scrollbar-thumb {
          background: dimgray;
        }
        #deleteCommentButton {
          background-color: red;
          color: white;
          padding: 4px 6px;
          border: none;
          cursor: pointer;
          border-radius: .25rem;
          font-size: .8rem;
          opacity: 80%;
        }
        #deleteCommentButton:hover {
          opacity: 100%;
        }

      </style>
      <div id="addEditContainer">
        <input type="text" id="commentTitle" placeholder="Comment Title (Optional)"></input>
        <div id="commentTextContainer"></div>
        <div id="surroundingText"></div>
        <hr/>
        <st-show-hide-component name="Media" show="true">
          <div id="imagesVMC" class="mediaContainer" slot="child"></div>
          <div id="videosVMC" class="mediaContainer" slot="child"></div>
          <div id="audiosVMC" class="mediaContainer" slot="child"></div>
        </st-show-hide-component>
        <st-show-hide-component name="Multiple Choice Question">            
          <div id="questionAnswerContainer" slot="child"></div>
        </st-show-hide-component>
        <st-show-hide-component name="Tags">
          <div id="tagContainer" slot="child"></div>
        </st-show-hide-component>
        <st-show-hide-component id="deleteHideShow" name="Delete this Comment" class="inactive">
          <div id="deleteCommentButtonDiv" slot="child" class="inactive">
            <hr/>
            <span>Delete this comment (this can't be undone)</span>
            <button id="deleteCommentButton">Delete</button>
          </div>
        </st-show-hide-component>
        <div id="errorMessages"></div>
        <div id="controlButtons">
          <button id="submitButton" class="controlButton"></button>
          <button id="cancelButton" class="controlButton">Cancel</button>
        </div>
      </div>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    //add the lines above/below controls
    const surroundingText = this.shadowRoot.querySelector('#surroundingText');
    const linesAbove = new SurroundingLinesSelector(-90, 'Above', this.numLinesInFile);
    linesAbove.setAttribute('id', 'linesAboveSelector');

    const linesBelow = new SurroundingLinesSelector(90, 'Below', this.numLinesInFile);
    linesBelow.setAttribute('id', 'linesBelowSelector');
    surroundingText.appendChild(linesAbove);
    surroundingText.appendChild(linesBelow);

    //listen for changes in the lines above/below
    this.shadowRoot.addEventListener('surrounding-lines-change', event => {
      this.sendEventNotifyLinesAboveBelowChange();
      event.stopPropagation();
    });

    //delete comment button
    const deleteCommentButton = this.shadowRoot.querySelector('#deleteCommentButton');
    deleteCommentButton.addEventListener('click', this.sendEventDeleteComment);

    //main comment buttons
    const cancelButton = this.shadowRoot.querySelector('#cancelButton');
    cancelButton.addEventListener('click', this.sendEventCancelAddEditComment);

    const submitButton = this.shadowRoot.querySelector('#submitButton');
    submitButton.innerHTML = 'Add Comment';
    submitButton.addEventListener('click', this.sendEventAddEditComment);

    //update the placeholder text on focus and blur
    const commentTextContainer = this.shadowRoot.querySelector('#commentTextContainer');
    const commentText = new MultiLineTextInput('Describe the code at this point', '', 200);
    commentText.setAttribute('id', 'commentText');
    commentTextContainer.appendChild(commentText);

    //if there is a comment associated with this component then fill the inputs with data from it
    if (this.editedComment) {
      this.updateEditCommentMode();
    } else { //no comment, fill with empty default values
      //init this component to be a new comment
      this.updateAddCommentMode();
    }

    this.shadowRoot.addEventListener('pause-all-vertical-media-containers', event => {
      //get all of the vertical media constainers and pause them
      const mediaContainers = this.shadowRoot.querySelectorAll('st-vertical-media-container');
      mediaContainers.forEach(mediaContainer => mediaContainer.pauseMedia());
    });

    //prevent normal text editing from firing any keyboard shortcuts
    this.shadowRoot.addEventListener('keydown', event => {
      event.stopPropagation();
    });
  }

  disconnectedCallback() {
  }

  sendEventNotifyLinesAboveBelowChange = () => {
    //get the elements that have the requested lines above/below
    const linesAboveSelector = this.shadowRoot.querySelector('#linesAboveSelector');
    const linesBelowSelector = this.shadowRoot.querySelector('#linesBelowSelector');

    //generate and send an event with the above/below values
    const customEvent = new CustomEvent('lines-above-below-change', {
      detail: {
        linesAbove: linesAboveSelector.getValue(),
        linesBelow: linesBelowSelector.getValue()
      },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(customEvent);
  }

  updateForFileSelected() {
    //get the number of lines in the file (may be 0 if there is not an active file)
    this.numLinesInFile = this.playbackEngine.editorState.getNumLinesInFile(this.playbackEngine.activeFileId);

    //update the max values for the inputs
    const linesAboveSelector = this.shadowRoot.querySelector('#linesAboveSelector');
    linesAboveSelector.setMax(this.numLinesInFile);
    const linesBelowSelector = this.shadowRoot.querySelector('#linesBelowSelector');
    linesBelowSelector.setMax(this.numLinesInFile);
  }

  updateAddCommentMode() {
    const imagesVMC = this.shadowRoot.querySelector('#imagesVMC');
    const images = new VerticalMediaContainer([], 'image');
    imagesVMC.appendChild(images);

    const videosVMC = this.shadowRoot.querySelector('#videosVMC');
    const videos = new VerticalMediaContainer([], 'video');
    videosVMC.appendChild(videos);

    const audiosVMC = this.shadowRoot.querySelector('#audiosVMC');
    const audios = new VerticalMediaContainer([], 'audio');
    audiosVMC.appendChild(audios);

    //add an empty Q&A component
    const questionAnswerContainer = this.shadowRoot.querySelector('#questionAnswerContainer');
    const qAndA = new CreateMultipleChoiceQuestion(null);
    questionAnswerContainer.appendChild(qAndA);

    //empty tags
    const tagContainer = this.shadowRoot.querySelector('#tagContainer');
    const tags = new CommentTags([], this.playbackEngine);
    tagContainer.appendChild(tags);

    //set the lines above/below to 0
    const linesAboveSelector = this.shadowRoot.querySelector('#linesAboveSelector');
    linesAboveSelector.setValue(0);
    const linesBelowSelector = this.shadowRoot.querySelector('#linesBelowSelector');
    linesBelowSelector.setValue(0);

    //update the max lines above/below from an active file
    this.updateForFileSelected();

    //set the text and event handler for the submit button
    const submitButton = this.shadowRoot.querySelector('#submitButton');
    submitButton.innerHTML = 'Add Comment';
  }

  updateEditCommentMode() {
    //set the main comment text
    const commentText = this.shadowRoot.querySelector('#commentText');
    commentText.updateFormattedText(this.editedComment.commentText);
    //set the comment title
    const commentTitle = this.shadowRoot.querySelector('#commentTitle');
    commentTitle.setAttribute('value', this.editedComment.commentTitle ? this.editedComment.commentTitle : '');

    const imagesVMC = this.shadowRoot.querySelector('#imagesVMC');
    const images = new VerticalMediaContainer(this.editedComment.imageURLs, 'image');
    imagesVMC.appendChild(images);

    const videosVMC = this.shadowRoot.querySelector('#videosVMC');
    const videos = new VerticalMediaContainer(this.editedComment.videoURLs, 'video');
    videosVMC.appendChild(videos);

    const audiosVMC = this.shadowRoot.querySelector('#audiosVMC');
    const audios = new VerticalMediaContainer(this.editedComment.audioURLs, 'audio');
    audiosVMC.appendChild(audios);

    //add a Q&A component for an existing question
    const questionAnswerContainer = this.shadowRoot.querySelector('#questionAnswerContainer');
    const qAndA = new CreateMultipleChoiceQuestion(this.editedComment.questionCommentData);

    if (this.editedComment.questionCommentData && this.editedComment.questionCommentData.question.length > 0){
      const showHideComponent = this.shadowRoot.querySelector('[name="Multiple Choice Question"]');
      showHideComponent.setAttribute('show', 'true');
    }

    questionAnswerContainer.appendChild(qAndA);

    //if there are any tags in this comment
    if (this.editedComment.commentTags.length > 0) {
      //expand the show/hide
      const tagsShowHide = this.shadowRoot.querySelector('[name="Tags"]');
      tagsShowHide.setAttribute('show', 'true');
    }
    const tagContainer = this.shadowRoot.querySelector('#tagContainer');
    const tags = new CommentTags(this.editedComment.commentTags, this.playbackEngine);
    tagContainer.innerHTML = '';
    tagContainer.appendChild(tags);


    //set the lines above/below to what they are in the comment
    const linesAboveSelector = this.shadowRoot.querySelector('#linesAboveSelector');
    linesAboveSelector.setValue(this.editedComment.linesAbove);
    const linesBelowSelector = this.shadowRoot.querySelector('#linesBelowSelector');
    linesBelowSelector.setValue(this.editedComment.linesBelow);
    //update the max lines above/below from an active file
    this.updateForFileSelected();

    //add a delete button to all but the first comment
    const allComments = this.playbackEngine.commentInfo.flattenedComments;
    const firstComment = allComments[0];
    if (this.editedComment.id !== firstComment.id) {
      //show the delete comment button
      const deleteCommentButtonDiv = this.shadowRoot.querySelector('#deleteCommentButtonDiv');
      deleteCommentButtonDiv.classList.remove('inactive');

      const deleteHideShow = this.shadowRoot.querySelector('#deleteHideShow');
      deleteHideShow.classList.remove('inactive');
    }

    //set the text and event handler for the submit button
    const submitButton = this.shadowRoot.querySelector('#submitButton');
    submitButton.innerHTML = 'Edit Comment';
  }

  sendEventCancelAddEditComment = () => {
    //clear out a previously edited comment (if there is one)
    this.editedComment = null;

    //hide the delete comment button
    const deleteCommentButtonDiv = this.shadowRoot.querySelector('#deleteCommentButtonDiv');
    deleteCommentButtonDiv.classList.add('inactive');

    //generate and send an event upward to indicate adding/editing is complete
    const customEvent = new CustomEvent('cancel-add-edit-comment', {
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(customEvent);
  }

  sendEventAddEditComment = (event) => {
    //attempt to get comment data
    const commentData = this.buildCommentObjectFromUI();

    //if it is not a valid comment
    if (commentData.status !== 'ok') {
      //display some error messages
      const errorMessages = this.shadowRoot.querySelector('#errorMessages');
      errorMessages.innerHTML = commentData.errorMessage;
    } else { //this is a valid comment
      //go through all of the media containers and commit any changes made to the media associated with the comment
      const allVMCs = this.shadowRoot.querySelectorAll('st-vertical-media-container');
      allVMCs.forEach(aVMC => {
        aVMC.commitChanges();
      });

      let eventType = '';
      //use the button text to determine what type of event to send
      if (event.target.innerHTML === 'Add Comment') {
        eventType = 'add-comment';
      } else {
        eventType = 'edit-comment';
      }

      //generate and send an event upward to indicate a new/edit comment has been added
      const customEvent = new CustomEvent(eventType, {
        detail: {
          comment: commentData.comment
        },
        bubbles: true,
        composed: true
      });
      this.dispatchEvent(customEvent);
    }
  }

  sendEventDeleteComment = () => {
    //go through all of the media containers and delete the media associated with the comment
    const allVMCs = this.shadowRoot.querySelectorAll('st-vertical-media-container');
    allVMCs.forEach(aVMC => {
      aVMC.deleteAll();
    });

    const event = new CustomEvent('delete-comment', {
      detail: {
        comment: this.editedComment
      },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  buildCommentObjectFromUI() {
    //status of the validation
    const retVal = {
      status: 'bad comment',
      comment: null,
      errorMessage: ''
    };

    //comment text
    const commentText = this.shadowRoot.querySelector('#commentText');
    
    //comment title
    const commentTitle = this.shadowRoot.querySelector('#commentTitle');
    
    //comment question
    const createMultipleChoiceQuestion = this.shadowRoot.querySelector('st-create-multiple-choice-question');
    const qAndA = createMultipleChoiceQuestion.getMultipleChoiceQuestionData();
    
    //media
    const imagesVMC = this.shadowRoot.querySelector('#imagesVMC').children[0];
    const videosVMC = this.shadowRoot.querySelector('#videosVMC').children[0];
    const audiosVMC = this.shadowRoot.querySelector('#audiosVMC').children[0];
    const imageURLs = imagesVMC.getURLsInOrder();
    const videoURLs = videosVMC.getURLsInOrder();
    const audioURLs = audiosVMC.getURLsInOrder();
    
    //tags
    const commentTags = this.shadowRoot.querySelector('st-comment-tags');
    //get all of the tags specified by the user
    const allTagsSet = new Set(commentTags.getAllTags());
    //handle automatic tagging of media and questions
    if(imageURLs.length === 0) {
      allTagsSet.delete('image');
    } else { //there is at least one image
      allTagsSet.add('image');
    }
    if(videoURLs.length === 0) {
      allTagsSet.delete('video');
    } else { //there is at least one video
      allTagsSet.add('video');
    }
    if(audioURLs.length === 0) {
      allTagsSet.delete('audio');
    } else { //there is at least one audio
      allTagsSet.add('audio');
    }
    if (qAndA.questionState === 'valid question') {
      allTagsSet.add('question');
    } else {
      allTagsSet.delete('question');
    }

    //if there is a comment title or some comment text 
    if (commentTitle.value.trim() !== '' || commentText.getFormattedText() !== '') {
      //if the question is ok, then this is a good comment
      if (qAndA.questionState === 'valid question' || qAndA.questionState === 'no question') {
        retVal.status = 'ok';
      }
    } else { //there is no comment title or comment text
      //if there is some media
      if (imageURLs.length > 0 || videoURLs.length > 0 || audioURLs.length > 0) {
        //if the question is ok, then this is a good comment
        if (qAndA.questionState === 'valid question' || qAndA.questionState === 'no question') {
          retVal.status = 'ok';
        }
      } else if (qAndA.questionState === 'valid question') { //no text, no media, but there is a valid question
        retVal.status = 'ok';
      }
    }
    //if its a valid comment
    if (retVal.status === 'ok') {
      const mostRecentEvent = this.playbackEngine.getMostRecentEvent();
      const activeFilePath = this.playbackEngine.getActiveFilePath();

      const comment = {
        id: this.editedComment ? this.editedComment.id : null,
        displayCommentEvent: this.editedComment ? this.editedComment.displayCommentEvent : mostRecentEvent,
        developerGroupId: this.editedComment ? this.editedComment.developerGroupId : null,
        timestamp: this.editedComment ? this.editedComment.timestamp : new Date().getTime(),
        commentText: commentText.getFormattedText(),
        commentTitle: commentTitle.value,
        selectedCodeBlocks: [], //this will be set in CodeView
        viewableBlogText: '', //this will be set in CodeView
        imageURLs: imageURLs,
        videoURLs: videoURLs,
        audioURLs: audioURLs,
        linesAbove: 0, //this will be set in CodeView
        linesBelow: 0, //this will be set in CodeView
        currentFilePath: this.editedComment ? this.editedComment.currentFilePath : activeFilePath,
        commentTags: [...allTagsSet], //all distinct tags with automatically added tags
        questionCommentData: qAndA.questionState === 'valid question' ? qAndA.questionData : null
      };
      //store the comment
      retVal.comment = comment;
    } else { //there's something wrong with this comment
      //add an error message
      if (commentTitle.value.trim() === '' || commentText.getFormattedText() === '') {
        retVal.errorMessage = 'A comment must have some text describing it or some media associated with it. ';
      }
      //error with question
      if (qAndA.questionState !== 'valid question' && qAndA.questionState !== 'no question') {
        retVal.errorMessage += qAndA.errorMessage;
      }
    }
    return retVal;
  }
}

window.customElements.define('st-add-edit-comment', AddEditComment);