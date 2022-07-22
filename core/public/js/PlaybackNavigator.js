class PlaybackNavigator extends HTMLElement {
  constructor(playbackEngine) {
    super();

    this.playbackEngine = playbackEngine;
    this.activeTab = 'comments';

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host {
          height: 100%;
          display: block;
        }

        .tab {
          display: flex;
          justify-content: space-between;
          overflow-y: hidden;
          overflow-x: scroll;
          scrollbar-width: none;
          -ms-overflow-style: none;
          border-bottom: 1px solid gray;
        }
        .tab::-webkit-scrollbar {
          display: none;
        }

        .tabLink {
          background-color: inherit;
          font-size: inherit;
          color: inherit;
          border: 1px solid transparent;
          cursor: pointer;
          padding: 8px 10px;
          border-top-left-radius: .25rem;
          border-top-right-radius: .25rem;
        }

        .tabLink:hover {
          border: 1px solid gray;
          border-bottom: 1px solid transparent;
        }

        .tabLink.activeTab {
          background-color: rgb(31,31,31);
          border: 1px solid gray;
          border-bottom: none;
        }

        .subNavigatorsTab {
          height: calc(100% - 40px);
          word-wrap: break-word;
        }

        .inactive {
          display: none;
        }
      </style>
      
      <div class="tab">
        <span>
          <button class="tabLink comments activeTab">Comments</button>
          <button class="tabLink fileSystem">File&nbsp;System</button>
        </span>
        <st-options-menu></st-options-menu>
      </div>
      <div class="subNavigatorsTab"></div>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    const tabLinks = this.shadowRoot.querySelectorAll('.tabLink');
    tabLinks.forEach(tabLink => {
      tabLink.addEventListener('click', this.tabClick);
    });

    const subNavigatorsTab = this.shadowRoot.querySelector('.subNavigatorsTab');
    //create the sub-navigators
    const commentNavigator = new CommentNavigator(this.playbackEngine);
    subNavigatorsTab.appendChild(commentNavigator);

    const fileSystemNavigator = new FileSystemNavigator(this.playbackEngine);
    fileSystemNavigator.classList.add('inactive');
    subNavigatorsTab.appendChild(fileSystemNavigator);
  }

  disconnectedCallback() {
    const tabLinks = this.shadowRoot.querySelectorAll('.tabLink');
    tabLinks.forEach(tabLink => {
      tabLink.removeEventListener('click', this.tabClick);
    });
  }

  tabClick = (event) => {
    const activeTab = this.shadowRoot.querySelector('.activeTab');
    //only handle the click if it is a new tab
    if(event.target !== activeTab) {
      //if there is an active tab, make in inactive
      if(activeTab) {
        activeTab.classList.remove('activeTab');
      }
      //make the clicked tab active
      event.target.classList.add('activeTab');

      //get each of the subnavigators
      const commentNavigator = this.shadowRoot.querySelector('st-comment-navigator');
      const fileSystemNavigator = this.shadowRoot.querySelector('st-file-system-navigator');

      //remove the old classes
      commentNavigator.classList.remove('inactive');
      fileSystemNavigator.classList.remove('inactive');

      //selected comment navigator
      if(event.target.classList.contains('comments')) {
        //make the fs inactive
        fileSystemNavigator.classList.add('inactive');
        this.activeTab = 'comments';
      } else if(event.target.classList.contains('fileSystem')) {
        //make the comments inactive
        commentNavigator.classList.add('inactive');
        this.activeTab = 'fileSystem';
      }
      //show the latest changes
      this.updateForPlaybackMovement();
    }
  }

  updateForCommentSelected() {
    const commentNavigator = this.shadowRoot.querySelector('st-comment-navigator');
    commentNavigator.updateForCommentSelected();
  }

  updateForPlaybackMovement() {
    //forward the message on to the fs tab if it is active
    if(this.activeTab === 'fileSystem') {
      const fileSystemNavigator = this.shadowRoot.querySelector('st-file-system-navigator');
      fileSystemNavigator.updateForPlaybackMovement();
    }
  }

  updateForFileSelected() {
    //forward the message on to the right tab
    if(this.activeTab === 'fileSystem') {
      const fileSystemNavigator = this.shadowRoot.querySelector('st-file-system-navigator');
      fileSystemNavigator.updateForFileSelected();
    } 
  }

  updateToDisplaySearchResults(searchResults){
    const commentNavigator = this.shadowRoot.querySelector('st-comment-navigator');
    commentNavigator.updateToDisplaySearchResults(searchResults);
  }

  updateForTitleChange(newTitle) {
    if(this.activeTab === 'comments') {
      const commentNavigator = this.shadowRoot.querySelector('st-comment-navigator');
      commentNavigator.updateForTitleChange(newTitle);
    }
  }
}

window.customElements.define('st-playback-navigator', PlaybackNavigator);