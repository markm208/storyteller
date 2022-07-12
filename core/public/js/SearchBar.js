class SearchBar extends HTMLElement {
    constructor() {
      super();
      
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.appendChild(this.getTemplate());
      this.previousSearchText = '';
    }
  
    getTemplate() {
      const template = document.createElement('template');
      template.innerHTML = `<style>
        .searchControls {
            display: flex;
            padding: 3px;
            justify-content: flex-end;
            align-items: baseline;
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
            outline: none;
        }

        #clearSearchResults {
          color: gray;
          padding-right: 5px;
          font-size: smaller;
          font-weight: bold;
        }
        </style>
        
        <div class="searchControls">
          <div id="clearSearchResults"></div>
          <input type="search" id='searchBar' class="searchInput" placeholder="Search playback...">
          </input>
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

    updateToDisplaySearchResults(numSearchComments, numTotalComments, searchText) {
      //get the contents of the search bar
      const searchBar = this.shadowRoot.querySelector("#searchBar");
      //get the element that holds the search results message
      const clearSearchResults = this.shadowRoot.querySelector('#clearSearchResults');

      //if the search bar does not have the same text as the query (due to clicking on a tag or something like that)
      if(searchBar.value !== searchText) {
        //display the search text to the user
        searchBar.value = searchText;
      }

      //if the search bar is empty
      if(searchBar.value === '') {
        //display nothing about how many search results there are
        clearSearchResults.innerHTML = '';
      } else { //search bar has something in it
        //display how many comment are being shown
        clearSearchResults.innerHTML = `Displaying ${numSearchComments} out of ${numTotalComments} comments`;
      }
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