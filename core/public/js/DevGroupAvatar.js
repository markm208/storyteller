class DevGroupAvatar extends HTMLElement {
  constructor(devGroupAvatarData) {
    super();

    this.developerGroupId = devGroupAvatarData.developerGroupId; 
    this.developers = devGroupAvatarData.developers;
    this.developerGroups = devGroupAvatarData.developerGroups
    
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }
  
  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        .commentDevelopersDiv {
          display: flex;
          flex-wrap: wrap;
        }
      </style>

      <div class="commentDevelopersDiv"></div>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() {
    const commentDevelopersDiv = this.shadowRoot.querySelector('.commentDevelopersDiv');
    let developerGroup = this.developerGroups[this.developerGroupId];

    if(!developerGroup) {
      developerGroup = this.developerGroups['devGroupId-0'];
    }
    
    developerGroup.memberIds.forEach(devId => {
      const dev = this.developers[devId];
      commentDevelopersDiv.appendChild(new DevAvatar(dev.avatarURL, dev.userName, dev.email, false));
    });
  }

  disconnectedCallback() {
  }
}  
window.customElements.define('st-dev-group-avatar', DevGroupAvatar);