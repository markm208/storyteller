/**
 * Create a vertical container to display audio, video, or image files.
 * Allows user to change the order of media as well as removal. 
 * 
 * 
 * mediaType should be 'audio', 'video', or 'image' 
 */
class VerticalMediaContainer extends HTMLElement {
    constructor(mediaURLs, mediaType) {
        super();

        this.mediaURLs = mediaURLs;
        this.mediaType = mediaType.toLowerCase();

        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(this.getTemplate());
    }

    getTemplate() {
        const template = document.createElement('template');
        // const tempType = this.mediaType + 's';

        const typeLabel = this.mediaType.charAt(0).toUpperCase() + this.mediaType.slice(1) + 's';
        template.innerHTML = `<style> 
        .mediaContainer{
            display: grid;
        }
        .draggable{
            height: 80%;
            width: 50%;
        }
        .removeMedia{
            color: red;
            position: absolute;
            cursor: pointer;
        }
        </style>

        
        <div class='mediaContainer'>${typeLabel}       
        
        </div>`;
        return template.content.cloneNode(true);
    }

    connectedCallback() {
        const mediaContainer = this.shadowRoot.querySelector('.mediaContainer');
        this.mediaURLs.forEach(mediaURL => {
            const mediaDiv = document.createElement('div');
            mediaDiv.classList.add('mediaDiv');

            //clean this all up
            let media;
            if (this.mediaType === 'image') {
                media = document.createElement('img');
            } else { //video and audio
                media = document.createElement(this.mediaType);
                media.setAttribute('controls', '');
                media.onplay = () => {
                    media.classList.add('playing');
                    //send event to pause all media in all VMCs
                };

                media.onpause = () => {
                    media.classList.remove('playing');
                    console.log('paused');
                }
            }
            media.setAttribute('src', mediaURL);
            media.setAttribute('draggable', 'true');
            media.classList.add('draggable');

            media.addEventListener('dragstart', () => {
                this.pauseMedia();
                media.classList.add('dragging');
            })

            media.addEventListener('dragend', () => {
                //more needed here?
                media.classList.remove('dragging');
            })

            //media.setAttribute('preload', 'metadata');   


            //commentVideo.classList.add('commentVideo');


            const removeMediaButton = document.createElement('btn');
            removeMediaButton.classList.add('removeMedia');
            removeMediaButton.title = `Remove ${this.mediaType}`;
            removeMediaButton.innerHTML = 'X';


            removeMediaButton.addEventListener('click', () =>{
                mediaContainer.removeChild(mediaDiv);
            })

            mediaDiv.appendChild(media);

            mediaDiv.appendChild(removeMediaButton);
            mediaContainer.appendChild(mediaDiv);
        })

        mediaContainer.addEventListener('dragover', event => {
            const draggable = mediaContainer.querySelector('.dragging');
            if (draggable) {
                event.preventDefault();
                const afterElement = this.getDragAfterElement(event.clientY);
                if (typeof afterElement === 'undefined') {
                    mediaContainer.appendChild(draggable.parentElement); 
                } else {
                    mediaContainer.insertBefore(draggable.parentElement, afterElement.parentElement);
                }
            }
        })
    }

    disconnectedCallback() {
        //TODO remove eventListeners?
    }
    
    getURLsInOrder() {
        const allMedia = this.shadowRoot.querySelectorAll('.draggable');

        let retVal = [];
        allMedia.forEach(media => {
            retVal.push(media.src);
        })
        return retVal;
    }

    getDragAfterElement(y) {
        const container = this.shadowRoot.querySelector('.mediaContainer');
        const draggableElements = [...container.querySelectorAll('.draggable:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {

            //gives us the dimensions of the box
            const box = child.getBoundingClientRect();

            //getting the center of the box
            const offset = y - box.top - box.height / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element
    }

    pauseMedia() {
        if (this.mediaType === 'video' || this.mediaType === 'audio') {
            const playing = this.shadowRoot.querySelector('.playing');

            if (playing) {
                playing.pause();
                playing.classList.remove('playing'); //this probably isn't need cause it happens in the onpause listener
            }
        }
    }
}
window.customElements.define('st-vertical-media-container', VerticalMediaContainer);
