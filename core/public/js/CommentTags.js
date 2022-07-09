class CommentTags extends HTMLElement {
    constructor(tags) {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(this.getTemplate());
        this.tagsSet = new Set();

        tags.forEach(tag => {
            this.addTag(tag);
        })
    }

    getTemplate() {
        const template = document.createElement('template');
        template.innerHTML = `
        <style>
        </style>
        <div id='outerDiv'> Enter a tag
            <input type="text" id='tagInput'>
            <input type='button' id='addTagButton' value='Add tag'>        
        </div>
        <div id='tagsDiv'></div>          
        `;
        return template.content.cloneNode(true);
    }

    connectedCallback() {
        const tagInput = this.shadowRoot.querySelector('#tagInput');
        const addTagButton = this.shadowRoot.querySelector('#addTagButton');

        addTagButton.addEventListener('click', () => {
            const tagValue = tagInput.value;

            if (tagValue.length) {
                this.addTag(tagValue);
            }
            tagInput.value = '';

        })

        tagInput.addEventListener('keydown', event => {
            //add a key down listener to stop keys from affecting the playback
            event.stopImmediatePropagation();

            if (event.key === 'Enter') {
                addTagButton.click();
            }
        });
    }

    addTag(tag) {
        tag = tag.trim().replaceAll(' ', '-').toLowerCase();

        if (!this.tagsSet.has(tag)) {
            this.tagsSet.add(tag);

            //sort the tags alphabetically
            this.tagsSet = Array.from(this.tagsSet).sort();
            this.tagsSet = new Set(this.tagsSet);

            //TODO come up with an algorithm to drop the new tag in it's right place alphabetically
            const tagDiv = this.shadowRoot.querySelector('#tagsDiv');
            tagDiv.innerHTML = '';
            this.tagsSet.forEach(tag => {
                const newTag = this.createTag(tag);
                tagDiv.appendChild(newTag);
            })
        }
    }

    createTag(tag) {
        const retVal = document.createTextNode(tag);

        return retVal;
    }

    getAllTags() {

    }

}
window.customElements.define('st-comment-tags', CommentTags);
