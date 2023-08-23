const crypto = require('crypto');
/*
 * This represents a comment in a playback.
 */
class Comment {
    constructor(displayCommentEventId, displayCommentEventSequenceNumber, developerGroupId, timestamp, commentText, commentTitle, selectedCodeBlocks, imageURLs, videoURLs, audioURLs, linesAbove, linesBelow, currentFilePath, viewableBlogText, commentTags, questionCommentData, position, id) {
        //store the comment data
        this.id = (id || crypto.randomUUID());
        this.displayCommentEventId = displayCommentEventId;
        this.displayCommentEventSequenceNumber = displayCommentEventSequenceNumber;
        this.developerGroupId = developerGroupId;
        this.timestamp = timestamp;
        this.commentText = commentText;
        this.commentTitle = commentTitle;
        this.position = position;
        this.selectedCodeBlocks = selectedCodeBlocks;
        this.imageURLs = imageURLs;
        this.videoURLs = videoURLs;
        this.audioURLs = audioURLs;
        this.linesAbove = linesAbove;
        this.linesBelow = linesBelow;
        this.currentFilePath = currentFilePath;
        this.viewableBlogText = viewableBlogText;
        this.commentTags = commentTags;
        this.questionCommentData = questionCommentData;
    }
}

module.exports = Comment;