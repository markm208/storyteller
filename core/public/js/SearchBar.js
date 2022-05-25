class SearchBar extends HTMLElement {
    constructor() {
      super();
      
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.appendChild(this.getTemplate());
    }
  
    getTemplate() {
      const template = document.createElement('template');
      template.innerHTML = `<style>

        .searchControls {
            display: flex;
            padding: 10px;
        }
        .searchInput {
            color: lightgray;
            border: 2px solid gray;
            background-color: inherit;
            background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="gray" class="bi bi-search" viewBox="0 0 16 16"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>');
            background-repeat: no-repeat;
            background-position: 7px 7px; 
            padding: 7px 15px 7px 30px;
            flex: 1;
        }
        .searchInput:focus {
            outline: none;/*1px solid gray;*/
        }
        .searchComment:hover{
            background-color: gray !important;
        }
        </style>
        
        <div class="searchControls">
          <input type="search" id='searchBar' class="searchInput" placeholder="Search comments...                                                     "></input>
        </div>
        `;
  
      return template.content.cloneNode(true);
    }
  
    connectedCallback() {
      const searchBar = this.shadowRoot.querySelector("#searchBar");

      //add an input listener to get changes to the search bar
      searchBar.addEventListener('input', event => {
        //grab the current text from the input
        const searchText = this.shadowRoot.querySelector("#searchBar").value;
        //generate the search event
        this.sendSearchRequest(searchText);
      });
      //add a key down listener to stop arrow keys from affecting the playback
      searchBar.addEventListener('keydown', event => {
        event.stopImmediatePropagation();
      });
    }
  
    disconnectedCallback() {
    }    

    sendSearchRequest(searchText) {
        const event = new CustomEvent('search', { 
          detail: {searchText: searchText}, 
          bubbles: true, 
          composed: true 
        });
        this.dispatchEvent(event);
      }
  }
  
  window.customElements.define('st-search-bar', SearchBar);