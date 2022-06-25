class AddEditComment extends HTMLElement {
  constructor(playbackEngine) {
    super();

    this.playbackEngine = playbackEngine;
    //when used for updating a comment (not a brand new comment)
    this.editedComment = null;
    //hold the number of lines in the file getting a new/edited comment
    this.numLinesInFile = 0;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
      .commentTitle, .commentText {
          min-height: 200px;
          color: lightgrey;
          outline: 0px solid transparent;
          border: 1px solid grey;
          padding: 5px 10px;
          margin: 5px;
          overflow: auto;
          resize: vertical;
        }
        .commentTitle {
          min-height: 1rem;
          resize: none;
        }
        .promptVisible {
          font-style: italic;
          color: grey;
        }
        .controlButton {
          color: white;
          padding: 8px 10px;
          border: none;
          cursor: pointer;
          border-radius: .25rem;
          font-size: 1.20rem;
        }
        #cancelButton {
          background-color: red;
          margin-left: 5px;
        }
        #submitButton {
          background-color: black;
        }
        .editorControls {
          padding: 0px;
          margin: 5px;  
        }
        .editorControl {
          font-size: 1.08rem;
          padding: 5px 5px;
          margin: 0px;
          background-color: grey;
          color: white;
          border: 1px solid lightgrey;
        }
        code {
          font-size: 1.2rem;
          font-family: Courier;
        }
      </style>
      <div class="commentTitle promptVisible"
           contenteditable="true" 
           data-placeholder="Comment Title (Optional)">
      </div>
      <div class="commentText"
           contenteditable="true" 
           data-placeholder="Describe the code at this point">
      </div>
      <div class="editorControls"></div>
      <div>
        Included lines above selected code
        <input type="number" id="linesAboveSelector" value="0" min="0"/>
      </div>
      <div>
        Included lines below selected code
        <input type="number" id="linesBelowSelector" value="0" min="0"/>
      </div>
      <button id="cancelButton" class="controlButton">Cancel</button>
      <button id="submitButton" class="controlButton"></button>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    //add the comment formatting buttons
    this.buildFormattingButtons();

    //add the lines above/below controls
    const linesAboveSelector = this.shadowRoot.querySelector('#linesAboveSelector');
    const linesBelowSelector = this.shadowRoot.querySelector('#linesBelowSelector');
    //event handler to notify the code view of the change
    linesAboveSelector.addEventListener('change', this.sendEventNotifyLinesAboveBelowChange);
    linesBelowSelector.addEventListener('change', this.sendEventNotifyLinesAboveBelowChange);

    //main comment buttons
    const cancelButton = this.shadowRoot.querySelector('#cancelButton');
    cancelButton.addEventListener('click', this.sendEventCancelAddEditComment);

    const submitButton = this.shadowRoot.querySelector('#submitButton');
    submitButton.innerHTML = 'Add Comment';
    submitButton.addEventListener('click', this.sendEventAddEditComment);
    
    //update the placeholder text on focus and blur
    const commentText = this.shadowRoot.querySelector('.commentText');
    const commentTextPlaceholder = commentText.getAttribute('data-placeholder');
    commentText.addEventListener('focus', event => {
      const value = commentText.textContent;
      if(value === commentTextPlaceholder) {
        commentText.innerHTML = '';
        commentText.classList.remove('promptVisible');
      }
    });
    commentText.addEventListener('blur', event => {
      const value = commentText.textContent;
      if(value === '') {
        commentText.innerHTML = commentTextPlaceholder;
        commentText.classList.add('promptVisible');
      }
    });

    //set the placeholder text for the main comment text
    const commentTitle = this.shadowRoot.querySelector('.commentTitle');
    commentTitle.appendChild(new RevealTextInput('Add Comment Title', 'Enter in a comment title (optional)', 'Add', 'add-edit-comment-title'));

    //init this component to be a new comment
    this.updateAddCommentMode();
    
    //prevent normal text editing from firing any keyboard shortcuts
    this.addEventListener('keydown', event => {
      event.stopPropagation();
    });
  }

  disconnectedCallback() {
  }

  buildFormattingButtons() {
    //create the formatting buttons
    const boldButton = document.createElement('button');
    boldButton.setAttribute('id', 'boldButton');
    boldButton.classList.add('editorControl');
    boldButton.innerHTML = '<strong>B</strong>';
    boldButton.addEventListener('click', event => {
      this.wrapSelectedText('strong');
    });

    const italicButton = document.createElement('button');
    italicButton.setAttribute('id', 'italicButton');
    italicButton.classList.add('editorControl');
    italicButton.innerHTML = '<em>I</em>';
    italicButton.addEventListener('click', event => {
      this.wrapSelectedText('em');
    });

    const codeButton = document.createElement('button');
    codeButton.setAttribute('id', 'codeButton');
    codeButton.classList.add('editorControl');
    codeButton.innerHTML = '&lt;code/&gt;';
    codeButton.addEventListener('click', event => {
      this.wrapSelectedText('code');
    });

    const addLink = document.createElement('span');
    addLink.setAttribute('id', 'addLink');
    addLink.classList.add('editorControl');
    addLink.appendChild(new RevealTextInput('link', 'enter a link', 'add', 'add-link'));
    this.addEventListener('add-link', event => {
      this.wrapSelectedText('a', [['href', event.detail.textInput], ['target', '_blank']]);
      event.stopPropagation();
    });

    const mediaButton = document.createElement('button');
    mediaButton.setAttribute('id', 'mediaButton');
    mediaButton.classList.add('editorControl');
    mediaButton.innerHTML = 'media';
    mediaButton.addEventListener('click', event => {
      console.log('Handle media here');
    });

    //add the buttons to the editorControls div
    const editorControls = this.shadowRoot.querySelector('.editorControls');
    editorControls.appendChild(boldButton);
    editorControls.appendChild(italicButton);
    editorControls.appendChild(codeButton);
    editorControls.appendChild(addLink);
    editorControls.appendChild(mediaButton);
  }

  wrapSelectedText(tagName, attributes = []) {
    if(window.getSelection) {
      //to make sure the selection is in the commentText
      const commentText = this.shadowRoot.querySelector('.commentText');
      //get the selected elements on the screen
      const selection = window.getSelection();
      //only apply styles to the comment text area
      if(commentText.contains(selection.anchorNode)) {
        for(let i = 0;i < selection.rangeCount;i++) {
          const range = selection.getRangeAt(i);
          //create a new tag to hold the selected elements
          const newElement = document.createElement(tagName);
          //add any attributes that are passed in (href, etc.)
          attributes.forEach(attribute => {
            newElement.setAttribute(attribute[0], attribute[1]);
          });
          //surround the selected text in the new element
          range.surroundContents(newElement);
        }
      }
    }
  }

  sendEventNotifyLinesAboveBelowChange = () => {
    //get the elements that have the requested lines above/below
    const linesAboveSelector = this.shadowRoot.querySelector('#linesAboveSelector');
    const linesBelowSelector = this.shadowRoot.querySelector('#linesBelowSelector');

    //generate and send an event with the above/below values
    const customEvent = new CustomEvent('lines-above-below-change', { 
      detail: {
        linesAbove: Number(linesAboveSelector.value),
        linesBelow: Number(linesBelowSelector.value)
      },
      bubbles: true, 
      composed: true 
    });
    this.dispatchEvent(customEvent);
  }

  updateActiveFile() {
    //get the number of lines in the file (may be 0 if there is not an active file)
    this.numLinesInFile = this.playbackEngine.editorState.getNumLinesInFile(this.playbackEngine.activeFileId);

    //update the max values for the inputs
    const linesAboveSelector = this.shadowRoot.querySelector('#linesAboveSelector');
    const linesBelowSelector = this.shadowRoot.querySelector('#linesBelowSelector');
    linesAboveSelector.setAttribute('max', this.numLinesInFile);
    linesBelowSelector.setAttribute('max', this.numLinesInFile);
  }

  updateAddCommentMode() {
    //set the placeholder text for the main comment text
    const commentText = this.shadowRoot.querySelector('.commentText');
    const commentTextPlaceholder = commentText.getAttribute('data-placeholder');
    commentText.innerHTML = commentTextPlaceholder;
    commentText.classList.add('promptVisible');

    //set the lines above/below to 0
    const linesAboveSelector = this.shadowRoot.querySelector('#linesAboveSelector');
    linesAboveSelector.setAttribute('value', 0);
    const linesBelowSelector = this.shadowRoot.querySelector('#linesBelowSelector');
    linesBelowSelector.setAttribute('value', 0);
    //update the max lines above/below from an active file
    this.updateActiveFile();

    //set the text and event handler for the submit button
    const submitButton = this.shadowRoot.querySelector('#submitButton');
    submitButton.innerHTML = 'Add Comment';
  }

  updateEditCommentMode(comment) {
    //store the comment being edited
    this.editedComment = comment;

    //set the main comment text
    const commentText = this.shadowRoot.querySelector('.commentText');
    commentText.innerHTML = comment.commentText;
    commentText.classList.remove('promptVisible');
    
    //set the lines above/below to what they are in the comment
    const linesAboveSelector = this.shadowRoot.querySelector('#linesAboveSelector');
    linesAboveSelector.setAttribute('value', comment.linesAbove);
    const linesBelowSelector = this.shadowRoot.querySelector('#linesBelowSelector');
    linesBelowSelector.setAttribute('value', comment.linesBelow);
    //update the max lines above/below from an active file
    this.updateActiveFile();

    //set the text and event handler for the submit button
    const submitButton = this.shadowRoot.querySelector('#submitButton');
    submitButton.innerHTML = 'Edit Comment';
  }

  sendEventCancelAddEditComment = () => {
    //clear out a previously edited comment (if there is one)
    this.editedComment = null;
    //generate and send an event upward to indicate adding/editing is complete
    const customEvent = new CustomEvent('cancel-add-edit-comment', { 
      bubbles: true, 
      composed: true 
    });
    this.dispatchEvent(customEvent);
  }

  sendEventAddEditComment = (event) => {
    let eventType = '';
    //use the button text to determine what type of event to send
    if(event.target.innerHTML === 'Add Comment') {
      eventType = 'add-comment';
    } else {
      eventType = 'edit-comment';
    }

    //generate and send an event upward to indicate a new/edit comment has been added
    const customEvent = new CustomEvent(eventType, { 
      detail: {
        comment: this.buildCommentObjectFromUI()
      },
      bubbles: true, 
      composed: true 
    });
    this.dispatchEvent(customEvent);
  }

  buildCommentObjectFromUI() {
    //TODO check for minimum data in the comment
    const commentText = this.shadowRoot.querySelector('.commentText');
    const mostRecentEvent = this.playbackEngine.getMostRecentEvent();
    const activeFilePath = this.playbackEngine.getActiveFilePath();

    //TODO media
    //TODO question/answer
    //TODO tags
    //TODO if there is a comment title, add it (update code view and blog view with new comment title)
    const comment = {
      id: this.editedComment ? this.editedComment.id : null,
      displayCommentEvent: this.editedComment ? this.editedComment.displayCommentEvent : mostRecentEvent,
      timestamp: this.editedComment ? this.editedComment.timestamp : new Date().getTime(),
      commentText: commentText.innerHTML,
      selectedCodeBlocks: [], //this will be set in CodeView
      viewableBlogText: '', //this will be set in CodeView
      imageURLs: [],
      videoURLs: [],
      audioURLs: [],
      linesAbove: 0, //this will be set in CodeView
      linesBelow: 0, //this will be set in CodeView
      currentFilePath: this.editedComment ? this.editedComment.currentFilePath : activeFilePath,
      commentTags: [],
      questionCommentData: {}
    };

    return comment;
  }
}

window.customElements.define('st-add-edit-comment', AddEditComment);