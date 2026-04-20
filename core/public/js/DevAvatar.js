class DevAvatar extends HTMLElement {
  constructor(avatarURL, userName, email, platform, platformUsername, websiteUrl, showAllDevInfo, imgSize=40) {
    super();

    this.avatarURL = avatarURL;
    this.userName = userName;
    this.email = email;
    this.platform = platform;
    this.platformUsername = platformUsername;
    this.websiteUrl = websiteUrl;
    this.showAllDevInfo = showAllDevInfo;
    this.imgSize = imgSize;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    // Use avatarURL if provided, otherwise fall back to UI Avatars
    let fullAvatarURL;
    if (this.avatarURL) {
      // Add size param if URL supports it (Gravatar, GitHub, etc.)
      fullAvatarURL = this.avatarURL.includes('?')
        ? `${this.avatarURL}&s=${this.imgSize}`
        : `${this.avatarURL}?s=${this.imgSize}&d=mp`;
    } else {
      // Fallback for old data without avatarURL
      const encodedName = encodeURIComponent(this.userName || 'User');
      fullAvatarURL = `https://ui-avatars.com/api/?name=${encodedName}&background=random&color=fff&size=${this.imgSize}`;
    }

    // Build alt text from available info
    const altText = this.platformUsername
      ? `${this.userName} @${this.platformUsername}`
      : this.email
        ? `${this.userName} ${this.email}`
        : this.userName;

    // Build contact info section - prioritize websiteUrl, then platform, then email
    let contactInfoHTML = '';
    if (this.websiteUrl) {
      contactInfoHTML = `<a href="${this.websiteUrl}" target="_blank">${this.websiteUrl}</a>`;
    } else if (this.platformUsername) {
      const platformURL = this.getPlatformURL(this.platform, this.platformUsername);
      contactInfoHTML = `<a href="${platformURL}" target="_blank">${platformURL}</a>`;
    } else if (this.email) {
      contactInfoHTML = `<a href="mailto:${this.email}">${this.email}</a>`;
    }

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
          alt="${altText}"
          height=${this.imgSize}
          width=${this.imgSize} />
        <span id="additionalDevInfo" class="hideAdditionalDevInfo">
          <div>${this.userName}</div>
          ${contactInfoHTML ? `<div>${contactInfoHTML}</div>` : ''}
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

    // Build title from available info
    let titleInfo = this.userName;
    if (this.platformUsername) {
      titleInfo += ` @${this.platformUsername}`;
    } else if (this.email) {
      titleInfo += ` ${this.email}`;
    }
    const imageTitle = `${titleInfo} (double click to reveal)`;
    this.shadowRoot.querySelector('img').setAttribute('title', imageTitle);
  }

  getPlatformURL(platform, username) {
    const platformURLs = {
      'github': `https://github.com/${username}`,
      'gitlab': `https://gitlab.com/${username}`,
      'bitbucket': `https://bitbucket.org/${username}`
    };
    return platformURLs[platform] || `https://github.com/${username}`;
  }
}

window.customElements.define('st-dev-avatar', DevAvatar);