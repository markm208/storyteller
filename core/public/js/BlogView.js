class BlogView extends HTMLElement {
  constructor(playbackEngine, editorProperties) {
    super();

    this.editorProperties = editorProperties;
    this.playbackEngine = playbackEngine;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host {
          overflow-y: scroll;
          overflow-x: hidden;
          height: 100%;
          display: block;
          word-wrap: break-word;
          scrollbar-width: thin;
        }
        :host::-webkit-scrollbar {
          width: .65em;
          background-color: inherit;
        }
        :host::-webkit-scrollbar-thumb {
          background: dimgray;
        }

        .blogViewWrapper {
          max-width: 1200px;
          margin-left:auto;
          margin-right:auto;
          background-color: rgb(37,37,37);
          color: white;
          padding: 10px 30px;
        }

        .blogTitle {
          text-align: center;
          padding-bottom: 50px;
          padding-top: 10px;
          font-size: 2.5em;
          font-weight: 400;
        }

        .blogDevelopersDiv {
          display: flex;
          flex-wrap: wrap;
        }

        .blogComponents {
          padding-top: 10px;
        }

        .nonRelevantSearchResult{
          display: none;
        }
      </style>

      <div class="blogViewWrapper">
        <div class="blogTitle"></div>
        <div class="blogDevelopersDiv"></div>
        <hr/>
        <div class="blogComponents"></div>
      </div>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    //playback title
    this.updateForTitleChange(this.playbackEngine.playbackData.playbackTitle);

    //dev authors
    const blogDevelopersDiv = this.shadowRoot.querySelector('.blogDevelopersDiv');
    Object.values(this.playbackEngine.playbackData.developers).forEach(dev => {
      if(dev.id !== 'devId-0' && dev.id !== 'devId-1') {
        blogDevelopersDiv.appendChild(new DevAvatar(dev.avatarURL, dev.userName, dev.email, true));
      }
    });
    
    //blog components
    const blogComponents = this.shadowRoot.querySelector('.blogComponents');

    //the blog component to scroll to if there is an active comment
    let scrollToElement = null;

    const flattenedComments = this.playbackEngine.commentInfo.flattenedComments;
    //go through each comment in the playback
    for(let i = 0;i < flattenedComments.length;i++) { 
      const comment = flattenedComments[i];
      
      //create the content and add it to the page
      const blogComponent = new BlogComponent(this.playbackEngine, comment, this.editorProperties);
      //make each blog component identifiable by id
      blogComponent.setAttribute('id', comment.id);

      //if this is the special 'description' comment (1st comment is always it)
      if(i === 0) {
        blogComponent.classList.add('descriptionComment');
      }

      //if there is an active comment when blog view is created
      if(this.playbackEngine.activeComment && comment.id === this.playbackEngine.activeComment.id) {
        blogComponent.classList.add('activeComment');
        //for scrolling, only scroll to non-description comments
        if(blogComponent.classList.contains('descriptionComment') === false) {
          scrollToElement = blogComponent;
        }
      }

      blogComponents.appendChild(blogComponent);
    }
    
    //scroll to the active comment (if there is one)
    if(scrollToElement) {
      scrollToElement.scrollIntoView(true);
    }
  }

  updateForTitleChange(newTitle) {
    const blogTitle = this.shadowRoot.querySelector('.blogTitle');
    blogTitle.innerHTML = newTitle;
  }

  updateToDisplaySearchResults(searchResults) {
    //get all of the blog components
    const blogComponents = this.shadowRoot.querySelectorAll('st-blog-component');
    blogComponents.forEach(blogComponent => {
      const commentID = blogComponent.comment.id;
      
      //clear any previous search results
      blogComponent.revealCommentsBeforeSearch();
      //highlight any code in a search
      blogComponent.highlightSearch(searchResults.searchText);
      
      //if there is a search result for this blog component's comment
      if(searchResults.details[commentID]) {
        //make sure it is visible
        blogComponent.classList.remove('nonRelevantSearchResult');
        //highlight the results
        blogComponent.updateToDisplaySearchResults(searchResults.details[commentID]);
      } else { //this one is not part of the search results
        //hide the blog component
        blogComponent.classList.add('nonRelevantSearchResult');
      }
    });
  }
}

window.customElements.define('st-blog-view', BlogView);