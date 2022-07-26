class QuestionAnswerView extends HTMLElement {
  constructor(comment) {
    super();

    this.comment = comment;
    
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.getTemplate());
  }

  getTemplate() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        .questionAndAnswerContainer {
          padding: 5px 7px;
          border: 1px solid gray;
          margin: 0px 10px 8px 10px;
          box-shadow: rgba(0, 0, 0, 0.24) 0px 3px 8px;
        }
        :host(.questionSearchHighlight) .questionAndAnswerContainer {
          border: 1px solid lightgray;
        }

        #questionText {
          padding-bottom: 5px;
        }
        #allAnswers {
          padding-left: 5px;
        }
        .answerDiv {
          padding: 2px 5px;
          margin: 2px 0px;
        }
        #explanationDiv {
          margin: 10px 0px 5px 0px;
        }
        #explanationText {
          padding: 0px 5px 2px 15px;
        }

        a {
          color: lightblue;
        }
        a:visited {
          color: lightblue;
        }
        a:hover {
          opacity: 80%;
        }

        button {
          background-color: inherit;
          border: 1px solid lightgray;
          color: lightgray;
          cursor: pointer;
        }
        button:hover {
          background-color: lightgray;
          border: 1px solid lightgray;
          color: black;
        }

        input[type='radio'] {
          cursor: pointer;
        }
        
        .hidden {
          display: none;
        }
        
        .correctSelectionLabel::before {
          content: '✓ ';
          color: green;
          font-weight: bold;
        }
        .correctSelectionDiv {
          border: 1px solid green;
        }

        .incorrectSelectionLabel::before {
          content: '✕ ';
          color: red;
          font-weight: bold;
        }
        .incorrectSelectionDiv {
          border: 1px solid red;
        }

      </style>
      <div class="questionAndAnswerContainer">
        <div id="questionText"></div>
        <div id="allAnswers"></div>
        <div id="explanationDiv" class="hidden">
          <div class="explanationLabel">Explanation:</div>
          <div id="explanationText"></div>
        </div>
        <button id="answerButton">Check Answer</button>
        <button id="clearAnswerButton" class="hidden">Clear</button>
      </div>`;

    return template.content.cloneNode(true);
  }

  connectedCallback() { 
    //add the question text
    const questionText = this.shadowRoot.querySelector('#questionText');
    questionText.innerHTML = this.comment.questionCommentData.question;
    
    //add the answers
    const allAnswers = this.shadowRoot.querySelector('#allAnswers');
    this.comment.questionCommentData.allAnswers.forEach((answer, index) => {
      const answerUI = this.createAnswer(answer, index);
      allAnswers.appendChild(answerUI);
    });

    //add the explanation
    const explanationText = this.shadowRoot.querySelector('#explanationText');
    explanationText.innerHTML = this.comment.questionCommentData.explanation ? this.comment.questionCommentData.explanation : '';

    //handle answering the question
    const answerButton = this.shadowRoot.querySelector('#answerButton');
    answerButton.addEventListener('click', event => {
      this.gradeQuestion();
    });

    //handle clearing the answer
    const clearAnswerButton = this.shadowRoot.querySelector('#clearAnswerButton');
    clearAnswerButton.addEventListener('click', event => {
      this.clearAnswers();
      this.clearAnswerHighlights();
    });
  }

  disconnectedCallback() {
  }

  createAnswer(answerText, answerNumber) {
    //div to hold the radio button and the label with the answer
    const outer = document.createElement('div');
    outer.classList.add('answerDiv');

    //create a checkbox
    const input = document.createElement('input');
    input.setAttribute('type', 'radio');
    input.setAttribute('id', `answer-${answerNumber}`);
    input.setAttribute('name', 'answerButton');
    input.setAttribute('value', answerText);
    input.addEventListener('keydown', event => {
      //prevent space bar from starting playback
      event.stopPropagation();
    });

    //create a label
    const label = document.createElement('label');
    label.setAttribute('for', `answer-${answerNumber}`);
    label.innerHTML = answerText;

    outer.appendChild(input);
    outer.appendChild(label);

    return outer;
  }

  gradeQuestion() {
    //clear any old highlights
    this.clearAnswerHighlights();

    //the user's selected answer and the right answer
    let selectedAnswer = null;
    let rightAnswer = null;

    //find the two relevant answers
    const allAnswerRadioButtons = this.shadowRoot.querySelectorAll('input');
    allAnswerRadioButtons.forEach(allAnswerRadioButton => {
      //user selected
      if(allAnswerRadioButton.checked) {
        selectedAnswer = allAnswerRadioButton;
      }
      //right answer from question data
      if(allAnswerRadioButton.value === this.comment.questionCommentData.correctAnswer) {
        rightAnswer = allAnswerRadioButton;
      }
    });

    //get the containing div and label of the input
    const rightAnswerDiv = rightAnswer.parentElement;
    const rightAnswerLabel = rightAnswer.parentElement.children[1];
    //if the user selected the right answer
    if(selectedAnswer) {
      //get the containing div and label of the input
      const selectedAnswerDiv = selectedAnswer.parentElement;
      const selectedAnswerLabel = selectedAnswer.parentElement.children[1];
      //if the user selected correctly
      if(selectedAnswer === rightAnswer) {
        //highlight the right answer
        selectedAnswerLabel.classList.add('correctSelectionLabel');
        selectedAnswerDiv.classList.add('correctSelectionDiv');
      } else {
        //highlight the wrong selected answer
        selectedAnswerLabel.classList.add('incorrectSelectionLabel');
        selectedAnswerDiv.classList.add('incorrectSelectionDiv');
        //highlight the answer they should have chosen
        rightAnswerLabel.classList.add('correctSelectionLabel');
        rightAnswerDiv.classList.add('correctSelectionDiv');
      }
    } else { //the user did not select any answer
      //put a check next to the right answer
      rightAnswer.checked = true;
      //highlight the answer they should have chosen
      rightAnswerLabel.classList.add('correctSelectionLabel');
      rightAnswerDiv.classList.add('correctSelectionDiv');
    }

    //if this question has some explanation then display it
    if(this.comment.questionCommentData.explanation && this.comment.questionCommentData.explanation.trim() !== '') {
      const explanationDiv = this.shadowRoot.querySelector('#explanationDiv');
      explanationDiv.classList.remove('hidden');
    }

    //toggle the visible buttons
    const answerButton = this.shadowRoot.querySelector('#answerButton');
    answerButton.classList.add('hidden');
    const clearAnswerButton = this.shadowRoot.querySelector('#clearAnswerButton');
    clearAnswerButton.classList.remove('hidden');
  }

  clearAnswers() {
    //remove all checked answers
    const allAnswerRadioButtons = this.shadowRoot.querySelectorAll('input');
    allAnswerRadioButtons.forEach(allAnswerRadioButton => {
      allAnswerRadioButton.checked = false;
    });
  }

  clearAnswerHighlights() {
    //remove all highlights
    const allAnswerRadioButtons = this.shadowRoot.querySelectorAll('input');
    allAnswerRadioButtons.forEach(allAnswerRadioButton => {
      const allAnswerRadioButtonDiv = allAnswerRadioButton.parentElement;
      const allAnswerRadioButtonLabel = allAnswerRadioButton.parentElement.children[1];

      allAnswerRadioButtonLabel.classList.remove('correctSelectionLabel');
      allAnswerRadioButtonDiv.classList.remove('correctSelectionDiv');
      allAnswerRadioButtonLabel.classList.remove('incorrectSelectionLabel');
      allAnswerRadioButtonDiv.classList.remove('incorrectSelectionDiv');
    });

    //remove the explanation
    const explanationDiv = this.shadowRoot.querySelector('#explanationDiv');
    explanationDiv.classList.add('hidden');

    //toggle the visible buttons
    const answerButton = this.shadowRoot.querySelector('#answerButton');
    answerButton.classList.remove('hidden');
    const clearAnswerButton = this.shadowRoot.querySelector('#clearAnswerButton');
    clearAnswerButton.classList.add('hidden');
  }
}

window.customElements.define('st-question-answer-view', QuestionAnswerView);