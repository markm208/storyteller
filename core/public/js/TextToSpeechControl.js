class TextToSpeechControl extends HTMLElement {
  constructor(previouslyRecordedURL, textToConvert, ttsSpeed, keyboardControl=false) {
    super();
    this.attachShadow({ mode: 'open' });

    //either a file url will be passed in or some text to be converted to speech (lazily)
    this.previouslyRecordedURL = previouslyRecordedURL;
    this.textToConvert = textToConvert;
    //audio playback speed
    this.ttsSpeed = ttsSpeed;
    //can play this audio file with the keyboard
    this.keyboardControl = keyboardControl;
    //tracks whether an audio file was created or not
    this.generatedAudioFile = false;

    //audio to play
    this.audio = new Audio();
    this.audio.addEventListener("ended", () => this.updateButtonImage("play"));
    
    this.shadowRoot.innerHTML = `
        <style>
          button {
            opacity: 80%;
            background-repeat: no-repeat;
            background-color: transparent;
            height: 1.6em;
            width: 1.6em;
            border: none;
            cursor: pointer;
            padding: 3px;
          }
          button.play, button.convert {
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="lightgray" class="bi bi-play-circle-fill" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M6.79 5.093A.5.5 0 0 0 6 5.5v5a.5.5 0 0 0 .79.407l3.5-2.5a.5.5 0 0 0 0-.814z"/></svg>') no-repeat center;
          }
          button.downloading {
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="lightgray" class="bi bi-cloud-arrow-down-fill" viewBox="0 0 16 16"><path d="M8 2a5.53 5.53 0 0 0-3.594 1.342c-.766.66-1.321 1.52-1.464 2.383C1.266 6.095 0 7.555 0 9.318 0 11.366 1.708 13 3.781 13h8.906C14.502 13 16 11.57 16 9.773c0-1.636-1.242-2.969-2.834-3.194C12.923 3.999 10.69 2 8 2m2.354 6.854-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 1 1 .708-.708L7.5 9.293V5.5a.5.5 0 0 1 1 0v3.793l1.146-1.147a.5.5 0 0 1 .708.708"/></svg>') no-repeat center;
          }
          button.pause {
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="lightgray" class="bi bi-pause-circle-fill" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M6.25 5C5.56 5 5 5.56 5 6.25v3.5a1.25 1.25 0 1 0 2.5 0v-3.5C7.5 5.56 6.94 5 6.25 5m3.5 0c-.69 0-1.25.56-1.25 1.25v3.5a1.25 1.25 0 1 0 2.5 0v-3.5C11 5.56 10.44 5 9.75 5"/></svg>') no-repeat center;
          }
          button.error {
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="lightgray" class="bi bi-exclamation-circle" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/></svg>') no-repeat center;
          }
          button:hover {
            opacity: 100%;
          }
          button:disabled {
            opacity: 40%;
          }
        </style>
        <button id="ttsButton"></button>
      `;

    const ttsButton = this.shadowRoot.querySelector("#ttsButton");
    ttsButton.addEventListener("click", () => this.handleButtonClick());

    //if there is a file url, set the audio source
    if(this.previouslyRecordedURL) {
      //set the source audio file
      this.audio.src = this.previouslyRecordedURL;
      //get UI ready to play
      this.updateButtonImage("play");
    } else if(textToConvert) {
      //don't convert the text to speech yet, wait until the button is clicked
      //get UI ready to convert the text to speech
      this.updateButtonImage("convert");
    } else { //neither a file url nor text to convert to speech
      //get UI ready to show an error
      this.updateButtonImage("error", "No audio file or text to convert to speech");
    } //else- the text will be converted to speech when the button is clicked
  }

  disconnectedCallback() {
    //if an audio file was generated via an object URL
    if(this.generatedAudioFile) {
      //revoke the previously created object URL
      URL.revokeObjectURL(this.audio.src);
    }
  }

  async handleButtonClick() {
    //going from 'paused' to 'playing'
    if (this.audio.paused) { 
      //if there is no audio source yet, convert the text to speech
      if (!this.audio.src && this.textToConvert) {
        //clean up the text from html/markdown before converting it to speech
        this.textToConvert = this.stripHTMLAndMarkdown(this.textToConvert);
        if(this.textToConvert.length > 0) {
          const ttsButton = this.shadowRoot.querySelector("#ttsButton");
          this.updateButtonImage("downloading");

          //disable the button while downloading
          ttsButton.disabled = true;

          //convert the text to speech via an API (may take a while)
          const serverProxy = new ServerProxy();
          const data = await serverProxy.sendTextToSpeechRequest(this.textToConvert);
          
          //reenable the button after the download is complete
          ttsButton.disabled = false;

          //verify the conversion happened
          if(data.error) {
            this.updateButtonImage("error", data.response);
            return;
          } else { //text was converted to speech, data.response is an audio file
            this.audio.src = URL.createObjectURL(data.response);
            this.generatedAudioFile = true;
          }
        } else { //no text to convert to speech
          this.updateButtonImage("error", "There was no text to convert to speech");
          console.log("Error: no text to convert to speech");
          return;
        }
      } //else- the audio source is already set

      //get UI ready to pause
      this.updateButtonImage("pause");
      //start the audio
      this.audio.playbackRate = this.ttsSpeed;
      await this.audio.play();
    } else { //go from 'playing' to 'paused'
      //get UI ready to play again
      this.updateButtonImage("play");
      //pause the audio
      await this.audio.pause();
    }
  }

  stripHTMLAndMarkdown(text) {
    //strip HTML tags
    const doc = new DOMParser().parseFromString(text, "text/html");
    let strippedText = doc.body.textContent || "";

    //strip Markdown syntax
    strippedText = strippedText
      .replace(/(\*\*|__)(.*?)\1/g, "$2") // Bold
      .replace(/(\*|_)(.*?)\1/g, "$2") // Italic
      .replace(/~~(.*?)~~/g, "$1") // Strikethrough
      .replace(/`(.*?)`/g, "$1") // Inline code
      .replace(/```[\s\S]*?```/g, "") // Code block
      .replace(/#+\s(.*?)/g, "$1") // Headers
      .replace(/!\[.*?\]\(.*?\)/g, "") // Images
      .replace(/\[.*?\]\(.*?\)/g, "$1") // Links
      .replace(/>\s(.*?)/g, "$1") // Blockquotes
      .replace(/[-+*]\s(.*?)/g, "$1") // Lists
      .replace(/\d+\.\s(.*?)/g, "$1"); // Numbered lists

      strippedText = strippedText.replace(/\s+/g, " ");
      strippedText = strippedText.trim();
    return strippedText;
  }

  updateTTSSpeed(newTTSSpeed) {
    //update the playback speed
    this.ttsSpeed = newTTSSpeed;
  }

  updateButtonImage(state, errorMsg = "Error convertconverting text to speech") {
    const ttsButton = this.shadowRoot.querySelector("#ttsButton");
    ttsButton.className = state;
    
    if(state === "play") {
      ttsButton.title = `Read comment ${this.keyboardControl ? "(press 'p' to play)" : ""}`;
    } else if(state === "pause") {
      ttsButton.title = "Pause reading comment";
    } else if(state === "convert") {
      ttsButton.title = `Convert comment to speech and read it ${this.keyboardControl ? "(press 'p' to play)" : ""}`;
    } else if(state === "downloading") {
      ttsButton.title = "Converting comment to speech... this may take a few seconds";
    } else if(state === "error") {
      ttsButton.title = errorMsg;
    }
  }
}

customElements.define('st-text-to-speech-control', TextToSpeechControl);
