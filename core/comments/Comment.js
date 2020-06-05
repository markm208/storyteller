/*
 * This represents a comment in a playback. It has a copy of the event where
 * the comment will show up, a timestamp when it was created, a dev group id
 * some text entered by the author, the ids of any highlighted events and
 * two array of images and videos.
 * 
 * TODO I would like to change how I am storing the images and videos in a
 * future version. I will store the images and videos in a separate directory
 * and serve the media from the server instead of wrapping them up in a
 * JSON object to be sent back to the browser. I think this will result in
 * better performance since the media can be fetched separately from the
 * event data. 
 */
class Comment {
    constructor(displayCommentEvent, developerGroupId, timestamp, commentText, selectedCodeIds, images, videoComments, id) {
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
        this.selectedCodeIds = selectedCodeIds;
        this.images = images;
        this.videoComments = videoComments;
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