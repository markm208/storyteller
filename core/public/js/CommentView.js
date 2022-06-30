class CommentView extends HTMLElement {
  constructor(commentViewData) {
    super();

    this.comment = commentViewData.comment;
    this.playbackEngine = commentViewData.playbackEngine;
    this.isDescriptionComment = commentViewData.isDescriptionComment;
    this.commentNumber = commentViewData.commentNumber;
    this.totalNumberOfComments = commentViewData.totalNumberOfComments;
    
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

        #editCommentButton {
          display: none;
          content: "";
          background-image: url("data:image/svg+xml,<svg viewBox='0 0 16 16' class='bi bi-pencil-square test' fill='lightgray' xmlns='http://www.w3.org/2000/svg'><path fill-rule='evenodd' d='M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456l-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z'/><path fill-rule='evenodd' d='M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z' clip-rule='evenodd'/></svg>");
          background-repeat: no-repeat;
          background-color: gray;
          height: 1.4em;
          width: 1.4em;
          border: none;
        }
        :host(.activeComment) #editCommentButton {
          display: block;
        }

        #deleteCommentButton {
          display: none;
          content: "";
          background-image: url("data:image/svg+xml,<svg viewBox='0 0 16 16' class='bi bi-x' fill='red' xmlns='http://www.w3.org/2000/svg'><path d='M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z'/></svg>");
          background-repeat: no-repeat;
          background-color: transparent;
          height: 1.8em;
          width: 1.8em;
          border: none;
          margin-right: -2px;
          margin-bottom: -3px;
          float: right;
        }
        :host(.activeComment) #deleteCommentButton {
          display: block;
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

        .inactive {
          display: none;
        }
      </style>
      <div>
        <button id="deleteCommentButton" class="inactive"></button>
        <div>
          <div class="commentTopBar"></div>
          <div class="commentText"></div>
          <div class="media"></div>
          <div class="questions"></div>
        </div>
        <button id="editCommentButton" class="inactive"></button>
      </div>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    const commentView = this.shadowRoot.host;
    commentView.addEventListener('click', this.commentClicked);

    //if this is an editable playback
    if(this.playbackEngine.playbackData.isEditable) {
      //add an edit button
      const editCommentButton = this.shadowRoot.querySelector('#editCommentButton');
      editCommentButton.classList.remove('inactive');
      editCommentButton.addEventListener('click', this.beginEditComment);

      //the description comment cannot be deleted, add the button if it is not the description
      if(!this.isDescriptionComment) {
        //add a delete button
        const deleteCommentButton = this.shadowRoot.querySelector('#deleteCommentButton');
        deleteCommentButton.addEventListener('click', this.deleteComment);
      }
    }

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

  beginEditComment = () => {
    const event = new CustomEvent('begin-edit-comment', { 
      detail: {
        comment: this.comment
      },
      bubbles: true, 
      composed: true 
    });
    this.dispatchEvent(event);
  }

  deleteComment = () => {
    const event = new CustomEvent('delete-comment', { 
      detail: {
        comment: this.comment
      },
      bubbles: true, 
      composed: true 
    });
    this.dispatchEvent(event);
  }

  updateForCommentGroupEditing() {
    //if this is an editable playback
    if(this.playbackEngine.playbackData.isEditable) {
      //the description comment cannot be deleted, make it visible if it is not the description
      if(!this.isDescriptionComment) {
        //make the delete button visible
        const deleteCommentButton = this.shadowRoot.querySelector('#deleteCommentButton');
        deleteCommentButton.classList.remove('inactive');
      }
    }
  }

  updateForCommentGroupEditingComplete() {
    //if this is an editable playback
    if(this.playbackEngine.playbackData.isEditable) {
      //the description comment cannot be deleted, make it visible if it is not the description
      if(!this.isDescriptionComment) {
        //make the delete button invisible
        const deleteCommentButton = this.shadowRoot.querySelector('#deleteCommentButton');
        deleteCommentButton.classList.add('inactive');
      }
    }
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
      commentCount.innerHTML = `${this.commentNumber}/${this.totalNumberOfComments - 1}`; //subtract one for description comment

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