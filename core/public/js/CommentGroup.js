
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

        :host(.nonRelevantSearchResult) {
          display: none;
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

  hideIrrelevantSearchResults(hideAllButThese, searchText) {
    //number of comments in the group that are not in the search results
    let hiddenCommentCount = 0;
    //get all of the comment views in this group
    const allCommentViews = this.shadowRoot.querySelectorAll('st-comment-view');

    allCommentViews.forEach(commentView => {

      let commentText = commentView.shadowRoot.querySelector('.commentText');
      commentText.innerHTML = commentText.innerHTML.replaceAll('<mark>' , '');
      commentText.innerHTML = commentText.innerHTML.replaceAll('</mark>', '');


      //if a comment view is not among the relevant search comments
      if(hideAllButThese.has(commentView.comment.id) === false) {
        //hide the comment
        commentView.classList.add('nonRelevantSearchResult');
        //count how many comments in the group are hidden
        hiddenCommentCount++;
      }
      else if (!searchText.startsWith('&') && searchText !== '' && searchText !== ' '){
        let regEx = new RegExp("(" + searchText + ")(?!([^<]+)?>)", "gi");        
        let output = commentText.innerHTML.replace(regEx, "<mark>$1</mark>");
        commentText.innerHTML = output;


      }
    });

    //if all of the comments in a group are hidden
    if(hiddenCommentCount === allCommentViews.length) {
      //hide the comment group too so it doesn't take up space in the UI
      this.classList.add('nonRelevantSearchResult');
    }
  }

  revealCommentsBeforeSearch() {
    //get all of the hidden comment views
    const allCommentViews = this.shadowRoot.querySelectorAll('.nonRelevantSearchResult');
    allCommentViews.forEach(commentView => {
      //reveal them by removing the hidden class
      commentView.classList.remove('nonRelevantSearchResult');
    });

    //if this comment group was previously hidden, make it visible again
    if(this.classList.contains('nonRelevantSearchResult')) {
      this.classList.remove('nonRelevantSearchResult');
    }
  }
}

window.customElements.define('st-comment-group', CommentGroup);