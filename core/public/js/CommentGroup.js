class CommentGroup extends HTMLElement {
  constructor(commentGroupData) {
    super();

    this.comments = commentGroupData.comments;
    this.firstCommentGroup = commentGroupData.firstCommentGroup;
    this.startingCommentNumber = commentGroupData.startingCommentNumber;
    this.totalNumberOfComments = commentGroupData.totalNumberOfComments;
    this.playbackEngine = commentGroupData.playbackEngine;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host {
          margin: 6px 0px;
          padding: 2px 2px;
          display: flex;
          flex-direction: column;
        }

        :host(.activeCommentGroup) .commentViews {
          background-color: rgb(63, 63, 63);
          border: 3px gray solid;  
          border-radius: .2rem;
          padding: 0px 0px;
        }

        :host(.nonRelevantSearchResult) {
          display: none;
        }

        .inactive {
          display: none;
        }

        #editCommentGroupButton {
          background-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' fill='lightgray' class='bi bi-list-ol' viewBox='0 0 16 16'><path fill-rule='evenodd' d='M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5z'/><path d='M1.713 11.865v-.474H2c.217 0 .363-.137.363-.317 0-.185-.158-.31-.361-.31-.223 0-.367.152-.373.31h-.59c.016-.467.373-.787.986-.787.588-.002.954.291.957.703a.595.595 0 0 1-.492.594v.033a.615.615 0 0 1 .569.631c.003.533-.502.8-1.051.8-.656 0-1-.37-1.008-.794h.582c.008.178.186.306.422.309.254 0 .424-.145.422-.35-.002-.195-.155-.348-.414-.348h-.3zm-.004-4.699h-.604v-.035c0-.408.295-.844.958-.844.583 0 .96.326.96.756 0 .389-.257.617-.476.848l-.537.572v.03h1.054V9H1.143v-.395l.957-.99c.138-.142.293-.304.293-.508 0-.18-.147-.32-.342-.32a.33.33 0 0 0-.342.338v.041zM2.564 5h-.635V2.924h-.031l-.598.42v-.567l.629-.443h.635V5z'/></svg>");
          background-repeat: no-repeat;
          height: 2em;
          width: 2em;
          border: none;    
          margin: 0px 15px;
          background-color: transparent;
          opacity: 70%;
          float: right;
          cursor: pointer;
        }
        #editCommentGroupButton:hover {
          opacity: 100%;
        }

        #doneEditingCommentGroupButton {
          background-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' fill='lightgray' class='bi bi-check-square' viewBox='0 0 16 16'><path d='M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z'/><path d='M10.97 4.97a.75.75 0 0 1 1.071 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.235.235 0 0 1 .02-.022z'/></svg>");
          background-repeat: no-repeat;
          height: 2em;
          width: 2em;
          border: none;    
          margin: 0px 15px;
          background-color: transparent;
          opacity: 70%;
          float: right;
          cursor: pointer;
        }
        #doneEditingCommentGroupButton:hover {
          opacity: 100%;
        }
      </style>

      <div class="commentViews"></div>
      <div>
        <button id="editCommentGroupButton" class="inactive" title="Reorder the comments with drag and drop."></button>
        <button id="doneEditingCommentGroupButton" class="inactive" title="End comment reordering."></button>
      </div>
      `;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    const commentViews = this.shadowRoot.querySelector('.commentViews');
    //go through all of the comments in this group
    for(let i = 0;i < this.comments.length;i++) {
      const comment = this.comments[i];

      let isDescriptionComment = false;
      if(this.firstCommentGroup && i === 0) {
        isDescriptionComment = true;
      } 
      //create a comment view for the comment
      const commentView = new CommentView({
        comment: comment,
        playbackEngine: this.playbackEngine,
        isDescriptionComment: isDescriptionComment,
        commentNumber: this.startingCommentNumber + i,
        totalNumberOfComments: this.totalNumberOfComments
      });
      //give the comment view the id of the comment
      commentView.setAttribute('id', comment.id);
      //add the comment view to this comment group
      commentViews.appendChild(commentView);
    }
    //if this is an editable playback with more than one comment in this group
    if(this.playbackEngine.playbackData.isEditable && this.comments.length > 1) {
      //add an edit order button
      const editCommentGroupButton = this.shadowRoot.querySelector('#editCommentGroupButton');
      editCommentGroupButton.addEventListener('click', this.updateForCommentGroupEditing);
      //and a 'done' button
      const doneEditingCommentGroupButton = this.shadowRoot.querySelector('#doneEditingCommentGroupButton');
      doneEditingCommentGroupButton.addEventListener('click', this.updateForCommentGroupEditingComplete);
    }
  }

  disconnectedCallback() {
  }

  makeCommentGroupActive() {
    //make this comment group active
    this.shadowRoot.host.classList.add('activeCommentGroup');

    //get all of the comment views in this group
    const allCommentViewsInGroup = this.shadowRoot.querySelectorAll('st-comment-view');
    allCommentViewsInGroup.forEach(commentView => {
      //make the group active
      commentView.makePartOfActiveGroup();
    });

    //get the new active comment view and make it active
    const newActiveCommentView = this.shadowRoot.querySelector(`st-comment-view#${this.playbackEngine.activeComment.id}`);
    newActiveCommentView.makeCommentViewActive();

    //if there are more than one comments in this group
    if(this.playbackEngine.playbackData.isEditable && this.comments.length > 1) {
      //make the order button visible
      const editCommentGroupButton = this.shadowRoot.querySelector('#editCommentGroupButton');
      editCommentGroupButton.classList.remove('inactive');
    }
  }

  makeCommentGroupInactive() {
    //make this comment group inactive
    this.shadowRoot.host.classList.remove('activeCommentGroup');

    //get all of the comment views in this group
    const allCommentViewsInGroup = this.shadowRoot.querySelectorAll('st-comment-view');
    allCommentViewsInGroup.forEach(commentView => {
      //make the group inactive
      commentView.makePartOfInactiveGroup();
    });
    
    //get the active comment view (if there is one) and make it inactive
    const activeCommentView = this.shadowRoot.querySelector('.activeComment');
    if(activeCommentView) {
      activeCommentView.makeCommentViewInactive();
    }

    //if this group has a visible reorder button, make it invisible
    const editCommentGroupButton = this.shadowRoot.querySelector('#editCommentGroupButton');
    editCommentGroupButton.classList.add('inactive');
  }

  updateToDisplaySearchResults(searchResults) {
    //number of comments in the group that are not in the search results
    let hiddenCommentCount = 0;

    //get all of the comment views in this group
    const allCommentViews = this.shadowRoot.querySelectorAll('st-comment-view');
    allCommentViews.forEach(commentView => {
      //if a comment view is among the relevant search comments
      if(searchResults.details[commentView.comment.id]) {
        //update the comment view with the results
        commentView.updateToDisplaySearchResults(searchResults.details[commentView.comment.id]);
      } else { //this comment view should be hidden
        //hide the comment
        commentView.classList.add('nonRelevantSearchResult');
        //count how many comments in the group are hidden
        hiddenCommentCount++;
      }
    });

    //if all of the comments in a group are hidden
    if(hiddenCommentCount === allCommentViews.length) {
      //hide the comment group too so it doesn't take up space in the UI
      this.classList.add('nonRelevantSearchResult');
    }
  }

  revealCommentsBeforeSearch() {
    //get all of the hidden comment views
    const allCommentViews = this.shadowRoot.querySelectorAll('st-comment-view');
    allCommentViews.forEach(commentView => {
      if(commentView.classList.contains('nonRelevantSearchResult')) {
        //reveal them by removing the hidden class
        commentView.classList.remove('nonRelevantSearchResult');
      }
      commentView.revealCommentsBeforeSearch();
    });

    //if this comment group was previously hidden, make it visible again
    if(this.classList.contains('nonRelevantSearchResult')) {
      this.classList.remove('nonRelevantSearchResult');
    }
  }
  
  updateForCommentGroupEditing = () => {
    //make the edit button invisible
    const editCommentGroupButton = this.shadowRoot.querySelector('#editCommentGroupButton');
    editCommentGroupButton.classList.add('inactive');

    //make the done button visible
    const doneEditingCommentGroupButton = this.shadowRoot.querySelector('#doneEditingCommentGroupButton');
    doneEditingCommentGroupButton.classList.remove('inactive');

    //make all of the comment views in this comment group draggable
    const allCommentViews = this.shadowRoot.querySelectorAll('st-comment-view');
    for(let i = 0;i < allCommentViews.length;i++) {
      const commentView = allCommentViews[i];
      commentView.setAttribute('draggable', true);
      commentView.addEventListener('dragstart', event => {
        //while being dragged add a class so it can be found later
        commentView.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
      });
    }
    //make this CommentGroup a drop zone
    //when a CommentView is dropped in the CommentGroup
    this.shadowRoot.host.addEventListener('drop', event => {
      event.preventDefault();
      //reorder the comments based on where the comment view was dropped
      this.sortCommentViews(event.clientY);
      console.log('handling a drop');
    });
    this.shadowRoot.host.addEventListener('dragover', event => {
      event.dataTransfer.dropEffect = 'move';
      event.preventDefault();
    });
  }
  
  updateForCommentGroupEditingComplete = () => {
    //make the edit button visible
    const editCommentGroupButton = this.shadowRoot.querySelector('#editCommentGroupButton');
    editCommentGroupButton.classList.remove('inactive');

    //make the done button invisible
    const doneEditingCommentGroupButton = this.shadowRoot.querySelector('#doneEditingCommentGroupButton');
    doneEditingCommentGroupButton.classList.add('inactive');
    
    //make the comment views non-draggable
    const allCommentViews = this.shadowRoot.querySelectorAll('st-comment-view');
    allCommentViews.forEach(commentView => {
      commentView.removeAttribute('draggable');
    });
  }

  updateForTitleChange(newTitle) {
    //if this is the first comment group
    if(this.firstCommentGroup) {
      const commentViews = this.shadowRoot.querySelector('.commentViews');
      //the first child comment view holds the title
      const firstCommentView = commentViews.children[0];
      firstCommentView.updateForTitleChange(newTitle);
    }
  }

  sortCommentViews(dropYPosition) {
    //get the comment view that was being dragged
    const draggedCommentView = this.shadowRoot.querySelector('.dragging');
    if(draggedCommentView) {
      //remove the dragging class
      draggedCommentView.classList.remove('dragging');

      //the position in the array of comments at this event of the comment being dragged and dropped
      let dragPos;
      let dropPos;

      //get all of the comment views
      const allCommentViews = this.shadowRoot.querySelectorAll('st-comment-view');
      //go through all of the comment views
      for(let i = 0;i < allCommentViews.length;i++) {
        const commentView = allCommentViews[i];

        //get the top and bottom position of every comment view
        const rect = commentView.getBoundingClientRect();
        const topPos = rect.top;
        const bottomPos = rect.bottom;

        //if the dragged comment view has been found
        if(draggedCommentView.comment.id === commentView.comment.id) {
          dragPos = i;
        }

        //if the drop position is in between another comment view's top and bottom
        if(dropYPosition >= topPos && dropYPosition <= bottomPos) {
          dropPos = i;
        }
      }

      //if the comment view needs to move (no need to move to its existing position)
      if(dragPos !== dropPos) {
        //create the reordering data
        const updatedCommentPosition = {
          eventId: draggedCommentView.comment.displayCommentEvent.id,
          oldCommentPosition: dragPos,
          newCommentPosition:dropPos
        };
        //send the event to handle reordering
        this.sendReorderComments(updatedCommentPosition);
      }
    }
  }

  sendReorderComments = (updatedCommentPosition) => {
    const event = new CustomEvent('reorder-comments', { 
      detail: {
        updatedCommentPosition: updatedCommentPosition
      },
      bubbles: true, 
      composed: true 
    });
    this.dispatchEvent(event);
  }
}

window.customElements.define('st-comment-group', CommentGroup);