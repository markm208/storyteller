class CreateMultipleChoiceQuestion extends HTMLElement {
  constructor(questionCommentData) {
    super();

    this.questionCommentData = questionCommentData;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 2px 4px;
          margin: 2px;
        }
        #commentQuestionContainer, #allAnswersContainer {
          margin-bottom: 15px;
        }
        .questionCommentInput{
          background-color: inherit;
          color: lightgray;
          border: 1px solid gray;
          width: calc(100% - 5px);
        }

        .removeAnswerButton{
          float: right;
          background: transparent;
          border: none;
          color: white;
          cursor: pointer;
        }

        label{
          padding-right: 10px;
        }

        .questionOuterDiv{
          padding-bottom: 5px;
        }

        .removeAnswerButton::before{
          display: inline-block;
          content: '';
          background-image: url("data:image/svg+xml,<svg viewBox='0 0 16 16' class='bi bi-x-circle-fill' fill='white' xmlns='http://www.w3.org/2000/svg'><path fill-rule='evenodd' d='M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z'/></svg>");
          background-repeat: no-repeat;
          height: 1em;
          width: 1.4em;
          border: none;
          margin-right: -2px;
          margin-bottom: -3px;
        }
        
        .removeAnswerButton:hover {
          border: 1px solid lightgray;
        }

        .spaceBetweenContent{
          display: flex;
          justify-content: space-between
        }
        
        #addAnswerButton{
          background-color: transparent;
          color: lightgray;
          border: 1px solid transparent;
          cursor: pointer;
          padding: 3px;
        }
        #addAnswerButton:hover{
          border: 1px solid lightgray;
        }

        #clearQuestionButton{
          display: block;
          background-color: transparent;
          color: lightgray;
          border: 1px solid transparent;
          cursor: pointer;
          padding: 3px;
        }
        #clearQuestionButton:hover {
          border: 1px solid lightgray;
        }

        input[type='checkbox'] {
          cursor: pointer;
        }

        #clearAllDiv {
          display: flex;
          justify-content: flex-end;
        }
      </style>

      <div class='questionComment'>
        <label>Question</label>
        <div id='commentQuestionContainer'></div>
        
        <div class="spaceBetweenContent">
          <label>Answers</label>
          <button id='addAnswerButton' type='button'>
            <svg width='1em' height='1em' viewBox='0 0 16 16' class='bi bi-plus-circle-fill addQuestionButton' fill='lightgray' xmlns='http://www.w3.org/2000/svg'>
              <path fill-rule='evenodd' d='M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3v-3z'/>
            </svg>
            Add Answer
          </button>
        </div>
        <div id="allAnswersContainer"></div>

        <label>Explanation</label>
        <div id="explanationTextContainer"></div>
        <div id="clearAllDiv">
          <button id='clearQuestionButton' type='button'>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x" viewBox="0 0 16 16">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>
            Clear All
          </button>
        </div>
      </div>
      `;
    return template.content.cloneNode(true);
  }

  connectedCallback() {
    //make the question prompt empty
    const commentQuestionContainer = this.shadowRoot.querySelector('#commentQuestionContainer');
    const commentQuestion = new MultiLineTextInput('Add the question here', '', 100);
    commentQuestion.setAttribute('id', 'commentQuestion');
    commentQuestionContainer.appendChild(commentQuestion);

    //link up the new answer button
    const addAnswerButton = this.shadowRoot.querySelector('#addAnswerButton');
    addAnswerButton.addEventListener('click', event => {
      //used to get the total number of answers
      const allAnswers = this.shadowRoot.querySelectorAll('.questionOuterDiv');
      //add a fresh answer box
      this.addNewAnswerBox('', false, allAnswers.length + 1);
    });

    //an optional explanation of the Q&A
    const explanationTextContainer = this.shadowRoot.querySelector('#explanationTextContainer');
    const explanationText = new MultiLineTextInput('Explain the answer (optional)', '', 75);
    explanationText.setAttribute('id', 'explanationText');
    explanationTextContainer.appendChild(explanationText);

    const clearQuestionButton = this.shadowRoot.querySelector('#clearQuestionButton');
    clearQuestionButton.addEventListener('click', event => {
      //clear the question
      commentQuestion.updateFormattedText('');
      
      //clear out all of the answers
      const allAnswersContainer = this.shadowRoot.querySelector('#allAnswersContainer');
      allAnswersContainer.innerHTML = '';
      //add the first two answers back
      this.addNewAnswerBox('', false, 1);
      this.addNewAnswerBox('', false, 2);
      
      //clear the explanation
      explanationText.updateFormattedText('');
    });

    //if the comment question is being edited
    if (this.questionCommentData && this.questionCommentData.question) {
      this.createExistingQuestion();
    } else { //brand new question
      this.createNewQuestion();
    }
  }

  disconnectedCallback() {
  }

  createNewQuestion() {
    //add the first two answer
    this.addNewAnswerBox('', false, 1);
    this.addNewAnswerBox('', false, 2);
  }

  createExistingQuestion() {
    //fill the question prompt
    const commentQuestion = this.shadowRoot.querySelector('#commentQuestion');
    commentQuestion.updateFormattedText(this.questionCommentData.question);

    //now add the answers
    this.questionCommentData.allAnswers.forEach((answer, index) => {
      let isCorrectAnswer = false;
      //if this is the correct answer, mark it
      if (answer === this.questionCommentData.correctAnswer) {
        isCorrectAnswer = true;
      }
      //build the answer UI
      this.addNewAnswerBox(answer, isCorrectAnswer, index + 1);
    });

    //add the explanation
    const explanationText = this.shadowRoot.querySelector('#explanationText');
    //legacy data format-- if there is an explanation in the question
    if(this.questionCommentData.explanation) {
      explanationText.updateFormattedText(this.questionCommentData.explanation);
    }
  }

  rightAnswerCheckBoxHandler = (event) => {
    const checkedBoxes = this.shadowRoot.querySelectorAll('.rightAnswerCheckBox:checked');
    checkedBoxes.forEach(checkbox => {
      if (checkbox.id !== event.target.id) {
        checkbox.checked = false;
      }
    })
  }

  stopKeypressesFromPropagating = (event) => {
    event.stopImmediatePropagation();
  }

  addNewAnswerBox(answerText, isCorrectAnswer, answerNumber) {
    //create a div to hold the answer
    const newAnswerOuterDiv = document.createElement('div');
    newAnswerOuterDiv.classList.add('questionOuterDiv');

    //input to hold the answer
    const answerInput = document.createElement('input');
    answerInput.type = 'text';
    answerInput.classList.add('questionCommentInput');
    answerInput.value = answerText ? answerText : '';
    answerInput.setAttribute('autocomplete', 'off');
    answerInput.placeholder = 'Answer';
    answerInput.addEventListener('keydown', this.stopKeypressesFromPropagating);

    //checkbox to select as the correct answer
    const checkBoxDiv = document.createElement('div');
    checkBoxDiv.classList.add('spaceBetweenContent');
    
    const checkBoxAndLabelDiv = document.createElement('div');
    const checkBox = document.createElement('input');
    checkBox.type = 'checkbox';
    //if this comes from an existing question and is the right answer
    if (isCorrectAnswer) {
      checkBox.setAttribute('checked', 'true');
    }
    checkBox.classList.add('rightAnswerCheckBox');
    checkBox.addEventListener('click', this.rightAnswerCheckBoxHandler);
    checkBox.setAttribute('id', `checkBox-${answerNumber}`);

    //label
    const label = document.createElement('label');
    label.innerHTML = ' Correct Answer';
    label.setAttribute('for', `checkBox-${answerNumber}`);

    checkBoxAndLabelDiv.append(checkBox);
    checkBoxAndLabelDiv.append(label);
    checkBoxDiv.appendChild(checkBoxAndLabelDiv);
    //if this is an extra answer
    if (answerNumber > 2) {
      //mark it with a class
      newAnswerOuterDiv.classList.add('extraQuestion');

      //create the remove button (there must always be a minimum of two answers)
      const removeAnswerButton = document.createElement('button');
      removeAnswerButton.classList.add('removeAnswerButton');
      removeAnswerButton.setAttribute('type', 'button');

      removeAnswerButton.addEventListener('click', function (event) {
        event.target.closest('.extraQuestion').remove();
      })

      //add a class that will highlight the border of the answer that will be deleted by pressing the removeAnswerButton
      removeAnswerButton.addEventListener('mouseover', function (event) {
        event.target.closest('.extraQuestion').querySelector('.questionCommentInput').style.border = 'solid 1px red';
      })

      removeAnswerButton.addEventListener('mouseout', function (event) {
        event.target.closest('.extraQuestion').querySelector('.questionCommentInput').style.border = 'solid 1px';
      })

      removeAnswerButton.appendChild(document.createTextNode('Remove Answer'));
      checkBoxDiv.append(removeAnswerButton);
    }

    newAnswerOuterDiv.append(answerInput);
    newAnswerOuterDiv.append(checkBoxDiv);

    const allAnswersContainer = this.shadowRoot.querySelector('#allAnswersContainer');
    allAnswersContainer.append(newAnswerOuterDiv);
  }

  getMultipleChoiceQuestionData() {
    const retVal = {
      questionData: {
        allAnswers: [],
        correctAnswer: '',
        question: '',
        explanation: ''
      },
      questionState: '',
      errorMessage: ''
    };

    //question text
    const commentQuestion = this.shadowRoot.querySelector('#commentQuestion');
    const questionText = commentQuestion.getFormattedText();

    //count the number of empty and non-empty answers
    let numEmptyAnswers = 0;
    let numNonEmptyAnswers = 0;
    //all the supplied answers for the question
    const answers = this.shadowRoot.querySelectorAll('.questionCommentInput');
    for(let i = 0;i < answers.length;i++) {
      if(answers[i].value.trim() === '') {
        numEmptyAnswers++;
      } else {
        numNonEmptyAnswers++;
        //add the answer to the results
        retVal.questionData.allAnswers.push(answers[i].value);
      }
    }

    //if there is no question text
    if(questionText === '') {
      //if there are some answers
      if(numNonEmptyAnswers > 0) {
        //no question but some answers
        retVal.questionState = 'invalid input';
        retVal.errorMessage += 'Question field cannot be empty. ';
      } else { //there are no answers
        //no question and no answers means the user isn't asking a question here
        retVal.questionState = 'no question';
      }
    } else { //there is some question text
      //if there is at least one empty answer
      if(numEmptyAnswers > 0) {
        //there is an empty answer
        retVal.questionState = 'invalid input';
        retVal.errorMessage = 'Question field cannot be empty. ';
      } else { //question with no empty answers
        //make sure there is an answer selected as correct
        const rightAnswerInput = this.shadowRoot.querySelector('.rightAnswerCheckBox:checked');
        //no selected correct answer
        if (rightAnswerInput !== null) {
          //this is a valid question with answers and one is selected as correct
          retVal.questionState = 'valid question';
          
          //store the question
          retVal.questionData.question = questionText;
          
          //store the right answer
          const rightAnswer = rightAnswerInput.closest('.questionOuterDiv').querySelector('.questionCommentInput').value;
          retVal.questionData.correctAnswer = rightAnswer;

          //add any explanation test (if there is some)
          const explanationText = this.shadowRoot.querySelector('#explanationText');
          if(explanationText.getFormattedText()) {
            retVal.questionData.explanation = explanationText.getFormattedText();
          }
        } else { //question with answers but one is not selected as correct
          retVal.questionState = 'invalid input';
          retVal.errorMessage += 'One correct answer must be selected. ';
        }
      }
    }

    return retVal;
  }
}
window.customElements.define('st-create-multiple-choice-question', CreateMultipleChoiceQuestion);