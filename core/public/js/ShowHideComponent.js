class ShowHideComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        .outerDiv{
          padding: 5px;
          margin: 8px;
        }
        .outerDiv.open{
          border: solid thin gray;
        }

        #titleBar {
          display: flex;
          cursor: pointer;
          width: 100%;
          padding-bottom: 5px;
        }
        #title {
          font-size: 1.1em;
        }
        #title.open {
          color: aliceblue;
          font-style: italic;
        }

        #showHideToggleButton {
          background-image: url("data:image/svg+xml,<svg viewBox='0 0 16 16' fill='lightgray' xmlns='http://www.w3.org/2000/svg'><path fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/></svg>") ;
          cursor: pointer;
          height: 1.1em;
          width: 1.1em;
          border: none;
          background-color: transparent;
          margin: 3px 5px;
          padding-top: 5px;
        }
        .closedButton {
          background-image: url("data:image/svg+xml,<svg viewBox='0 0 16 16' fill='lightgray' xmlns='http://www.w3.org/2000/svg'><path fill-rule='evenodd' d='M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z'/></svg>") !important;
        }

        #expandedContainer {
          padding: 0px 10px;
        }

        .hide {
          height: 0;
          overflow: hidden;
          transition: height 0.4s ease;
        }

        #slotContainer: {
          height: fit-content;
        }
      </style>
      <div class='outerDiv'>
        <div id='titleBar' title='Click to expand'>
          <button id='showHideToggleButton' class='closedButton'></button>
          <div id='title'></div>
        </div>
        <div id='expandedContainer'>
          <div id='slotContainer' class='hide'>
            <slot id='slot' name='child'></slot>
          </div>
        </div>
      </div> `;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    const showHideToggleButton = this.shadowRoot.querySelector('#showHideToggleButton');
    const titleBar = this.shadowRoot.querySelector('#titleBar');
    const title = this.shadowRoot.querySelector('#title');

    titleBar.addEventListener('click', () => {
      const slotContainer = this.shadowRoot.querySelector('#slotContainer');

      showHideToggleButton.classList.toggle('closedButton');
      if (showHideToggleButton.classList.contains('closedButton')) {
        titleBar.setAttribute('title', 'Click to expand');

        slotContainer.style.height = slotContainer.scrollHeight + 'px';
        titleBar.style.pointerEvents = 'none';

        setTimeout(() =>{
          slotContainer.style.height = '0px';
          titleBar.style.pointerEvents = 'auto';
        }, 1);

      } else {
        titleBar.setAttribute('title', 'Click to collapse');
        slotContainer.style.height = slotContainer.scrollHeight + 'px';

        titleBar.style.pointerEvents = 'none';
        setTimeout(() =>{
          slotContainer.style.height = 'fit-content';
          titleBar.style.pointerEvents = 'auto';
        }, 400);
      }

      const outerDiv = this.shadowRoot.querySelector('.outerDiv');
      outerDiv.classList.toggle('open');

      //slotContainer.classList.toggle('hide');
      title.classList.toggle('open');
    });

    const name = this.getAttribute('name');
    if (name) {
      title.innerHTML = name;
    }

    const showInitially = this.getAttribute('show');
    if (showInitially) {
      titleBar.click();
    }
  }
}
window.customElements.define('st-show-hide-component', ShowHideComponent);