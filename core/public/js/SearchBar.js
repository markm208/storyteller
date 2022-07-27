class SearchBar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
    this.searchEnabled = true;
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML =
    `
      <style>
      .searchControls {
        display: flex;
        padding: 3px;
        justify-content: flex-end;
        align-items: baseline;
      }
      .searchInput {
        color: lightgray;
        border:none;
        background-color: inherit;
        background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="gray" class="bi bi-search" viewBox="0 0 16 16"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>');
        background-repeat: no-repeat;
        background-position: 7px 7px; 
        padding: 7px 15px 7px 30px;
        flex: 1;
        border-radius: 30px;
        width: 90px;
        transition: width 1s;
      }

      .searchInput.expanded {
        width: 300px;
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

      input[type="search"]::-webkit-search-decoration,
      input[type="search"]::-webkit-search-cancel-button,
      input[type="search"]::-webkit-search-results-button,
      input[type="search"]::-webkit-search-results-decoration { display: none; }

      .resetSearchButton {
        opacity 1;
        cursor: pointer;
        border: none;
        background-color: transparent;
        color: gray;
        position: relative;
        right: 3px;
      }

      .resetSearchButton.hidden {
        opacity: 0;
        cursor: text;
      }

      .searchForm {
        border : 2px solid gray;
        border-radius: 45px;
      }        
      </style>
        
      <div class="searchControls">
        <div id="clearSearchResults"></div>
        <div class='searchForm'>
          <input type="search" id='searchBar' class="searchInput" placeHolder="Search" autocomplete="off" spellcheck="false"></input>
          <button class="resetSearchButton hidden" type="reset" title='Clear search results'>✕</button>
        </div>
      </div>
    `;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    const searchBar = this.shadowRoot.querySelector("#searchBar");
    const searchResetButton = this.shadowRoot.querySelector('.resetSearchButton');

    //add an input listener to get changes to the search bar
    searchBar.addEventListener('input', () => {
      const searchText = searchBar.value;

      //if the search bar is empty
      if (searchText === '') {
        //hide it
        searchResetButton.classList.add('hidden');
      }
      else { //not empty, 
        //expand it
        searchResetButton.classList.remove('hidden');
      }

      //if search is enabled
      if(this.searchEnabled) {
        //generate the search event
        this.sendSearchRequest(searchText);
      }
    });

    //add a key down listener to stop arrow keys from affecting the playback
    searchBar.addEventListener('keydown', event => {
      event.stopImmediatePropagation();
    });
    
    searchBar.addEventListener('focus', () => {
      searchBar.classList.add('expanded');
      searchBar.setAttribute('placeHolder', "Search Playback...");
    })

    searchBar.addEventListener('blur', event => {
      if (event && event.relatedTarget && event.relatedTarget.classList.contains('resetSearchButton')) {
        searchBar.focus();
        return;
      }

      if (searchBar.value === ''){
        searchBar.classList.remove('expanded');
      }
    })

    searchResetButton.addEventListener('click', () => {
      searchBar.focus();
      const clearSearchResults = this.shadowRoot.querySelector('#clearSearchResults');
      clearSearchResults.innerHTML = '';
      this.sendSearchRequest('');
      searchResetButton.classList.add('hidden');
    });
  }

  disconnectedCallback() {
  }

  updateToDisplaySearchResults(numSearchComments, numTotalComments, searchText) {
    //get the contents of the search bar
    const searchBar = this.shadowRoot.querySelector("#searchBar");
    searchBar.focus();
    
    const searchResetButton = this.shadowRoot.querySelector('.resetSearchButton');
    searchResetButton.classList.remove('hidden');
    
    //get the element that holds the search results message
    const clearSearchResults = this.shadowRoot.querySelector('#clearSearchResults');

    //if the search bar does not have the same text as the query (due to clicking on a tag or something like that)
    if (searchBar.value !== searchText) {
      //display the search text to the user
      searchBar.value = searchText;
    }

    //if the search bar is empty
    if (searchBar.value === '') {
      //display nothing about how many search results there are
      clearSearchResults.innerHTML = '';
    } else { //search bar has something in it
      //display how many comment are being shown
      clearSearchResults.innerHTML = `Displaying ${numSearchComments} out of ${numTotalComments} comments`;
    }
  }

  updateToEnableSearch() {
    this.searchEnabled = true;
  }

  updateToDisableSearch() {
    this.searchEnabled  = false;
  }
  
  sendSearchRequest(searchText) {
    const event = new CustomEvent('search', {
      detail: { searchText: searchText },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }
}

window.customElements.define('st-search-bar', SearchBar);