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
        .commentGroups::-webkit-scrollbar {
          width: .65em;
          background-color: inherit;
        }
        .commentGroups::-webkit-scrollbar-thumb {
          background: dimgray;
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
      </button>`;
      
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
      newCommentButton.addEventListener('click', this.sendBeginAddComment);
    }

    //update to the active comment (usually the first comment)
    this.updateForCommentSelected();
  }

  disconnectedCallback() {
  }

  sendBeginAddComment = () => {
    //send an event to add a new comment
    const event = new CustomEvent('begin-add-comment', { 
      bubbles: true, 
      composed: true 
    });
    this.dispatchEvent(event);    
  }

  updateForCommentSelected() {
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

  updateForTitleChange(newTitle) {
    const commentGroups = this.shadowRoot.querySelector('.commentGroups');
    //the first child is the comment group with the title
    const firstCommentGroup = commentGroups.children[0];
    firstCommentGroup.updateForTitleChange(newTitle);
  }

  addCommentsToView() {
    //clear out any old comment views
    const commentGroups = this.shadowRoot.querySelector('.commentGroups');
    commentGroups.innerHTML = '';
    
    //comment count
    let totalNumberOfCommentsSoFar = 0;
    const totalNumberOfComments = this.playbackEngine.commentInfo.totalNumberOfComments;

    //get all of the comment groups in order from the playback engine
    const commentsInGroups = this.playbackEngine.commentInfo.allCommentsInGroups;
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
  }

  updateToDisplaySearchResults(searchResults){
    //clear out old search results
    const commentGroups = this.shadowRoot.querySelectorAll('st-comment-group');
    commentGroups.forEach(commentGroup => {
      commentGroup.revealCommentsBeforeSearch();
    });

    commentGroups.forEach(commentGroup => {
      commentGroup.updateToDisplaySearchResults(searchResults);
    });
  }
}

window.customElements.define('st-comment-navigator', CommentNavigator);