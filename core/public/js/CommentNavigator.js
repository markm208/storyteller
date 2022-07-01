class CommentNavigator extends HTMLElement {
  constructor(playbackEngine) {
    super();

    this.playbackEngine = playbackEngine;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        .commentGroups {
          height: 100%;
          overflow-y: auto;
          word-wrap: break-word;
          scrollbar-width: thin;
        }

        #newCommentButton {
          position: sticky;
          bottom: 0;
          left: 0;

          cursor: pointer;
          background-color: gray;
          color: black;
          border: none;
          font-weight: bold;
          opacity: .85;
          height: 40px;
          width: 100%;
          padding: 5px;
        }
        #newCommentButton:hover {
          opacity: 1;
        }

        .inactive {
          display: none;
        }

      </style>
      <div class="commentGroups"></div>
      <button id="newCommentButton" class="inactive" title="Create a new comment">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-plus-circle" viewBox="0 0 16 16">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
          <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
        </svg>
        Add a Comment
      </button>
      <div id="addEditCommentComponent" class="inactive"></div>`
      
    return template.content.cloneNode(true);
  }

  connectedCallback() {
    //add the comment views 
    this.addCommentsToView();

    //if this is an editable playback
    if(this.playbackEngine.playbackData.isEditable) {
      //make the add new comment button visible
      const newCommentButton = this.shadowRoot.querySelector('#newCommentButton');
      newCommentButton.classList.remove('inactive');
      newCommentButton.addEventListener('click', this.beginAddComment);
    }

    this.shadowRoot.addEventListener('reorder-comments', async (event) => {
      //when the reordering of events is complete send the pb engine the new comment ordering
      this.playbackEngine.reorderComments(event.detail.updatedCommentPosition);
      
      //send the new comment ordering to the st server
      const serverProxy = new ServerProxy();
      await serverProxy.updateCommentPositionOnServer(event.detail.updatedCommentPosition);

      //update the UI for the new order
      this.updateForReorderedComments();
    });

    //update to the active comment (usually the first comment)
    this.updateForPlaybackMovement();
  }

  disconnectedCallback() {
  }

  beginAddComment = () => {
    //send an event to add a new comment
    const event = new CustomEvent('begin-add-comment', { 
      bubbles: true, 
      composed: true 
    });
    this.dispatchEvent(event);    
  }

  updateForPlaybackMovement() {
    //make sure that the add/edit UI is closed
    this.updateUIToCancelAddEditComment();

    //if there is an active comment
    if(this.playbackEngine.activeComment) {
      //get the current active comment group (if there is one) and deactivate it 
      const activeCommentGroup = this.shadowRoot.querySelector('st-comment-group.activeCommentGroup');
      if(activeCommentGroup) {
        activeCommentGroup.makeCommentGroupInactive();
      }

      //look for the comment group that contains the new active comment
      const newActiveCommentGroup = this.shadowRoot.querySelector(`st-comment-group.${this.playbackEngine.activeComment.id}`);
      newActiveCommentGroup.makeCommentGroupActive();
    } //else- no active comment, nothing to do in this case
  }

  updateForNewComment() {
    //rebuild all of the comment groups
    this.addCommentsToView();
  }

  updateForDeleteComment() {
    //rebuild all of the comment groups
    this.addCommentsToView();
  }
  
  updateForReorderedComments() {
    //rebuild all of the comment groups
    this.addCommentsToView();
  }

  addCommentsToView() {
    //clear out any old comment views
    const commentGroups = this.shadowRoot.querySelector('.commentGroups');
    commentGroups.innerHTML = '';
    
    //comment count
    let totalNumberOfCommentsSoFar = 0;
    const totalNumberOfComments = this.playbackEngine.getTotalNumberOfComments();

    //get all of the comment groups in order from the playback engine
    const commentsInGroups = this.playbackEngine.getCommentsInGroups();
    //go through each of the comments in this group
    for(let i = 0;i < commentsInGroups.length;i++) {
      //a group of comments at an event
      const flattenedCommentGroup = commentsInGroups[i];
      //create a comment group
      const commentGroup = new CommentGroup({
        comments: flattenedCommentGroup, 
        firstCommentGroup: i === 0 ? true : false,
        startingCommentNumber: totalNumberOfCommentsSoFar,
        totalNumberOfComments: totalNumberOfComments,
        playbackEngine: this.playbackEngine,
      });
      //give the group the id of the first comment
      commentGroup.setAttribute('id', flattenedCommentGroup[0].id);

      //add each comment's id as a class in each comment group
      flattenedCommentGroup.forEach(comment => {
        commentGroup.classList.add(comment.id);
      });
      //add the group
      commentGroups.appendChild(commentGroup);

      //update the comment number
      totalNumberOfCommentsSoFar += flattenedCommentGroup.length;
    }
    //if there is an active comment highlight it
    this.updateForPlaybackMovement();
  }

  updateForSelectedFile() {
    const addEditCommentComponent = this.shadowRoot.querySelector('st-add-edit-comment');
    //if the add/edit ui is visible
    if(addEditCommentComponent.classList.contains('inactive') === false) {
      //send the message on to update the above/below max val for the active file
      addEditCommentComponent.updateActiveFile();
    }
  }

  displaySearchResults(searchResults){
    //clear out old search results
    const commentGroups = this.shadowRoot.querySelectorAll('st-comment-group');
    commentGroups.forEach(commentGroup => {
      commentGroup.revealCommentsBeforeSearch();
    });

    //holds the IDs of the comments that were in the results
    const relevantCommentIDs = new Set();
    searchResults.forEach(searchResult => {
      relevantCommentIDs.add(searchResult.commentId);
    });

    //hide the comments that are not in the results
    commentGroups.forEach(commentGroup => {
      commentGroup.hideIrrelevantSearchResults(relevantCommentIDs);
    });
  }

  updateUIToAddNewComment() {
    if(this.playbackEngine.playbackData.isEditable) {
      //make the comment groups and the new comment button invisible
      const commentGroups = this.shadowRoot.querySelector('.commentGroups');
      commentGroups.classList.add('inactive');
      const newCommentButton = this.shadowRoot.querySelector('#newCommentButton');
      newCommentButton.classList.add('inactive');
  
      //create a new/edit comment UI
      const addEditComment = new AddEditComment(this.playbackEngine, null);
      
      //add the new component to the UI and make it visible
      const addEditCommentComponent = this.shadowRoot.querySelector('#addEditCommentComponent');
      addEditCommentComponent.innerHTML = '';
      addEditCommentComponent.appendChild(addEditComment);
      addEditCommentComponent.classList.remove('inactive');
    }
  }

  updateUIToEditComment(comment) {
    if(this.playbackEngine.playbackData.isEditable) {
      //make the comment groups and the new comment button invisible
      const commentGroups = this.shadowRoot.querySelector('.commentGroups');
      commentGroups.classList.add('inactive');
      const newCommentButton = this.shadowRoot.querySelector('#newCommentButton');
      newCommentButton.classList.add('inactive');
  
      //create a new/edit comment UI using the comment that is being edited
      const addEditComment = new AddEditComment(this.playbackEngine, comment);

      //add the new component to the UI and make it visible
      const addEditCommentComponent = this.shadowRoot.querySelector('#addEditCommentComponent');
      addEditCommentComponent.innerHTML = '';
      addEditCommentComponent.appendChild(addEditComment);
      addEditCommentComponent.classList.remove('inactive');
    }
  }

  updateUIToCancelAddEditComment() {
    //make the AddEditComment invisible and the comments visible
    const addEditComment = this.shadowRoot.querySelector('#addEditCommentComponent');
    //if the add/edit component is visible
    if(addEditComment.classList.contains('inactive') === false) {
      //make it invisible
      addEditComment.classList.add('inactive');

      //make the comment groups and the add new comment button visible
      const commentGroups = this.shadowRoot.querySelector('.commentGroups');
      commentGroups.classList.remove('inactive');
      const newCommentButton = this.shadowRoot.querySelector('#newCommentButton');
      newCommentButton.classList.remove('inactive');

      //get rid of the add edit component
      const addEditCommentComponent = this.shadowRoot.querySelector('#addEditCommentComponent');
      addEditCommentComponent.innerHTML = '';
    }
  }

  updateForCommentEdit(editedComment) {
    const commentGroups = this.shadowRoot.querySelectorAll('st-comment-group');
    for(let i = 0;i < commentGroups.length;i++) {
      const commentGroup = commentGroups[i];
      if(commentGroup.classList.contains(editedComment.id)) {
        commentGroup.updateForCommentEdit(editedComment);
        break;
      }
    }
  }
}

window.customElements.define('st-comment-navigator', CommentNavigator);