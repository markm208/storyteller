class OptionsMenu extends HTMLElement {
    constructor(){
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(this.getTemplate());
    }

    getTemplate(){
        const template = document.createElement('template');
        template.innerHTML = `
        <style>
            .modal {
                display: none;
                position: fixed;
                z-index: 100;    
                width: 30%;    
                left: 50%;
                top: 10%;
            }
        
            .modal-content {    
                position: relative;
                background-color: #fefefe;
                margin: auto;
                padding: 0;
                border: 1px solid #888;
                width: 80%;
                box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2),0 6px 20px 0 rgba(0,0,0,0.19);
                animation-name: animatetop;
                animation-duration: 0.4s
                z-index: 100;
            }
        
            .close {
                color: #aaa;
                float: right;
                font-size: 28px;
                font-weight: bold;
                padding-top: 20px;
                background: transparent;
                border: none;
                cursor: pointer;
            }

            .modal-header {
                padding: 1rem 1rem;
                background-color: rgb(51,51,51);
                color: grey;
                font-size: 1.25rem;
                border-bottom: 1px solid #dee2e6;
            }
        
            .modal-body {
                background-color: rgb(31,31,31);    
                padding: 16px 16px 16px 16px;
            }
        
            .modal-footer {
                padding: 2px 16px;
                background-color: #5cb85c;
                color: white;
            }
        
            #modal-Opener{
                background: transparent;
                border: none;
                color: rgb(201, 226, 242);
                cursor: pointer;
            }
        
            .tab {
                display: flex;
                overflow-y: hidden;
                overflow-x: scroll;
                scrollbar-width: none;
                -ms-overflow-style: none;
                border-bottom: 1px solid gray;
            }
        
            .tab::-webkit-scrollbar {
                display: none;
            }
        
            .tabLink {
                background-color: inherit;
                font-size: inherit;
                color: inherit;
                border: none;
                cursor: pointer;
                padding: 8px 10px;
                border-top-left-radius: .25rem;
                border-top-right-radius: .25rem;
            }
        
            .tabLink:hover:not(.activeTab) {
                opacity: .3;
            }
        
            .tabLink.activeTab {
                background-color: rgb(31,31,31);
                border: 1px solid gray;
                border-bottom: none;
            }

            .optionsMenu.active{
                display: block;
            }

            .optionsMenu{
                display: none;
            }

            .btn{
                cursor: pointer;
                border: none;
            }

            .btn:active{
                opacity: .5;
            }

            .commandList{
                display: flex;
                padding: 10px;
            }

            .command{
                margin-left: 100px;
            }

            .buttonCommand{
                margin-left: 100px;
            }

            .commandAction{
                width: 40%;
                font-weight: bold;
            }

            .modal-title{
                margin: 0;
                padding: 15px 0px;
                font-size: xx-large;
            }

            .optionsGroup{
                display: grid;
                padding: 5px;
            }

            .buttonGroup{
                display: flex;
            }

            .btn{
                height: 35px;
                cursor: pointer;
                border: double;
                width: 45%;
                font-weight: bold;
            }

        </style>
    
        <button id='modal-Opener' title='Options Menu'>
            <svg width='32' height='32' viewBox='0 0 16 16' class='bi bi-gear-wide' fill='currentColor' xmlns='http://www.w3.org/2000/svg'>
                <path
                    fill-rule='evenodd'
                    d='M8.932.727c-.243-.97-1.62-.97-1.864 0l-.071.286a.96.96 0 0 1-1.622.434l-.205-.211c-.695-.719-1.888-.03-1.613.931l.08.284a.96.96 0 0 1-1.186 1.187l-.284-.081c-.96-.275-1.65.918-.931 1.613l.211.205a.96.96 0 0 1-.434 1.622l-.286.071c-.97.243-.97 1.62 0 1.864l.286.071a.96.96 0 0 1 .434 1.622l-.211.205c-.719.695-.03 1.888.931 1.613l.284-.08a.96.96 0 0 1 1.187 1.187l-.081.283c-.275.96.918 1.65 1.613.931l.205-.211a.96.96 0 0 1 1.622.434l.071.286c.243.97 1.62.97 1.864 0l.071-.286a.96.96 0 0 1 1.622-.434l.205.211c.695.719 1.888.03 1.613-.931l-.08-.284a.96.96 0 0 1 1.187-1.187l.283.081c.96.275 1.65-.918.931-1.613l-.211-.205a.96.96 0 0 1 .434-1.622l.286-.071c.97-.243.97-1.62 0-1.864l-.286-.071a.96.96 0 0 1-.434-1.622l.211-.205c.719-.695.03-1.888-.931-1.613l-.284.08a.96.96 0 0 1-1.187-1.186l.081-.284c.275-.96-.918-1.65-1.613-.931l-.205.211a.96.96 0 0 1-1.622-.434L8.932.727zM8 12.997a4.998 4.998 0 1 0 0-9.995 4.998 4.998 0 0 0 0 9.996z'
                />
            </svg>
        </button>
        <div class='modal'>
            <div class='modal-header'>
                <button type='button' id='optionsCloseButton' class='close'>
                    <span aria-hidden='true'>&times;</span>
                </button>
                <h5 class='modal-title'>Playback Options</h5>
            </div>
            <div class='modal-body'>
                <div class='tab'>
                    <button class='tabLink options activeTab' data-tabClicked='Options'>Options</button>
                    <button class='tabLink controls' data-tabClicked='Shortcuts'>Keyboard Shortcuts</button>
                </div>
                <div class='subNavigatorsTab'>
                    <div class='optionsMenu active' id='Options'>
                        <div class='optionsGroup'>Change code window text size
                            <div class='btn-group buttonGroup'>
                                <button id='textSmallerButton' class='btn'>Smaller</button>
                                <button id='textBiggerButton' class='btn'>Bigger</button>
                            </div>
                        </div>
                        <div class='optionsGroup'>Change playback speed
                            <div class='btn-group buttonGroup'>
                                <button id='playbackSpeedDown' class='btn'>Slower</button>
                                <button id='playbackSpeedUp' class='btn'>Faster</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class='optionsMenu' id='Shortcuts'>
                    <div class='commandList'>
                        <div class='commandAction'> Move playback one character</div>  <div class='command'>left/right arrow</div>  
                    </div>
                    <div class='commandList'>
                        <div class='commandAction'>Move playback one comment</div>  <div class='command'>shift + left/right arrow </div>
                    </div>
                    <div class='commandList'>
                        <div class='commandAction'>Move to the beginning/end of a playback</div>  <div class='command'>ctrl + shift + left/right arrow </div>
                    </div>
                    <div class='commandList'>
                        <div class='commandAction'>Toggle play/pause of the playback</div>  <div class='command'>spacebar</div>
                    </div>
                    <div class='commandList'>
                        <div class='commandAction'>Increase/decrease text editor font size</div>  <div class='command'>ctrl + shift + up/down arrow</div>
                    </div>
                </div>
            </div>
        </div>
        `;
        return template.content.cloneNode(true);
    }

    connectedCallback() {    
       const modal = this.shadowRoot.querySelector('#modal-Opener');
       modal.addEventListener('click', this.showModal);

       const closeButton = this.shadowRoot.querySelector('.close');
       closeButton.addEventListener('click', this.hideModal);

       const tabLinks = this.shadowRoot.querySelectorAll('.tabLink');
       tabLinks.forEach(tabLink => {
         tabLink.addEventListener('click', this.tabClick);
       });

       const speedDownButton = this.shadowRoot.querySelector('#playbackSpeedDown');
       speedDownButton.addEventListener('click', this.decreasePlaybackSpeed);

       const speedUpButton = this.shadowRoot.querySelector('#playbackSpeedUp');
       speedUpButton.addEventListener('click', this.increasePlaybackSpeed);

       const textSmallerButton = this.shadowRoot.querySelector('#textSmallerButton');
       textSmallerButton.addEventListener('click', this.decreaseFontSize);

       const textBiggerButton = this.shadowRoot.querySelector('#textBiggerButton');
       textBiggerButton.addEventListener('click', this.increaseFontSize);
    }

    disonnectedCallback(){
        const modal = this.shadowRoot.querySelector('#modal-Opener');
        modal.removeEventListener('click', this.showModal);
 
        const closeButton = this.shadowRoot.querySelector('.close');
        closeButton.removeEventListener('click', this.hideModal);
 
        const tabLinks = this.shadowRoot.querySelectorAll('.tabLink');
        tabLinks.forEach(tabLink => {
          tabLink.removeEventListener('click', this.tabClick);
        });
 
        const speedDownButton = this.shadowRoot.querySelector('#playbackSpeedDown');
        speedDownButton.removeEventListener('click', this.decreasePlaybackSpeed);
 
        const speedUpButton = this.shadowRoot.querySelector('#playbackSpeedUp');
        speedUpButton.removeEventListener('click', this.increasePlaybackSpeed);
 
        const textSmallerButton = this.shadowRoot.querySelector('#textSmallerButton');
        textSmallerButton.removeEventListener('click', this.decreaseFontSize);
 
        const textBiggerButton = this.shadowRoot.querySelector('#textBiggerButton');
        textBiggerButton.removeEventListener('click', this.increaseFontSize);
    }

    increasePlaybackSpeed = () => {
        //increase the speed of the playback
        const event = new CustomEvent('increase-playback-speed', { 
          bubbles: true, 
          composed: true 
        });
        this.dispatchEvent(event);
    }

    decreasePlaybackSpeed = () => {
        //decrease the speed of the playback
        const event = new CustomEvent('decrease-playback-speed', { 
            bubbles: true, 
            composed: true 
          });
          this.dispatchEvent(event);
    }

    increaseFontSize = () => {
        //increase editor font size
        const event = new CustomEvent('increase-font', { 
            bubbles: true, 
            composed: true 
          });
        this.dispatchEvent(event);
    }

    decreaseFontSize = () => {
        //decrease editor font size
        const event = new CustomEvent('decrease-font', { 
            bubbles: true, 
            composed: true 
          });
        this.dispatchEvent(event);
    }

    tabClick = (event) => { 
        const activeTab = this.shadowRoot.querySelector('.activeTab');
        const clickedTab = event.target;

        //ignore clicks on the active tab
        if (clickedTab === activeTab){
            return;
        }

        //make the tab active and the old tab not active
        activeTab.classList.remove('activeTab');
        clickedTab.classList.add('activeTab');

        //remove the active class from the old active content
        const activeTabContent = this.shadowRoot.querySelector('.active');
        activeTabContent.classList.remove('active');

        //make the tab content active
        //the id of the tab content to make active is passed as a data element when the tab was clicked
        const newActiveTab = event.target.dataset.tabclicked;
        const tabToMakeActive = this.shadowRoot.querySelector(`#${newActiveTab}`);
        tabToMakeActive.classList.add('active');
    }

    showModal = () => {
        const modal = this.shadowRoot.querySelector('.modal');
        modal.style.display = 'inline-block';
    }

    hideModal = () => {
        const modal = this.shadowRoot.querySelector('.modal');
        modal.style.display = 'none';        

        //make the options tab active again for the next time the modal is brought up
        const optionsModal = this.shadowRoot.querySelector('.options');
        optionsModal.click();
    }
}
window.customElements.define('st-options-menu', OptionsMenu);
