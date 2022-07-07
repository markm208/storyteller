class ShowHideComponent extends HTMLElement {

    constructor() {
        super();

        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(this.getTemplate());
        this.isHidden = true;
    }

    getTemplate() {
        const template = document.createElement('template');
        template.innerHTML = `
        
        <style>
        //:host { background: lightblue ; display: block }
        //::slotted( [slot=child] ) { display: none; }
        #slot {
            display: none;
        }
        .hidden {
            display: block;
            content: "";
            background-image: url("data:image/svg+xml,<svg viewBox='0 0 16 16' fill='currentColor' xmlns='http://www.w3.org/2000/svg'><path fill-rule='evenodd' d='M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z'/></svg>") !important;
            background-repeat: no-repeat;
            height: 1.9em;
            width: 1.9em;
            // border: none;
            // margin-right: -2px;
            // margin-bottom: -3px;
            // margin-bottom: -8px;
            

            
        }
        #toggleButton{
            display:block;
            content: "";
            background-image: url("data:image/svg+xml,<svg viewBox='0 0 16 16' fill='currentColor' xmlns='http://www.w3.org/2000/svg'><path fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/></svg>");
            background-repeat: no-repeat;
            height: 1.9em;
            width: 1.9em;
            // border: none;
            // margin-right: -2px;
            // margin-bottom: -3px;
            // margin-bottom: -8px;
            cursor: pointer;

        }

        #testing {
            display: flex;
        }


    </style>
    <div id='testing'>
        <button id='toggleButton' class='hidden'> 
        </button>
        <div id='textTesting'></div>
    </div>
    <slot id='slot' name="child"></slot>
        
        `;
        return template.content.cloneNode(true);
    }

    connectedCallback(){
        const toggleButton = this.shadowRoot.querySelector('#toggleButton');
        toggleButton.addEventListener('click', () =>{
            toggleButton.classList.toggle('hidden');

            const slot = this.shadowRoot.querySelector('slot[name=child]');

            if (this.isHidden){
                slot.style.display = 'block';
                this.isHidden = false;
            }else{
                slot.style.display = 'none';
                this.isHidden = true;
            }

        })

        const test = this.getAttribute('name');
        if (test){
            const blah = this.shadowRoot.querySelector('#textTesting');
            blah.innerHTML=test;
        }
        test;
    }

}

window.customElements.define('st-show-hide-component', ShowHideComponent);