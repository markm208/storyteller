class ServerProxy {
  //send the comment object to the server and recieve a complete comment back with id and developerGroup
  async sendNewCommentToServer(comment) {
    let newComment;
    try {
      const fetchConfigData = {
        method: 'POST',
        body: JSON.stringify(comment),
        headers: {
          'Content-Type': 'application/json'
        }
      };
      const response = await fetch('/comment', fetchConfigData);

      //check the response
      if (response.ok) {
        newComment = await response.json();
        console.log('Success');
      } else {
        console.log('Error with the response data');
      }

    } catch (error) {
      console.log('Error with the POST');
    }
    return newComment;
  }

  //update an existing comment on the server
  async updateCommentOnServer(comment) {
    let updatedComment;
    try {
      const fetchConfigData = {
        method: 'PUT',
        body: JSON.stringify(comment),
        headers: {
          'Content-Type': 'application/json'
        }
      };
      const response = await fetch('/comment', fetchConfigData);

      //check the response
      if (response.ok) {
        updatedComment = await response.json();
        console.log('Success');
      } else {
        console.log('Error with the response data');
      }

    } catch (error) {
      console.log('Error with the Comment Change');
    }
    return updatedComment;
  }

  //update the comment position on the server
  async updateCommentPositionOnServer(updatedCommentPosition) {
    try {
      const fetchConfigData = {
        method: 'PUT',
        body: JSON.stringify(updatedCommentPosition),
        headers: {
          'Content-Type': 'application/json'
        }
      };
      const response = await fetch('/commentPosition', fetchConfigData);

      //check the response
      if (response.ok) {
        console.log('Success');
      } else {
        console.log('Error with the response data');
      }

    } catch (error) {
      console.log('Error with the Position Change');
    }
  }

  //delete a comment from the server
  async deleteCommentFromServer(comment) {
    try {
      const fetchConfigData = {
        method: 'DELETE',
        body: JSON.stringify(comment),
        headers: {
          'Content-Type': 'application/json'
        }
      };
      const response = await fetch('/comment', fetchConfigData);

      //check the response
      if (response.ok) {
        console.log('Success');
      } else {
        console.log('Error with the response data');
      }

    } catch (error) {
      console.log('Error with the Deletion');
    }
  }

  //send the comment object to the server
  async updateTitleOnServer(newTitle) {
    try {
      const fetchConfigData = {
        method: 'PUT',
        body: JSON.stringify({ title: newTitle }),
        headers: {
          'Content-Type': 'application/json'
        }
      };
      const response = await fetch('/project', fetchConfigData);

      //check the response
      if (response.ok) {
        console.log('Success');
      } else {
        console.log('Error with the response data');
      }

    } catch (error) {
      console.log('Error with the Comment Change');
    }
  }

  async addImageOnServer(files) {
    let retVal = [];
    try {
      //create some form data
      const formData = new FormData();

      //go through all of the selected files
      //if there is only one the FormData will add it, if there are many it 
      //will create an array of the files
      for (let i = 0; i < files.length; i++) {
        //add the file to the form data
        formData.append('newFiles', files[i]);
      }

      //post to the server
      const fetchConfigData = {
        method: 'POST',
        body: formData,
      };
      const response = await fetch('/newMedia/image', fetchConfigData);

      //check the response
      if (response.ok) {
        const mediaInfo = await response.json();

        //return the new file paths of the uploaded media
        retVal = mediaInfo.filePaths
      } else {
        console.log('Error with the response data');
      }
    } catch (error) {
      console.log('Error with request');
    }

    return retVal;
  }

  async deleteImageOnServer(filePath) {
    try {
      //delete to the server
      const fetchConfigData = {
        method: 'DELETE',
        body: JSON.stringify([filePath]),
        headers: {
          'Content-Type': 'application/json'
        }
      };
      const response = await fetch('/newMedia/image', fetchConfigData);

      //check the response
      if (!response.ok) {
        console.log('Error with the response data');
      }
    } catch (error) {
      console.log(error);
    }
  }

  async addVideoOnServer(files) {
    let retVal = [];
    try {
      //create some form data
      const formData = new FormData();

      //go through all of the selected files
      //if there is only one the FormData will add it, if there are many it 
      //will create an array of the files
      for (let i = 0; i < files.length; i++) {
        //add the file to the form data
        formData.append('newFiles', files[i]);
      }

      //post to the server
      const fetchConfigData = {
        method: 'POST',
        body: formData,
      };
      const response = await fetch('/newMedia/video', fetchConfigData);

      //check the response
      if (response.ok) {
        const mediaInfo = await response.json();

        //return the new file paths of the uploaded media
        retVal = mediaInfo.filePaths
      } else {
        console.log('Error with the response data');
      }
    } catch (error) {
      console.log('Error with request');
    }

    return retVal;
  }

  async deleteVideoOnServer(filePath) {
    try {
      //delete to the server
      const fetchConfigData = {
        method: 'DELETE',
        body: JSON.stringify([filePath]),
        headers: {
          'Content-Type': 'application/json'
        }
      };
      const response = await fetch('/newMedia/video', fetchConfigData);

      //check the response
      if (!response.ok) {
        console.log('Error with the response data');
      }
    } catch (error) {
      console.log(error);
    }
  }

  async addAudioOnServer(files) {
    let retVal = [];
    try {
      //create some form data
      const formData = new FormData();

      //go through all of the selected files
      //if there is only one the FormData will add it, if there are many it 
      //will create an array of the files
      for (let i = 0; i < files.length; i++) {
        //add the file to the form data
        formData.append('newFiles', files[i]);
      }

      //post to the server
      const fetchConfigData = {
        method: 'POST',
        body: formData,
      };
      const response = await fetch('/newMedia/audio', fetchConfigData);

      //check the response
      if (response.ok) {
        const mediaInfo = await response.json();

        //return the new file paths of the uploaded media
        retVal = mediaInfo.filePaths
      } else {
        console.log('Error with the response data');
      }
    } catch (error) {
      console.log('Error with request');
    }

    return retVal;
  }

  async deleteAudioOnServer(filePath) {
    try {
      //delete to the server
      const fetchConfigData = {
        method: 'DELETE',
        body: JSON.stringify([filePath]),
        headers: {
          'Content-Type': 'application/json'
        }
      };
      const response = await fetch('/newMedia/audio', fetchConfigData);

      //check the response
      if (!response.ok) {
        console.log('Error with the response data');
      }
    } catch (error) {
      console.log(error);
    }
  }

  //add a method to send an ai prompt to the server
  async sendAIPromptToServer(prompt) {
    let resultObject = {response: null, error: true};

    try {
      const fetchConfigData = {
        method: 'POST',
        body: JSON.stringify({ prompt }),
        headers: {
          'Content-Type': 'application/json',
        }
      };

      let metaTag = document.querySelector('meta[name="csrf-token"]');
      if (metaTag) {
        fetchConfigData.headers['X-CSRF-Token'] = metaTag.content;
      }
      
      const httpResponse = await fetch('/aiPrompt', fetchConfigData);
      const bodyJSON = await httpResponse.json();
      resultObject.response = bodyJSON.response;
      if (httpResponse.ok) {
        resultObject.error = false;
      }
    } catch (error) {
      console.log(error);
    }
    return resultObject;
  }

  async sendTextToSpeechRequest(text) {
    let resultObject = { response: null, error: true };
    try {
      const fetchConfigData = {
        method: 'POST',
        body: JSON.stringify({ text }),
        headers: {
          'Content-Type': 'application/json',
        }
      };

      let metaTag = document.querySelector('meta[name="csrf-token"]');
      if (metaTag) {
        fetchConfigData.headers['X-CSRF-Token'] = metaTag.content;
      }

      const httpResponse = await fetch('/tts', fetchConfigData);
      if (httpResponse.ok) {
        resultObject.response = await httpResponse.blob();
        resultObject.error = false;
      } else {
        const errorResponse = await httpResponse.json();
        resultObject.response = errorResponse.response;
        resultObject.error = true;
      }
    } catch (error) {
      resultObject.response = "Error converting text to speech.";
      resultObject.error = true;
    }
    return resultObject;
  }
}