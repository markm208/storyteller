const Developer = require('../developers/Developer');
const DeveloperGroup = require('../developers/DeveloperGroup');
const File = require('../filesAndDirs/File');
const Comment = require('../comments/Comment');
const Directory = require('../filesAndDirs/Directory');
const Project = require('./Project');

const sqlite3 = require('sqlite3').verbose();

//TODO: look at reconciliation
// -- there is a line deactivating this in extension.js:
// -- if(false /*areDiscrepanciesPresent(discrepancies)*/) {
// -- remove before testing this
//TODO: look at/remove zip functionality
//TODO: look at perfect programmer
//TODO: build converter to take a loadPlayback.json file and convert it to a db 
//TODO: get rid of project description in the project class
//TODO: look at the File's lastModifiedDate and make sure it is set based on event timestamp or fs lastModified, or get rid of it
//TODO: cleanup repo get rid of mergeExample, threads.html and other docs
//TODO: update tests or remove them
//TODO: whitespace cleanup, use tabs remove trailing spaces
/*
 * This class is responsible for storing project data persistently in a
 * database (sqlite). 
 */
class DBAbstraction {
    constructor(dbPath) {
        this.dbPath = dbPath;
    }
    
    openDb() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, async (err) => {
                if(err) {
                    console.error(err);
                    reject();
                } else {
                    //create all of the tables if they don't already exist
                    await this.createTables();

                    resolve();
                }
            });
        });
    }

    //general promise based helper methods
    runQueryNoResultsNoParams(sql) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, (err) => {
                if(err) {
                    console.error(err);
                    reject();
                } else {
                    resolve();
                }
            });
        });
    }

    runQueryNoResultsWithParams(sql, params) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, (err) => {
                if(err) {
                    console.error(err);
                    reject();
                } else {
                    resolve();
                }
            });
        });
    }

    runInsertFromObject(tableName, anObject) {
        return new Promise((resolve, reject) => {
            //collect the name and values of all of the properties
            const propertyNames = Object.getOwnPropertyNames(anObject);
            const propertyValues = propertyNames.map((propertyName) => anObject[propertyName]);
    
            //build the sql statement
            var sql = `INSERT INTO ${tableName} (${propertyNames.join(', ')}) VALUES (${propertyValues.map(() => '?').join(', ')})`;
            
            this.db.run(sql, propertyValues, function(err) {
                if(err) {
                    console.error(err);
                    reject();
                } else {
                    //add the auto generated id to the object
                    anObject['id'] = this.lastID;

                    //return the new object
                    resolve(anObject);
                }
            });
        });
    }

    runInsertFromArrayOfObjects(tableName, someObjects) {
        return new Promise((resolve, reject) => {
            //if there are any objects in the passed in array
            if(someObjects.length > 0) {
                //using the first object get all of the property names
                const propertyNames = Object.getOwnPropertyNames(someObjects[0]);
                const queryParams = `(${propertyNames.map(() => '?').join(', ')})`;

                //holds the values for all of the objects flattened out into a single array
                const flattenedValues = [];
                const queryParamsArray = [];

                for(const object of someObjects) {
                    //add the values from the objects into the flattened array
                    flattenedValues.push(...propertyNames.map((propertyName) => object[propertyName]));
                    //add the groups of ?'s
                    queryParamsArray.push(queryParams);
                }

                //build the sql statement
                var sql = `INSERT INTO ${tableName} (${propertyNames.join(', ')}) VALUES ${queryParamsArray.join(', ')}`;
                
                this.db.run(sql, flattenedValues, (err) => {
                    if(err) {
                        console.error(err);
                        reject();
                    } else {
                        //don't return objects because they don't have the auto generated id
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    runUpdateFromObject(tableName, anObject) {
        return new Promise((resolve, reject) => {
            const propertyNames = Object.getOwnPropertyNames(anObject);
            //combos of 'propertyName = ?'
            const propertyNameArray = propertyNames.map((propertyName) => `${propertyName} = ?`);
            //all of the values for the properties
            const propertyValues = propertyNames.map((propertyName) => anObject[propertyName]);
    
            //build the sql statement
            var sql = `UPDATE ${tableName} SET `;
            sql += propertyNameArray.join(', ');
            sql += ` WHERE id = ?`;

            this.db.run(sql, [...propertyValues, anObject.id], (err) => {
                if(err) {
                    console.error(err);
                    reject();
                } else {
                    resolve();
                }
            });
        });
    }

    runQueryGetAllNoParams(sql) {
        return new Promise((resolve, reject) => {            
            this.db.all(sql, (err, rows) => {
                if(err) {
                    console.error(err);
                    reject();
                } else {
                    //add the properties from the db to the objects
                    const allObjects = this.buildObjectsFromRows(rows);

                    resolve(allObjects);
                }
            });
        });
    }

    runQueryGetAllWithParams(sql, params) {
        return new Promise((resolve, reject) => {            
            this.db.all(sql, params, (err, rows) => {
                if(err) {
                    console.error(err);
                    reject();
                } else {
                    //add the properties from the db to the objects
                    const allObjects = this.buildObjectsFromRows(rows);

                    resolve(allObjects);
                }
            });
        });
    }

    runQueryGetOneNoParams(sql) {
        return new Promise((resolve, reject) => {            
            this.db.get(sql, (err, row) => {
                if(err) {
                    console.error(err);
                    reject();
                } else {
                    //return null if there is no row
                    if(row === undefined) {
                        resolve(null);
                    } else {
                        //add properties from the db to the object
                        const object = this.buildObjectFromRow(row);
                        resolve(object);
                    }
                }
            });
        });
    }

    runQueryGetOneWithParams(sql, params) {
        return new Promise((resolve, reject) => {            
            this.db.get(sql, params, (err, row) => {
                if(err) {
                    console.error(err);
                    reject();
                } else {
                    //return null if there is no row
                    if(row === undefined) {
                        resolve(null);
                    } else { //there is one row
                        //add properties from the db to the object
                        const object = this.buildObjectFromRow(row);
                        resolve(object);
                    }
                }
            });
        });
    }

    buildObjectFromRow(row) {
        const object = {};
        for(const propertyName in row) {
            if(row[propertyName] !== undefined) {
                //add a property to the object from a db row
                object[propertyName] = row[propertyName];
            }
        }
        return object;
    }

    buildObjectsFromRows(rows) {
        const allObjects = [];
        //add an object for each row
        for(const row of rows) {
            const object = this.buildObjectFromRow(row);
            allObjects.push(object);
        }
        return allObjects;
    }

    runQueryGetRowCount(tableName) {
        return new Promise((resolve, reject) => {            
            const sql = `SELECT COUNT(*) FROM ${tableName};`;
            this.db.get(sql, (err, row) => {
                if(err) {
                    console.error(err);
                    reject();
                } else {
                    //return the row count
                    const rowCount = row['COUNT(*)'];
                    resolve(rowCount);
                }
            });
        });
    }

    createTables() {
        const allCreateTablePromises = [
            //developers
            this.createDeveloperTable(),
            this.createDeveloperGroupTable(),
            this.createDeveloperDeveloperGroupJoinTable(),

            //project info
            this.createProjectTable(),
            
            //files and directories
            this.createDirectoryTable(),
            this.createFileTable(),

            //events
            this.createEventTable(),

            //comments
            this.createCommentTable(),
            this.createCommentQuestionTable(),
            this.createCommentQuestionAnswerTable(),
            this.createSelectedCodeBlockTable(),
            this.createTagTable(),
            this.createCommentTagJoinTable(),

            //media
            this.createMediaURLTable(),
            this.createMediaBlobTable()
        ];

        return Promise.all(allCreateTablePromises);
    }

    createCommentTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS Comment (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                commentText TEXT,
                commentTitle TEXT,
                linesAbove INTEGER,
                linesBelow INTEGER,
                viewableBlogText TEXT,
                displayCommentEventId TEXT,
                displayCommentEventSequenceNumber INTEGER,
                position INTEGER,
                developerGroupId INTEGER,
                FOREIGN KEY(displayCommentEventId) REFERENCES Event(id),
                FOREIGN KEY(developerGroupId) REFERENCES DeveloperGroup(id)
            );`;

        return this.runQueryNoResultsNoParams(sql);
    }

    createComment(comment) {
        return new Promise(async (resolve, reject) => {
            try {
                //update the position of any comments after where the new one will go
                const sql = `
                    UPDATE Comment
                    SET position = position + 1
                    WHERE displayCommentEventId = ?
                    AND position >= ?;`;
                await this.runQueryNoResultsWithParams(sql, [comment.displayCommentEventId, comment.position]);

                //create the basic comment
                const commentForDb = {
                    timestamp: comment.timestamp,
                    commentText: comment.commentText,
                    commentTitle: comment.commentTitle,
                    linesAbove: comment.linesAbove,
                    linesBelow: comment.linesBelow,
                    viewableBlogText: comment.viewableBlogText,
                    displayCommentEventId: comment.displayCommentEventId,
                    displayCommentEventSequenceNumber: comment.displayCommentEventSequenceNumber,
                    position: comment.position,
                    developerGroupId: comment.developerGroupId
                };
                await this.runInsertFromObject('Comment', commentForDb);
                
                //next add the linked data (tags, question, code blocks, media)
                //add tags
                for(const tagText of comment.commentTags) {
                    //search for the tag in the db
                    let tagFromDb = await this.getCommentTag(tagText);
                    
                    //if it doesn't exist then create it
                    if(tagFromDb === null) {
                        tagFromDb = await this.createTag(tagText);
                    }
                    
                    //link the tag to the comment
                    await this.linkTagToComment(tagFromDb, commentForDb);
                }

                //add a question (if there is one)
                if(comment.questionCommentData) {
                    //basic question
                    const theQuestion = {
                        question: comment.questionCommentData.question,
                        correctAnswer: comment.questionCommentData.correctAnswer,
                        explanation: comment.questionCommentData.explanation,
                        commentId: commentForDb.id
                    };
                    await this.runInsertFromObject('CommentQuestion', theQuestion);

                    //create the answers
                    for(const answer of comment.questionCommentData.allAnswers) {
                        const answerObject = {
                            answer: answer,
                            commentQuestionId: theQuestion.id,
                            commentId: commentForDb.id
                        }
                        await this.runInsertFromObject('CommentQuestionAnswer', answerObject);
                    }
                }

                //add selected code blocks
                for(const codeBlock of comment.selectedCodeBlocks) {
                    //add a foreign key to the comment (needed in the db but not in the front end)
                    codeBlock['commentId'] = commentForDb.id;
                    await this.runInsertFromObject('SelectedCodeBlock', codeBlock);
                }

                //create the media urls
                for(const url of comment.imageURLs) {
                    await this.createMediaURL(url, 'image', commentForDb.id);
                }
                for(const url of comment.audioURLs) {
                    await this.createMediaURL(url, 'audio', commentForDb.id);
                }
                for(const url of comment.videoURLs) {
                    await this.createMediaURL(url, 'video', commentForDb.id);
                }
                
                //create the complete comment object
                const completeComment = new Comment(comment.displayCommentEventId, comment.displayCommentEventSequenceNumber, comment.developerGroupId, comment.timestamp, comment.commentText, comment.commentTitle, comment.selectedCodeBlocks, comment.imageURLs, comment.videoURLs, comment.audioURLs, comment.linesAbove, comment.linesBelow, comment.currentFilePath, comment.viewableBlogText, comment.commentTags, comment.questionCommentData, comment.position, commentForDb.id);
                
                //return the complete comment
                resolve(completeComment);
            } catch(err) {
                console.error(err);
                reject();
            }
        });
    }
    
    deleteComment(comment) {
        return new Promise(async (resolve, reject) => {
            try {
                //delete the basic comment
                const sql1 = 'DELETE FROM Comment WHERE id = ?;';
                await this.runQueryNoResultsWithParams(sql1, [comment.id]);

                //remove the link between the comment and the tags
                const sql2 = 'DELETE FROM CommentTag WHERE commentId = ?;';
                await this.runQueryNoResultsWithParams(sql2, [comment.id]);

                //delete if there is a question
                const sql3 = 'DELETE FROM CommentQuestion WHERE commentId = ?;';
                await this.runQueryNoResultsWithParams(sql3, [comment.id]);
                const sql4 = 'DELETE FROM CommentQuestionAnswer WHERE commentId = ?;';
                await this.runQueryNoResultsWithParams(sql4, [comment.id]);

                //delete selected code blocks
                const sql5 = 'DELETE FROM SelectedCodeBlock WHERE commentId = ?;';
                await this.runQueryNoResultsWithParams(sql5, [comment.id]);

                const sql6 = 'DELETE FROM MediaURL WHERE commentId = ?;';
                await this.runQueryNoResultsWithParams(sql6, [comment.id]);

                //update the position of any comments after this one
                const sql7 = `
                    UPDATE Comment 
                    SET position = position - 1 
                    WHERE displayCommentEventId = ? 
                    AND position > ?;`;
                await this.runQueryNoResultsWithParams(sql7, [comment.displayCommentEventId, comment.position]);
                
                resolve();
            } catch(err) {
                console.error(err);
                reject();
            }
        });
    }

    updateComment(comment) {
        return new Promise(async (resolve, reject) => {
            try {
                //get rid of the current version of the comment
                await this.deleteComment(comment);
                
                //create a new one with updated info
                const updatedComment = await this.createComment(comment);
                
                //return the new comment
                resolve(updatedComment);
            } catch(err) {
                console.error(err);
                reject();
            }
        });
    }

    updateCommentPosition(commentPosition) {
        return new Promise(async (resolve, reject) => {
            try {
                //get the comment that is being moved
                const sql1 = `
                    SELECT * 
                    FROM Comment 
                    WHERE displayCommentEventId = ? 
                    ORDER BY position 
                    LIMIT 1 
                    OFFSET ?;`;
                const movingComment = await this.runQueryGetOneWithParams(sql1, [commentPosition.eventId, commentPosition.oldCommentPosition]);

                //if moving a comment forward
                if(commentPosition.oldCommentPosition < commentPosition.newCommentPosition) {
                    //move the ones in between the two comments back one
                    const sql2 = `
                        UPDATE Comment 
                        SET position = position - 1 
                        WHERE position > ? 
                        AND position <= ? 
                        AND displayCommentEventId = ?;`;
                    await this.runQueryNoResultsWithParams(sql2, [commentPosition.oldCommentPosition, commentPosition.newCommentPosition, commentPosition.eventId]);
                } else { //moving a comment backward
                    //move the ones in between the two comments forward one
                    const sql3 = `
                        UPDATE Comment 
                        SET position = position + 1 
                        WHERE position >= ? 
                        AND position < ? 
                        AND displayCommentEventId = ?;`;
                    await this.runQueryNoResultsWithParams(sql3, [commentPosition.newCommentPosition, commentPosition.oldCommentPosition, commentPosition.eventId]);
                }

                //set the position of the comment being moved
                const sql4 = `
                    UPDATE Comment 
                    SET position = ? 
                    WHERE id = ?;`;
                await this.runQueryNoResultsWithParams(sql4, [commentPosition.newCommentPosition, movingComment.id]);
                
                resolve();
            } catch(err) {
                console.error(err);
                reject();
            }
        });
    }

    getAllComments() {
        return new Promise(async (resolve, reject) => {
            try {
                //the complete object that has all of the comment info in it
                //the key is the event id and the value is an array of comments for that event
                const allCommentsObject = {};
                
                //get the basic comment info
                const sql = 'SELECT * FROM Comment ORDER BY position;';
                const allComments = await this.runQueryGetAllNoParams(sql);
                
                //go through all of the comments and fill in the rest of the info
                for(const comment of allComments) {
                    //array of tag text only
                    const allCommentTags = await this.getAllCommentTags(comment);
                    //question with answers in a subarray
                    const allCommentQuestions = await this.getAllCommentQuestionsAndAnswers(comment);
                    //array of selected code blocks
                    const allSelectedCodeBlocks = await this.getAllSelectedCodeBlocks(comment);
                    //object with image, audio, and video arrays
                    const allMediaURLs = await this.getAllMediaURLs(comment);
                    
                    //build a new comment
                    const newComment = new Comment(comment.displayCommentEventId, comment.displayCommentEventSequenceNumber, comment.developerGroupId, comment.timestamp, comment.commentText, comment.commentTitle, allSelectedCodeBlocks, allMediaURLs.image, allMediaURLs.video, allMediaURLs.audio, comment.linesAbove, comment.linesBelow, comment.currentFilePath, comment.viewableBlogText, allCommentTags, allCommentQuestions, comment.position, comment.id);

                    //if this is the first comment for this event then create an array
                    if(!allCommentsObject[comment.displayCommentEventId]) {
                        allCommentsObject[comment.displayCommentEventId] = [];    
                    }
                    //add it to the array of all comments for this event
                    allCommentsObject[comment.displayCommentEventId].push(newComment);
                }

                //return the complete group of all comments
                resolve(allCommentsObject);
            } catch(err) {
                console.error(err);
                reject();
            }
        });
    }

    createTagTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS Tag (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tagText TEXT
            );`;

        return this.runQueryNoResultsNoParams(sql);
    }

    createTag(tagText) {
        const newTag = {
            tagText: tagText
        };
        return this.runInsertFromObject('Tag', newTag);
    }

    createCommentTagJoinTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS CommentTag (
                tagId INTEGER,
                commentId INTEGER,
                FOREIGN KEY(tagId) REFERENCES Tag(id),
                FOREIGN KEY(commentId) REFERENCES Comment(id)
            );`;

        return this.runQueryNoResultsNoParams(sql);
    }

    linkTagToComment(tag, comment) {
        const sql = 'INSERT INTO CommentTag (tagId, commentId) VALUES (?, ?);';
        return this.runQueryNoResultsWithParams(sql, [tag.id, comment.id]);
    }

    getCommentTag(tagText) {
        const sql = `SELECT * FROM Tag WHERE tagText = ?;`;
        return this.runQueryGetOneWithParams(sql, [tagText]);
    }

    getAllCommentTags(comment) {
        return new Promise(async (resolve, reject) => {
            try {
                const sql = `
                    SELECT Tag.tagText 
                    FROM Tag, CommentTag 
                    WHERE tag.id = CommentTag.tagId
                    AND CommentTag.commentId = ?;`;
                const allTagObjects = await this.runQueryGetAllWithParams(sql, [comment.id]);
                
                //array of tag text only
                const tagTextsOnly = allTagObjects.map(tagObject => tagObject.tagText);
                
                //return an array of strings
                resolve(tagTextsOnly);
            } catch(err) {
                console.error(err);
                reject();
            }
        });
    }

    removeUnusedTags() {
        const sql = `
            DELETE FROM Tag
            WHERE id NOT IN (
                SELECT tagId FROM CommentTag
            );`;
        return this.runQueryNoResultsNoParams(sql);
    }

    createCommentQuestionTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS CommentQuestion (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question TEXT,
                correctAnswer TEXT,
                explanation TEXT,
                commentId INTEGER,
                FOREIGN KEY(commentId) REFERENCES Comment(id)
            );`;

        return this.runQueryNoResultsNoParams(sql);
    }

    createCommentQuestionAnswerTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS CommentQuestionAnswer (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                answer TEXT,
                commentQuestionId INTEGER,
                commentId INTEGER,
                FOREIGN KEY(commentQuestionId) REFERENCES CommentQuestion(id),
                FOREIGN KEY(commentId) REFERENCES Comment(id)
            );`;

        return this.runQueryNoResultsNoParams(sql);
    }

    getAllCommentQuestionsAndAnswers(comment) {
        return new Promise(async (resolve, reject) => {
            try {
                const sql = `
                    SELECT CommentQuestion.id, CommentQuestion.question, CommentQuestion.correctAnswer, CommentQuestion.explanation, CommentQuestionAnswer.answer
                    FROM CommentQuestion, CommentQuestionAnswer
                    WHERE CommentQuestion.id = CommentQuestionAnswer.commentQuestionId
                    AND CommentQuestion.commentId = ?;`;
                const allQAndAData = await this.runQueryGetAllWithParams(sql, [comment.id]);
                
                //if there is a question (and answers)
                if(allQAndAData.length > 0) {
                    //use the first row to fill the basic question info
                    const questionCommentData = {
                        id: allQAndAData[0].id,
                        question: allQAndAData[0].question,
                        correctAnswer: allQAndAData[0].correctAnswer,
                        explanation: allQAndAData[0].explanation,
                        allAnswers: [] //fill this next with the rows
                    };

                    //for every answer from the query
                    for(const qsAnswer of allQAndAData) {
                        //add the answer
                        questionCommentData.allAnswers.push(qsAnswer.answer);
                    }
                    //return the complete question and answer object
                    resolve(questionCommentData);
                } else {
                    //no question, return null
                    resolve(null);
                }
            } catch(err) {
                console.error(err);
                reject();
            }
        });
    }

    createSelectedCodeBlockTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS SelectedCodeBlock (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                startRow INTEGER,
                startColumn INTEGER,
                endRow INTEGER,
                endColumn INTEGER,
                selectedText TEXT,
                commentId INTEGER,
                fileId INTEGER,
                FOREIGN KEY(commentId) REFERENCES Comment(id),
                FOREIGN KEY(fileId) REFERENCES File(id)
            );`;

        return this.runQueryNoResultsNoParams(sql);
    }

    getAllSelectedCodeBlocks(comment) {
        const sql = `
            SELECT startRow, startColumn, endRow, endColumn, selectedText, fileId
            FROM SelectedCodeBlock
            WHERE commentId = ?;`;
        return this.runQueryGetAllWithParams(sql, [comment.id]);        
    }

    createMediaURLTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS MediaURL (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT UNIQUE,
                mediaType TEXT,
                commentId INTEGER,
                FOREIGN KEY(commentId) REFERENCES Comment(id)
            );`;

        return this.runQueryNoResultsNoParams(sql);
    }

    createMediaURL(url, mediaType, commentId) {
        const sql = 'INSERT INTO MediaURL (url, mediaType, commentId) VALUES (?, ?, ?);';
        return this.runQueryNoResultsWithParams(sql, [url, mediaType, commentId]);
    }
    
    deleteMediaURL(url) {
        const sql = 'DELETE FROM MediaURL WHERE url = ?;';
        return this.runQueryNoResultsWithParams(sql, [url]);
    }

    getAllMediaURLs(comment) {
        return new Promise(async (resolve, reject) => {
            try {
                //holds all of the urls
                const allMediaURLs = {
                    image: [],
                    audio: [],
                    video: []
                };
                
                const sql = `
                SELECT MediaURL.url, MediaURL.mediaType
                FROM MediaURL
                WHERE MediaURL.commentId = ?;`;

                const mediaURLs = await this.runQueryGetAllWithParams(sql, [comment.id]);

                //filter by media type
                for(const mediaURL of mediaURLs) {
                    if(mediaURL.mediaType === 'image') {
                        allMediaURLs.image.push(mediaURL.url);
                    } else if(mediaURL.mediaType === 'audio') {
                        allMediaURLs.audio.push(mediaURL.url);
                    } else if(mediaURL.mediaType === 'video') {
                        allMediaURLs.video.push(mediaURL.url);
                    }
                }

                //return the object that holds all of the urls
                resolve(allMediaURLs);
            } catch(err) {
                console.error(err);
                reject();
            }
        });
    }

    createMediaBlobTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS MediaBlob (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                blob BLOB,
                mimeType TEXT,
                filePath TEXT UNIQUE
            );`;

        return this.runQueryNoResultsNoParams(sql);   
    }

    addMediaFile(fileData, mimetype, filePath) {
        const sql = 'INSERT INTO MediaBlob (blob, mimeType, filePath) VALUES (?, ?, ?);';
        return this.runQueryNoResultsWithParams(sql, [fileData, mimetype, filePath]);
    }

    getMediaFile(filePath) {
        const sql = 'SELECT * FROM MediaBlob WHERE filePath = ?;';
        return this.runQueryGetOneWithParams(sql, [filePath]);
    }

    deleteMediaFile(filePath) {
        const sql = 'DELETE FROM MediaBlob WHERE filePath = ?;';
        return this.runQueryNoResultsWithParams(sql, [filePath]);
    }

    removeUnusedMediaFiles() {
        //delete any blobs that are not referenced in a media url
        const sql = `
            DELETE FROM MediaBlob
            WHERE filePath NOT IN (
                SELECT url FROM MediaURL
            );`;
        return this.runQueryNoResultsNoParams(sql);
    }

    createEventTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS Event (
                id INTEGER PRIMARY KEY AUTOINCREMENT, --TEXT PRIMARY KEY,
                timestamp TEXT,
                type TEXT,
                eventSequenceNumber INTEGER,
                permanentRelevance TEXT,
                character TEXT,
                lineNumber INTEGER,
                column INTEGER,
                filePath TEXT DEFAULT NULL,
                newFilePath TEXT DEFAULT NULL,
                oldFilePath TEXT DEFAULT NULL,
                directoryPath TEXT DEFAULT NULL,
                newDirectoryPath TEXT DEFAULT NULL,
                oldDirectoryPath TEXT DEFAULT NULL,
                deletedAtTimestamp TEXT DEFAULT NULL,
                createdByDevGroupId INTEGER,
                branchId INTEGER,
                fileId INTEGER DEFAULT NULL,
                directoryId INTEGER DEFAULT NULL,
                parentDirectoryId INTEGER DEFAULT NULL,
                newParentDirectoryId INTEGER DEFAULT NULL,
                oldParentDirectoryId INTEGER DEFAULT NULL,
                previousNeighborId INTEGER DEFAULT NULL,
                pastedEventId INTEGER DEFAULT NULL,
                deletedByEventId INTEGER DEFAULT NULL,
                FOREIGN KEY(createdByDevGroupId) REFERENCES DeveloperGroup(id),
                FOREIGN KEY(fileId) REFERENCES File(id),
                FOREIGN KEY(directoryId) REFERENCES Directory(id),
                FOREIGN KEY(parentDirectoryId) REFERENCES Directory(id),
                FOREIGN KEY(newParentDirectoryId) REFERENCES Directory(id),
                FOREIGN KEY(oldParentDirectoryId) REFERENCES Directory(id),
                FOREIGN KEY(previousNeighborId) REFERENCES Event(id),
                FOREIGN KEY(pastedEventId) REFERENCES Event(id),
                FOREIGN KEY(deletedByEventId) REFERENCES Event(id)
            );`;

        return this.runQueryNoResultsNoParams(sql);
    }

    getNumberOfEvents() {
        return this.runQueryGetRowCount('Event');
    }
    
    getAllEvents() {
        return new Promise(async (resolve, reject) => {
            const sql = 'SELECT * FROM Event ORDER BY eventSequenceNumber;';
            this.db.all(sql, (err, rows) => {
                if(err) {
                    console.error(err);
                    reject();
                } else {
                    //add the properties from the db to the objects
                    const allEvents = this.trimEventData(rows);
                    resolve(allEvents);
                }
            });
        });
    }

    getAllEventsFromNonDeletedFiles() {
        return new Promise(async (resolve, reject) => {
            const sql = `
                SELECT * 
                FROM Event 
                WHERE Event.fileId IN (
                    SELECT id
                    FROM File
                    WHERE isDeleted = 'false'
                )
                ORDER BY eventSequenceNumber;`;
            this.db.all(sql, (err, rows) => {
                if(err) {
                    console.error(err);
                    reject();
                } else {
                    //add the properties from the db to the objects
                    const allEvents = this.trimEventData(rows);
                    resolve(allEvents);
                }
            });
        });
    }

    trimEventData(rows) {
        //add the properties from the db to the objects
        const allEvents = [];

        for(const row of rows) {
            //common to all events
            const object = {
                id: row['id'],
                timestamp: row['timestamp'],
                type: row['type'],
                eventSequenceNumber: row['eventSequenceNumber'],
                permanentRelevance: row['permanentRelevance'],
                createdByDevGroupId: row['createdByDevGroupId'],
                branchId: row['branchId']
            }

            //add event specific properties
            if(row['type'] === 'INSERT') {
                object['fileId'] = row['fileId'];
                object['character'] = row['character'];
                object['previousNeighborId'] = row['previousNeighborId'];
                object['lineNumber'] = row['lineNumber'];
                object['column'] = row['column'];
                object['pastedEventId'] = row['pastedEventId'];
                //if this insert has been deleted
                if(row['deletedByEventId']) {
                    object['deletedAtTimestamp'] = row['deletedAtTimestamp'];
                    object['deletedByEventId'] = row['deletedByEventId'];
                }
            } else if(row['type'] === 'DELETE') {
                object['fileId'] = row['fileId'];
                object['character'] = row['character'];
                object['previousNeighborId'] = row['previousNeighborId'];
                object['lineNumber'] = row['lineNumber'];
                object['column'] = row['column'];
            } else if(row['type'] === 'CREATE FILE') {
                object['fileId'] = row['fileId'];
                object['filePath'] = row['filePath'];
                object['parentDirectoryId'] = row['parentDirectoryId'];
            } else if(row['type'] === 'DELETE FILE') {
                object['fileId'] = row['fileId'];
                object['filePath'] = row['filePath'];
                object['parentDirectoryId'] = row['parentDirectoryId'];
            } else if(row['type'] === 'MOVE FILE') {
                object['fileId'] = row['fileId'];
                object['newParentDirectoryId'] = row['newParentDirectoryId'];
                object['oldParentDirectoryId'] = row['oldParentDirectoryId'];
                object['newFilePath'] = row['newFilePath'];
                object['oldFilePath'] = row['oldFilePath'];
            } else if(row['type'] === 'RENAME FILE') {
                object['fileId'] = row['fileId'];
                object['parentDirectoryId'] = row['parentDirectoryId'];
                object['newFilePath'] = row['newFilePath'];
                object['oldFilePath'] = row['oldFilePath'];
            } else if(row['type'] === 'CREATE DIRECTORY') {
                object['directoryId'] = row['directoryId'];
                object['directoryPath'] = row['directoryPath'];
                object['parentDirectoryId'] = row['parentDirectoryId'];
            } else if(row['type'] === 'DELETE DIRECTORY') {
                object['directoryId'] = row['directoryId'];
                object['directoryPath'] = row['directoryPath'];
                object['parentDirectoryId'] = row['parentDirectoryId'];
            } else if(row['type'] === 'MOVE DIRECTORY') {
                object['directoryId'] = row['directoryId'];
                object['newParentDirectoryId'] = row['newParentDirectoryId'];
                object['oldParentDirectoryId'] = row['oldParentDirectoryId'];
                object['newDirectoryPath'] = row['newDirectoryPath'];
                object['oldDirectoryPath'] = row['oldDirectoryPath'];
            } else if(row['type'] === 'RENAME DIRECTORY') {
                object['directoryId'] = row['directoryId'];
                object['parentDirectoryId'] = row['parentDirectoryId'];
                object['newDirectoryPath'] = row['newDirectoryPath'];
                object['oldDirectoryPath'] = row['oldDirectoryPath'];
            } else {
                throw new Error('Unknown event type');
            }

            allEvents.push(object);
        }
        return allEvents;
    }

    addInsertEvent(insertEvent) {
        return this.runInsertFromObject('Event', insertEvent);
    }

    addDeleteEvent(deleteEvent) {
        return this.runInsertFromObject('Event', deleteEvent);
    }

    updateInsertFromDelete(deleteEvent) {
        const sql = `
            UPDATE Event
            SET deletedAtTimestamp = ?, deletedByEventId = ?
            WHERE id = ?;`;
        return this.runQueryNoResultsWithParams(sql, [deleteEvent.timestamp, deleteEvent.id, deleteEvent.previousNeighborId]);
    }
    
    createDeveloperTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS Developer (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userName TEXT,
                email TEXT,
                avatarURL TEXT
            );`;

        return this.runQueryNoResultsNoParams(sql);
    }

    createDeveloper(userName, email, avatarURL) {
        return new Promise(async (resolve, reject) => {
            try {
                const devObject = {
                    userName: userName, 
                    email: email, 
                    avatarURL: avatarURL
                };
                await this.runInsertFromObject('Developer', devObject);
                const newDeveloper = new Developer(devObject.userName, devObject.email, devObject.avatarURL, devObject.id);
                resolve(newDeveloper);
            } catch(err) {
                console.error(err);
                reject();
            }
        });
    }

    getAllDevelopers() {
        return this.runQueryGetAllNoParams('SELECT * FROM Developer;');
    }

    getDeveloperById(id) {
        const sql = `SELECT * FROM Developer WHERE id = ?;`;
        return this.runQueryGetOneWithParams(sql, [id]);
    }

    getDeveloperByUserName(userName) {
        const sql = `SELECT * FROM Developer WHERE userName = ?;`;
        return this.runQueryGetOneWithParams(sql, [userName]);
    }

    createDeveloperGroupTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS DeveloperGroup (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                isActiveDeveloperGroup TEXT DEFAULT 'false'
            );`;

        return this.runQueryNoResultsNoParams(sql);
    } 

    createDeveloperGroup() {
        return new Promise(async (resolve, reject) => {
            try {
                const devGroupObject = {
                    isActiveDeveloperGroup: 'false'
                };
                await this.runInsertFromObject('DeveloperGroup', devGroupObject);
                const newDevGroup = new DeveloperGroup([], false, devGroupObject.id);
                resolve(newDevGroup);
            } catch(err) {
                console.error(err);
                reject();
            }
        });
    }

    getAllDeveloperGroups() {
        return this.runQueryGetAllNoParams('SELECT * FROM DeveloperGroup;');
    }

    getActiveDeveloperGroup() {
        const sql = 'SELECT * FROM DeveloperGroup WHERE isActiveDeveloperGroup = "true";';
        return this.runQueryGetOneNoParams(sql);
    }

    createDeveloperDeveloperGroupJoinTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS DeveloperDeveloperGroup (
                developerId INTEGER,
                developerGroupId INTEGER,
                FOREIGN KEY(developerId) REFERENCES Developer(id),
                FOREIGN KEY(developerGroupId) REFERENCES DeveloperGroup(id),
                PRIMARY KEY(developerId, developerGroupId)
            );`;

        return this.runQueryNoResultsNoParams(sql);
    }

    linkDeveloperToDeveloperGroup(developer, developerGroup) {
        return this.linkDevelopersToDeveloperGroup([developer.id], developerGroup);
    }

    linkDevelopersToDeveloperGroup(devIds, developerGroup) {
        const queryParams = devIds.map(() => '(?, ?)').join(', ');
        const flattenedValues = [];
        for(const devId of devIds) {
            flattenedValues.push(devId);
            flattenedValues.push(developerGroup.id);
        }
        const sql = `INSERT INTO DeveloperDeveloperGroup (developerId, developerGroupId) VALUES ${queryParams};`;
        return this.runQueryNoResultsWithParams(sql, flattenedValues);
    }

    unlinkDeveloperFromDeveloperGroup(developerId, developerGroupId) {
        const sql = `DELETE FROM DeveloperDeveloperGroup WHERE developerId = ? AND developerGroupId = ?;`;
        return this.runQueryNoResultsWithParams(sql, [developerId, developerGroupId]);    
    }

    matchDevelopersToDeveloperGroups(allDevelopers, allDeveloperGroups) {
        return new Promise(async (resolve, reject) => {
            try {
                const sql = `SELECT developerId, developerGroupId FROM DeveloperDeveloperGroup;`;
                const allRows = await this.runQueryGetAllNoParams(sql);
                for(const row of allRows) {
                    //get a dev and dev group combo
                    const developerId = row.developerId;
                    const developerGroupId = row.developerGroupId;

                    //retrieve them from the map in memory
                    const dev = allDevelopers[developerId];
                    const devGroup = allDeveloperGroups[developerGroupId];

                    //make a link between the objects
                    devGroup.addDeveloper(dev);
                }
                resolve();
            } catch(err) {
                console.error(err);
                reject();
            }
        });
    }

    updateActiveDeveloperGroup(developerGroup) {
        return new Promise(async (resolve, reject) => {
            try {
                const sql1 = 'UPDATE DeveloperGroup SET isActiveDeveloperGroup = "false" WHERE isActiveDeveloperGroup = "true";';
                await this.runQueryNoResultsNoParams(sql1);

                const sql2 = `UPDATE DeveloperGroup SET isActiveDeveloperGroup = 'true' WHERE id = ?;`;
                await this.runQueryNoResultsWithParams(sql2, [developerGroup.id]);

                resolve();
            } catch(err) {
                console.error(err);
                reject();
            }
        });
    }
    
    createDirectoryTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS Directory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                currentPath TEXT,
                isDeleted TEXT,
                parentDirectoryId INTEGER DEFAULT -1,
                FOREIGN KEY (parentDirectoryId) REFERENCES Directory(id)
            );`;

        return this.runQueryNoResultsNoParams(sql);
    }

    createDirectory(newDirParentDirId, newDirPath) {
        return new Promise(async (resolve, reject) => {
            try {
                const newDirObject = {
                    currentPath: newDirPath,
                    isDeleted: 'false',
                    parentDirectoryId: newDirParentDirId
                };
                
                await this.runInsertFromObject('Directory', newDirObject);
                const newDirectory = new Directory(newDirObject.parentDirectoryId, newDirObject.currentPath, newDirObject.isDeleted, newDirObject.id);
                resolve(newDirectory);
            } catch(err) {
                console.error(err);
                reject();
            }
        });
    }

    removeDirectory(directory) {
        const sql = 'UPDATE Directory SET isDeleted = "true" WHERE id = ?;';
        return this.runQueryNoResultsWithParams(sql, [directory.id]);
    }

    renameDirectory(directory, newPath) {
        const sql = 'UPDATE Directory SET currentPath = ? WHERE id = ?;';
        return this.runQueryNoResultsWithParams(sql, [newPath, directory.id]);
    }

    moveDirectory(directory, newParentDirId, newPath) {
        const sql = 'UPDATE Directory SET parentDirectoryId = ?, currentPath = ? WHERE id = ?;';
        return this.runQueryNoResultsWithParams(sql, [newParentDirId, newPath, directory.id]);
    }
    
    getAllDirectories() {
        return this.runQueryGetAllNoParams('SELECT * FROM Directory;');
    }

    createFileTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS File (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                currentPath TEXT,
                isDeleted TEXT,
                lastModifiedDate TEXT,
                parentDirectoryId INTEGER,
                FOREIGN KEY (parentDirectoryId) REFERENCES Directory(id)
            );`;

        return this.runQueryNoResultsNoParams(sql);
    }

    createFile(newFileParentDirId, newFilePath, lastModifiedDate) {
        return new Promise(async (resolve, reject) => {
            try {
                const newFileObject = {
                    currentPath: newFilePath,
                    isDeleted: 'false',
                    lastModifiedDate: lastModifiedDate,
                    parentDirectoryId: newFileParentDirId
                };

                await this.runInsertFromObject('File', newFileObject);
                const newFile = new File(newFileObject.parentDirectoryId, newFileObject.currentPath, newFileObject.lastModifiedDate, [], newFileObject.isDeleted, newFileObject.id);
                resolve(newFile);
            } catch(err) {
                console.error(err);
                reject();
            }
        });
    }

    removeFile(file) {
        const sql = 'UPDATE File SET isDeleted = "true" WHERE id = ?;';
        return this.runQueryNoResultsWithParams(sql, [file.id]);
    }

    renameFile(file, newPath) {
        const sql = 'UPDATE File SET currentPath = ? WHERE id = ?;';
        return this.runQueryNoResultsWithParams(sql, [newPath, file.id]);
    }

    moveFile(file, newParentDirId, newPath) {
        const sql = 'UPDATE File SET parentDirectoryId = ?, currentPath = ? WHERE id = ?;';
        return this.runQueryNoResultsWithParams(sql, [newParentDirId, newPath, file.id]);
    }

    updateFileLastModifiedDate(file) {
        const sql = 'UPDATE File SET lastModifiedDate = ? WHERE id = ?;';
        return this.runQueryNoResultsWithParams(sql, [file.lastModifiedDate, file.id]);
    }

    getAllFiles() {
        return this.runQueryGetAllNoParams('SELECT * FROM File;');
    }

    createProjectTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS Project (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT,
                description TEXT,
                branchId TEXT
            );`;

        return this.runQueryNoResultsNoParams(sql);
    }

    createProject(title, description, branchId) {
        return new Promise(async (resolve, reject) => {                
            try {
                const project = {
                    title: title,
                    description: description,
                    branchId: branchId
                };
                await this.runInsertFromObject('Project', project);
                const newProject = new Project(project.title, project.description, project.branchId, project.id);
                resolve(newProject);
            } catch(err) {
                console.error(err);
                reject();
            }
        });
    }

    updateProject(project) {
        return new Promise(async (resolve, reject) => {
            try {
                this.runUpdateFromObject('Project', project);
                resolve();
            } catch(err) {
                console.error(err);
                reject();
            }
        });
    }

    getProject() {
        const sql = 'SELECT * FROM Project;';
        return this.runQueryGetOneNoParams(sql);
    }
}

module.exports = DBAbstraction;