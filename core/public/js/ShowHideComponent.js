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
                #slot {
                    display: none;
                }

                .hidden {
                    background-image: url("data:image/svg+xml,<svg viewBox='0 0 16 16' fill='currentColor' xmlns='http://www.w3.org/2000/svg'><path fill-rule='evenodd' d='M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z'/></svg>") !important;
                }

                #toggleButton{
                    background-image: url("data:image/svg+xml,<svg viewBox='0 0 16 16' fill='currentColor' xmlns='http://www.w3.org/2000/svg'><path fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/></svg>");
                    height: 1.9em;
                    width: 1.9em;
                    cursor: pointer;
                }

                #outerDiv {
                    display: flex;
                }
            </style>
            <div id='outerDiv'>
                <button id='toggleButton' class='hidden' title='Click to expand'></button>
                <div id='title'></div>
            </div>
            <slot id='slot' name="child"></slot>
        `;
        return template.content.cloneNode(true);
    }

    connectedCallback() {
        const toggleButton = this.shadowRoot.querySelector('#toggleButton');
        toggleButton.addEventListener('click', () => {
            const slot = this.shadowRoot.querySelector('slot[name=child]');

            if (toggleButton.classList.contains('hidden')) {
                slot.style.display = 'block';
            } else {
                slot.style.display = 'none';
            }
            toggleButton.classList.toggle('hidden');
        })

        const name = this.getAttribute('name');
        if (name) {
            const slotTitle = this.shadowRoot.querySelector('#title');
            slotTitle.innerHTML = name;
        }
    }
}
window.customElements.define('st-show-hide-component', ShowHideComponent);
