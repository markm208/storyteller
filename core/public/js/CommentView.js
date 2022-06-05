class CommentView extends HTMLElement {
  constructor(commentViewData) {
    super();

    this.comment = commentViewData.comment;
    this.playbackEngine = commentViewData.playbackEngine;
    this.isDescriptionComment = commentViewData.isDescriptionComment;
    this.commentNumber = commentViewData.commentNumber;
    
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host {
          display: block;
          border: 1px gray solid;
          padding: 3px 12px;
        }
        
        :host(.activeComment) {
          background-color: rgb(59,76,98);
        }

        :host(.nonRelevantSearchResult) {
          display: none;
        }


        a {
          color: lightblue;
        }
        a:hover {
          color: gray;
        }

        .commentTopBar {
          border-bottom: 1px solid rgb(83, 84, 86);
          margin-bottom: 8px;
          overflow-y: auto;
        }

        .commentCount {
          font-size: .95em;
          display: inline;
          color: rgb(127, 138, 148);
        }

        .commentText {
          padding: 2px 5px 12px 5px;
        }

        .commentAvatar {
          display: inline;
        }

        .titleBar {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25em;
          padding: 8px 0px;
        }

        .commentBar {
          display: flex;
          justify-content: space-between;
        }

        .commentVideo, .commentAudio {
          width: 100%;
          padding-bottom: 5px;
        }
      </style>

      <div class="commentTopBar"></div>
      <div class="commentText"></div>
      <div class="media"></div>
      <div class="questions"></div>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    const commentView = this.shadowRoot.host;
    commentView.addEventListener('click', this.commentClicked);

    //top of comment view
    this.buildCommentViewTop();
    //comment text
    const commentText = this.shadowRoot.querySelector('.commentText');
    commentText.innerHTML = this.comment.commentText;
    //media
    const media = this.shadowRoot.querySelector('.media');
    //videos
    if(this.comment.videoURLs.length > 0) {
      for(let i = 0;i < this.comment.videoURLs.length;i++) {
        const commentVideo = document.createElement('video');
        commentVideo.setAttribute('controls', '');
        commentVideo.setAttribute('src', this.comment.videoURLs[i]);
        commentVideo.classList.add('commentVideo');
        media.appendChild(commentVideo);
      }
    }
    //audios
    if(this.comment.audioURLs.length > 0) {
      for(let i = 0;i < this.comment.audioURLs.length;i++) {
        const commentAudio = document.createElement('audio');
        commentAudio.setAttribute('controls', '');
        commentAudio.setAttribute('src', this.comment.audioURLs[i]);
        commentAudio.classList.add('commentAudio');
        media.appendChild(commentAudio);
      }
    }
    //images
    if(this.comment.imageURLs.length > 0) {
      media.appendChild(new ImageGallery(this.comment.imageURLs,true));
    }
    //TODO
    //comment tags
    //q&a
    
  }

  disconnectedCallback() {
    const commentView = this.shadowRoot.host;
    commentView.removeEventListener('click', this.commentClicked);
  }

  commentClicked = event => {
    event.preventDefault();
    this.sendActiveCommentEvent();
  }

  buildCommentViewTop() {
    const commentTopBar = this.shadowRoot.querySelector('.commentTopBar');
    if (this.isDescriptionComment) {
      const titleBarDiv = document.createElement('div');
      titleBarDiv.classList.add('titleBar');
      titleBarDiv.innerHTML = this.playbackEngine.playbackData.playbackTitle;
      commentTopBar.appendChild(titleBarDiv);
    } else {
      const commentBar = document.createElement('div');
      commentBar.classList.add('commentBar');
  
      const devGroup = document.createElement('div');
      devGroup.classList.add('commentDevelopersDiv');
      devGroup.appendChild(new DevGroupAvatar({
        developerGroupId: this.comment.developerGroupId, 
        developers: this.playbackEngine.playbackData.developers, 
        developerGroups: this.playbackEngine.playbackData.developerGroups
      }));

      const commentCount = document.createElement('div');
      commentCount.classList.add('commentCount');
      commentCount.innerHTML = `${this.commentNumber}/${this.playbackEngine.flattenedComments.length - 1}`; //subtract one for description comment

      commentBar.appendChild(devGroup);
      commentBar.appendChild(commentCount);
      commentTopBar.appendChild(commentBar);
    }
  }

  sendActiveCommentEvent() {
    const event = new CustomEvent('active-comment', { 
      detail: {activeCommentId: this.comment.id}, 
      bubbles: true, 
      composed: true 
    });
    this.dispatchEvent(event);
  }
}

window.customElements.define('st-comment-view', CommentView);