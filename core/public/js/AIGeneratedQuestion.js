class AIGeneratedQuestion extends HTMLElement {
  constructor(playbackEngine, sendResponseAsEvent=false) {
    super();

    this.playbackEngine = playbackEngine;
    this.sendResponseAsEvent = sendResponseAsEvent;
    
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
        }

        #submitButton {
          margin: 5px;
          padding: 5px;
          display: block;
          margin-left: auto;
          margin-right: auto;
          background-color: transparent;
          color: lightgrey;
          border: 1px solid lightgrey;
          border-radius: .25rem;
          transition: color .15s ease-in-out, background-color .15s ease-in-out, border-color .15s ease-in-out, box-shadow .15s ease-in-out;
          opacity: 0.8;
        }

        #submitButton:hover {
          opacity: 1.0;
        }
      </style>
      <button id="submitButton">Generate A Self-Grading Multiple Choice Question</button>
      <div class="questionContainer">
      </div>
    `;
  }

  connectedCallback() {
    const submitButton = this.shadowRoot.querySelector('#submitButton');
    submitButton.addEventListener('click', this.submitText);
  }

  disconnectedCallback() {
    const submitButton = this.shadowRoot.querySelector('#submitButton');
    submitButton.removeEventListener('click', this.submitText);
  }

  submitText = async () => {
    const submitButton = this.shadowRoot.querySelector('#submitButton');
    let codeFromPlayback = this.playbackEngine.getMostRecentFileEdits(false);   
    let promptWithCode = `
      Look at the following code and come up with a multiple choice question that can be asked about it:\n\n${codeFromPlayback}\n\n
      Look at the differences and come up with a question that a learner will find it challenging to answer.\n\n
      The format of the response should be raw JSON (no markdown, specifically no \`\`\`json designators) with the question in a member called 'question', another member called 'allAnswers' that is an array of all the answers. 
      The correct answer should be duplicated in a member called 'correctAnswer'. The correct answer should have a very brief explanation of why it is correct stored in a member called 'explanation'.\n\n
      Put the correct answer at position 0 of the 'allAnswers' array.
      Here is an example of what the response should look like (make sure the response is a valid JSON object):\n\n
      {\n
        "question": "What is the capital of France?",\n
        "allAnswers": [\n
          "Paris",\n
          "London",\n
          "Berlin",\n
          "Madrid"\n
        ],\n
        "correctAnswer": "Paris",\n
        "explanation": "Paris is the capital of France."\n
      }\n\n
    If you cannot come up with a question then return this object {question: "Error"}`;

    let promptObject = {
      requestType: "Generate Question",
      prompt: promptWithCode,
      playbackViewId: document.body.dataset.playbackViewId ? document.body.dataset.playbackViewId : null
    };

    submitButton.textContent = `Generating a question...`;
    submitButton.setAttribute('disabled', 'true');
    
    //send the formatted one to the server
    const serverProxy = new ServerProxy();
    const responseObject = await serverProxy.sendAIPromptToServer(promptObject);
    
    submitButton.textContent = 'Generate Another Self-Grading Multiple Choice Question';
    submitButton.removeAttribute('disabled');

    const questionContainer = this.shadowRoot.querySelector('.questionContainer');

    if(responseObject.error) {
      questionContainer.textContent = responseObject.response;
    } else {
      //turn the string response w/Q&A into an object
      const questionCommentData = JSON.parse(responseObject.response);

      //swap the correct answer with a random one
      const randomIndex = Math.floor(Math.random() * questionCommentData.allAnswers.length);
      const temp = questionCommentData.allAnswers[0];
      questionCommentData.allAnswers[0] = questionCommentData.allAnswers[randomIndex];
      questionCommentData.allAnswers[randomIndex] = temp;
      
      const md = markdownit();
      questionCommentData.question = md.render(questionCommentData.question);
      questionCommentData.explanation = md.render(questionCommentData.explanation);

      if(this.sendResponseAsEvent) {
        const event = new CustomEvent('ai-generate-question-response', {
          detail: {
            response: questionCommentData
          },
          bubbles: true,
          composed: true
        });
        this.dispatchEvent(event);
      } else {
        const qAndAView = new QuestionAnswerView({ questionCommentData });
        questionContainer.prepend(qAndAView);
      }
    }
  }
}

window.customElements.define('st-ai-generated-question', AIGeneratedQuestion);