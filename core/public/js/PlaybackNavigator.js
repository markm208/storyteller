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
          overflow-y: scroll;
          word-wrap: break-word;
          scrollbar-width: thin;
        }

        .active {
          display: block;
        }
      </style>
      
      <div class="tab">
        <button class="tabLink comments activeTab">Comments</button>
        <button class="tabLink fileSystem">File&nbsp;System</button>
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
    commentNavigator.classList.add('active');
    subNavigatorsTab.appendChild(commentNavigator);

    const fileSystemNavigator = new FileSystemNavigator(this.playbackEngine);
    subNavigatorsTab.appendChild(fileSystemNavigator);
  }

  disconnectedCallback() {
    const tabLinks = this.shadowRoot.querySelectorAll('.tabLink');
    tabLinks.forEach(tabLink => {
      tabLink.removeEventListener('click', this.tabClick);
    });
  }

  tabClick = (event) => {
    const tabLinks = this.shadowRoot.querySelectorAll('.tabLink');
    tabLinks.forEach(tabLink => {
      tabLink.classList.remove('activeTab');
    });
    event.target.classList.add('activeTab');

    //get each of the subnavigators
    const commentNavigator = this.shadowRoot.querySelector('st-comment-navigator');
    const fileSystemNavigator = this.shadowRoot.querySelector('st-file-system-navigator');

    //remove the old classes
    commentNavigator.classList.remove('active');
    fileSystemNavigator.classList.remove('active');

    //selected comment navigator
    if(event.target.classList.contains('comments')) {
      //make active
      commentNavigator.classList.add('active');
      this.activeTab = 'comments';
      //update and send event
      if(this.playbackEngine.activeComment.pausedOnComment) {
        commentNavigator.updateSelectedComment();
      }
      this.sendEventPlaybackNavigatorTabClick('comments');
    } else if(event.target.classList.contains('fileSystem')) {
      //make active
      fileSystemNavigator.classList.add('active');
      this.activeTab = 'fileSystem';
      //update and send event
      fileSystemNavigator.updateActiveFile();
      this.sendEventPlaybackNavigatorTabClick('fileSystem');
    }
  }

  sendEventPlaybackNavigatorTabClick(newTab) {
    const event = new CustomEvent('playback-navigator-tab-switch', { 
      detail: {newPlaybackNavTab: newTab},
      bubbles: true, 
      composed: true 
    });
    this.dispatchEvent(event);
  }

  updateSelectedComment() {
    if(this.activeTab === 'comments') {
      const commentNavigator = this.shadowRoot.querySelector('st-comment-navigator');
      commentNavigator.updateSelectedComment();
    } else if(this.activeTab === 'fileSystem') {
      const fileSystemNavigator = this.shadowRoot.querySelector('st-file-system-navigator');
      fileSystemNavigator.updateActiveFile();
    } 
  }

  updateSliderMoved() {
    if(this.activeTab === 'fileSystem') {
      const fileSystemNavigator = this.shadowRoot.querySelector('st-file-system-navigator');
      fileSystemNavigator.updateActiveFile();
    } 
  }

  updateActiveFile() {
    if(this.activeTab === 'fileSystem') {
      const fileSystemNavigator = this.shadowRoot.querySelector('st-file-system-navigator');
      fileSystemNavigator.updateActiveFile();
    }
  }

  performSearch(searchText){
    const commentNavigator = this.shadowRoot.querySelector('st-comment-navigator');
    commentNavigator.performSearch(searchText);
  }
}

window.customElements.define('st-playback-navigator', PlaybackNavigator);