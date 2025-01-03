const Comment = require('./Comment');

/*
 * This class manages the comments in the system. There is an object that uses
 * event ids as the key and arrays of comments as the value. During playback
 * when an event is animated this object is checked to see if there are any
 * comments, and if so, they are displayed.
 */
class CommentManager {
    constructor() {
        //init an object to hold comments
        this.comments = {};
    }

    load(comments) {
        this.comments = comments;
    }

    /*
     * Adds a comment to the collection of all comments.
     */
    addComment(commentData) {
        //if an array of comments does not already exist for this event
        if(!this.comments[commentData.displayCommentEventId]) {
            //create an empty array to hold the comments for this event
            this.comments[commentData.displayCommentEventId] = [];
        }
        
        //store the position of the new comment
        commentData['position'] = this.comments[commentData.displayCommentEventId].length;
        
        //create a comment object
        const newComment = new Comment(commentData.displayCommentEventId, commentData.displayCommentEventSequenceNumber, commentData.developerGroupId, commentData.timestamp, commentData.commentText, commentData.commentTitle, commentData.ttsFilePath, commentData.selectedCodeBlocks, commentData.imageURLs, commentData.videoURLs, commentData.audioURLs, commentData.linesAbove, commentData.linesBelow, commentData.currentFilePath, commentData.viewableBlogText, commentData.commentTags, commentData.questionCommentData, commentData.position);

        //store the comment in the array
        this.comments[commentData.displayCommentEventId].push(newComment);        
        
        return newComment;
    }

    /*
     * Update an existing comment.
     */
    updateComment(commentData) {
        //if the array of comments exists for the specified event 
        if(this.comments[commentData.displayCommentEventId]) {
            //get the array of comments for the event
            const arrayOfCommentsAtThisEvent = this.comments[commentData.displayCommentEventId];
            
            //get the position where the comment is stored
            const position = commentData.position;
            
            //if the position is valid
            if(position >= 0 && position < arrayOfCommentsAtThisEvent.length) {
                //create an updated comment 
                const updatedComment = new Comment(commentData.displayCommentEventId, commentData.displayCommentEventSequenceNumber, commentData.developerGroupId, commentData.timestamp, commentData.commentText, commentData.commentTitle, commentData.ttsFilePath, commentData.selectedCodeBlocks, commentData.imageURLs, commentData.videoURLs, commentData.audioURLs, commentData.linesAbove, commentData.linesBelow, commentData.currentFilePath, commentData.viewableBlogText, commentData.commentTags, commentData.questionCommentData, commentData.position, commentData.id);
                //reuse the old comment's id 
                updatedComment.id = arrayOfCommentsAtThisEvent[position].id;
                
                //update and return the new comment
                arrayOfCommentsAtThisEvent[position] = updatedComment;
                
                return updatedComment;
            }
        }
    }

    /*
     * Deletes a comment.
     */
    deleteComment(commentData) {
        //if the array of comments exists for the specified event 
        if(this.comments[commentData.displayCommentEventId]) {
            //get the array of comments for the event
            const arrayOfCommentsAtThisEvent = this.comments[commentData.displayCommentEventId];
            
            //get the position where the comment is stored
            const position = commentData.position;
            
            //if the position is valid
            if(position >= 0 && position < arrayOfCommentsAtThisEvent.length) {
                //remove the comment
                arrayOfCommentsAtThisEvent.splice(position, 1);
                //if there are no more comments at this event
                if(arrayOfCommentsAtThisEvent.length === 0) {
                    //remove the array of comments for this event
                    delete this.comments[commentData.displayCommentEventId];
                }
            }
        }
    }

    /*
     * Updates the position of a comment in the array of comments.
     */
    updateCommentPosition(updatedCommentPosition) {
        //get the array of comment at the event id
        const arrayOfCommentsAtThisEvent = this.comments[updatedCommentPosition.eventId];
        
        //if the list of comments exists for the specified event 
        if(arrayOfCommentsAtThisEvent) {
            //if the array of comments is present and the old and new positions are valid
            if(updatedCommentPosition.oldCommentPosition >= 0 &&
               updatedCommentPosition.oldCommentPosition < arrayOfCommentsAtThisEvent.length &&
               updatedCommentPosition.newCommentPosition >= 0 &&
               updatedCommentPosition.newCommentPosition < arrayOfCommentsAtThisEvent.length) {
                //get the element to move
                const element = arrayOfCommentsAtThisEvent[updatedCommentPosition.oldCommentPosition];

                //remove it from the array
                arrayOfCommentsAtThisEvent.splice(updatedCommentPosition.oldCommentPosition, 1);

                //add it back in the new postion
                arrayOfCommentsAtThisEvent.splice(updatedCommentPosition.newCommentPosition, 0, element);

                //update all of the positions of the comments
                for(let i = 0;i < arrayOfCommentsAtThisEvent.length;i++) {
                    arrayOfCommentsAtThisEvent[i].position = i;
                }
            }
        }
    }

    getReadTimeEstimate() {
        //some constants (that may need to change with some more experience)
        const secondsPerCommentWord = .25;
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