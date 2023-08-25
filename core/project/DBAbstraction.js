const path = require('path');
const fs = require('fs');

const Developer = require('../developers/Developer');
const DeveloperGroup = require('../developers/DeveloperGroup');
const File = require('../filesAndDirs/File');
const Comment = require('../comments/Comment');
const Directory = require('../filesAndDirs/Directory');
const Project = require('./Project');

/*
 * This class is responsible for storing project data persistently. All of the 
 * managers (CommentManager, DeveloperManager, etc.) store their data in memory.
 * This class is used by the ProjectManager to save/retrieve data to disk.
 */
class DBAbstraction {
    constructor(dbPath) {
        this.dbPath = dbPath;

        //small js objects with persistent data (events are handled differently)
        this.comments = {};
        this.devs = {};
        this.fs = {};
        this.project = {};
        this.events = {numberOfEvents: 0}; //only holds the # of events
    }
    
    openDb(isNewProject) {
        return new Promise(async (resolve, reject) => {
            try {
                //if it is a new project
                if(isNewProject) {
                    //create the dirs in the hidden st dir
                    fs.mkdirSync(this.dbPath);
                    fs.mkdirSync(path.join(this.dbPath, 'comments'));
                    fs.mkdirSync(path.join(this.dbPath, 'comments', 'media'));
                    fs.mkdirSync(path.join(this.dbPath, 'comments', 'media', 'audios'));
                    fs.mkdirSync(path.join(this.dbPath, 'comments', 'media', 'images'));
                    fs.mkdirSync(path.join(this.dbPath, 'comments', 'media', 'videos'));
                    fs.mkdirSync(path.join(this.dbPath, 'devs'));
                    fs.mkdirSync(path.join(this.dbPath, 'events'));
                    fs.mkdirSync(path.join(this.dbPath, 'fs'));
                    fs.mkdirSync(path.join(this.dbPath, 'project'));
                } else { //existing project
                    //console.time('Reading existing project from disk');
                    //read the data from the json files and convert to js objects
                    const promises = [
                        fs.promises.readFile(path.join(this.dbPath, 'devs', 'devs.json'), 'utf8'),
                        fs.promises.readFile(path.join(this.dbPath, 'fs', 'filesAndDirs.json'), 'utf8'),
                        fs.promises.readFile(path.join(this.dbPath, 'comments', 'comments.json'), 'utf8'),
                        fs.promises.readFile(path.join(this.dbPath, 'project', 'project.json'), 'utf8'),
                        fs.promises.readFile(path.join(this.dbPath, 'events', 'events.txt'), 'utf8')
                    ];
                    const fileContents = await Promise.all(promises);
                    
                    //fill the in-memory objects with the data from the files
                    this.devs = this.buildDevelopersAndDeveloperGroups(fileContents[0]);
                    this.fs = this.buildFilesAndDirs(fileContents[1]);
                    this.comments = this.buildComments(fileContents[2]);
                    this.project = this.buildProject(fileContents[3]);
                    
                    //count the events in the file
                    this.events = {numberOfEvents: fileContents[4].trimEnd().split('\n').length};
                    //console.timeEnd('Reading existing project from disk');
                }
                resolve();
            } catch(err) {
                console.error(err);
                reject();
            }
        });
    }

    buildDevelopersAndDeveloperGroups(jsonFile) {
        const devs = {
            allDevelopers: {},
            allDeveloperGroups: {},
            activeDeveloperGroupId: {},
            systemDeveloperGroup: {},
            anonymousDeveloperGroup: {}
        };

        //convert text from file into plain objects
        const devObjects = JSON.parse(jsonFile);
        
        //convert plain objects into Developers and DeveloperGroups
        for(const devId in devObjects.allDevelopers) {
            const devObject = devObjects.allDevelopers[devId];
            devs.allDevelopers[devObject.id] = new Developer(devObject.userName, devObject.email, devObject.avatarURL, devObject.id);
        }

        for(const devGroupId in devObjects.allDeveloperGroups) {
            const devGroupObject = devObjects.allDeveloperGroups[devGroupId];
            devs.allDeveloperGroups[devGroupObject.id] = new DeveloperGroup(devGroupObject.memberIds, devGroupObject.id);
        }

        //store the system and anonymous developer groups
        devs.systemDeveloperGroup = devs.allDeveloperGroups[devObjects.systemDeveloperGroup.id];
        devs.anonymousDeveloperGroup = devs.allDeveloperGroups[devObjects.anonymousDeveloperGroup.id];
        
        //store the active developer group
        devs.activeDeveloperGroupId = devObjects.activeDeveloperGroupId;

        return devs;
    }

    buildFilesAndDirs(jsonFile) {
        const fs = {
            allFiles: {},
            allDirs: {},
            pathToFileIdMap: {},
            pathToDirIdMap: {}
        };

        //convert text from file into plain objects
        const fsObjects = JSON.parse(jsonFile);

        for(const fileId in fsObjects.allFiles) {
            const fileObject = fsObjects.allFiles[fileId];                                               
            fs.allFiles[fileObject.id] = new File(fileObject.parentDirectoryId, fileObject.currentPath, fileObject.textFileInsertEvents, fileObject.isDeleted, fileObject.id);
        }

        for(const dirId in fsObjects.allDirs) {
            const dirObject = fsObjects.allDirs[dirId];
            fs.allDirs[dirObject.id] = new Directory(dirObject.parentDirectoryId, dirObject.currentPath, dirObject.id);
        }

        fs.pathToFileIdMap = fsObjects.pathToFileIdMap;
        fs.pathToDirIdMap = fsObjects.pathToDirIdMap;

        return fs;
    }

    buildComments(jsonFile) {
        const comments = {};

        //convert text from file into plain objects
        const commentObjects = JSON.parse(jsonFile);

        for(const eventId in commentObjects.comments) {
            comments[eventId] = [];
            for(const commentObject of commentObjects.comments[eventId]) {
                const comment = new Comment(commentObject.displayCommentEventId, commentObject.displayCommentEventSequenceNumber, commentObject.developerGroupId, commentObject.timestamp, commentObject.commentText, commentObject.commentTitle, commentObject.selectedCodeBlocks, commentObject.imageURLs, commentObject.videoURLs, commentObject.audioURLs, commentObject.linesAbove, commentObject.linesBelow, commentObject.currentFilePath, commentObject.viewableBlogText, commentObject.commentTags, commentObject.questionCommentData, commentObject.position, commentObject.id);
                comments[eventId].push(comment);
            }
        }

        return comments;
    }

    buildProject(jsonFile) {
        //convert text from file into plain objects
        const projectObject = JSON.parse(jsonFile);

        const project = new Project(projectObject.project.title, projectObject.project.description, projectObject.project.branchId, projectObject.project.id);
        return project;
    }

    writeDeveloperInfo({anonymousDeveloper, systemDeveloper, allDevelopers, allDeveloperGroups, activeDeveloperGroupId, systemDeveloperGroup, anonymousDeveloperGroup}) {
        const allDevInfo = {
            anonymousDeveloper: anonymousDeveloper,
            anonymousDeveloperGroup: anonymousDeveloperGroup,
            systemDeveloper: systemDeveloper,
            systemDeveloperGroup: systemDeveloperGroup,
            allDevelopers: allDevelopers,
            allDeveloperGroups: allDeveloperGroups,
            activeDeveloperGroupId: activeDeveloperGroupId,
        };

        const devInfoText = JSON.stringify(allDevInfo, null, 2);
        fs.writeFileSync(path.join(this.dbPath, 'devs', 'devs.json'), devInfoText, 'utf8');
    }

    writeFSInfo({allFiles, allDirs, pathToFileIdMap, pathToDirIdMap}) {
        const fsInfo = {
            allFiles: allFiles,
            allDirs: allDirs,
            pathToFileIdMap: pathToFileIdMap,
            pathToDirIdMap: pathToDirIdMap
        };

        const fsInfoText = JSON.stringify(fsInfo, null, 2);
        fs.writeFileSync(path.join(this.dbPath, 'fs', 'filesAndDirs.json'), fsInfoText, 'utf8');
    }

    writeCommentInfo({comments}) {
        const commentInfo = {
            comments: comments
        };

        const commentInfoText = JSON.stringify(commentInfo, null, 2);
        fs.writeFileSync(path.join(this.dbPath, 'comments', 'comments.json'), commentInfoText, 'utf8');
    }

    writeEventInfo(unwrittenEvents) {
        //if there are any events not written to the file
        let hasChanges = unwrittenEvents.length > 0;
        if(hasChanges) {
            //convert the events to strings and join them with newlines
            const eventsString = unwrittenEvents.map((event) => `${JSON.stringify(event)}\n`).join('');
            //append the events to the file
            fs.appendFileSync(path.join(this.dbPath, 'events', 'events.txt'), eventsString);
            //empty the newly written events to get ready for the next batch
            unwrittenEvents.splice(0, unwrittenEvents.length);
        }

        return hasChanges;
    }

    emptyEventInfo() {
        //empty the events file
        fs.writeFileSync(path.join(this.dbPath, 'events', 'events.txt'), '');        
    }

    readEvents(unwrittenEvents) {
        //return value with all events from the file in an array
        const events = [];

        //if there are any unwritten events
        if(unwrittenEvents.length > 0) {
            //write them to disk first
            this.writeEventInfo(unwrittenEvents);
        }

        //read the file (non-json) of flat events and split them into an array
        const eventsText = fs.readFileSync(path.join(this.dbPath, 'events', 'events.txt'), 'utf8');
        const eventsArray = eventsText.trim().split('\n');
        //convert the strings to objects and add them to the array
        for(const event of eventsArray) {
            //parse the event into an object
            const eventObject = JSON.parse(event);
            //add the object to the array
            events.push(eventObject);
        }
        return events;
    }
    
    writeProjectInfo({project}) {
        const projectInfo = {
            project: project
        };

        const projectInfoText = JSON.stringify(projectInfo, null, 2);
        fs.writeFileSync(path.join(this.dbPath, 'project', 'project.json'), projectInfoText, 'utf8');
    }

    addMediaFile(fileData, filePath) {
        fs.writeFileSync(filePath, fileData);
        return filePath;
    }

    getMediaFile(filePath) {
        if(fs.existsSync(filePath)) {
            const mediaData = fs.readFileSync(filePath);
            return mediaData;
        } else {
            console.log(`Read file attempt: the file ${filePath} does not exist.`);
        }
    }

    deleteMediaFile(filePath) {
        //make sure the file exists before attempting to delete it
        if(fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
}

module.exports = DBAbstraction;