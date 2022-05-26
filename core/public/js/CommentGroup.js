class CommentGroup extends HTMLElement {
  constructor(commentGroupData) {
    super();

    this.comments = commentGroupData.comments;
    this.firstCommentGroup = commentGroupData.firstCommentGroup;
    this.startingCommentNumber = commentGroupData.startingCommentNumber;
    this.playbackEngine = commentGroupData.playbackEngine;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host {
          margin: 6px 0px;
          padding: 2px 2px;
          display: flex;
          flex-direction: column;
        }

        :host(.activeCommentGroup) {
          background-color: rgb(63, 63, 63);
          border: 3px gray solid;  
          border-radius: .2rem;
          padding: 0px 0px;
        }
      </style>

      <div class="commentViews"></div>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    const commentViews = this.shadowRoot.querySelector('.commentViews');
    //go through all of the comments in this group
    for(let i = 0;i < this.comments.length;i++) {
      const comment = this.comments[i];

      let isDescriptionComment = false;
      if(this.firstCommentGroup && i === 0) {
        isDescriptionComment = true;
      } 

      const commentView = new CommentView({
        comment: comment,
        playbackEngine: this.playbackEngine,
        isDescriptionComment: isDescriptionComment,
        commentNumber: this.startingCommentNumber + i,
      });

      commentView.setAttribute('id', comment.id);

      commentViews.appendChild(commentView);
    }
  }

  disconnectedCallback() {
  }

  makeCommentViewInactive() {
    const activeComment = this.shadowRoot.querySelector('.activeComment');
    if(activeComment) {
      activeComment.classList.remove('activeComment');
    }
  }

  makeCommentViewActive() {
    const newActiveComment = this.shadowRoot.querySelector(`st-comment-view#${this.playbackEngine.activeComment.comment.id}`);
    newActiveComment.classList.add('activeComment');

    //get the rectangle around the active comment that is displayed
    const commentRectangle = newActiveComment.getBoundingClientRect();
    
    //if the comment's top/bottom edge is  off of the screen (+/- 50px)
    if (commentRectangle.bottom - 50 < 0 || commentRectangle.top > window.innerHeight - 50) {
      //scroll to the active comment
      newActiveComment.scrollIntoView(true)
    }
  }
}

window.customElements.define('st-comment-group', CommentGroup);