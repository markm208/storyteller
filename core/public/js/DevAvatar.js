class DevAvatar extends HTMLElement {
  constructor(avatarURL, userName, email, showAllDevInfo, imgSize=40) {
    super();

    this.avatarURL = avatarURL;
    this.userName = userName;
    this.email = email
    this.showAllDevInfo = showAllDevInfo;
    this.imgSize = imgSize;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const fullAvatarURL = `${this.avatarURL}?s=${this.imgSize}&d=mp`;
    
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        .devImage {
          background-color: rgb(59,76,98);
          border: 1px solid gray;
          margin: 5px;
          border-radius: 50%;
          padding: .25rem;
          cursor: pointer;
        }

        .devContainer {
          display: flex;
        }

        .displayAdditionalDevInfo {
          display: flex;
          flex-direction: column;
          padding: 10px 5px 0px 5px;
        }

        .hideAdditionalDevInfo {
          display: none;
        }

        a {
          color: gray;
        }
        a:hover {
          color: lightgray;
        }
      </style>

      <div class="devContainer">
        <img
          class="devImage"
          src="${fullAvatarURL}"
          title=""
          alt="${this.userName} ${this.email}"
          height=${this.imgSize}
          width=${this.imgSize} />
        <span id="additionalDevInfo" class="hideAdditionalDevInfo">
          <div>${this.userName}</div>
          <div>
            <a href="mailto:${this.email}">${this.email}</a>
          </div>
        </span>
      </div>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    if(this.showAllDevInfo) {
      this.displayFullInfo();
    } else {
      this.hideFullInfo();
    }

    const img = this.shadowRoot.querySelector('img');
    img.addEventListener('dblclick', this.devDblClickListener);
  }

  disconnectedCallback() {
    const img = this.shadowRoot.querySelector('img');
    img.removeEventListener('dblclick', this.devDblClickListener);
  }

  devDblClickListener = () => {
    if(this.showAllDevInfo) {
      this.hideFullInfo();
    } else {
      this.displayFullInfo();
    }
  }

  displayFullInfo() {
    this.showAllDevInfo = true;

    const additionalDevInfo = this.shadowRoot.querySelector('#additionalDevInfo');
    additionalDevInfo.classList.remove('hideAdditionalDevInfo');
    additionalDevInfo.classList.add('displayAdditionalDevInfo');
    
    this.shadowRoot.querySelector('img').setAttribute('title', 'Double click to hide');
  }

  hideFullInfo() {
    this.showAllDevInfo = false;
    const additionalDevInfo = this.shadowRoot.querySelector('#additionalDevInfo');
    additionalDevInfo.classList.remove('displayAdditionalDevInfo');
    additionalDevInfo.classList.add('hideAdditionalDevInfo');
    
    const imageTitle = `${this.userName} ${this.email} (double click to reveal)`;
    this.shadowRoot.querySelector('img').setAttribute('title', imageTitle);
  }
}

window.customElements.define('st-dev-avatar', DevAvatar);