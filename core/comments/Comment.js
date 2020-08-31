/*
 * This represents a comment in a playback. It has a copy of the event where
 * the comment will show up, a timestamp when it was created, a dev group id
 * some text entered by the author, the ids of any highlighted events and
 * two array of images and videos.
 */
class Comment {
    constructor(displayCommentEvent, developerGroupId, timestamp, commentText, selectedCodeBlocks, imageURLs, videoURLs, audioURLs, linesAbove, linesBelow, id) {
        //if an id is supplied, use it
        if(id) {
            this.id = id;
        } else {
            //generate an id
            this.id = this.generateId();
        }
        //store the comment data
        this.displayCommentEvent = displayCommentEvent;
        this.developerGroupId = developerGroupId; 
        this.timestamp = timestamp;
        this.commentText = commentText;
        this.selectedCodeBlocks = selectedCodeBlocks;
        this.imageURLs = imageURLs;
        this.videoURLs = videoURLs;
        this.audioURLs = audioURLs;
        this.linesAbove = linesAbove;
        this.linesBelow = linesBelow;
    }

    generateId() {
        //use the static nextId to generate a string with a comment id
        const newId = `commentId-${Comment.nextId}`;
        
        //increase for the next comment
        Comment.nextId++;

        return newId;
    }
}
//used to autogenerate ids
Comment.nextId = 0;

module.exports = Comment;