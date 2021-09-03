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
      </style>

      <div class="commentGroups"></div>`;

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
}

window.customElements.define('st-comment-navigator', CommentNavigator);