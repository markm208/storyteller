const sqlite3 = require('sqlite3').verbose();
const path = require('path');

//name of the hidden storyteller directory
const STORYTELLER_DIR = '.storyteller';

class DBAbstraction {
    constructor(stPath, createDB) {
        const dbPath = path.join(stPath, STORYTELLER_DIR, 'storyteller.db');
        this.db = new sqlite3.Database(dbPath, (err) => {
            if(err) {
                console.error(err);
            } else if(createDB) {
                this.createTables();
            }
        });
    }

    createTables() {
        //developers
        this.createDeveloperTable();
        this.createDeveloperGroupTable();
        this.createDeveloperDeveloperGroupJoinTable();

        //project info
        this.createProjectTable();
        this.createBranchTable();
        
        //files and directories
        this.createDirectoryTable();
        this.createFileTable();

        //events
        this.createEventTable();

        //comments
        this.createCommentTable();
        this.createCommentQuestionTable();
        this.createCommentQuestionAnswerTable();
        this.createSelectedCodeBlockTable();
        this.createTagTable();
        this.createCommentTagJoinTable();

        //media
        this.createMediaURLTable();
        this.createMediaBlobTable();
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
            eventId INTEGER,
            developerGroupId INTEGER,
            FOREIGN KEY(eventId) REFERENCES Event(id),
            FOREIGN KEY(developerGroupId) REFERENCES DeveloperGroup(id));`;

        this.db.run(sql, (err) => {
            if(err) {
                console.error(err);
            } else {
                console.log('Comment table created');
            }
        });
    }

    createTagTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS Tag (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tagText TEXT);`;

        this.db.run(sql, (err) => {
            if(err) {
                console.error(err);
            } else {
                console.log('Tag table created');
            }
        });
    }

    createCommentTagJoinTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS CommentTag (
            tagId INTEGER,
            commentId INTEGER,
            FOREIGN KEY(tagId) REFERENCES Tag(id),
            FOREIGN KEY(commentId) REFERENCES Comment(id));`;

        this.db.run(sql, (err) => {
            if(err) {
                console.error(err);
            } else {
                console.log('CommentTag table created');
            }
        });
    }

    createCommentQuestionTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS CommentQuestion (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT,
            explanation TEXT,
            commentId INTEGER,
            FOREIGN KEY(commentId) REFERENCES Comment(id));`;

        this.db.run(sql, (err) => {
            if(err) {
                console.error(err);
            } else {
                console.log('CommentQuestion table created');
            }
        });
    }

    createCommentQuestionAnswerTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS CommentQuestionAnswer (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            answer TEXT,
            isCorrect TEXT,
            commentQuestionId INTEGER,
            FOREIGN KEY(commentQuestionId) REFERENCES CommentQuestion(id));`;

        this.db.run(sql, (err) => {
            if(err) {
                console.error(err);
            } else {
                console.log('CommentQuestionAnswer table created');
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
            FOREIGN KEY(fileId) REFERENCES File(id));`;

        this.db.run(sql, (err) => {
            if(err) {
                console.error(err);
            } else {
                console.log('SelectedCodeBlock table created');
            }
        });
    }

    createMediaURLTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS MediaURL (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT,
            commentId INTEGER,
            FOREIGN KEY(commentId) REFERENCES Comment(id));`;

        this.db.run(sql, (err) => {
            if(err) {
                console.error(err);
            } else {
                console.log('MediaURL table created');
            }
        });
    }

    createEventTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS Event (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
            developerGroupId INTEGER,
            branchId INTEGER,
            fileId INTEGER DEFAULT NULL,
            directoryId INTEGER DEFAULT NULL,
            parentDirectoryId INTEGER DEFAULT NULL,
            newParentDirectoryId INTEGER DEFAULT NULL,
            oldParentDirectoryId INTEGER DEFAULT NULL,
            previousNeigborId INTEGER DEFAULT NULL,
            pastedEventId INTEGER DEFAULT NULL,
            deletedByEventId INTEGER DEFAULT NULL,
            FOREIGN KEY(developerGroupId) REFERENCES DeveloperGroup(id),
            FOREIGN KEY(branchId) REFERENCES Branch(id),
            FOREIGN KEY(fileId) REFERENCES File(id),
            FOREIGN KEY(directoryId) REFERENCES Directory(id),
            FOREIGN KEY(parentDirectoryId) REFERENCES Directory(id),
            FOREIGN KEY(newParentDirectoryId) REFERENCES Directory(id),
            FOREIGN KEY(oldParentDirectoryId) REFERENCES Directory(id),
            FOREIGN KEY(previousNeigborId) REFERENCES Event(id),
            FOREIGN KEY(pastedEventId) REFERENCES Event(id),
            FOREIGN KEY(deletedByEventId) REFERENCES Event(id));`;

        this.db.run(sql, (err) => {
            if(err) {
                console.error(err);
            } else {
                console.log('Event table created');
            }
        });
    }

    insertNewInsertEvent() {
    }

    insertNewDeleteEvent() {
    }

    insertNewInEvent() {
    }
    createDeveloperTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS Developer (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userName TEXT,
            email TEXT,
            avatarURL TEXT);`;

        this.db.run(sql, (err) => {
            if(err) {
                console.error(err);
            } else {
                console.log('Developer table created');
            }
        });
    }
    insertNewDeveloper(userName, email, avatarURL) {
        const sql = `INSERT INTO Developer (userName, email, avatarURL) VALUES (?, ?, ?)`;
        this.db.run(sql, [userName, email, avatarURL], (err) => {
            if(err) {
                console.error(err);
            } else {
                console.log('New developer inserted');
            }
        });
    }

    createDeveloperGroupTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS DeveloperGroup (
            id INTEGER PRIMARY KEY AUTOINCREMENT);`;

        this.db.run(sql, (err) => {
            if(err) {
                console.error(err);
            } else {
                console.log('DeveloperGroup table created');
            }
        });
    } 

    inserNewDeveloperGroup() {
        const sql = `INSERT INTO DeveloperGroup DEFAULT VALUES`;
        this.db.run(sql, (err) => {
            if(err) {
                console.error(err);
            } else {
                console.log('New developer group inserted');
            }
        });
    }

    //write a method to build a join table between developer and developergroup
    createDeveloperDeveloperGroupJoinTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS DeveloperDeveloperGroup (
            developerId INTEGER,
            developerGroupId INTEGER,
            FOREIGN KEY(developerId) REFERENCES Developer(id),
            FOREIGN KEY(developerGroupId) REFERENCES DeveloperGroup(id));`;

        this.db.run(sql, (err) => {
            if(err) {
                console.error(err);
            } else {
                console.log('DeveloperDeveloperGroup table created');
            }
        });
    }

    addDeveloperToDeveloperGroup(developerId, developerGroupId) {
        const sql = `INSERT INTO DeveloperDeveloperGroup (developerId, developerGroupId) VALUES (?, ?)`;
        this.db.run(sql, [developerId, developerGroupId], (err) => {
            if(err) {
                console.error(err);
            } else {
                console.log('Developer added to developer group');
            }
        });
    }

    createDirectoryTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS Directory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            currentPath TEXT,
            isDeleted TEXT,
            lastModifiedDate TEXT,
            parentDirectoryId INTEGER DEFAULT NULL,
            FOREIGN KEY (parentDirectoryId) REFERENCES Directory(id));`;

        this.db.run(sql, (err) => {
            if(err) {
                console.error(err);
            } else {
                console.log('Directory table created');
            }
        });
    }

    insertNewDirectory(currentPath, isDeleted, lastModifiedDate, parentDirectoryId) {
        const sql = `INSERT INTO Directory (currentPath, isDeleted, lastModifiedDate, parentDirectoryId) VALUES (?, ?, ?, ?)`;
        this.db.run(sql, [currentPath, isDeleted, lastModifiedDate, parentDirectoryId], (err) => {
            if(err) {
                console.error(err);
            } else {
                console.log('New directory inserted');
            }
        });
    }

    createFileTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS File (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            currentPath TEXT,
            isDeleted TEXT,
            lastModifiedDate TEXT,
            parentDirectoryId INTEGER,
            FOREIGN KEY (parentDirectoryId) REFERENCES Directory(id));`;

        this.db.run(sql, (err) => {
            if(err) {
                console.error(err);
            } else {
                console.log('File table created');
            }
        });
    }

    insertNewFile(currentPath, isDeleted, lastModifiedDate, parentDirectoryId) {
        const sql = `INSERT INTO File (currentPath, isDeleted, lastModifiedDate, parentDirectoryId) VALUES (?, ?, ?, ?)`;
        this.db.run(sql, [currentPath, isDeleted, lastModifiedDate, parentDirectoryId], (err) => {
            if(err) {
                console.error(err);
            } else {
                console.log('New file inserted');
            }
        });
    }

    createProjectTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS Project (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            description TEXT);`;

        this.db.run(sql, (err) => {
            if(err) {
                console.error(err);
            } else {
                console.log('Project table created');
            }
        });
    }

    insertNewProject(title, description) {
        const sql = `INSERT INTO Project (title, description) VALUES (?, ?)`;
        this.db.run(sql, [title, description], (err) => {
            if(err) {
                console.error(err);
            } else {
                console.log('New project inserted');
            }
        });
    }

    createBranchTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS Branch (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            description TEXT,
            projectId INTEGER,
            developerGroupId INTEGER,
            FOREIGN KEY(projectId) REFERENCES Project(id),
            FOREIGN KEY(developerGroupId) REFERENCES DeveloperGroup(id));`;

        this.db.run(sql, (err) => {
            if(err) {
                console.error(err);
            } else {
                console.log('Branch table created');
            }
        });
    }

    insertNewBranch(name, description, projectId, developerGroupId) {
        const sql = `INSERT INTO Branch (name, description, projectId, developerGroupId) VALUES (?, ?, ?, ?)`;
        this.db.run(sql, [name, description, projectId, developerGroupId], (err) => {
            if(err) {
                console.error(err);
            } else {
                console.log('New branch inserted');
            }
        });
    }

    createMediaBlobTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS MediaBlob (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            blob BLOB,
            commentId INTEGER,
            FOREIGN KEY(commentId) REFERENCES Comment(id));`;

        this.db.run(sql, (err) => {
            if(err) {
                console.error(err);
            } else {
                console.log('MediaBlob table created');
            }
        });
    }
}

module.exports = DBAbstraction;