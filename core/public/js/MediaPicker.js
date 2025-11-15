class MediaPicker extends HTMLElement {
  constructor(playbackEngine) {
    super();
    this.playbackEngine = playbackEngine;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        .modal {
          display: none;
          position: fixed;
          z-index: 1000;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          overflow: auto;
          background-color: rgba(0,0,0,0.7);
        }
        .modal-content {
          background-color: #2E2E2E;
          margin: 5% auto;
          padding: 20px;
          border: 1px solid #888;
          width: 80%;
          max-width: 1200px;
          border-radius: 10px;
        }
        .close {
          color: #aaa;
          float: right;
          font-size: 28px;
          font-weight: bold;
        }
        .close:hover,
        .close:focus {
          color: white;
          text-decoration: none;
          cursor: pointer;
        }
        .media-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          max-height: 70vh;
          overflow-y: auto;
        }
        .thumbnail-container {
          /* This container is now ONLY for videos and audio placeholders */
          width: 100%;
          min-height: 150px; 
          border-radius: 5px;
          background-color: #333;
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }

        .media-thumbnail {
          /* This is the base style for both <img> and <video> */
          display: block; /* Ensures proper layout */
          width: 100%;
          border-radius: 5px;
          background-color: #000;
          transition: transform 0.2s;
        }

        .media-thumbnail:hover {
            transform: scale(1.05);
        }

        .placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ccc;
          font-family: sans-serif;
          background-color: #444;
        }

        .hidden {
          display: none;
        }
      </style>
      <div id="mediaPickerModal" class="modal">
        <div class="modal-content">
          <span class="close">&times;</span>
          <h2>Search Comments by Media</h2>
          <div class="media-grid"></div>
        </div>
      </div>
    `;
    return template.content.cloneNode(true);
  }

  connectedCallback() {
    const modal = this.shadowRoot.querySelector('#mediaPickerModal');
    const closeButton = this.shadowRoot.querySelector('.close');

    // Listener for the 'X' button
    closeButton.onclick = () => this.hide();

    //listener for background modal
    modal.addEventListener('click', (event) => {
      //if the direct target of the click is the modal background itself then hide it
      if (event.target === modal) {
        this.hide();
      }
    });

    this.populateMediaGrid();
  }

  populateMediaGrid() {
    const mediaGrid = this.shadowRoot.querySelector('.media-grid');
    const comments = this.playbackEngine.commentInfo.flattenedComments;

    comments.forEach(comment => {
      ['imageURLs', 'videoURLs', 'audioURLs'].forEach(mediaType => {
        comment[mediaType].forEach(url => {
          const thumbnail = this.createThumbnail(url, mediaType, comment.id);
          mediaGrid.appendChild(thumbnail);
        });
      });
    });
  }

  createThumbnail(url, mediaType, commentId) {
    if (mediaType === 'imageURLs') {
      // For images, create the element directly without a wrapper
      const thumbnail = document.createElement('img');
      thumbnail.src = url;
      thumbnail.classList.add('media-thumbnail');
      thumbnail.onclick = () => {
        this.dispatchEvent(new CustomEvent('media-selected', {
          detail: { commentId },
          bubbles: true,
          composed: true
        }));
        this.hide();
      };
      return thumbnail; // Return the <img> element itself

    } else {
      // For video and audio, we still use the container for the placeholder logic
      const container = document.createElement('div');
      container.classList.add('thumbnail-container');
      container.onclick = () => {
        this.dispatchEvent(new CustomEvent('media-selected', {
          detail: { commentId },
          bubbles: true,
          composed: true
        }));
        this.hide();
      };

      if (mediaType === 'videoURLs') {
        const placeholder = document.createElement('div');
        placeholder.classList.add('placeholder');
        placeholder.textContent = 'Loading Video...';
        container.appendChild(placeholder);

        const thumbnail = document.createElement('video');
        thumbnail.src = url;
        thumbnail.preload = 'metadata';
        thumbnail.muted = true;
        thumbnail.classList.add('media-thumbnail', 'hidden');
        // This makes the video fill the container, which is fine for a preview
        thumbnail.style.height = '100%';
        thumbnail.style.objectFit = 'cover';
        container.appendChild(thumbnail);

        thumbnail.addEventListener('loadedmetadata', () => {
          placeholder.style.display = 'none';
          thumbnail.classList.remove('hidden');
        });

        thumbnail.addEventListener('error', () => {
          placeholder.textContent = 'Media Error';
        });

      } else { // Audio
        const placeholder = document.createElement('div');
        placeholder.classList.add('placeholder');
        placeholder.textContent = 'Audio';
        container.appendChild(placeholder);
      }

      return container; // Return the container element
    }
  }

show() {
    this.shadowRoot.querySelector('#mediaPickerModal').style.display = 'block';
    // Add the listener when the modal is shown
    document.addEventListener('keydown', this.handleEscapeKey);
  }

  hide() {
    this.shadowRoot.querySelector('#mediaPickerModal').style.display = 'none';
    // CRUCIAL: Remove the listener when the modal is hidden to clean up
    document.removeEventListener('keydown', this.handleEscapeKey);
  }

  // This is the new method you are adding
  handleEscapeKey = (event) => {
    // If the pressed key is 'Escape', hide the modal
    if (event.key === 'Escape') {
      this.hide();
    }
  }
}

window.customElements.define('st-media-picker', MediaPicker);