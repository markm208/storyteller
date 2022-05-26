class ImageGallery extends HTMLElement {
  constructor(imageURLs, withZoom) {
    super();

    this.imageURLs = imageURLs;
    this.withZoom = withZoom;
    this.slideIndex = 0;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        .galleryContainer {
          max-width: 1000px;
          position: relative;
          margin: auto;
        }

        .slide {
          display: none;
        }

        .hideButton {
          display: none;
        }

        .prevButton, .nextButton {
          cursor: pointer;
          position: absolute;
          top: 50%;
          width: auto;
          margin-top: -22px;
          padding: 8px;
          color: lightgray;
          font-weight: bold;
          font-size: 18px;
          transition: 0.3s ease;
          border-radius: 0 3px 3px 0;
          user-select: none;
        }

        .nextButton {
          right: 0;
          border-radius: 3px 0 0 3px;
        }

        .prevButton:hover, .nextButton:hover {
          background-color: rgba(0,0,0,0.25);
        }

        .numberText {
          color: lightgray;
          padding: 8px 12px;
        }

        .galleryImage {
          width: 80%;
        }

        .mediaDiv {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 10px 0px 5px 0px;
        }

        .fade {
          -webkit-animation-name: fade;
          -webkit-animation-duration: 1.0s;
          animation-name: fade;
          animation-duration: 1.0s;
        }

        @-webkit-keyframes fade {
          from {opacity: .4}
          to {opacity: 1}
        }

        @keyframes fade {
          from {opacity: .4}
          to {opacity: 1}
        }

        .modal {
          display: none;
          position: fixed;
          z-index: 100; 
          padding-top: 100px;
          left: 0;
          top: 0;
          width: 100%; 
          height: 100%; 
          overflow: auto; 
          background-color: rgb(0,0,0); 
          background-color: rgba(0,0,0,0.9); 
        }

        .modalContent {
          margin: auto;
          display: block;
          width: unset;
          height: 90%; 
          width: unset;
          overflow: scroll;
          animation-name: zoom;
          animation-duration: 0.6s;
        }

        @keyframes zoom {
          from {opacity: 0.0}
          to {opacity: 1.0}
        }

        .close {
          position: absolute;
          top: 15px;
          right: 35px;
          color: lightgray;
          font-size: 40px;
          font-weight: bold;
        }

        .close:hover,
        .close:focus {
          color: #bbb;
          text-decoration: none;
          cursor: pointer;
        }

        /* 100% Image Width on Smaller Screens */
        @media only screen and (max-width: 700px){
          .modal-content {
            width: 100%;
          }
        }
      </style>

      <div class="galleryContainer">
        <a class="prevButton">&#10094;</a>
        <a class="nextButton">&#10095;</a>
      </div>
      <div class="modal">
        <span class="close">&times;</span>
        <img class="modalContent">
      </div>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    const galleryContainer = this.shadowRoot.querySelector('.galleryContainer');

    //if there is only one pic in the gallery hide the buttons
    if(this.imageURLs.length === 1) {
      const nextButton = this.shadowRoot.querySelector('.nextButton');
      const prevButton = this.shadowRoot.querySelector('.prevButton');
      nextButton.classList.add('hideButton');
      prevButton.classList.add('hideButton');
    }
    
    for(let i = 0;i < this.imageURLs.length;i++) {
      const imageURL = this.imageURLs[i];

      const aSlide = document.createElement('div');
      aSlide.classList.add('slide');
      aSlide.classList.add('fade');
      aSlide.classList.add('mediaDiv');

      const numsDiv = document.createElement('div');
      numsDiv.classList.add('numberText');
      numsDiv.innerHTML = `${i + 1}/${this.imageURLs.length}`;
      
      const img = document.createElement('img');
      img.classList.add('galleryImage');
      img.setAttribute('src', imageURL);

      if(this.withZoom) {
        //add a click listener to each image
        img.addEventListener('click', this.zoomPic);

        //click the x closes the modal
        const close = this.shadowRoot.querySelector('.close');
        close.addEventListener('click', this.closeModal);

        //escape closes the modal
        document.addEventListener('keydown', this.closeModalFromEscape);

        //click anywhere in the modal to close it
        const modal = this.shadowRoot.querySelector('.modal');
        modal.addEventListener('click', this.closeModal);
      }
      aSlide.appendChild(img);
      aSlide.appendChild(numsDiv);
      
      galleryContainer.appendChild(aSlide);
    }

    const prevButton = this.shadowRoot.querySelector('.prevButton');
    prevButton.addEventListener('click', this.moveBackward);
    const nextButton = this.shadowRoot.querySelector('.nextButton');
    nextButton.addEventListener('click', this.moveForward);

    this.showSlide(this.slideIndex);
  }

  disconnectedCallback() {
    const prevButton = this.shadowRoot.querySelector('.prevButton');
    prevButton.removeEventListener('click', this.moveBackward);
    const nextButton = this.shadowRoot.querySelector('.nextButton');
    nextButton.removeEventListener('click', this.moveForward);

    if(this.withZoom) {
      const allImages = this.shadowRoot.querySelectorAll('img');
      allImages.forEach(img => {
        img.removeEventListener('click', this.zoomPic);
      });

      const close = this.shadowRoot.querySelector('.close');
      close.removeEventListener('click', this.closeModal);

      const modal = this.shadowRoot.querySelector('.modal');
      modal.removeEventListener('click', this.closeModal);

      document.removeEventListener('keydown', this.closeModalFromEscape);
    }
  }

  moveBackward = () => {
    this.showSlide(this.slideIndex - 1);
  }

  moveForward = () => {
    this.showSlide(this.slideIndex + 1);
  }

  showSlide(newSlideIndex) {
    const slides = this.shadowRoot.querySelectorAll('.slide');
    if (newSlideIndex === slides.length) {
      this.slideIndex = 0;
    } else if (newSlideIndex < 0) {
      this.slideIndex = slides.length - 1;
    } else {
      this.slideIndex = newSlideIndex;
    }

    for (let i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";
    }
    slides[this.slideIndex].style.display = "flex";
  } 

  zoomPic = () => {
    const slides = this.shadowRoot.querySelectorAll('.slide');
    const slide = slides[this.slideIndex];
    const img = slide.firstChild.getAttribute('src');
    const modal = this.shadowRoot.querySelector('.modal');
    const modalImage = this.shadowRoot.querySelector('.modalContent');
    modalImage.classList.add('expandedPic');

    modal.style.display = 'block';
    modalImage.setAttribute('src', img);
  }

  closeModal = () => {
    const modalImage = this.shadowRoot.querySelector('.modalContent');
    modalImage.classList.add('expandedPic');
    modalImage.classList.remove('expandedPic');

    const modal = this.shadowRoot.querySelector('.modal');
    modal.style.display = "none";
  }

  closeModalFromEvent = event => {
    this.closeModal();
    event.preventDefault();
  }

  closeModalFromEscape = event => {
    if (event.key === 'Esc' || event.key === 'Escape') {
      this.closeModalFromEvent(event);
    }
  }
}

window.customElements.define('st-image-gallery', ImageGallery);