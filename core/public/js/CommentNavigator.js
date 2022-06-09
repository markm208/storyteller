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
        :host {
          display: none;
        }
        .commentGroups {
          height: 100%;
          overflow-y: auto;
          word-wrap: break-word;
          scrollbar-width: thin;
        }

        .newCommentButton {
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
        .newCommentButton:hover {
          opacity: 1;
        }

        .newCommentButton.isEditable {
          /*display: unset;*/
        }

        .inactive {
          display: none;
        }

      </style>
      <div class="commentGroups"></div>
      <button id="addNewComment" class="newCommentButton" title="Create a new comment">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-plus-circle" viewBox="0 0 16 16">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
          <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
        </svg>
        Add a Comment
      </button>
      <st-add-edit-comment id="addEditCommentComponent" class="inactive"></st-add-edit-comment>`
      
    return template.content.cloneNode(true);
  }

  connectedCallback() {
    const commentGroups = this.shadowRoot.querySelector('.commentGroups');
    let totalNumberOfCommentsSoFar = 0;

    //go through each of the comments in this group
    for(let i = 0;i < this.playbackEngine.commentsInGroups.length;i++) {
      const flattenedCommentGroup = this.playbackEngine.commentsInGroups[i];

      const commentGroup = new CommentGroup({
        comments: flattenedCommentGroup, 
        firstCommentGroup: i === 0 ? true : false,
        startingCommentNumber: totalNumberOfCommentsSoFar,
        playbackEngine: this.playbackEngine,
      });

      commentGroup.setAttribute('id', flattenedCommentGroup[0].id);

      //add each comment's id as a class in each comment group
      flattenedCommentGroup.forEach(comment => {
        commentGroup.classList.add(comment.id);
      });

      commentGroups.appendChild(commentGroup);
      
      //update the comment number
      totalNumberOfCommentsSoFar += flattenedCommentGroup.length;
    }

    if(this.playbackEngine.playbackData.isEditable) {
      const newCommentButton = this.shadowRoot.querySelector('.newCommentButton');
      newCommentButton.classList.add('isEditable');
      newCommentButton.addEventListener('click', this.addNewComment);
    }
    //update to the active
    this.updateSelectedComment();
  }

  disconnectedCallback() {
  }

  updateSelectedComment() {
    if(this.playbackEngine.activeComment.pausedOnComment) {
      const activeCommentGroup = this.shadowRoot.querySelector('st-comment-group.activeCommentGroup');
      if(activeCommentGroup) {
        activeCommentGroup.classList.remove('activeCommentGroup');
        //make the active comment view inactive
        activeCommentGroup.makeCommentViewInactive();
      }

      //look for the comment group that contains the active comment
      const newActiveCommentGroup = this.shadowRoot.querySelector(`.${this.playbackEngine.activeComment.comment.id}`);
      newActiveCommentGroup.classList.add('activeCommentGroup');
      //make the comment view active
      newActiveCommentGroup.makeCommentViewActive();
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

  addNewComment = () => {
    const addEditComment = this.shadowRoot.querySelector('#addEditCommentComponent');
    const commentGroups = this.shadowRoot.querySelector('.commentGroups');
    const newCommentButton = this.shadowRoot.querySelector('.newCommentButton');
    addEditComment.classList.remove('inactive');
    commentGroups.classList.add('inactive');
    newCommentButton.classList.add('inactive');
  }

  cancelAddEditComment() {
    const addEditComment = this.shadowRoot.querySelector('#addEditCommentComponent');
    const commentGroups = this.shadowRoot.querySelector('.commentGroups');
    const newCommentButton = this.shadowRoot.querySelector('.newCommentButton');
    addEditComment.classList.add('inactive');
    commentGroups.classList.remove('inactive');
    newCommentButton.classList.remove('inactive');
  }
}

window.customElements.define('st-comment-navigator', CommentNavigator);