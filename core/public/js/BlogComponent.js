class BlogComponent extends HTMLElement {
  constructor(comment, editorProperties) {
    super();
    
    this.comment = comment;
    this.editorProperties = editorProperties;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 10px;
        }

        :host(.activeComment) {
          background-color: rgb(40, 40, 40);
        }

        :host(.descriptionComment) {
          font-size: 1.2em;
        }

        .blogModeVideo, .blogModeAudio, .blogModePicture {
          width: 75%;
        }

        .commentFileName {
          color: gray;
        }

        .mediaDiv {
          display: flex;
          justify-content: center;
          padding: 10px 0px 5px 0px;
        }
      </style>

      <div class="blogCommentText"></div>
      <div class="commentVideos"></div>
      <div class="commentAudios"></div>
      <div class="codeEditor"></div>
      <div class="commentImages"></div>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    //add the comment text
    const blogCommentText = this.shadowRoot.querySelector('.blogCommentText');
    blogCommentText.innerHTML = this.comment.commentText;

    //add the media
    //videos
    const commentVideos = this.shadowRoot.querySelector('.commentVideos');
    if (this.comment.videoURLs.length > 0) {
      this.comment.videoURLs.forEach(url => {
        const video = document.createElement('video');
        video.setAttribute('controls', '');
        video.setAttribute('src', url);
        video.classList.add('blogModeVideo');

        const videoDiv = document.createElement('div');
        videoDiv.classList.add('mediaDiv');
        videoDiv.appendChild(video);
        commentVideos.appendChild(videoDiv);
      });
    }
    //audios
    const commentAudios = this.shadowRoot.querySelector('.commentAudios');
    if (this.comment.audioURLs.length > 0) {
      this.comment.audioURLs.forEach(url => {
        const audio = document.createElement('audio');
        audio.setAttribute('controls', '');
        audio.setAttribute('src', url);
        audio.classList.add('blogModeAudio');

        const audioDiv = document.createElement('div');
        audioDiv.classList.add('mediaDiv');
        audioDiv.appendChild(audio);
        commentAudios.appendChild(audioDiv);
      });
    }

    //if there is some code to display
    if (this.comment.selectedCodeBlocks[0]) {
      //create a code snippet
      const blogCodeSnippet = new BlogCodeSnippet(this.comment, this.editorProperties);
      const codeEditor = this.shadowRoot.querySelector('.codeEditor');
      codeEditor.appendChild(blogCodeSnippet);
    }

    //images
    const commentImages = this.shadowRoot.querySelector('.commentImages');
    if (this.comment.imageURLs.length > 0) {
      const imageGallery = new ImageGallery(this.comment.imageURLs, false);
      commentImages.appendChild(imageGallery);
    }

    //add an event handler so users can click comments
    this.addEventListener('click', this.sendEventActiveComment);
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.sendEventActiveComment);
  }

  sendEventActiveComment() {
    const event = new CustomEvent('active-comment', { 
      detail: {activeCommentId: this.comment.id}, 
      bubbles: true, 
      composed: true 
    });
    this.dispatchEvent(event);
  }
}

window.customElements.define('st-blog-component', BlogComponent);