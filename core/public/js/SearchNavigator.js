class SearchNavigator extends HTMLElement {
  constructor(playbackEngine) {
    super();

    this.playbackEngine = playbackEngine;
    this.searchMode = 'all';
    this.searchText = '';

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
        .searchButton {
          background-color: gray;
          color: black;
          border: none;
          font-weight: bold;
          opacity: .85;
        }
        .searchButton:hover {
          opacity: 1;
        }

        .searchControls {
          display: flex;
          padding: 10px;
        }
        .searchInput {
          color: lightgray;
          border: 2px solid gray;
          background-color: inherit;
          background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="gray" class="bi bi-search" viewBox="0 0 16 16"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>');
          background-repeat: no-repeat;
          background-position: 7px 7px; 
          padding: 7px 15px 7px 30px;
          flex: 1;
        }
        .searchInput:focus {
          outline: none;/*1px solid gray;*/
        }
      </style>
      
      <div class="searchControls">
        <input type="text" class="searchInput" placeholder="Search comments..."></input>
        <button class="searchButton">Search</button>
      </div>
      <div class="searchResults"></div>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    const searchButton = this.shadowRoot.querySelector('.searchButton');
    searchButton.addEventListener('click', this.search);

    const searchInput = this.shadowRoot.querySelector('.searchInput');
    searchInput.addEventListener('change', this.saveSearchText)
  }

  disconnectedCallback() {
    const searchButton = this.shadowRoot.querySelector('.searchButton');
    searchButton.removeEventListener('click', this.search);

    const searchInput = this.shadowRoot.querySelector('.searchInput');
    searchInput.removeEventListener('change', this.saveSearchText)
  }

  search = () => {
    if(this.searchText !== '') {
      //clear out any old results
      const searchResults = this.shadowRoot.querySelector('.searchResults');
      searchResults.innerHTML = '';

      //go through all the comments and collect search relevant ones
      const relevantComments = [];
      for(let i = 0;i < this.playbackEngine.flattenedComments.length;i++) {
        const comment = this.playbackEngine.flattenedComments[i];
        
        let isRelevantComment = false;
        if(this.searchMode === 'Highlighted Code' || this.searchMode === 'all') {
          comment.selectedCodeBlocks.some(block => {
            if(block.selectedText.toLowerCase().includes(this.searchText.toLowerCase())) {
              isRelevantComment = true;
            }
          });
        }

        if(this.searchMode === 'Comment Text' || this.searchMode === 'all') {
          if(comment.commentText.toLowerCase().includes(this.searchText.toLowerCase())) {
            isRelevantComment = true;
          }
        } 
        
        if(this.searchMode === 'Comment Tags' || this.searchMode === 'all') {
          if(comment.commentTags.some(tag => tag.toLowerCase().includes(this.searchText.toLowerCase()))) {
            isRelevantComment = true;
          }
        }
        
        //create a comment view if the current comment is search relevant
        if(isRelevantComment) {
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
          relevantComments.push(commentView);
        }
      }

      //populate the search results
      relevantComments.forEach(relComment => {
        searchResults.appendChild(relComment);
      });
    }
  }

  saveSearchText = event => {
    this.searchText = event.target.value;
    this.search();
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