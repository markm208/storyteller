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
          flex-wrap: wrap;
          justify-content: right;
          align-items: baseline;
        }

        button {
          background-color: transparent;
          color: lightgray;
          border: none;
          font-size: .8em;
          cursor: pointer;
          padding-right: 2px;
        }

        .tagDiv {
          background-color: transparent;
          border: 1px solid lightgray;
          padding:5px;
          border-radius: 5px;
          display: inline-block;
          opacity: .8;
          margin: 2px;
        }
        .tagDiv:hover {
          opacity: 1;
        }

        .tagLabel {
          color: lightgray;
          font-size: .8em;
          margin-right: 2px;
        }

        .hidden {
          display: none;
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

  createTag(tagText) {
    const tagDiv = document.createElement('div');
    //add the tag name to the class for easy searching later
    tagDiv.classList.add(tagText);
    tagDiv.classList.add('tagDiv');

    //make a button for each tag
    const newTag = document.createElement('button');
    newTag.appendChild(document.createTextNode(tagText));
    //when the button is clicked perform a search for comments with this tag
    newTag.addEventListener('click', event => {
      //send event to search for this tag
      this.sendSearchRequest(tagText);
    });
    
    const clearButton = document.createElement('button');
    clearButton.classList.add('hidden');
    clearButton.appendChild(document.createTextNode('✕'));
    clearButton.addEventListener('click', event => {
      //send an empty string to search for
      this.sendSearchRequest('');
      event.stopPropagation();
    });

    tagDiv.appendChild(newTag);
    tagDiv.appendChild(clearButton);

    return tagDiv;
  }

  highlightTag(searchText) {
    //get the tag by searching for it (if it is present)
    const tagDiv = this.shadowRoot.querySelector(`.${searchText}`);
    if(tagDiv) {
      //make the clear button visible
      const clearButton = tagDiv.children[1];
      clearButton.classList.remove('hidden');
    }
  }
  
  dehighlightTags() {
    //get all of the tags
    const tagDivs = this.shadowRoot.querySelectorAll('.tagDiv');
    tagDivs.forEach(tagDiv => {
      //hide each clear button
      const clearButton = tagDiv.children[1];
      clearButton.classList.add('hidden');
    });
  }

  sendSearchRequest(searchText) {
    const event = new CustomEvent('search', { 
      detail: {searchText: searchText.length > 0 ? `tag:${searchText}` : ''},
      bubbles: true, 
      composed: true 
    });
    this.dispatchEvent(event);
  }
}

window.customElements.define('st-tag-view', TagView);