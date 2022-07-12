class TagView extends HTMLElement {
  constructor(comment) {
    super();
    
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
    this.comment = comment;
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        .tagContainer {
          display: flex;
          justify-content: right;
          align-items: baseline;
        }

        .tag {
          background-color: transparent;
          color: lightgray;
          border: 1px solid lightgray;
          padding: 5px;
          margin-right: 5px;
          margin-top: 10px;
          border-radius: 5px;
          display: inline-block;
          font-size: .7em;
        }

        .tag:hover {
          background-color: lightgray;
          color: black;
        }
        .tagLabel {
          color: lightgray;
          font-size: .8em;
          margin-right: 2px;
        }
      </style>
      <div class="tagContainer"></div>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    //create a label
    const tagContainer = this.shadowRoot.querySelector('.tagContainer');
    const tagLabel = document.createElement('span');
    tagLabel.classList.add('tagLabel');
    tagLabel.innerHTML = 'tags:';
    tagContainer.appendChild(tagLabel);

    //create tag elements and add them to the div
    this.comment.commentTags.forEach(tag => {
      tagContainer.appendChild(this.createTag(tag));
    });
  }

  disconnectedCallback() {
  }

  createTag(tag) {
    //make a button for each tag
    const newTag = document.createElement('button');
    newTag.classList.add('tag');
    newTag.appendChild(document.createTextNode(tag));
    //when the button is clicked perform a search for comments with this tag
    newTag.addEventListener('click', () => {
      //send event to search for this tag
      this.sendSearchRequest(tag);
    });

    return newTag;
  }

  sendSearchRequest(searchText) {
    const event = new CustomEvent('search', { 
      detail: {searchText: searchText}, 
      bubbles: true, 
      composed: true 
    });
    this.dispatchEvent(event);
  }
}

window.customElements.define('st-tag-view', TagView);