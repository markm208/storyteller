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
          background-color: grey;
        }

        .checkBoxContent{
          display: flex;
        }
        
        #addAnswerButton{
          background-color: transparent;
          color: white;
          border: none;
          cursor: pointer;
          margin-bottom: 20px;
        }
        #addAnswerButton:hover {
          background-color: gray;
        }
      </style>

      <div class='questionComment'>
        <label>Question</label>
        <div id='commentQuestionContainer'></div>
        
        <label>Answers</label>
        <button id='addAnswerButton' type='button'>
          <svg width='1em' height='1em' viewBox='0 0 16 16' class='bi bi-plus-circle-fill addQuestionButton' fill='white' xmlns='http://www.w3.org/2000/svg'>
            <path fill-rule='evenodd' d='M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3v-3z'/>
          </svg>
          Add Answer
        </button>
        <div id="allAnswersContainer"></div>
        
        <label>Explanation</label>
        <div id="explanationTextContainer"></div>
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
    checkBoxDiv.classList.add('checkBoxContent');
    const checkBox = document.createElement('input');
    checkBox.type = 'checkbox';
    //if this comes from an existing question and is the right answer
    if (isCorrectAnswer) {
      checkBox.setAttribute('checked', 'true');
    }
    checkBox.classList.add('rightAnswerCheckBox');
    checkBox.addEventListener('click', this.rightAnswerCheckBoxHandler);
    this.totalAnswers++;
    checkBox.setAttribute('id', `checkBox-${answerNumber}`);

    //label
    const label = document.createElement('label');
    label.innerHTML = ' Correct Answer';
    label.setAttribute('for', `checkBox-${answerNumber}`);

    checkBoxDiv.append(checkBox);
    checkBoxDiv.append(label);

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
      questionState: 'no question',
      errorMessage: ''
    };

    let foundError = false;

    //question text
    const commentQuestion = this.shadowRoot.querySelector('#commentQuestion');
    if (commentQuestion.getFormattedText() !== '') {
      retVal.questionData.question = commentQuestion.getFormattedText();
    } else {
      foundError = true;
      retVal.errorMessage = 'Question field cannot be empty';
    }

    //explanation test
    const explanationText = this.shadowRoot.querySelector('#explanationText');
    if(explanationText.getFormattedText()) {
      retVal.questionData.explanation = explanationText.getFormattedText();
    }

    //error checking
    if (!foundError) {
      const answers = this.shadowRoot.querySelectorAll('.questionCommentInput');
      //empty answer text
      for (let i = 0; i < answers.length; i++) {
        const thisAnswer = answers[i].value;
        if (thisAnswer !== '') {
          retVal.questionData.allAnswers.push(thisAnswer);
        } else {
          foundError = true;
          retVal.errorMessage = 'An answer field cannot be empty';
          break;
        }
      }
    }

    if (!foundError) {
      const rightAnswerInput = this.shadowRoot.querySelector('.rightAnswerCheckBox:checked');
      //no selected correct answer
      if (rightAnswerInput !== null) {
        const rightAnswer = rightAnswerInput.closest('.questionOuterDiv').querySelector('.questionCommentInput').value;
        retVal.questionData.correctAnswer = rightAnswer;
      } else {
        foundError = true;
        retVal.errorMessage = 'One correct answer must be selected';
      }
    }

    retVal.questionState = foundError ? 'invalid input' : 'valid question';
    return retVal;
  }
}
window.customElements.define('st-create-multiple-choice-question', CreateMultipleChoiceQuestion);