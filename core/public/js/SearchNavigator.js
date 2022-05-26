class SearchNavigator extends HTMLElement {
  constructor(playbackEngine) {
    super();

    this.playbackEngine = playbackEngine;
    this.searchMode = 'all';

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
        </style>
      <div id="searchResults"></div>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
  }

  disconnectedCallback() {
  }

  performSearch(searchText) {
    //clear out any old results
    const searchResults = this.shadowRoot.querySelector('#searchResults');
    searchResults.innerHTML = '';

    //only perform the search if text has been entered
    if(searchText !== '') {
      //go through all the comments and collect search relevant ones
      const relevantComments = this.playbackEngine.performSearch(searchText);
      const relevantCommentViews = [];
      for (let i = 0; i < relevantComments.length; i++){
        const comment = relevantComments[i];
        //create a comment view if the current comment is search relevant
        const commentView = new CommentView({
          comment: comment,
          playbackEngine: this.playbackEngine,
          isDescriptionComment: (i === 0),
          isActiveComment: false, //comment.id === this.playbackEngine.activeComment.comment.id,
          commentNumber: i,
        });

        commentView.setAttribute('id', comment.id);
        if(this.playbackEngine.activeComment.pausedOnComment && comment.id === this.playbackEngine.activeComment.comment.id) {
          commentView.classList.add('activeComment');
        }
        commentView.classList.add('searchComment');
        relevantCommentViews.push(commentView);
      }
      //populate the search results
      relevantCommentViews.forEach(relComment => {
         searchResults.appendChild(relComment);
      });
    }    
  }

  updateSelectedComment() {
    if(this.playbackEngine.activeComment.pausedOnComment) {
      const activeCommentView = this.shadowRoot.querySelector('.activeComment');
      if(activeCommentView) {
        activeCommentView.classList.remove('activeComment');
      }

      const newActiveComment = this.shadowRoot.querySelector(`st-comment-view#${this.playbackEngine.activeComment.comment.id}`);
      if(newActiveComment) {
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
  }

  notifySTATE(newSTATE) {
    const event = new CustomEvent('EVENT_NAME', { 
      detail: {DATA: data}, 
      bubbles: true, 
      composed: true 
    });
    this.dispatchEvent(event);
  }
}

window.customElements.define('st-search-navigator', SearchNavigator);