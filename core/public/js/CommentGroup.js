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

        :host(.activeCommentGroup) {
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
      </style>

      <div class="commentViews"></div>
      <button id="editCommentGroupButton" class="inactive">edit group</button>
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

      commentViews.appendChild(commentView);
    }
    //if this is an editable playback
    if(this.playbackEngine.playbackData.isEditable) {
      //add an edit button
      const editCommentGroupButton = this.shadowRoot.querySelector('#editCommentGroupButton');
      editCommentGroupButton.classList.remove('inactive');
      editCommentGroupButton.addEventListener('click', this.beginEditCommentGroup);
    }
  }

  disconnectedCallback() {
  }

  makeCommentViewInactive() {
    //get the active comment view and make it inactive
    const activeCommentView = this.shadowRoot.querySelector('.activeComment');
    if(activeCommentView) {
      activeCommentView.classList.remove('activeComment');
    }
  }

  makeCommentViewActive() {
    //get the new active comment view and make it active
    const newActiveCommentView = this.shadowRoot.querySelector(`st-comment-view#${this.playbackEngine.activeComment.id}`);
    newActiveCommentView.classList.add('activeComment');

    //get the rectangle around the active comment that is displayed
    const commentRectangle = newActiveCommentView.getBoundingClientRect();
    
    //if the comment's top/bottom edge is  off of the screen (+/- 50px)
    if (commentRectangle.bottom - 50 < 0 || commentRectangle.top > window.innerHeight - 50) {
      //scroll to the active comment
      newActiveCommentView.scrollIntoView({behavior: "smooth", block: "start", inline: "center"})
    }
  }

  updateForCommentEdit(editedComment) {
    //get the old comment view that will be replaced
    const oldCommentView = this.shadowRoot.querySelector(`st-comment-view#${editedComment.id}`);
    //create a new comment view with the edited comment
    const newCommentView = new CommentView({
        comment: editedComment,
        playbackEngine: this.playbackEngine,
        isDescriptionComment: oldCommentView.isDescriptionComment,
        commentNumber: oldCommentView.commentNumber,
        totalNumberOfComments: this.totalNumberOfComments
      }
    );
    newCommentView.setAttribute('id', editedComment.id);

    //replace the old comment view with a new one
    const commentViews = this.shadowRoot.querySelector('.commentViews');
    commentViews.replaceChild(newCommentView, oldCommentView);
  }

  hideIrrelevantSearchResults(hideAllButThese) {
    //number of comments in the group that are not in the search results
    let hiddenCommentCount = 0;
    //get all of the comment views in this group
    const allCommentViews = this.shadowRoot.querySelectorAll('st-comment-view');
    allCommentViews.forEach(commentView => {
      //if a comment view is not among the relevant search comments
      if(hideAllButThese.has(commentView.comment.id) === false) {
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
    const allCommentViews = this.shadowRoot.querySelectorAll('.nonRelevantSearchResult');
    allCommentViews.forEach(commentView => {
      //reveal them by removing the hidden class
      commentView.classList.remove('nonRelevantSearchResult');
    });

    //if this comment group was previously hidden, make it visible again
    if(this.classList.contains('nonRelevantSearchResult')) {
      this.classList.remove('nonRelevantSearchResult');
    }
  }
  
  updateForCommentGroupEditing() {
    const allCommentViews = this.shadowRoot.querySelectorAll('st-comment-view');
    allCommentViews.forEach(commentView => {
      commentView.updateForCommentGroupEditing();
    });
  }
  
  updateForCommentGroupEditingComplete() {
    const allCommentViews = this.shadowRoot.querySelectorAll('st-comment-view');
    allCommentViews.forEach(commentView => {
      commentView.updateForCommentGroupEditingComplete();
    });
  }

  updateForReordering() {
    //only make comment views draggable if there are more than one
    if(this.comments.length > 1) {
      //make all of the comment views in this comment group draggable
      const allCommentViews = this.shadowRoot.querySelectorAll('st-comment-view');
      for(let i = 0;i < allCommentViews.length;i++) {
        const commentView = allCommentViews[i];

        commentView.setAttribute('draggable', true);
        commentView.addEventListener("dragstart", event => {
          //while being dragged add a class so it can be found later
          commentView.classList.add('dragging');
          event.dataTransfer.effectAllowed = "move";
        });

        //make this CommentGroup a drop zone
        //when a CommentView is dropped in the CommentGroup
        this.shadowRoot.host.addEventListener('drop', event => {
          event.preventDefault();
          //reorder the comments based on where the comment view was dropped
          this.sortCommentViews(event.clientY);
        });
        this.shadowRoot.host.addEventListener("dragover", event => {
          event.dataTransfer.dropEffect = "move"
          event.preventDefault();
        });
      }  
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
        this.reorderComments(updatedCommentPosition);
      }
    }
  }

  updateForReorderingComplete() {
    //make the comment views non-draggable
    const allCommentViews = this.shadowRoot.querySelectorAll('st-comment-view');
    allCommentViews.forEach(commentView => {
      commentView.removeAttribute('draggable');
    });
  }

  beginEditCommentGroup = () => {
    const event = new CustomEvent('begin-edit-comment-group', { 
      detail: {
        selectedCommentGroupId: this.comments[0].id
      },
      bubbles: true, 
      composed: true 
    });
    this.dispatchEvent(event);
  }

  reorderComments = (updatedCommentPosition) => {
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