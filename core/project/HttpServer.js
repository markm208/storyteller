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

        //get the path to the public dir inside this repo /core
        const pathToPublicDirInThisProject = path.join(__dirname, '..', 'public');

        //create the express server
        const app = express();

        //for file uploads- 100Mb limit using a temp dir instead of memory
        app.use(fileUpload({
            limits: { fileSize: 100 * 1024 * 1024 },
            useTempFiles : true,
            tempFileDir : this.projectManager.commentManager.pathToTempDir
        }));

        //serve js and css from the core/public/ directory
        app.use(express.static(pathToPublicDirInThisProject));
        
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
     * Creates the routes that this server responds to
     */
    createRoutes(app) {
        //routes        
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

        app.get('/playbackEditable', (req, res) => {
            res.json({editable: true});
        });

        app.post('/comment', (req, res) => {
            //add a comment            
            const comment = req.body;            
            comment['developerGroupId'] = this.projectManager.developerManager.currentDeveloperGroupId;
            const newComment = this.projectManager.commentManager.addComment(comment);
            res.json(newComment);
        });

        app.put('/comment', (req, res) => {
            //update a comment
            const comment = req.body;
            const newComment = this.projectManager.commentManager.updateComment(comment);
            res.json(newComment);
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

        //for serving images
        app.get('/media/images/:filePath', (req, res) => {
            //create a path to the image and send it back to the client
            const filePath = path.join(this.projectManager.commentManager.pathToImagesDir, req.params.filePath);
            res.sendFile(filePath);
        });
        //for serving videos
        app.get('/media/videos/:filePath', (req, res) => {
            //create a path to the video and send it back to the client
            const filePath = path.join(this.projectManager.commentManager.pathToVideosDir, req.params.filePath);
            res.sendFile(filePath);
        });
        //for serving audios
        app.get('/media/audios/:filePath', (req, res) => {
            //create a path to the audio and send it back to the client
            const filePath = path.join(this.projectManager.commentManager.pathToAudiosDir, req.params.filePath);
            res.sendFile(filePath);
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
                //all images uploaded together will get the same timestamp
                const timestamp = new Date().getTime();
                
                //create a promise for all files
                const addedPaths = await Promise.all(newFiles.map(newFile => {
                    //create a new file path that includes a timestamp (to show files in order of upload)
                    const newFileInfo = path.parse(newFile.name);
                    const newFileName = `${timestamp}-${newFileInfo.base}`; 
                    
                    //system dependent full path to where the file will be stored
                    //like C:/users/mark/documents/project1/.storyteller/comments/media/images/123-pic.png
                    const pathToNewFile = path.join(this.projectManager.commentManager.pathToImagesDir, newFileName);
                    
                    //move the file into the directory (using express-fileupload to move the file)
                    newFile.mv(pathToNewFile);

                    //relative web path from the public directory
                    //like /media/images/123-pic.png
                    return path.posix.join(this.projectManager.commentManager.webPathToImagesDir, newFileName);
                }));

                //return the web paths of the files
                res.json({filePaths: addedPaths});
            } else { //at least one invalid mimetype
                res.status(415).json({error: `One or more file types not supported`});
            }
        });

        //for getting the web urls of the existing media items
        app.get('/newMedia/image', async (req, res) => {
            //get the contents of the images dir
            const dirContents = fs.readdirSync(this.projectManager.commentManager.pathToImagesDir);
            //holds the web paths of the images
            const filePaths = dirContents.map(fileName => path.posix.join(this.projectManager.commentManager.webPathToImagesDir, fileName));
            //return all of the web paths to the images
            res.json({filePaths: filePaths});
        });

        //for deleting existing media items
        app.delete('/newMedia/image', async (req, res) => {
            //get the file paths to delete
            const filePaths = req.body;

            //go through the paths
            for(let i = 0;i < filePaths.length;i++) {
                //change the relative web path to a full path and delete it 
                const parts = filePaths[i].split(path.posix.sep);
                const fileName = path.join(parts[parts.length - 1]);
                const fullFilePath = path.join(this.projectManager.commentManager.pathToImagesDir, fileName);
                fs.unlinkSync(fullFilePath);
            }

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
                //all videos uploaded together will get the same timestamp
                const timestamp = new Date().getTime();
                
                //save the files in the comment's media directory
                const addedPaths = await Promise.all(newFiles.map(newFile => {
                    //create a new file path that includes a timestamp (to show files in order of upload)
                    const newFileInfo = path.parse(newFile.name);
                    const newFileName = `${timestamp}-${newFileInfo.base}`; 
                    
                    //system dependent full path to where the file will be stored
                    //like C:/users/mark/documents/project1/.storyteller/comments/media/videos/123-mov.mp4
                    const pathToNewFile = path.join(this.projectManager.commentManager.pathToVideosDir, newFileName);
                    
                    //move the file into the directory (using express-fileupload to move the file)
                    newFile.mv(pathToNewFile);
        
                    //relative web path from the public directory
                    //like /media/videos/123-mov.mp4
                    return path.posix.join(this.projectManager.commentManager.webPathToVideosDir, newFileName);
                }));

                //return the web paths of the files
                res.json({filePaths: addedPaths});
            } else { //at least one invalid mimetype
                res.status(415).json({error: `One or more file types not supported`});
            }
        });

        //for getting the web urls of the existing media items
        app.get('/newMedia/video', async (req, res) => {
            //get the contents of the videos dir
            const dirContents = fs.readdirSync(this.projectManager.commentManager.pathToVideosDir);
            //holds the web paths of the videos
            const filePaths = dirContents.map(fileName => path.posix.join(this.projectManager.commentManager.webPathToVideosDir, fileName));
            //return all of the web paths to the videos
            res.json({filePaths: filePaths});
        });

        //for deleting existing media items
        app.delete('/newMedia/video', async (req, res) => {
            //get the file paths to delete
            const filePaths = req.body;
                        
            //go through the paths
            for(let i = 0;i < filePaths.length;i++) {
                //change the relative web path to a full path and delete it 
                const parts = filePaths[i].split(path.posix.sep);
                const fileName = path.join(parts[parts.length - 1]);
                const fullFilePath = path.join(this.projectManager.commentManager.pathToVideosDir, fileName);
                fs.unlinkSync(fullFilePath);
            }

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
                //all audios uploaded together will get the same timestamp
                const timestamp = new Date().getTime();

                //save the files in the comment's media directory
                const addedPaths = await Promise.all(newFiles.map(newFile => {
                    //create a new file path that includes a timestamp (to show files in order of upload)
                    const newFileInfo = path.parse(newFile.name);
                    const newFileName = `${timestamp}-${newFileInfo.base}`; 
                    
                    //system dependent full path to where the file will be stored
                    //like C:/users/mark/documents/project1/.storyteller/comments/media/audios/123-audio.mp3
                    const pathToNewFile = path.join(this.projectManager.commentManager.pathToAudiosDir, newFileName);
                    
                    //move the file into the directory (using express-fileupload to move the file)
                    newFile.mv(pathToNewFile);

                    //relative web path from the public directory
                    //like /media/audios/123-audio.mp3
                    return path.posix.join(this.projectManager.commentManager.webPathToAudiosDir, newFileName);
                }));
                //return the web paths of the files
                res.json({filePaths: addedPaths});

            } else { //at least one invalid mimetype
                res.status(415).json({error: `One or more file types not supported`});
            }
        });

        //for getting the web urls of the existing media items
        app.get('/newMedia/audio', async (req, res) => {
            //get the contents of the audios dir
            const dirContents = fs.readdirSync(this.projectManager.commentManager.pathToAudiosDir);
            //holds the web paths of the audios
            const filePaths = dirContents.map(fileName => path.posix.join(this.projectManager.commentManager.webPathToAudiosDir, fileName));
            //return all of the web paths to the audios
            res.json({filePaths: filePaths});
        });

        //for deleting existing media items
        app.delete('/newMedia/audio', async (req, res) => {
            //get the file paths to delete
            const filePaths = req.body;

            //go through the paths
            for(let i = 0;i < filePaths.length;i++) {
                //change the relative web path to a full path and delete it 
                const parts = filePaths[i].split(path.posix.sep);
                const fileName = path.join(parts[parts.length - 1]);
                const fullFilePath = path.join(this.projectManager.commentManager.pathToAudiosDir, fileName);
                fs.unlinkSync(fullFilePath);
            }

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
}

module.exports = HttpServer;