class CommentTags extends HTMLElement {
    constructor(tags, playbackEngine) {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(this.getTemplate());
        
        const permanentCommentTags = ['all-tests-pass', 'successful-run', 'version-control-commit'];
        const placeHolderForAllTagsInComments = ['zebra', 'commit', 'broken', 'WORKING well'];

        //create and add tag to tagsDiv
        this.formatArrayOfTags(tags).forEach(tag => {
            this.addTag(tag);
        })

        let arrayTesting = permanentCommentTags.concat(placeHolderForAllTagsInComments);
        arrayTesting = this.formatArrayOfTags(arrayTesting);

        this.masterTagList = new Set(arrayTesting);

        //TODO change ids/classes of divs
        this.masterTagList.forEach(tagToAvoid => {
            if (!tags.includes(tagToAvoid)) {

                this.addTagToDropdown(tagToAvoid)
            }
        })
    }

    getTemplate() {
        const template = document.createElement('template');
        template.innerHTML = `
        <style>
            .dropdown_button {
                background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-caret-down-fill" viewBox="0 0 16 16"><path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/></svg>');

                background-repeat: no-repeat;
                height: 2.4em;
                width: 2em;
                background-position: center;
                border-radius: 2px;
            }

            .dropdown_button.expanded{
                background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-caret-up-fill" viewBox="0 0 16 16"><path d="m7.247 4.86-4.796 5.481c-.566.647-.106 1.659.753 1.659h9.592a1 1 0 0 0 .753-1.659l-4.796-5.48a1 1 0 0 0-1.506 0z"/></svg>');

                background-repeat: no-repeat;
                height: 2.4em;
                width: 2em;
                background-position: center;
                border-radius: 2px;
            }
            .tags {
                display: block;
                position: absolute;
                background-color: #f1f1f1;
                min-width: 200px;
                box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
                z-index: 1;
                min-height: 20px;  
                overflow: hidden;
                transition: height 0.4s ease;
            }

            .tags.hidden {
                display: none;
                height: 0px;
            }

            .tags li {
                color: black;
            //  padding: 12px 16px;
                text-decoration: none;
                display: block;
                list-style: none;
                background-color: rgb(47, 47, 47);
                font-family: montserrat;
                border: 1px solid white;
                cursor: pointer;
            }
    
            .tags li a {
                text-decoration: none;
                color: white;
                display: block;
                padding: 10px;
            }
    
            .tags li:hover {
                // background-color: #0979ad;
                background-color: gray;
                color: white;
            }
            #outerDiv {
                display: flex;
                padding-top: 10px;
                position: relative;
            }

            .blink{
                background-color: lightgray !important;
            }

            #tagsDiv {
                display: block;
                padding-bottom: 10px;
                padding-top: 5px;
            }

            .tag{
                padding: 5px;
                border-radius: 5px;
                border: solid thin;
                margin-right: 10px;
                margin-top: 10px;
                display: inline-block;
            }

            .removeTag{
                background: transparent;
                border: none;
                color: lightblue;
                cursor: pointer;
                font-size: large;
            }

            #tagInput{
                width: 300px;
            }

        </style>
        <div id='outerDiv'> 
            <div class="dropdown_list">           
                <button class="dropdown_button" title='Expand tag options'></button>

                <div id="tags-div" class="tags hidden">

                </div>
            </div> 
            <input type="text" id='tagInput' placeholder='Enter a tag...'>
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
        var tags = this.shadowRoot.getElementById("tags-div");

        tags.style.height = '0px';
        const dropDownButton = this.shadowRoot.querySelector('.dropdown_button');
        dropDownButton.addEventListener('click', (event) => {
            event.stopImmediatePropagation();
            dropDownButton.classList.toggle('expanded');

            if (dropDownButton.classList.contains('expanded')) {
                dropDownButton.setAttribute('title', 'Collapse tag options');
            } else {
                dropDownButton.setAttribute('title', 'Expand tag options');
            }

            tags.classList.toggle('hidden');

            if (!tags.classList.contains('hidden')) {
                //tags.style.display = 'block'
                tags.style.height = tags.scrollHeight + 'px';
            } else {
                // tags.style.display = 'none';
                tags.style.height = '0px';
            }
        })

        const blah = this.shadowRoot.querySelector('#tags-div').getElementsByTagName('li');

        for (let i = 0; i < blah.length; i++) {
            //const thisBlah = blah[i];
            this.addEventListenerToDropdownItem(blah[i]);
        }

        //prevent the click event from bubbling higher to avoid click listeners in other components
        this.shadowRoot.addEventListener('click', (event) => {
            event.stopImmediatePropagation();
            this.closeDropDown();
        })
    }

    addEventListenerToDropdownItem (thisBlah){
        thisBlah.addEventListener('click', (event) => {
            event.stopImmediatePropagation();

            event.preventDefault();
            this.addTag(thisBlah.innerText);
            thisBlah.classList.toggle('blink');
            setTimeout(() => {
                thisBlah.classList.toggle('blink');
                setTimeout(() => {
                    thisBlah.classList.toggle('blink');
                    setTimeout(() => {
                        thisBlah.classList.toggle('blink');
                        setTimeout(() => {
                            thisBlah.remove();
                            var tags = this.shadowRoot.getElementById("tags-div");

                            tags.style.height = 'fit-content';
                        }, 150);
                    }, 75);
                }, 75);
            }, 75);
        });
    }

    formatArrayOfTags(arrayOfTags) {
        for (let i = 0; i < arrayOfTags.length; i++) {
            arrayOfTags[i] = this.formatTag(arrayOfTags[i]);
        }
        return arrayOfTags.sort();
    }

    formatTag(tag) {
        return tag.trim().toLowerCase().replaceAll(' ', '-')
    }

    //TODO alphabatize
    addTagToDropdown(tag){
        const tagsDiv = this.shadowRoot.getElementById('tags-div');
        const blah = [...tagsDiv.getElementsByTagName('li')];
        tagsDiv.innerHTML = '';

        const tagsArray = [tag];
        blah.forEach(fadfaf =>{
            
            tagsArray.push(fadfaf.innerText);
        })

        tagsArray.sort();

        tagsArray.forEach(newTag => {
            const newDropdownItem = document.createElement('a');
            newDropdownItem.href = '';
            newDropdownItem.innerHTML = newTag;
    
            const newListItem = document.createElement('li');
            newListItem.appendChild(newDropdownItem);
    
            this.addEventListenerToDropdownItem(newListItem);
    
            tagsDiv.appendChild(newListItem);
        })
    }

    addTag(tag) {
        tag = this.formatTag(tag);
        let allTags = this.getAllTags();

        if (!allTags.includes(tag)){
            allTags.push(tag);
            allTags.sort();

            //TODO come up with an algorithm to drop the new tag in it's right place alphabetically
            const tagDiv = this.shadowRoot.querySelector('#tagsDiv');
            tagDiv.innerHTML = '';
            allTags.forEach(tag => {
                const newTag = this.createTag(tag);
                tagDiv.appendChild(newTag);
            })
        }
    }

    createTag(tag) {
        const newTag = document.createElement("div");
        newTag.classList.add('tag');
        newTag.appendChild(document.createTextNode(tag));

        const removeTagButton = document.createElement('button');
        removeTagButton.innerHTML = 'x';
        removeTagButton.classList.add('removeTag');
        removeTagButton.title = 'Remove tag';

        removeTagButton.addEventListener('click', () => {
            newTag.remove();
            if (this.masterTagList.has(tag)){
                this.addTagToDropdown(tag);
            }
        })

        newTag.appendChild(removeTagButton);
        return newTag;
    }

    getAllTags() {
        const retVal = [];
        const allTags = this.shadowRoot.querySelectorAll('.tag');
        allTags.forEach(tag => {
            retVal.push(tag.firstChild.textContent);
        })
        return retVal;
    }

    closeDropDown() {
        const tags = this.shadowRoot.getElementById("tags-div");

        if (!tags.classList.contains('hidden')) {
            const dropDownButton = this.shadowRoot.querySelector('.dropdown_button');
            dropDownButton.click();
        }
    }
}
window.customElements.define('st-comment-tags', CommentTags);
