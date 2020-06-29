const fs = require('fs');
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');

const utilities = require('../utilities.js');

//port number to listen for http requests
const HTTP_SERVER_PORT = 53140;

//initial list of acceptable media files
const acceptableImageMimeTypes = ['image/apng', 'image/bmp', 'image/gif', 'image/ico', 'image/jpeg', 'image/png', 'image/svg+xml'];
const acceptableAudioMimeTypes = ['audio/aac', 'audio/mpeg', 'audio/wav', 'audio/webm'];
const acceptableVideoMimeTypes = ['video/mpeg', 'video/mp4', 'video/webm'];
/*
 * Creates an http server to accept requests from the playback page and
 * can be used with editors too.
 */
class HttpServer {
    constructor (projectManager) {
        //store a reference to the project manager
        this.projectManager = projectManager;

        //create the 'public' directory if it doesn't exist to hold statically 
        //served public content
        //like C:/users/mark/documents/project1/.storyteller/public
        this.pathToPublicDir = path.join(this.projectManager.fullPathToHiddenStorytellerDir, 'public');
        if(fs.existsSync(this.pathToPublicDir) === false) {
            fs.mkdirSync(this.pathToPublicDir);
        }
        //TODO copy files only once on new project?? An updated storyteller wouldn't use the new public files??
        //copy any static html/css/javascript into this repo's public dir
        //get the path to the public dir inside this repo /core
        const pathToPublicDirInThisProject = path.join(__dirname, '..', 'public');
        //copy everything in /core/public/ into the open project's dir, /.storyteller/public/
        utilities.copyDirectoryHelper(pathToPublicDirInThisProject, this.pathToPublicDir)

        //store the names of the directories to hold media
        this.mediaDirectoryName = 'media';
        this.mediaTempDirectoryName = '.tmp';
        this.imageDirectoryName = 'images';
        this.videoDirectoryName = 'videos';
        this.audioDirectoryName = 'audios';

        //create the full paths to the directories
        //like C:/users/mark/documents/project1/.storyteller/public/media
        this.fullPathToMediaDirectory = path.join(this.pathToPublicDir, this.mediaDirectoryName);
        //like C:/users/mark/documents/project1/.storyteller/.tmp
        this.fullPathToMediaTempDirectory = path.join(this.projectManager.fullPathToHiddenStorytellerDir, this.mediaTempDirectoryName);
        //like C:/users/mark/documents/project1/.storyteller/public/media/images
        this.fullPathToImageDirectory = path.join(this.fullPathToMediaDirectory, this.imageDirectoryName);
        //like C:/users/mark/documents/project1/.storyteller/public/media/videos
        this.fullPathToVideoDirectory = path.join(this.fullPathToMediaDirectory, this.videoDirectoryName);
        //like C:/users/mark/documents/project1/.storyteller/public/media/audios
        this.fullPathToAudioDirectory = path.join(this.fullPathToMediaDirectory, this.audioDirectoryName);
        
        //these are relative paths from the served 'public' directory
        // /media/images
        this.webPathToImageDirectory = path.posix.join(`${path.posix.sep}`, this.mediaDirectoryName, this.imageDirectoryName);
        // /media/videos
        this.webPathToVideoDirectory = path.posix.join(`${path.posix.sep}`, this.mediaDirectoryName, this.videoDirectoryName);
        // /media/audios
        this.webPathToAudioDirectory = path.posix.join(`${path.posix.sep}`, this.mediaDirectoryName, this.audioDirectoryName);

        //create the express server
        const app = express();

        //for file uploads- 100Mb limit using a temp dir instead of memory
        app.use(fileUpload({
            limits: { fileSize: 100 * 1024 * 1024 },
            useTempFiles : true,
            tempFileDir : this.fullPathToMediaTempDirectory
        }));

        //add middleware
        //serve media from the 'public' directory created above 
        app.use(express.static(this.pathToPublicDir));
        //for form data
        app.use(bodyParser.urlencoded({extended: true}));
        app.use(bodyParser.json());
        
        //set the routes
        this.createRoutes(app);

        //create a server listening on the storyteller port
        this.server = app.listen(HTTP_SERVER_PORT, () => console.log('The storyteller http server is up and running...'));
    }

    /*
     * Shuts down the http server.
     */
    close() {
        //close the http server
        this.server.close();
    }

    /*
     * Stores a collection of media files (image, video, audio) into the correct 
     * subdirectory inside /.storyteller/media.
     */
    async saveMediaFiles(newFiles, fullPathToMediaDirectory, webPathToMediaDirectory, res) {
        //all the relative web paths to the files being added (so they can be 
        //immediately retrieved)
        const addedPaths = [];
        
        try {
            //go through all of the new files
            for(let i = 0;i < newFiles.length;i++) {
                //create a new file path that includes a timestamp (to show files in order of upload)
                const timestamp = new Date().getTime();
                const newFileInfo = path.parse(newFiles[i].name);
                const newFileName = `${timestamp}-${newFileInfo.base}`; 
                
                //system dependent full path to where the file will be stored
                //like C:/users/mark/documents/project1/.storyteller/public/media/images/123-pic.png
                const pathToNewFile = path.join(fullPathToMediaDirectory, newFileName);
                
                //relative web path from the public directory
                //like /media/images/123-pic.png
                const webPathToNewFile = path.posix.join(webPathToMediaDirectory, newFileName);

                //move the file into the directory (using express-fileupload to move the file)
                await newFiles[i].mv(pathToNewFile);

                //add the new web path to an array that will be returned to the client
                addedPaths.push(webPathToNewFile);
            }
        } catch(err) {
            return res.status(500).send(err);
        }
        //return a collection of the newly added relative file paths
        res.json({filePaths: addedPaths});
    }

    deleteFilesFromPublic(filePaths) {
        //go through the paths
        for(let i = 0;i < filePaths.length;i++) {
            //change the relative web path to a full path and delete it from the 'public' dir
            const parts = filePaths[i].split(path.posix.sep);
            const systemDependentPath = path.join(...parts);
            const fullFilePath = path.join(this.pathToPublicDir, systemDependentPath);
            fs.unlinkSync(fullFilePath);
        }
    }
    /*
     * Creates the routes that this server responds to
     */
    createRoutes(app) {
        //routes
        //request a playback page
        app.get('/playback', (req, res) => {
            this.createPlayback(req, res);
        });
        
        //title and description 
        app.get('/project', (req, res) => {
            //return the project manager's 'project' which contains the title,
            //description, and the branch id
            res.json(this.projectManager.project);
        });

        app.put('/project', (req, res) => {
            //get an object with a title and description (comes from the user)
            const titleDescription = req.body;

            //title is required
            if(titleDescription.title && titleDescription.title.trim()) {
                //trim and store the title
                this.projectManager.project.title = titleDescription.title.trim();

                //if there is a description
                if(titleDescription.description) {
                    //trim and store the description
                    this.projectManager.project.description = titleDescription.description.trim();
                } else { //no description property
                    //default to empty string
                    this.projectManager.project.description = '';
                }

                //return the newly updated project
                res.json(this.projectManager.project);
            } else { //title is missing
                res.status(400).send('Playback title is required.');
            }
        });

        //developers and developer groups
        app.get('/developer', (req, res) => {
            //get the developer manager's object with all of the developers
            res.json(this.projectManager.developerManager.allDevelopers);
        });

        app.get('/developerGroup', (req, res) => {
            //get the developer manager's object with all of the developer groups
            res.json(this.projectManager.developerManager.allDeveloperGroups);
        });

        //files and directories
        app.get('/file', (req, res) => {
            //holds files without the text file insert events
            const minimalFiles = {};

            //go through every file that the file system manager is holding
            for(const fileId in this.projectManager.fileSystemManager.allFiles) {
                //store the minimal file
                minimalFiles[fileId] = this.projectManager.fileSystemManager.allFiles[fileId].getMinimalFileData();
            }
            res.json(minimalFiles);
        });

        app.get('/directory', (req, res) => {
            //return all the directories that the file system manager is holding
            res.json(this.projectManager.fileSystemManager.allDirs);
        });

        //events
        app.get('/event', (req, res) => {
            //return all the events
            const allEvents = this.projectManager.eventManager.read();
            res.json(allEvents);
        });

        app.get('/event/numberOfEvents', (req, res) => {
            //return the number of events
            //const allEvents = this.projectManager.eventManager.read();
            res.json({numberOfEvents: this.projectManager.eventManager.nextId});
        });

        app.get('/event/start/:start', (req, res) => {
            //return all the events starting from a requested index
            const start = Number(req.params.start);
            const allEvents = this.projectManager.eventManager.read();
            res.json(allEvents.slice(start));
        });

        app.get('/event/start/:start/numEvents/:numEvents', (req, res) => {
            //return all the events starting from a requested index plus a 
            //requested number of events after that
            const start = Number(req.params.start);
            const numEvents = Number(req.params.numEvents);
            const allEvents = this.projectManager.eventManager.read();
            res.json(allEvents.slice(start, (start + numEvents)));
        });

        app.get('/event/start/:start/end/:end', (req, res) => {
            //return all the events starting from a requested index up to but
            //not including a requested end index
            const start = Number(req.params.start);
            const end = Number(req.params.end);
            const allEvents = this.projectManager.eventManager.read();
            res.json(allEvents.slice(start, end));
        });

        app.get('/event/upToFirstComment', (req, res) => {
            //return all the events from the beginning up to and including the 
            //first event that has a comment (can be used to move from comment 
            //to comment)
            const allEvents = this.projectManager.eventManager.read();
            const events = [];
            //go from the beginning index until the next comment or the end
            for(let i = 0;i < allEvents.length;i++) {
                //grab the next event and add it
                const event = allEvents[i];
                events.push(event);

                //if there is a comment for the latest event
                if(this.projectManager.commentManager.comments[event.id]) {
                    //stop adding events
                    break;
                }
            }
            res.json(events);
        });

        app.get('/event/start/:start/nextComment', (req, res) => {
            //return all the events that come after the requested start index
            //up to and including the next event that has a comment (can be used
            //to move from comment to comment)
            const start = Number(req.params.start);
            const allEvents = this.projectManager.eventManager.read();
            const events = [];

            //go from one beyond the starting index until the next comment or the end
            for(let i = start + 1;i < allEvents.length;i++) {
                //grab the next event and add it
                const event = allEvents[i];
                events.push(event);

                //if there is a comment for the latest event
                if(this.projectManager.commentManager.comments[event.id]) {
                    //stop adding events
                    break;
                }
            }
            res.json(events);
        });

        //comments
        app.get('/comment', (req, res) => {
            //return all of the comments that the comment manager is holding on to
            res.json(this.projectManager.commentManager.comments);
        });

        app.post('/comment', (req, res) => {
            //add a comment
            
            const comment = req.body;            
            comment['developerGroupId'] = this.projectManager.developerManager.currentDeveloperGroupId;
            console.log(comment);
            this.projectManager.commentManager.addComment(comment);
            res.sendStatus(200);
        });

        app.put('/comment', (req, res) => {
            //update a comment
            const comment = req.body;
            this.projectManager.commentManager.updateComment(comment);
            res.sendStatus(200);
        });
        
        app.put('/commentPosition', (req, res) => {
            //update the position of a comment
            const commentPositionData = req.body;
            this.projectManager.commentManager.updateCommentPosition(commentPositionData);
            res.sendStatus(200);
        });

        app.delete('/comment', (req, res) => {
            //delete a comment
            const comment = req.body;
            this.projectManager.commentManager.deleteComment(comment);
            res.sendStatus(200);
        });

        //for uploading image files
        app.post('/newMedia/image', async (req, res) => {
            //if there are no files, send a 400
            if (!req.files || Object.keys(req.files).length === 0) {
                return res.status(400).send('No files were uploaded.');
            }

            //get the new image files from the request
            let newFiles = [];
            //if there were more than one files uploaded then this will be an array
            //if there is no length then only one file is being passed in (see FormData in client)
            if(req.files.newImageFiles.length === undefined) {
                //store the one file in an array
                newFiles.push(req.files.newImageFiles);
            } else { //there are an array of files, store them all
                newFiles = req.files.newImageFiles;
            }

            //verify that every file has an acceptable mime type
            if(newFiles.every(newFile => acceptableImageMimeTypes.includes(newFile.mimetype))) {
                //save the files in the server's public directory
                this.saveMediaFiles(newFiles, this.fullPathToImageDirectory, this.webPathToImageDirectory, res);
            } else { //at least one invalid mimetype
                res.status(415).json({error: `One or more file types not supported`});
            }
        });

        //for getting the web urls of the existing media items
        app.get('/newMedia/image', async (req, res) => {
            //holds the web paths of the images
            const filePaths = [];

            //go through the images dir
            const files = fs.readdirSync(this.fullPathToImageDirectory);
            for(let i = 0;i < files.length;i++) {
                //ignore the .keep file
                if(files[i] !== '.keep') {
                    //create and store a relative path on the server to the image
                    const webPath = path.posix.join(this.webPathToImageDirectory, files[i]);
                    filePaths.push(webPath);
                }
            }
            //return all of the web paths to the images
            res.json({filePaths: filePaths});
        });

        //for deleting existing media items
        app.delete('/newMedia/image', async (req, res) => {
            //get the file paths to delete
            const filePaths = req.body;

            //delete them from the public dir
            this.deleteFilesFromPublic(filePaths);

            //return success
            res.sendStatus(200);
        });
        
        //for uploading video files
        app.post('/newMedia/video', async (req, res) => {
            //if there are no files, send a 400
            if (!req.files || Object.keys(req.files).length === 0) {
                return res.status(400).send('No files were uploaded.');
            }

            //get the new video files from the request
            let newFiles = [];
            //if there were more than one files uploaded then this will be an array
            //if there is no length then only one file is being passed in (see FormData in client)
            if(req.files.newVideoFiles.length === undefined) {
                //store the one file in an array
                newFiles.push(req.files.newVideoFiles);
            } else { //there are an array of files, store them all
                newFiles = req.files.newVideoFiles;
            }

            //verify that every file has an acceptable mime type
            if(newFiles.every(newFile => acceptableVideoMimeTypes.includes(newFile.mimetype))) {
                //save the files in the server's public directory
                this.saveMediaFiles(newFiles, this.fullPathToVideoDirectory, this.webPathToVideoDirectory, res);
            } else { //at least one invalid mimetype
                res.status(415).json({error: `One or more file types not supported`});
            }
        });
        //for getting the web urls of the existing media items
        app.get('/newMedia/video', async (req, res) => {
            //holds the web paths of the videos
            const filePaths = [];

            //go through the videos dir
            const files = fs.readdirSync(this.fullPathToVideoDirectory);
            for(let i = 0;i < files.length;i++) {
                //ignore the .keep file
                if(files[i] !== '.keep') {
                    //create and store a relative path on the server to the video
                    const webPath = path.posix.join(this.webPathToVideoDirectory, files[i]);
                    filePaths.push(webPath);
                }
            }
            //return all of the web paths to the videos
            res.json({filePaths: filePaths});
        });

        //for deleting existing media items
        app.delete('/newMedia/video', async (req, res) => {
            //get the file paths to delete
            const filePaths = req.body;
                        
            //delete them from the public dir
            this.deleteFilesFromPublic(filePaths);

            //return success
            res.sendStatus(200);
        });

        //for uploading audio files
        app.post('/newMedia/audio', async (req, res) => {
            //if there are no files, send a 400
            if (!req.files || Object.keys(req.files).length === 0) {
                return res.status(400).send('No files were uploaded.');
            }

            //get the new audio files from the request
            let newFiles = [];
            //if there were more than one files uploaded then this will be an array
            //if there is no length then only one file is being passed in (see FormData in client)
            if(req.files.newAudioFiles.length === undefined) {
                //store the one file in an array
                newFiles.push(req.files.newAudioFiles);
            } else { //there are an array of files, store them all
                newFiles = req.files.newAudioFiles;
            }

            //verify that every file has an acceptable mime type
            if(newFiles.every(newFile => acceptableAudioMimeTypes.includes(newFile.mimetype))) {
                //save the files in the server's public directory
                this.saveMediaFiles(newFiles, this.fullPathToAudioDirectory, this.webPathToAudioDirectory, res);
            } else { //at least one invalid mimetype
                res.status(415).json({error: `One or more file types not supported`});
            }
        });

        //for getting the web urls of the existing media items
        app.get('/newMedia/audio', async (req, res) => {
            //holds the web paths of the audios
            const filePaths = [];

            //go through the audios dir
            const files = fs.readdirSync(this.fullPathToAudioDirectory);
            for(let i = 0;i < files.length;i++) {
                //ignore the .keep file
                if(files[i] !== '.keep') {
                    //create and store a relative path on the server to the audio
                    const webPath = path.posix.join(this.webPathToAudioDirectory, files[i]);
                    filePaths.push(webPath);
                }
            }
            //return all of the web paths to the audios
            res.json({filePaths: filePaths});
        });

        //for deleting existing media items
        app.delete('/newMedia/audio', async (req, res) => {
            //get the file paths to delete
            const filePaths = req.body;

            //delete them from the public dir
            this.deleteFilesFromPublic(filePaths);

            //return success
            res.sendStatus(200);
        });

        //if this server will handle http requests from web editors
        if(this.projectManager.useHttpServerForEditor) {
            this.addEditorRoutes(app);
        }

        //for invalid routes
        app.use((req, res) => {
            res.status(404).send(`<h2>Uh Oh!</h2><p>Sorry ${req.url} cannot be found here</p>`);
        });
    }

    /*
     * These are routes to work with a web based editor using http.
     */
    addEditorRoutes(app) {
        app.get('/close-project', (req, res) => {
            //stop storyteller
            this.projectManager.stopStoryteller();
            res.status(200).end();
        });
        
        app.get('/active-devs', (req, res) => {
            //get all the active devs
            res.json({allActiveDevs: this.projectManager.developerManager.getActiveDevelopers()});
        });
        
        app.get('/inactive-devs', (req, res) => {
            //get all the inactive devs
            res.json({allInactiveDevs: this.projectManager.developerManager.getInactiveDevelopers()});
        });
        
        //developer related 
        app.post('/update-first-developer', (req, res) => {
            const dev = req.body.devInfo; 
            //replace the default dev with a new one
            this.projectManager.developerManager.replaceAnonymousDeveloperWithNewDeveloper(dev.userName, dev.email);
            res.status(200).end();
        });
        
        app.post('/add-new-developer', (req, res) => {
            const devInfo = req.body.devInfo;
            //create a new dev and add them to the current dev group
            this.projectManager.developerManager.createDeveloper(devInfo.userName, devInfo.email);
            this.projectManager.developerManager.addDevelopersToActiveGroupByUserName([devInfo.userName]);
            //get all the active devs
            res.json({allActiveDevs: this.projectManager.developerManager.getActiveDevelopers()});
        });
        
        app.post('/add-dev-to-active-dev-group', (req, res) => {
            //add all the developers to the active dev group
            const devUserNames = req.body.devUserNames;
            this.projectManager.developerManager.addDevelopersToActiveGroupByUserName(devUserNames);
            //get all the active devs
            res.json({allActiveDevs: this.projectManager.developerManager.getActiveDevelopers()});
        });
        
        app.post('/remove-dev-from-active-dev-group', (req, res) => {
            //remove all the developers to the active dev group
            const devUserNames = req.body.devUserNames;
            this.projectManager.developerManager.removeDevelopersFromActiveGroupByUserName(devUserNames);
            //get all the active devs
            res.json({allActiveDevs: this.projectManager.developerManager.getActiveDevelopers()});
        });
        
        //file system /fs
        app.get('/save-all', (req, res) => {
            //save the file state
            this.projectManager.saveTextFileState();
            res.status(200).end();
        });
        
        app.post('/create-file', (req, res) => {
            //create a new file 
            const filePath = req.body.filePath;
            this.projectManager.createFile(filePath);
            res.status(200).end();
        });
        
        app.post('/delete-file', (req, res) => {
            //delete a file 
            const filePath = req.body.filePath;
            this.projectManager.deleteFile(filePath);
            res.status(200).end();
        });

        app.post('/rename-file', (req, res) => {
            //rename a file
            const oldFilePath = req.body.oldFilePath;
            const newFilePath = req.body.newFilePath;
            this.projectManager.renameFile(oldFilePath, newFilePath);
            res.status(200).end();
        });

        app.post('/move-file', (req, res) => {
            //move a file 
            const oldFilePath = req.body.oldFilePath;
            const newFilePath = req.body.newFilePath;
            this.projectManager.moveFile(oldFilePath, newFilePath);
            res.status(200).end();
        });
        
        app.post('/create-directory', (req, res) => {
            //create a dir
            const dirPath = req.body.dirPath;
            this.projectManager.createDirectory(dirPath);
            res.status(200).end();
        });
        
        app.post('/delete-directory', (req, res) => {
            //delete a directory
            const dirPath = req.body.dirPath;
            this.projectManager.deleteDirectory(dirPath);
            res.status(200).end();
        });

        app.post('/rename-directory', (req, res) => {
            //rename a directory
            const oldDirPath = req.body.oldDirPath;
            const newDirPath = req.body.newDirPath;
            this.projectManager.renameDirectory(oldDirPath, newDirPath);
            res.status(200).end();
        });

        app.post('/move-directory', (req, res) => {
            //move a directory
            const oldDirPath = req.body.oldDirPath;
            const newDirPath = req.body.newDirPath;
            this.projectManager.moveDirectory(oldDirPath, newDirPath);
            res.status(200).end();
        });
        
        app.post('/delete-file-or-directory', (req, res) => {
            //delete a file or directory
            const aPath = req.body.aPath;
            this.projectManager.deleteFileOrDirectory(aPath);
            res.status(200).end();
        });
        
        //text related /text
        app.post('/insert-text', (req, res) => {
            //insert some text
            const filePath = req.body.filePath;
            const insertedText = req.body.insertedText;
            const startRow = req.body.startRow;
            const startCol = req.body.startCol;
            const pastedInsertEventIds = req.body.pastedInsertEventIds;
            this.projectManager.handleInsertedText(filePath, insertedText, startRow, startCol, pastedInsertEventIds);
            res.status(200).end();
        });
        
        app.post('/delete-text', (req, res) => {
            //delete some text
            const filePath = req.body.filePath;
            const startRow = req.body.startRow;
            const startCol = req.body.startCol;
            const numElementsToDelete = req.body.numElementsToDelete;
            this.projectManager.handleDeletedText(filePath, startRow, startCol, numElementsToDelete);
            res.status(200).end();
        });
    }
    /*
     * Creates a page to show a playback.
     */
    createPlayback(req, res) {
        //get all of the event data 
        const codeEvents = this.projectManager.eventManager.read();
        
        //strip the text events from the files
        const minimizedAllFiles = {};
        for(const fileId in this.projectManager.fileSystemManager.allFiles) {
            //add everything but the textFileInsertEvents
            minimizedAllFiles[fileId] = this.projectManager.fileSystemManager.allFiles[fileId].getMinimalFileData();
        }

        //add the data members required for a playback to an object
        let playbackData = {
            codeEvents: codeEvents,
            allFiles: minimizedAllFiles, 
            allDirs: this.projectManager.fileSystemManager.allDirs,
            allDevelopers: this.projectManager.developerManager.allDevelopers,
            allDeveloperGroups: this.projectManager.developerManager.allDeveloperGroups,
            currentDeveloperGroupId: this.projectManager.developerManager.currentDeveloperGroupId,
            comments: this.projectManager.commentManager.comments,
            title: this.projectManager.project.title, 
            description: this.projectManager.project.description,
            branchId: this.projectManager.branchId
        };

        //TEMPORARY- using old playback page with slightly different properties
        //converts the newer format to the older one to work with the old 
        //playback.html file
        playbackData = this.convertToOldDataFormat(playbackData);

        //this will get added to the playback code and is used to detemine whether to 
        //jump to the end of the playback for adding a comment.
        let isComment = 'false';

        //if this is a playback for adding a comment 
        if(req.query.comment && req.query.comment === 'true') {

            //indicate that there should be a jump to the end of the playback to add a comment    
            isComment = 'true';
        }

        //replace parts of the template html file
        //read the playback html file that will drive the playback from the parent folder
        let playbackPage = fs.readFileSync(path.join(__dirname, 'playback.html'), 'utf8');
        playbackPage = this.replaceLoadPlaybackDataFunction(playbackPage, isComment, playbackData);
        // playbackPage = replaceCSS(playbackPage);
        // playbackPage = replaceJQuery(playbackPage);
        // playbackPage = replaceBootstrap(playbackPage);
        // playbackPage = replaceMD5(playbackPage);
        // playbackPage = replaceJSZip(playbackPage);

        res.send(playbackPage);
    }

    /*
     * Takes the latest playback data and converts it into a form that can be 
     * used with the old playback.html file. 
     * TODO get rid of this when there is a new playback.html
     */
    convertToOldDataFormat(newPlaybackData) {
        //create a new object and convert a few of the properties along the way
        const oldPlaybackData = {
            codeEvents: this.convertEvents(newPlaybackData.codeEvents),
            allFiles: this.convertFiles(newPlaybackData.allFiles), //TODO strip the text events from the files
            allDirs: this.convertDirs(newPlaybackData.allDirs),
            allDevelopers: this.convertDevelopers(newPlaybackData.allDevelopers),
            allDeveloperGroups: newPlaybackData.allDeveloperGroups,
            currentDevGroupId: newPlaybackData.currentDeveloperGroupId,
            comments: newPlaybackData.comments,
            playbackDescription: {title: newPlaybackData.title, description: newPlaybackData.description},
            branchId: newPlaybackData.branchId
        };

        return oldPlaybackData;
    }

    /*
     * Converts new events into old ones.
     * TODO get rid of this when there is a new playback.html
     */
    convertEvents(codeEvents) {
        //go through all of the new events
        return codeEvents.map(newEvent => {
            //create an old event for each new one
            const oldEvent = {
                //same: id, timestamp , createdByDevGroupId 
                id: newEvent.id,
                timestamp: newEvent.timestamp,
                createdByDevGroupId: newEvent.createdByDevGroupId,
            };

            //if the event is not relevant to playback, mark the old one as such
            if(newEvent.permanentRelevance === 'never relevant') {
                oldEvent['permanentRelevance'] = 'never relevant';
            }

            //handle event types
            if(newEvent.type === 'CREATE DIRECTORY') {
                //change the event type
                oldEvent['type'] = 'Create Directory';
                //same
                oldEvent['directoryId'] = newEvent.directoryId;
                oldEvent['parentDirectoryId'] = newEvent.parentDirectoryId;
                //map properties from new to old
                oldEvent['initialName'] = utilities.normalizeSeparators(utilities.addEndingPathSeparator(path.parse(newEvent.directoryPath).base));
            } else if(newEvent.type === 'DELETE DIRECTORY') {
                //change the event type
                oldEvent['type'] = 'Delete Directory';
                //same
                oldEvent['directoryId'] = newEvent.directoryId;
                oldEvent['parentDirectoryId'] = newEvent.parentDirectoryId;
                //map properties from new to old
                oldEvent['directoryName'] = utilities.normalizeSeparators(utilities.addEndingPathSeparator(path.parse(newEvent.directoryPath).base));
            } else if(newEvent.type === 'RENAME DIRECTORY') {
                //change the event type
                oldEvent['type'] = 'Rename Directory';
                //same
                oldEvent['directoryId'] = newEvent.directoryId;
                //map properties from new to old
                oldEvent['newDirectoryName'] = utilities.normalizeSeparators(utilities.addEndingPathSeparator(path.parse(newEvent.newDirectoryPath).base));
                oldEvent['oldDirectoryName'] = utilities.normalizeSeparators(utilities.addEndingPathSeparator(path.parse(newEvent.oldDirectoryPath).base));
            } else if(newEvent.type === 'MOVE DIRECTORY') {
                //change the event type
                oldEvent['type'] = 'Move Directory';
                //same
                oldEvent['directoryId'] = newEvent.directoryId;
                oldEvent['newParentDirectoryId'] = newEvent.newParentDirectoryId;
                oldEvent['oldParentDirectoryId'] = newEvent.oldParentDirectoryId;
                //map properties from new to old
                oldEvent['directoryName'] = utilities.normalizeSeparators(utilities.addEndingPathSeparator(path.parse(newEvent.newDirectoryPath).base));
                oldEvent['newParentDirectoryName'] = utilities.normalizeSeparators(utilities.addEndingPathSeparator(path.parse(newEvent.newDirectoryPath).base));
                oldEvent['oldParentDirectoryName'] = utilities.normalizeSeparators(utilities.addEndingPathSeparator(path.parse(newEvent.oldDirectoryPath).base));
            } else if(newEvent.type === 'CREATE FILE') {
                //change the event type
                oldEvent['type'] = 'Create File';
                //same
                oldEvent['fileId'] = newEvent.fileId;
                oldEvent['parentDirectoryId'] = newEvent.parentDirectoryId;
                //map properties from new to old
                oldEvent['initialName'] = utilities.normalizeSeparators(path.parse(newEvent.filePath).base);
            } else if(newEvent.type === 'DELETE FILE') {
                //change the event type
                oldEvent['type'] = 'Delete File';
                //same
                oldEvent['fileId'] = newEvent.fileId;
                oldEvent['parentDirectoryId'] = newEvent.parentDirectoryId;
                //map properties from new to old
                oldEvent['fileName'] = utilities.normalizeSeparators(path.parse(newEvent.filePath).base);
            } else if(newEvent.type === 'RENAME FILE') {
                //change the event type
                oldEvent['type'] = 'Rename File';
                //same
                oldEvent['fileId'] = newEvent.fileId;
                //map properties from new to old
                oldEvent['newFileName'] = utilities.normalizeSeparators(path.parse(newEvent.newFilePath).base);
                oldEvent['oldFileName'] = utilities.normalizeSeparators(path.parse(newEvent.oldFilePath).base);
            } else if(newEvent.type === 'MOVE FILE') {
                //change the event type
                oldEvent['type'] = 'Move File';
                //same
                oldEvent['fileId'] = newEvent.fileId;
                oldEvent['newParentDirectoryId'] = newEvent.newParentDirectoryId;
                oldEvent['oldParentDirectoryId'] = newEvent.oldParentDirectoryId;
                //map properties from new to old
                oldEvent['fileName'] = utilities.normalizeSeparators(path.parse(newEvent.newFilePath).base);
                oldEvent['newParentDirectoryName'] = utilities.normalizeSeparators(utilities.addEndingPathSeparator(path.parse(newEvent.newFilePath).dir));
                oldEvent['oldParentDirectoryName'] = utilities.normalizeSeparators(utilities.addEndingPathSeparator(path.parse(newEvent.oldFilePath).dir));
            } else if(newEvent.type === 'INSERT') {
                //change the event type
                oldEvent['type'] = 'Insert';
                //same
                oldEvent['character'] = utilities.unescapeSpecialCharacter(newEvent.character);
                if(newEvent.previousNeighborId) {
                    oldEvent['previousNeighborId'] = newEvent.previousNeighborId;
                } else {
                    oldEvent['previousNeighborId'] = 'none';
                }
                oldEvent['lineNumber'] = newEvent.lineNumber;
                oldEvent['column'] = newEvent.column;
                oldEvent['fileId'] = newEvent.fileId;
                oldEvent['pastedEventId'] = newEvent.pastedEventId;
            } else if(newEvent.type === 'DELETE') {
                //change the event type
                oldEvent['type'] = 'Delete';
                //same
                oldEvent['fileId'] = newEvent.fileId;
                oldEvent['character'] = utilities.unescapeSpecialCharacter(newEvent.character);
                oldEvent['previousNeighborId'] = newEvent.previousNeighborId;
                oldEvent['lineNumber'] = newEvent.lineNumber;
                oldEvent['column'] = newEvent.column;
                oldEvent['fileId'] = newEvent.fileId;
            } 
            return oldEvent;
        });
    }
    /*
     * Converts new files into old ones.
     * TODO get rid of this when there is a new playback.html
     */
    convertFiles(newAllFiles) {
        const oldAllFiles = {};
        for(const fileId in newAllFiles) {
            oldAllFiles[fileId] = {
                id: newAllFiles[fileId].id,
                parentId: newAllFiles[fileId].parentDirectoryId,
                currentName: newAllFiles[fileId].currentPath,
                isDeleted: newAllFiles[fileId].isDeleted
            }
        }
        return oldAllFiles;
    }
    /*
     * Converts new dirs into old ones.
     * TODO get rid of this when there is a new playback.html
     */
    convertDirs(newAllDirs) {
        const oldAllFiles = {};
        for(const dirId in newAllDirs) {
            oldAllFiles[dirId] = {
                id: newAllDirs[dirId].id,
                parentId: newAllDirs[dirId].parentDirectoryId,
                currentName: newAllDirs[dirId].currentPath,
                isDeleted: newAllDirs[dirId].isDeleted
            }
        }
        return oldAllFiles;
    }
    /*
     * Converts new devs into old ones.
     * TODO get rid of this when there is a new playback.html
     */
    convertDevelopers(newAllDevelopers) {
        const oldAllDevelopers = {};
        for(const devId in newAllDevelopers) {
            oldAllDevelopers[devId] = {
                id: newAllDevelopers[devId].id,
                firstName: newAllDevelopers[devId].userName,
                lastName: '',
                email: newAllDevelopers[devId].email
            };
        }
        return oldAllDevelopers;
    }

    /*
     * Replaces a function in the static playback.html file with one that loads
     * the data for the playback.
     */
    replaceLoadPlaybackDataFunction(playbackPage, isComment, playbackData) {
        //function to load all of the playback data to the html file. This will be added to the html in playbackPage
        let loadPlaybackDataFunction = `function loadPlaybackData() {
                //collect the playback data from the editor- events and developer info
                playbackData.codeEvents = ${JSON.stringify(playbackData.codeEvents)};
                playbackData.allDevelopers = ${JSON.stringify(playbackData.allDevelopers)}; 
                playbackData.allDeveloperGroups = ${JSON.stringify(playbackData.allDeveloperGroups)};
                playbackData.allFiles = ${JSON.stringify(playbackData.allFiles)};
                playbackData.allDirs = ${JSON.stringify(playbackData.allDirs)};
                playbackData.currentDevGroupId = ${JSON.stringify(playbackData.currentDevGroupId)};
                playbackData.comments = ${JSON.stringify(playbackData.comments)};
                playbackData.playbackDescription = ${JSON.stringify(playbackData.playbackDescription)};
                playbackData.branchId = ${JSON.stringify(playbackData.branchId)};
                
                //setup a new playback with the current data
                getPlaybackWindowsReadyForAnimation(true);
            
                //if this is a playback for a comment
                if(${isComment}) {
                
                    //step forward as far as possible
                    step("forward", Number.MAX_SAFE_INTEGER);
                }
            }`;

        //the text in the file to replace
        const templateText = "function loadPlaybackData() {} //!!! string replacement of function here !!!";
        
        //replace the dummy text with the new function
        //javascript's replace() function will replace some special characters, 
        //'$&' for example, in the simplest case with some text. Since many js 
        //libraries include '$' we will use another version of replace that 
        //doesn't (see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace 
        //for more info).   
        return playbackPage.replace(templateText, function() {return loadPlaybackDataFunction;});
    }
}

module.exports = HttpServer;