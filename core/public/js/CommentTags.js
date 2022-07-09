class CommentTags extends HTMLElement {
    constructor(tags) {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(this.getTemplate());
        this.tagsSet = new Set();
        this.permanentCommentTags = ['all-tests-pass', 'successful-run', 'version-control-commit'];

        tags.forEach(tag => {
            this.addTag(tag);
        })
    }

    getTemplate() {
        const template = document.createElement('template');
        template.innerHTML = `
        <style>
            .dropdown_button {
                background-color: #0979ad;
                color: white;
            // padding: 16px;
                font-size: 16px;
                border: none;
                cursor: pointer;
            // width: 200px;
                font-family: montserrat;
                border: 1px solid #ffffff;
            }
            .courses {
                display: none;
                position: absolute;
                background-color: #f1f1f1;
                min-width: 200px;
                box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
                z-index: 1;
            }
    
            .courses li {
                color: black;
            //  padding: 12px 16px;
                text-decoration: none;
                display: block;
                list-style: none;
                background-color: rgb(47, 47, 47);
                font-family: montserrat;
                border: 1px solid white;
            }
    
            .courses li a {
                text-decoration: none;
                color: white;
                display: block;
                padding: 10px;
            }
    
            .courses li:hover {
                // background-color: #0979ad;
                background-color: gray;
                color: white;
            }

            #outerDiv {
                display: inline-flex;
            }

            .blink{
                background-color: red !important;
            }

            #tagsDiv {
                display: flex;
            }

            .tag{
                padding: 5px;
                border-radius: 25px;
                border: solid thin;
                margin-right: 10px;
                margin-top: 10px;
            }

            .removeTag{
                background: transparent;
                border: none;
                color: red;
                cursor: pointer;
            }

        </style>
        <div id='outerDiv'> Enter a tag
            <input type="text" id='tagInput'>
            <input type='button' id='addTagButton' value='Add tag'>  
            <div class="dropdown_list">            <button class="dropdown_button" >            Select tag            </button>

                <div id="courses_id" class="courses">
                    <li><a href="">Machine learning</a></li>
                    <li><a href="">Data science</a></li>
                    <li><a href="">Data analysis</a></li>
                    <li><a href="">Data mining</a></li>
                    <li><a href="">Data warehousing</a></li>
                </div>
            </div>     
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

        const dropDownButton = this.shadowRoot.querySelector('.dropdown_button');
        dropDownButton.addEventListener('click', () => {
            var courses = this.shadowRoot.getElementById("courses_id");

            if (courses.style.display == "block") {
                courses.style.display = "none";
            } else {
                courses.style.display = "block";
            }
        })

        const blah = this.shadowRoot.querySelector('#courses_id').getElementsByTagName('li');

        for (let i = 0; i < blah.length; i++) {
            const thisBlah = blah[i];
            thisBlah.addEventListener('click', (event) => {
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
                                dropDownButton.click();
                            }, 150);
                        }, 75);
                    }, 75);
                }, 75);
            });
        }
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
        const newTag = document.createElement("div");
        newTag.classList.add('tag');
        newTag.appendChild(document.createTextNode(tag));

        const removeTagButton = document.createElement('button');
        //removeTagButton.setAttribute('type', 'button');
        removeTagButton.innerHTML = 'X';
        removeTagButton.classList.add('removeTag');
        removeTagButton.title = 'Remove tag';

        removeTagButton.addEventListener('click', () => {
            newTag.remove();
            this.tagsSet.delete(tag);
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
}
window.customElements.define('st-comment-tags', CommentTags);
