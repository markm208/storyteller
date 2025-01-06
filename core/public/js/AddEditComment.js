class AddEditComment extends HTMLElement {
  constructor(playbackEngine, editedComment) {
    super();

    this.playbackEngine = playbackEngine;
    //when used for updating a comment (not a brand new comment)
    this.editedComment = editedComment;
    //hold the number of lines in the file getting a new/edited comment
    this.numLinesInFile = 0;
    //hold the file path of a new tts audio file
    this.ttsFilePath = null;

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

        #aiCommentSuggestionInput {
          margin: 5px;
          width: calc(100% - 32px);
        }

        .ttsButton {
          font-size: 1rem;
          padding: 2px 8px;
          margin: 0px;
          background-color: inherit;
          color: lightgray;
          border: 1px solid grey;
          flex-shrink: 1;
          cursor: pointer;
          opacity: 80%;
        }
        .ttsButton:hover {
          opacity: 100%;
        }
      </style>
      <div id="addEditContainer">
        <input type="text" id="commentTitle" placeholder="Comment Title (Optional)"></input>
        <div id="commentTextContainer"></div>
        <div id="aiCommentSuggestionInput"></div>
        <st-show-hide-component name="Add Secondary Highlights" show="true">
          <div id="surroundingText" slot="child"></div>
        </st-show-hide-component>
        <st-show-hide-component name="Media" show="true">
          <div id="imagesVMC" class="mediaContainer" slot="child"></div>
          <div id="videosVMC" class="mediaContainer" slot="child"></div>
          <div id="audiosVMC" class="mediaContainer" slot="child"></div>
        </st-show-hide-component>
        <st-show-hide-component name="Audio Transcription">            
          <button id="genTTS" class="ttsButton" title="Generate AI Text-To-Speech Transcription" slot="child">Generate with AI</button>
          <button id="uploadTts" class="ttsButton" title="Upload Audio File Transcription (mp3)" slot="child">Upload</button>
          <button id="clearTts" class="ttsButton" title="Clear the Text-To-Speech Transcription" slot="child">Clear</button>
          <div id="audioTranscriptionPreview" slot="child"></div>
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

    this.shadowRoot.addEventListener('ai-prompt-response', async (event) => {
      //get formatted prompt with code
      const prompt = event.detail.prompt;
      const response = event.detail.response;
      
      //add the AI response to the comment text
      const commentText = this.shadowRoot.querySelector('#commentText');
      commentText.changeTextFormat("html");
      commentText.updateText(response);
      //set the focus and move the cursor to the end of the text
      commentText.focus();
      let range = document.createRange();
      range.selectNodeContents(commentText);
      range.collapse(false);
      let sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    
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
    const commentText = new MultiLineTextInput('Describe the code at this point', '', 200, this.editedComment ? this.editedComment.textFormat : "markdown");
    commentText.setAttribute('id', 'commentText');
    commentText.setFocus();
    commentTextContainer.appendChild(commentText);

    //create an AI input to get suggestions
    const aiCommentSuggestionInput = this.shadowRoot.querySelector('#aiCommentSuggestionInput');
    const collapsable = new Collapsable('Get an AI Comment Suggestion');
    const aiPromptInput = new AIPromptInput(this.playbackEngine, true);
    collapsable.addContent(aiPromptInput);
    aiCommentSuggestionInput.appendChild(collapsable);
    
    //tts controls
    const genTTSButton = this.shadowRoot.getElementById('genTTS');
    const uploadTTSButton = this.shadowRoot.getElementById('uploadTts');
    const clearTts = this.shadowRoot.getElementById('clearTts');
    genTTSButton.addEventListener('click', this.handleGenTTSClick);
    uploadTTSButton.addEventListener('click', this.handleUploadTtsClick);
    clearTts.addEventListener('click', this.clearTtsClick);

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
    this.shadowRoot.addEventListener('keydown', this.stopProp);
  }

  disconnectedCallback() {
    this.shadowRoot.removeEventListener('keydown', this.stopProp);
    
    const genTTSButton = this.shadowRoot.getElementById('genTTS');
    const uploadTTSButton = this.shadowRoot.getElementById('uploadTts');
    const clearTts = this.shadowRoot.getElementById('clearTts');

    genTTSButton.removeEventListener('click', this.handleGenTTSClick);
    uploadTTSButton.removeEventListener('click', this.handleUploadTtsClick);
    clearTts.removeEventListener('click', this.clearTtsClick);

    this.deleteTempTts();
  }

  handleGenTTSClick = async () => {
    const audioTranscriptionPreview = this.shadowRoot.querySelector('#audioTranscriptionPreview');

    //get the text from the comment
    const commentText = this.shadowRoot.querySelector('#commentText');
    const text = commentText.getText();

    if(text.length > 0) {
      audioTranscriptionPreview.innerHTML = 'Generating an AI Preview...';
      
      //convert the text to speech
      const serverProxy = new ServerProxy();
      const data = await serverProxy.sendTextToSpeechRequest(text);
      
      //verify the conversion happened
      if(data.error) {
        audioTranscriptionPreview.innerHTML = 'There was an error converting the text to speech: ' + data.error;
      } else { //text was converted to speech
        //upload the tts audio file to the server
        this.ttsFilePath = await this.addTTSAudioFile(data.response);
        //create the audio control
        const ttsControl = new TextToSpeechControl(this.ttsFilePath, null, this.playbackEngine.editorProperties.ttsSpeed);
        audioTranscriptionPreview.innerHTML = 'AI Preview:';
        audioTranscriptionPreview.appendChild(ttsControl);
      }
    } else { //no text to convert
      audioTranscriptionPreview.innerHTML = "Please enter some comment text to generate an AI transcription.";
    }
  }

  handleUploadTtsClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/mp3';

    input.onchange = async (event) => {
      const file = event.target.files[0];
      if (file) {
        this.ttsFilePath = await this.addTTSAudioFile(file);

        //display a preview of the uploaded file
        const audioTranscriptionPreview = this.shadowRoot.querySelector('#audioTranscriptionPreview');  
        const ttsControl = new TextToSpeechControl(this.ttsFilePath, null, this.playbackEngine.editorProperties.ttsSpeed);
        audioTranscriptionPreview.innerHTML = 'File Upload Preview:';
        audioTranscriptionPreview.appendChild(ttsControl);
      }
    };

    input.click();
  }

  clearTtsClick = async () => {
    //clear out any tts audio preview
    const audioTranscriptionPreview = this.shadowRoot.querySelector('#audioTranscriptionPreview');
    audioTranscriptionPreview.innerHTML = '';

    const serverProxy = new ServerProxy();
    if(this.ttsFilePath) {
      await serverProxy.deleteAudioOnServer(this.ttsFilePath);
      this.ttsFilePath = null;
    } else if(this.editedComment && this.editedComment.ttsFilePath) {
      await serverProxy.deleteAudioOnServer(this.editedComment.ttsFilePath);
      this.editedComment.ttsFilePath = null;
    }
  }
  
  addTTSAudioFile = async (binFileData) => {
    await this.deleteTempTts();

    //upload the tts audio file to the server
    const newFile = new File([binFileData], 'tts-comment.mp3', { type: "audio/mpeg" });
    const serverProxy = new ServerProxy();
    const response = await serverProxy.addAudioOnServer([newFile]);
    
    //get the new file path from the server and set it as the audio source
    return response[0];
  }

  deleteTempTts = async () => {
    if(this.ttsFilePath) {
      const serverProxy = new ServerProxy();
      await serverProxy.deleteAudioOnServer(this.ttsFilePath);
      this.ttsFilePath = null;
    }
  }

  stopProp(event) {
    event.stopPropagation();
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
    const qAndA = new CreateMultipleChoiceQuestion(this.playbackEngine, null);
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
    commentText.updateText(this.editedComment.commentText);
    //set the comment title
    const commentTitle = this.shadowRoot.querySelector('#commentTitle');
    commentTitle.setAttribute('value', this.editedComment.commentTitle ? this.editedComment.commentTitle : '');

    //add the tts audio file if there is one
    if (this.editedComment.ttsFilePath) {
      const audioTranscriptionPreview = this.shadowRoot.querySelector('#audioTranscriptionPreview');
      const ttsControl = new TextToSpeechControl(this.editedComment.ttsFilePath, null, this.playbackEngine.editorProperties.ttsSpeed);
      audioTranscriptionPreview.innerHTML = 'Text to Speech Preview:';
      audioTranscriptionPreview.appendChild(ttsControl);
    }

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
    const qAndA = new CreateMultipleChoiceQuestion(this.playbackEngine, this.editedComment.questionCommentData);

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

    //clear out any tts audio file
    this.deleteTempTts(); 

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

  sendEventAddEditComment = async (event) => {
    //attempt to get comment data
    const commentData = await this.buildCommentObjectFromUI();

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
    const event = new CustomEvent('delete-comment', {
      detail: {
        comment: this.editedComment
      },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  async buildCommentObjectFromUI() {
    //status of the validation
    const retVal = {
      status: 'bad comment',
      comment: null,
      errorMessage: ''
    };

    //comment text
    const commentText = this.shadowRoot.querySelector('#commentText');
    const commentTextString = commentText.getText();
    let textFormat = commentText.getTextFormat();
    
    //comment title
    const commentTitle = this.shadowRoot.querySelector('#commentTitle');
    
    //tts audio file
    let ttsFilePath = null;
    //if there is a new tts file
    if(this.ttsFilePath) {
      //store the path
      ttsFilePath = this.ttsFilePath;
      //clear out the temp tts file
      this.ttsFilePath = null;
    } else if(this.editedComment && this.editedComment.ttsFilePath) { //existing tts file
      ttsFilePath = this.editedComment.ttsFilePath;
    } //else- no tts file, default to null

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
    if (commentTitle.value.trim() !== '' || commentTextString !== '') {
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
        displayCommentEventId: this.editedComment ? this.editedComment.displayCommentEventId : mostRecentEvent.id,
        displayCommentEventSequenceNumber: this.editedComment ? this.editedComment.displayCommentEventSequenceNumber : mostRecentEvent.eventSequenceNumber,
        position: this.editedComment ? this.editedComment.position : 0,

        developerGroupId: this.editedComment ? this.editedComment.developerGroupId : null,
        timestamp: this.editedComment ? this.editedComment.timestamp : new Date().getTime(),
        commentText: commentTextString,
        textFormat: textFormat,
        commentTitle: commentTitle.value,
        ttsFilePath: ttsFilePath,
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
      if (commentTitle.value.trim() === '' || commentTextString === '') {
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