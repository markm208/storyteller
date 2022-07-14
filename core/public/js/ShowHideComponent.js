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
    

                .hidden {
                    background-image: url("data:image/svg+xml,<svg viewBox='0 0 16 16' fill='lightgray' xmlns='http://www.w3.org/2000/svg'><path fill-rule='evenodd' d='M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z'/></svg>") !important;

                }

                #toggleButton{
                   background-image: url("data:image/svg+xml,<svg viewBox='0 0 16 16' fill='lightgray' xmlns='http://www.w3.org/2000/svg'><path fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/></svg>") ;
                    cursor: pointer;
                    height: 1.9em;
                    width: 1.9em;
                    border: none;
                    background-color: transparent;
                    margin: 0px 5px;
                }

                #outerDiv {
                    display: flex;
                    cursor: pointer;
                    width: fit-content;
                }

                #expanded-container{
                  //  overflow: hidden;
                }

                #testing {
                   // height: 0;
                   // overflow: hidden;
                   // transition: height 0.4s ease;
                }

                .hide{
                    display: none;
                }



            </style>
            <div id='outerDiv'>
                <button id='toggleButton' class='hidden'></button>
                <div id='title'></div>
            </div>
            <div id='expanded-container'>
                <div id='testing' class='hide'>
                    <slot id='slot' name="child"></slot>
                </div>
            </div>
        `;
    return template.content.cloneNode(true);
  }

  connectedCallback() {
    const toggleButton = this.shadowRoot.querySelector('#toggleButton');
    const outerDiv = this.shadowRoot.querySelector('#outerDiv');

    outerDiv.addEventListener('click', () => {
      const slot = this.shadowRoot.querySelector('#testing');
      // const expandedContainer = this.shadowRoot.querySelector('#expanded-container');

      // if (toggleButton.classList.contains('hidden')) {
      //     //slot.style.height = slot.scrollHeight+'px';
      //     //slot.style.height = 'fit-content';

      //     expandedContainer.style.overflow = 'visible';
      //    slot.style.overflow = 'visible';

      // } else {
      //    // slot.style.height = 0;
      //     slot.style.overflow = 'hidden';
      //     expandedContainer.style.overflow = 'hidden';

      // }
      toggleButton.classList.toggle('hidden');
      if (toggleButton.classList.contains('hidden')){
        outerDiv.setAttribute('title', 'Click to expand');
      }else{
        outerDiv.setAttribute('title', 'Click to collapse');
      }

      

      slot.classList.toggle('hide');
      //target.style.height = target.scrollHeight+"px";
    });

    //outerDiv.addEventListener('click' , () => toggleButton.click());

    const name = this.getAttribute('name');
    if (name) {
      const slotTitle = this.shadowRoot.querySelector('#title');
      slotTitle.innerHTML = name;
    }

    const showInitially = this.getAttribute('show');
    if (showInitially) {
      outerDiv.click();
    }else{
      outerDiv.setAttribute('title', 'Click to expand');
    }
  }
}
window.customElements.define('st-show-hide-component', ShowHideComponent);
/*
    connectedCallback() {
        const toggleButton = this.shadowRoot.querySelector('#toggleButton');
        toggleButton.addEventListener('click', () => {
            const slot = this.shadowRoot.querySelector('#testing');
            const expandedContainer = this.shadowRoot.querySelector('#expanded-container');

            if (toggleButton.classList.contains('hidden')) {
                slot.classList.remove('hide');
                expandedContainer.style.overflow = 'visible';
               // slot.style.height = 'fit-content';
            } else {
                slot.classList.add('hide');
                expandedContainer.style.overflow = 'hidden';

            }
            toggleButton.classList.toggle('hidden');
            //target.style.height = target.scrollHeight+"px";
        })
*/