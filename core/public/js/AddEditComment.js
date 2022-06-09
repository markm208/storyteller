class AddEditComment extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
      .commentText {
          min-height: 200px;
          color: lightgrey;
          outline: 0px solid transparent;
          border: 1px solid grey;
          padding: 5px 10px;
          margin: 5px;
          overflow: auto;
          resize: vertical;
        }
        .promptVisible {
          font-style: italic;
          color: grey;
        }
        .controlButton {
          color: white;
          padding: 8px 10px;
          border: none;
          cursor: pointer;
          border-radius: .25rem;
          font-size: 1.20rem;
        }
        #cancelButton {
          background-color: red;
          margin-left: 5px;
        }
        #submitButton {
          background-color: black;
        }
        .editorControls {
          test-size: .75rem;
        }
      </style>
      <div class="commentText promptVisible" 
           contenteditable="true" 
           data-placeholder="Describe the code at this point"></div>
      <div class="editorControls">
        <button>B</button>
        <button>I</button>
        <button>&lt/&gt;</button>
        <button>Media</button>
      </div>
      <button id="cancelButton" class="controlButton">Cancel</button>
      <button id="submitButton" class="controlButton">Add Comment</button>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    const cancelButton = this.shadowRoot.querySelector('#cancelButton');
    cancelButton.addEventListener('click', this.cancelAddEditComment);
    const submitButton = this.shadowRoot.querySelector('#cancelButton');

    //set the placeholder text
    const commentText = this.shadowRoot.querySelector('.commentText');
    const placeholder = commentText.getAttribute('data-placeholder');
    commentText.innerHTML = placeholder;
    
    //update the placeholder text on focus and blur
    commentText.addEventListener('focus', event => {
      const value = commentText.textContent;
      if(value === placeholder) {
        commentText.innerHTML = '';
        commentText.classList.remove('promptVisible');
      }
    });

    commentText.addEventListener('blur', event => {
      const value = commentText.textContent;
      if(value === '') {
        commentText.innerHTML = placeholder;
        commentText.classList.add('promptVisible');
      }
    });

    //prevent normal text editing from firing any keyboard shortcuts
    this.addEventListener('keydown', event => {
      event.stopPropagation();
    });
  }

  disconnectedCallback() {
  }

  cancelAddEditComment = () => {
    const event = new CustomEvent('cancel-add-edit-comment', { 
      bubbles: true, 
      composed: true 
    });
    this.dispatchEvent(event);
  }
}

window.customElements.define('st-add-edit-comment', AddEditComment);