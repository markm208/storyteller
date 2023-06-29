/*
 * This class manages the comments in the system. There is an object that uses
 * event ids as the key and arrays of comments as the value. During playback
 * when an event is animated this object is checked to see if there are any
 * comments, and if so, they are displayed.
 */
class CommentManager {
    constructor(db) {
        //store a reference to the db abstraction
        this.db = db;
        //init an object to hold comments
        this.comments = {};
    }

    init(isNewProject) {
        return new Promise(async (resolve, reject) => {
            try {
                //if its an existing project
                if(isNewProject === false) {
                    //read all of the comments from the db
                    this.comments = await this.db.getAllComments();
                }
                resolve();
            } catch(err) {
                reject(err);
            }
        });
    }
    
    /*
     * Adds a comment to the collection of all comments.
     */
    async addComment(commentData) {
        //if an array of comments does not already exist for this event
        if(!this.comments[commentData.displayCommentEventId]) {
            //create an empty array to hold the comments for this event
            this.comments[commentData.displayCommentEventId] = [];
        }
        
        //get the position of the new comment
        commentData['position'] = this.comments[commentData.displayCommentEventId].length;
        
        //create a comment object
        const newComment = await this.db.createComment(commentData);

        //store the comment in the array
        this.comments[commentData.displayCommentEventId].push(newComment);
        
        return newComment;
    }

    /*
     * Update an existing comment.
     */
    async updateComment(commentData) {
        //if the array of comments exists for the specified event 
        if(this.comments[commentData.displayCommentEventId]) {
            //get the array of comments for the event
            const arrayOfCommentsAtThisEvent = this.comments[commentData.displayCommentEventId];

            //search for the correct comment
            for(let i = 0;i < arrayOfCommentsAtThisEvent.length;i++) {
                //find the correct comment based on its id
                if(arrayOfCommentsAtThisEvent[i].id === commentData.id) {
                    //create an updated comment object in the db
                    const updatedComment = await this.db.updateComment(commentData);
                    
                    //update and return the new comment
                    arrayOfCommentsAtThisEvent[i] = updatedComment;
                    return updatedComment;
                }
            }
        }
    }

    /*
     * Deletes a comment.
     */
    async deleteComment(commentData) {
        //if the array of comments exists for the specified event 
        if(this.comments[commentData.displayCommentEventId]) {
            //get the array of comments for the event
            const arrayOfCommentsAtThisEvent = this.comments[commentData.displayCommentEventId];
            
            //search for the correct comment
            for(let i = 0;i < arrayOfCommentsAtThisEvent.length;i++) {
                //find the correct comment based on its id
                if(arrayOfCommentsAtThisEvent[i].id === commentData.id) {
                    //delete the comment in the db
                    await this.db.deleteComment(commentData);

                    //remove the comment
                    arrayOfCommentsAtThisEvent.splice(i, 1);
                    //if there are no more comments at this event
                    if(arrayOfCommentsAtThisEvent.length === 0) {
                        //remove the array of comments for this event
                        delete this.comments[commentData.displayCommentEventId];
                    }
                }
            }
        }
    }

    /*
     * Updates the position of a comment in the array of comments.
     */
    async updateCommentPosition(updatedCommentPosition) {
        //get the array of comment at the event id
        const arrayOfCommentsAtThisEvent = this.comments[updatedCommentPosition.eventId];
        
        //if the list of comments exists for the specified event 
        if(arrayOfCommentsAtThisEvent) {
            //if the array of comments is present and the old and new positions are valid
            if(updatedCommentPosition.oldCommentPosition >= 0 &&
               updatedCommentPosition.oldCommentPosition < arrayOfCommentsAtThisEvent.length &&
               updatedCommentPosition.newCommentPosition >= 0 &&
               updatedCommentPosition.newCommentPosition < arrayOfCommentsAtThisEvent.length) {
                //update the position in the db
                await this.db.updateCommentPosition(updatedCommentPosition);

                //get the element to move
                const element = arrayOfCommentsAtThisEvent[updatedCommentPosition.oldCommentPosition];

                //remove it from the array
                arrayOfCommentsAtThisEvent.splice(updatedCommentPosition.oldCommentPosition, 1);

                //add it back in the new postion
                arrayOfCommentsAtThisEvent.splice(updatedCommentPosition.newCommentPosition, 0, element);
            }
        }
    }

    /*
     * Removes any tags that are not associated with any comments.
     */
    removeUnusedTags() {
        return this.db.removeUnusedTags();
    }

    /*
     * Removes any media blobs that are not associated with any comments.
     */
    removeUnusedMediaFiles() {
        return this.db.removeUnusedMediaFiles();
    }

    /*
     * Adds a media blob to the db with a path to it. The path is used to
     * create a URL that is stored in the comment. The URL is used to
     * display the media in the comment.
     */
    addMediaFile(fileData, mimetype, pathToNewFile) {
        return this.db.addMediaFile(fileData, mimetype, pathToNewFile);
    }

    /*
     * Returns a media blob from the db with a mimetype.
     */
    getMediaFile(filePath) {
        return this.db.getMediaFile(filePath);
    }

    /*
     * Removes a media blob from the db.
     */
    deleteMediaFile(filePath) {
        return this.db.deleteMediaFile(filePath);
    }

    /*
     * Removes a media URL. Comments hold media urls but the blobs
     * are stored and served from the db.
     * MediaFile === Blob holding file data
     * MediaURL === URL to the MediaFile served from the db
     */
    deleteMediaURL(mediaURL) {
        return this.db.deleteMediaURL(mediaURL);
    }

    getReadTimeEstimate() {
        //some constants (that may need to change with some more experience)
        const secondsPerCommentWord = .2525;
        const secondsPerCodeWord = 1.0;
        const secondsPerSurroundingCodeLine = 2.0;
        const secondsPerImage = 12.0;
        const secondsPerAudioVideo = 20.0;
        const qAndAThinkTime = 15.0;
        
        //total estimated read time in seconds
        let totalSeconds = 0.0;
    
        //go through all of the comments
        for(let eventId in this.comments) {
            const commentsAtEvent = this.comments[eventId];
            for(let i = 0;i < commentsAtEvent.length;i++) {
                const comment = commentsAtEvent[i];
        
                //comment text
                const numWordsInCommentText = comment.commentText.split(/\s+/g).length;
                totalSeconds += numWordsInCommentText * secondsPerCommentWord;
        
                //selected code
                let selectedTextWordCount = 0;
                comment.selectedCodeBlocks.forEach(selectedCodeBlock => {
                    selectedTextWordCount += selectedCodeBlock.selectedText.split(/\s+/g).length;
                });
                totalSeconds += selectedTextWordCount * secondsPerCodeWord;
        
                //surrounding code
                totalSeconds += comment.linesAbove * secondsPerSurroundingCodeLine;
                totalSeconds += comment.linesBelow * secondsPerSurroundingCodeLine;
        
                //for media in the comment
                totalSeconds += comment.imageURLs.length * secondsPerImage;
                totalSeconds += comment.videoURLs.length * secondsPerAudioVideo;
                totalSeconds += comment.audioURLs.length * secondsPerAudioVideo;
        
                //for questions
                if(comment.questionCommentData && comment.questionCommentData.question && comment.questionCommentData.explanation) {
                    let qAndAWordCount = comment.questionCommentData.question.split(/\s+/g).length; 
                    qAndAWordCount += comment.questionCommentData.explanation.split(/\s+/g).length;
                    qAndAWordCount += comment.questionCommentData.allAnswers.reduce((totalWordCount, answer) => {
                        return totalWordCount + answer.split(/\s+/g).length
                    }, 0);
            
                    //time to read and think about the question and time to read the explanation
                    totalSeconds += (qAndAWordCount * secondsPerCommentWord) + qAndAThinkTime;
                }
            }
        }
        //return an estimate in minutes
        return Math.ceil(totalSeconds / 60.0);
    }
}

module.exports = CommentManager;