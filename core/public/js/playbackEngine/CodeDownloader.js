class CodeDownloader {
  constructor(playbackEngine) {
    this.playbackEngine = playbackEngine;
    this.zip = new JSZip();
  }

  /*
   * Recreates a storyteller project and gives the user a zip file to download.
   */
  async zipAndDownload() {
    //first add the code at the current pause point
    //add the current dirs
    Object.keys(this.playbackEngine.editorState.allDirectories).forEach(dirId => {
      if(this.isDirectoryDeleted(dirId) === false) {
        //get the dir path
        const dir = this.playbackEngine.editorState.allDirectories[dirId];
        let dirPath = dir.directoryPath;
        //JSZip doesn't like the leading / in paths so remove it (except for the root)
        if(dirPath !== '/') {
          dirPath = dirPath.substring(1);
        }
        //add an entry for the dir (this is to preserve empty dirs)
        this.zip.folder(dirPath);
      }
    });
    //add the current files
    Object.keys(this.playbackEngine.editorState.allFiles).forEach(fileId => {
      if(this.isFileDeleted(fileId) === false) {
        const file = this.playbackEngine.editorState.allFiles[fileId];
        //get the file path and the text in the editor and add the file to the zip
        const fileContents = this.playbackEngine.editorState.getFile(fileId);
        //JSZip doesn't like the leading / in paths so remove it
        const filePath = file.filePath.substring(1);
        this.zip.file(filePath, fileContents);
      }
    });

    //create a blob representation of the zip
    const blobbedZip = await this.zip.generateAsync({
      type:'blob',
      compression: 'DEFLATE',
      compressionOptions: {
          level: 9
      }
    });
    return blobbedZip;
  }

  isFileDeleted(fileId) {
    let retVal = false;
    const file = this.playbackEngine.editorState.allFiles[fileId];
    //check to see if the file is deleted
    if(file.isDeleted === true) {
      retVal = true;
    } else { 
      //check to see if any parent dir has been deleted
      let parentDir = this.playbackEngine.editorState.allDirectories[file.parentDirectoryId];
      while(parentDir) {
        if(parentDir.isDeleted === true) {
          retVal = true;
          break;
        }
        //move up to the next parent dir
        parentDir = this.playbackEngine.editorState.allDirectories[parentDir.parentDirectoryId];
      }
    }
    return retVal;
  }

  isDirectoryDeleted(dirId) {
    let retVal = false;
    const dir = this.playbackEngine.editorState.allDirectories[dirId];
    //check to see if the dir is deleted
    if(dir.isDeleted === true) {
      retVal = true;
    } else { 
      //check to see if any parent dir has been deleted
      let parentDir = this.playbackEngine.editorState.allDirectories[dir.parentDirectoryId];
      while(parentDir) {
        if(parentDir.isDeleted === true) {
          retVal = true;
          break;
        }
        //move up to the next parent dir
        parentDir = this.playbackEngine.editorState.allDirectories[parentDir.parentDirectoryId];
      }
    }
    return retVal;
  }
}