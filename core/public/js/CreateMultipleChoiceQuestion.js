class CreateMultipleChoiceQuestion extends HTMLElement {
    constructor() {
        super();

        this.totalAnswers = 2;
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(this.getTemplate());
    }

    getTemplate() {
        const template = document.createElement('template');
        template.innerHTML = `
        <style>
            #commentQuestion {
                min-height: 100px;
                overflow: auto;
                resize: vertical;
                background-color: rgb(51,51,51);
                color: white;
                border: 1px solid #CED4D6;
                border-radius: 0.25rem;

                
            }

            input[type=text], textarea , #commentQuestion{
                // -webkit-transition: all 0.30s ease-in-out;
                // -moz-transition: all 0.30s ease-in-out;
                // -ms-transition: all 0.30s ease-in-out;
                // -o-transition: all 0.30s ease-in-out;
                outline: none;
                padding: 3px 0px 3px 3px;
                margin: 5px 1px 3px 0px;
                border: 1px solid #DDDDDD;
              }

            input[type=text]:focus, textarea:focus, #commentQuestion:focus {
                box-shadow: 0 0 5px rgba(91, 122, 237, 1);
                padding: 3px 0px 3px 3px;
                margin: 5px 1px 3px 0px;
                border: 1px solid rgba(91, 122, 237, 1);
              }

            .questionCommentInput{
                background-color: rgb(51,51,51);
                color: white;
                border: 1px solid #CED4D6;
                border-radius: 0.25rem;
            }

            .answerToDelete{
                border: solid thin red !important;
            }


        
        </style>

        <div class="questionComment">
            <form class="questionCommentContent">
                <div class="form-group">
                <label>Question</label>
                <div id="commentQuestion" contenteditable="true" placeholder="Question"></div>
                    <button id="addAnswerButton" type="button">
                        <svg width="1em" height="1em" viewBox="0 0 16 16" class="bi bi-plus-circle-fill addQuestionButton" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd" d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3v-3z"/>
                        </svg>
                        Add Answer
                    </button>
                </div>
                
                <div>
                    <input type="text" class="questionCommentInput" value="" autocomplete="off" placeholder="Answer">
                    <div >
                        <input class="rightAnswerCheckBox" type="checkbox"  id="checkBox-1">
                        <label for="checkBox-1">
                    Correct Answer
                        </label>
                    </div>
                </div>
                <div>
                    <input type="text" class="questionCommentInput" value="" autocomplete="off" placeholder="Answer">
                    <div>
                        <input class="rightAnswerCheckBox" type="checkbox"  id="checkBox-2">
                        <label for="checkBox-2">
                    Correct Answer
                        </label>
                    </div>
                </div>
            </form>
        </div>
        `;
        return template.content.cloneNode(true);

    }

    connectedCallback() {
        const checkBoxes = this.shadowRoot.querySelectorAll('.rightAnswerCheckBox');
        checkBoxes.forEach(checkbox => {
            checkbox.addEventListener('click', this.rightAnswerCheckBoxHandler);
        })

        const addAnswerButton = this.shadowRoot.querySelector('#addAnswerButton');
        addAnswerButton.addEventListener('click', () => {
            const newAnswerOuterDiv = document.createElement('div');
            newAnswerOuterDiv.classList.add('extraQuestion');
            const answerInput = document.createElement('input');
            answerInput.type = 'text';
            answerInput.classList.add('questionCommentInput');
            answerInput.value = '';
            answerInput.setAttribute('autocomplete', 'off');
            answerInput.placeholder = 'Answer';

            const checkBoxDiv = document.createElement('div');
            const checkBox = document.createElement('input');
            checkBox.type = 'checkbox';
            checkBox.classList.add('rightAnswerCheckBox');
            checkBox.addEventListener('click', this.rightAnswerCheckBoxHandler);
            this.totalAnswers++;
            checkBox.setAttribute('id', "checkBox-" + this.totalAnswers); 

        


            const label = document.createElement('label');
            label.innerHTML = ' Correct Answer';
            label.setAttribute("for", "checkBox-" + this.totalAnswers);

            const removeAnswerButton = document.createElement("button");
            removeAnswerButton.classList.add("removeAnswerButton");
            removeAnswerButton.setAttribute("type", "button");
        
            removeAnswerButton.addEventListener('click', function(event) {
                event.target.closest(".extraQuestion").remove();
            })
        
            //add a class that will highlight the border of the answer that will be deleted by pressing the removeAnswerButton
            removeAnswerButton.addEventListener('mouseover', function(event) {
                event.target.closest(".extraQuestion").querySelector(".questionCommentInput").style.border = 'solid thin red';
            })
        
            removeAnswerButton.addEventListener('mouseout', function(event) {
                event.target.closest(".extraQuestion").querySelector(".questionCommentInput").style.border = 'solid thin';
            })
        
            removeAnswerButton.appendChild(document.createTextNode('Remove Answer'));  


            checkBoxDiv.append(checkBox);
            checkBoxDiv.append(label);
            checkBoxDiv.append(removeAnswerButton);

            newAnswerOuterDiv.append(answerInput);
            newAnswerOuterDiv.append(checkBoxDiv);

            const testing = this.shadowRoot.querySelector('.questionCommentContent');
            testing.append(newAnswerOuterDiv);


            
        })
    }

    disconnectedCallback() {

    }

    rightAnswerCheckBoxHandler = (event) => {
        const checkedBoxes = this.shadowRoot.querySelectorAll('.rightAnswerCheckBox:checked');       
        checkedBoxes.forEach(checkbox => {
            if (checkbox.id !== event.target.id) {
                checkbox.checked = false;
            }
        })    
    }
}
window.customElements.define('st-create-multiple-choice-question', CreateMultipleChoiceQuestion);
