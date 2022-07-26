class CommentTags extends HTMLElement {
  constructor(tags, playbackEngine) {
    super();
    this.playbackEngine = playbackEngine;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());

    //all the default tags
    const permanentCommentTags = ['all-tests-pass', 'successful-run', 'version-control-commit'];

    //all tags from the comment
    let allTags = permanentCommentTags.concat(tags);
    
    //format and alphabetize all of the tags
    allTags = this.formatArrayOfTags(allTags);
    
    //store the tags without dups
    this.masterTagList = new Set(allTags);

    //add the tags that are not already part of the comment's tags to the dropdown of selectable tags
    this.masterTagList.forEach(tagToAvoid => {
      if (!tags.includes(tagToAvoid)) {
        this.addTagToDropdown(tagToAvoid)
      }
    });

    //create and add tag to tagsDiv
    const allTagsInComment = this.formatArrayOfTags(tags);
    allTagsInComment.forEach(tag => {
      this.addTag(tag);
    });
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        .dropDownButton {
          background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="lightgray" class="bi bi-caret-right-fill" viewBox="0 0 16 16"><path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/></svg>');
          background-repeat: no-repeat;
          height: 2.4em;
          width: 2em;
          background-position: center;
          border-radius: 2px;
          border: none;
          background-color: transparent;
          cursor: pointer;
        }

        #addTagButton {
          cursor: pointer;
        }

        .dropDownButton.expanded {
          background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="lightgray" class="bi bi-caret-down-fill" viewBox="0 0 16 16"><path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/></svg>');
        }
        
        .tags {
          display: block;
          background-color: rgb(51,51,51);
          min-width: 20px;
          z-index: 1;
          overflow: hidden;
          transition: height 0.4s ease;
          max-width: 410px;
          height: fit-content;
          word-wrap: break-word;
          padding: 10px;
        }

        .tags.hidden {
          transition: all 0.4s ease;
          height: 0px;
          overflow: hidden;
          border: none;
          padding: 0px;
        }
        
        #outerDiv {
          display: block;
          padding-top: 10px;
          position: relative;
        }
      
        #tagsDiv {
          display: block;
          padding-bottom: 10px;
          padding-top: 5px;
        }

        .tag{
          padding: 5px;
          border-radius: 5px;
          border: solid thin;
          margin-right: 10px;
          margin-top: 10px;
          display: inline-block;
        }

        .tag.dropDownTag{
          cursor: pointer;
        }

        .removeTag{
          background: transparent;
          border: none;
          color: lightblue;
          cursor: pointer;
          font-size: large;
        }

        #tagInput{
          width: 300px;
          color: lightgrey;
          outline: none;
          border: 1px solid grey;
          padding: 5px 10px;
          background-color: transparent;
        }

        #controls {
          display: flex;
        }

        #addTagButton {
          background-color: inherit;
          border: 1px solid gray;
          color: white;
          cursor: pointer;
        }
        #addTagButton:hover {
          background-color: lightgray;
          border: 1px solid lightgray;
          color: black;
        }

        #dropdownControls {
          border: 1px solid gray;
          position: relative;
          height: fit-content;
        }

        #dropdownControls.hidden {
          transition: all 0.4s ease;
          height: 0px;
          overflow: hidden;
          border: none;
          padding: 0px;
        }

        #closeDropDown {
          position: absolute;
          top: 0;
          right: 0;
          color: red;
          border: none;
          background-color: inherit;
          cursor: pointer;
        }
      </style>

      <div id="outerDiv">
        <div id="controls">
          <button class="dropDownButton" title="Expand tag options"></button>
          <input type="text" id="tagInput" placeholder="Enter a tag..." />
          <input type="button" id="addTagButton" value="Add tag" />
        </div>
        <div id="tagsDiv"></div>
        <div id='dropdownControls' class='hidden'>
          <div id="tagsDiv" class="tags hidden"></div>
          <button id="closeDropDown" title='Collapse tag options'>✕</button>
        </div>
      </div>
    `;
    return template.content.cloneNode(true);
  }

  connectedCallback() {
    const tagInput = this.shadowRoot.querySelector('#tagInput');
    const addTagButton = this.shadowRoot.querySelector('#addTagButton');

    addTagButton.addEventListener('click', () => {
      const tagValue = tagInput.value;

      //if there is some text in the tag name input
      if (tagValue.length) {
        //add the tag
        this.addTag(tagValue);
      }
      tagInput.value = '';
    });

    tagInput.addEventListener('keydown', event => {
      //add a key down listener to stop keys from affecting the playback
      event.stopImmediatePropagation();

      if (event.key === 'Enter') {
        addTagButton.click();
      }
    });

    const tagsDiv = this.shadowRoot.getElementById("tagsDiv");
    tagsDiv.style.height = '0px';

    const dropdownControls = this.shadowRoot.querySelector('#dropdownControls');
    dropdownControls.style.height = '0px';

    const dropDownButton = this.shadowRoot.querySelector('.dropDownButton');
    dropDownButton.addEventListener('click', (event) => {
      event.stopImmediatePropagation();
      dropDownButton.classList.toggle('expanded');

      if (dropDownButton.classList.contains('expanded')) {
        dropDownButton.setAttribute('title', 'Collapse tag options');
      } else {
        dropDownButton.setAttribute('title', 'Expand tag options');
      }

      dropdownControls.classList.toggle('hidden');
      tagsDiv.classList.toggle('hidden');

      if (!tagsDiv.classList.contains('hidden')) {
        tagsDiv.style.height = tagsDiv.scrollHeight - 15 + 'px';
        dropdownControls.style.height = dropdownControls.scrollHeight  + tagsDiv.scrollHeight - 15+ 'px';
      } else {
        tagsDiv.style.height = '0px';
        dropdownControls.style.height = '0px';
      }
    });

    const dropdownCloseX = this.shadowRoot.querySelector('#closeDropDown');
    dropdownCloseX.addEventListener('click', () =>{
      dropDownButton.click();
    });

    //prevent the click event from bubbling higher to avoid click listeners in other components
    this.shadowRoot.addEventListener('click', (event) => {
      event.stopImmediatePropagation();
    });
  }

  addEventListenerToDropdownItem(tag) {
    tag.addEventListener('click', (event) => {
      event.stopImmediatePropagation();
      event.preventDefault();

      this.addTag(tag.innerText);
      tag.remove();

      const tags = this.shadowRoot.getElementById("tagsDiv");

      const dropdownControls = this.shadowRoot.querySelector('#dropdownControls');
      if (!dropdownControls.classList.contains('hidden')){
        dropdownControls.style.height = 'fit-content';
        tags.style.height = 'fit-content';
      }
    });
  }

  formatArrayOfTags(arrayOfTags) {
    for (let i = 0; i < arrayOfTags.length; i++) {
      arrayOfTags[i] = this.formatTag(arrayOfTags[i]);
    }
    return arrayOfTags.sort();
  }

  formatTag(tag) {
    return tag.trim().toLowerCase().replaceAll(' ', '-');
  }

  addTagToDropdown(tag) {
    const tagsDiv = this.shadowRoot.querySelector('#tagsDiv');
    const dropDownTagsDiv = this.shadowRoot.querySelectorAll('.dropDownTag');
    const tagsArray = [tag];

    dropDownTagsDiv.forEach(dropDownTag => {
      tagsArray.push(dropDownTag.innerText);
    });
    tagsArray.sort();

    tagsDiv.innerHTML = '';
    tagsArray.forEach(dropDownTag => {
      const newTag = this.createTag(dropDownTag, false);
      tagsDiv.appendChild(newTag);

      const testing = this.shadowRoot.querySelector('#dropdownControls');

      if (!tagsDiv.classList.contains('hidden'))
        tagsDiv.style.height = 'fit-content';
        testing.style.height = 'fit-content';
    });
  }

  addTag(tag) {
    tag = this.formatTag(tag);
    let allTags = this.getAllTags();

    if (!allTags.includes(tag)) {
      //if the tag is not in the comment but it is in the masterTagList
      if (this.masterTagList.has(tag)){
        const dropdownItems = [...this.shadowRoot.querySelectorAll('.dropDownTag')];
        dropdownItems.forEach(dropdownItem => {
          if (dropdownItem.innerText === tag){
            dropdownItem.click();
            return;
          }
        });
      }

      allTags.push(tag);
      allTags.sort();

      const tagDiv = this.shadowRoot.querySelector('#tagsDiv');
      tagDiv.innerHTML = '';
      allTags.forEach(tag => {
        const newTag = this.createTag(tag);
        tagDiv.appendChild(newTag);
      });
    }
  }

  createTag(tag, isCommentTag = true) {
    const newTag = document.createElement("div");
    newTag.appendChild(document.createTextNode(tag));
    newTag.classList.add('tag');

    if (isCommentTag) {
      const removeTagButton = document.createElement('button');
      removeTagButton.innerHTML = '✕';
      removeTagButton.classList.add('removeTag');
      removeTagButton.title = 'Remove tag';

      removeTagButton.addEventListener('click', () => {
        newTag.remove();
        if (this.masterTagList.has(tag)) {
          this.addTagToDropdown(tag);
        }
      });
      newTag.appendChild(removeTagButton);
    } else { //tag in the dropdown list
      newTag.classList.add('dropDownTag');
      newTag.setAttribute('title', 'Add tag to comment');
      this.addEventListenerToDropdownItem(newTag);
    }
    return newTag;
  }

  getAllTags() {
    const retVal = [];
    const allTags = this.shadowRoot.querySelectorAll('.tag:not(.dropDownTag)');
    allTags.forEach(tag => {
      retVal.push(tag.firstChild.textContent);
    });
    return retVal;
  }

  closeDropDown() {
    const tags = this.shadowRoot.getElementById("tagsDiv");

    if (!tags.classList.contains('hidden')) {
      const dropDownButton = this.shadowRoot.querySelector('.dropDownButton');
      dropDownButton.click();
    }
  }
}
window.customElements.define('st-comment-tags', CommentTags);
