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
        .close{
          color: lightgray;
          font-size: 40px;
          font-weight: bold;
          position: absolute;
          right: 35px;
          top: 15px;
        }

        .close:hover, .close:focus{
          color: #bbb;
          cursor: pointer;
          text-decoration: none;
        }

        .fade{
          animation-duration: 1.0s;
          animation-name: fade;
          webkit-animation-duration: 1.0s;
          webkit-animation-name: fade;
        }

        .galleryContainer{
          margin: auto;
          max-width: 1000px;
          position: relative;
        }

        .galleryImage{
          width: 80%;
        }

        .mediaDiv{
          align-items: center;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 10px 0px 5px 0px;
        }

        .modal{
          background-color: rgb(0,0,0);
          background-color: rgba(0,0,0,0.9);
          display: none;
          height: 100%;
          left: 0;
          overflow: auto;
          padding-top: 100px;
          position: fixed;
          top: 0;
          width: 100%;
          z-index: 100;
        }

        .modalButton{
          display: none;
        }

        .modalContent{
          animation-duration: 0.6s;
          animation-name: zoom;
          display: block;
          margin: auto;
          max-height: 80%;
          max-width: 80%;
          object-fit: contain;
          overflow: scroll;
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

        .nextButton, .modalNextButton{
          border-radius: 3px 0 0 3px;
          right: 0;
        }

        .numbers{
          bottom: 11%;
          font-size: 40px;
          margin-left: 50%;
          position: absolute;
        }

        .numberText{
          color: lightgray;
          padding: 8px 12px;
        }

        .prevButton, .nextButton, .modalPrevButton, .modalNextButton{
          border-radius: 0 3px 3px 0;
          color: lightgray;
          cursor: pointer;
          font-size: 18px;
          font-weight: bold;
          margin-top: -22px;
          padding: 16px;
          position: absolute;
          top: 50%;
          transition: 0.3s ease;
          user-select: none;
          width: auto;
        }

        .prevButton:hover, .nextButton:hover{
          background-color: rgba(0,0,0,0.25);
        }

        .slide{
          display: none;
        }

        @keyframes fade{
          from{
            opacity: .4;
          }
          to{
            opacity: 1;
          }
        }

        @keyframes zoom{
          from{
            opacity: 0.0;
          }
          to{
            opacity: 1.0;
          }
        }

        @media only screen and (max-width: 700px){
          .modal-content{
            width: 100%;
          }
        }
        
        @-webkit-keyframes fade{
          from{
            opacity: .4;
          }
          to{
            opacity: 1;
          }
        }
      </style>

      <div class='galleryContainer'>
        <a class='prevButton'>&#10094;</a>
        <a class='nextButton'>&#10095;</a>
      </div>
      <div class='modal' tabindex='-1'>
        <a class='modalPrevButton modalButton'>&#10094;</a>
        <a class='modalNextButton modalButton'>&#10095;</a>          
        <span class='close'>&times;</span>
        <img class='modalContent'></img>
        <div class='numbers'</div>
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

        //handle left and right keyboard arrow presses
        modal.addEventListener('keyup' , this.handleModalKeyboardArrows);

        const modalPrevButton = this.shadowRoot.querySelector('.modalPrevButton');
        modalPrevButton.addEventListener('click', this.modalBackward);

        const modalNextButton = this.shadowRoot.querySelector('.modalNextButton');
        modalNextButton.addEventListener('click', this.modalForward);
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
      modal.removeEventListener('keyup' , this.handleModalKeyboardArrows);

      document.removeEventListener('keydown', this.closeModalFromEscape);

      const modalPrevButton = this.shadowRoot.querySelector('.modalPrevButton');
      modalPrevButton.removeEventListener('click', this.modalBackward);

      const modalNextButton = this.shadowRoot.querySelector('.modalNextButton');
      modalNextButton.removeEventListener('click', this.modalForward);
    }
  }

  handleModalKeyboardArrows = event => {
    if (event.key === 'ArrowLeft'){
      this.modalBackward();
    }
    if (event.key === 'ArrowRight'){
      this.modalForward();
    }
  }

  moveBackward = () => {
    this.showSlide(this.slideIndex - 1);
  }

  moveForward = () => {
    this.showSlide(this.slideIndex + 1);
  }  
  
  modalBackward = () => {
    this.moveBackward();
    this.zoomPic();
  }

  modalForward = () => {
    this.moveForward();
    this.zoomPic();
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
        slides[i].style.display = 'none';
    }
    slides[this.slideIndex].style.display = 'flex';
  } 

  zoomPic = () => {
    const slides = this.shadowRoot.querySelectorAll('.slide');
    const slide = slides[this.slideIndex];
    const img = slide.firstChild.getAttribute('src');
    const modal = this.shadowRoot.querySelector('.modal');
    const modalImage = this.shadowRoot.querySelector('.modalContent');
   // modalImage.classList.add('expandedPic');

    //set the modal number text and add the prev/next buttons if there is more than 1 picture
    const imagePosition = slide.querySelector('.numberText').innerHTML;
    if (imagePosition.split('/').pop() !== '1'){
      const modalNumbersDiv = modal.querySelector('.numbers');
      modalNumbersDiv.innerHTML = imagePosition;

      const modalButtons = modal.querySelectorAll('.modalButton');
      modalButtons.forEach(button => {
        button.style.display = 'block';
      });
    };
    
    modal.style.display = 'block';
    modalImage.setAttribute('src', img);

    //needed for left/right arrow button listener
    modal.focus();
  }

  closeModal = event => {
    //dont close modal when the next/previous image button is clicked
     if (event.target.classList.contains('modalButton')){
      return;
    }

    //const modalImage = this.shadowRoot.querySelector('.modalContent');
    // modalImage.classList.add('expandedPic');
    // modalImage.classList.remove('expandedPic');

    const modal = this.shadowRoot.querySelector('.modal');

    //hide the prev/next buttons again
    const modalButtons = modal.querySelectorAll('.modalButton');
    modalButtons.forEach(button => {
      button.style.display = 'none';
    });

    modal.style.display = 'none';
  }

  closeModalFromEvent = event => {
    this.closeModal(event);
    event.preventDefault();
  }

  closeModalFromEscape = event => {
    if (event.key === 'Esc' || event.key === 'Escape') {
      this.closeModalFromEvent(event);
    }
  }
}

window.customElements.define('st-image-gallery', ImageGallery);