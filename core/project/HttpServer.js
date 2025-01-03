const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const https = require('https');

const utilities = require('../utilities.js');

//port number to listen for http requests
const HTTP_SERVER_PORT = 53140;

//initial list of acceptable media files (copied into VerticalMediaContainer.js)
const acceptableImageMimeTypes = ['image/apng', 'image/bmp', 'image/gif', 'image/ico', 'image/jpeg', 'image/png', 'image/svg+xml'];
const acceptableAudioMimeTypes = ['audio/aac', 'audio/mpeg', 'audio/wav', 'audio/webm'];
const acceptableVideoMimeTypes = ['video/mpeg', 'video/mp4', 'video/webm'];
/*
 * Creates an http server to accept requests from the playback page and
 * can be used with editors too.
 */
class HttpServer {
    constructor (projectManager, openaiApiKey) {
        //store a reference to the project manager
        this.projectManager = projectManager;
        this.openaiApiKey = openaiApiKey;

        //get the path to the public dir inside this repo /core
        const pathToPublicDirInThisProject = path.join(__dirname, '..', 'public');

        //create the express server
        const app = express();

        //for file uploads
        app.use(fileUpload());

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
        //builds a js file that loads the data for playback
        app.get('/js/loadPlayback.js', (req, res) => {
            //get the text for a function that loads the playback data
            const playbackData = this.projectManager.getPlaybackData(true);

            //send the function back to the browser
            res.type('application/javascript');
            res.status(200).send(`${playbackData}`);
        });

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
                this.projectManager.updateProjectTitleDescription(titleDescription.title.trim(), titleDescription.description ? titleDescription.description : '');
                
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
            const allEvents = this.projectManager.getAllEvents();
            res.json(allEvents);
        });

        app.get('/event/numberOfEvents', (req, res) => {
            //return the number of events
            const allEvents = this.projectManager.getAllEvents();
            res.json({numberOfEvents: allEvents.length});
        });

        app.get('/event/start/:start', (req, res) => {
            //return all the events starting from a requested index
            const start = Number(req.params.start);
            const allEvents = this.projectManager.getAllEvents();
            res.json(allEvents.slice(start));
        });

        app.get('/event/start/:start/numEvents/:numEvents', (req, res) => {
            //return all the events starting from a requested index plus a 
            //requested number of events after that
            const start = Number(req.params.start);
            const numEvents = Number(req.params.numEvents);
            const allEvents = this.projectManager.getAllEvents();
            res.json(allEvents.slice(start, (start + numEvents)));
        });

        app.get('/event/start/:start/end/:end', (req, res) => {
            //return all the events starting from a requested index up to but
            //not including a requested end index
            const start = Number(req.params.start);
            const end = Number(req.params.end);
            const allEvents = this.projectManager.getAllEvents();
            res.json(allEvents.slice(start, end));
        });

        app.get('/event/upToFirstComment', (req, res) => {
            //return all the events from the beginning up to and including the 
            //first event that has a comment (can be used to move from comment 
            //to comment)
            const allEvents = this.projectManager.getAllEvents();
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
            const allEvents = this.projectManager.getAllEvents();
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

            //decode the urls
            const newImageURLs = [];
            for(const imageURL of comment.imageURLs) {
                newImageURLs.push(utilities.replaceSpacesWithDashes(imageURL));
            }
            comment.imageURLs = newImageURLs;

            const newVideoURLs = [];
            for(const videoURL of comment.videoURLs) {
                newVideoURLs.push(utilities.replaceSpacesWithDashes(videoURL));
            }
            comment.videoURLs = newVideoURLs;

            const newAudioURLs = [];
            for(const audioURL of comment.audioURLs) {
                newAudioURLs.push(utilities.replaceSpacesWithDashes(audioURL));
            }
            comment.audioURLs = newAudioURLs;

            const newComment = this.projectManager.addComment(comment);
            res.json(newComment);
        });

        app.put('/comment', (req, res) => {
            //update a comment
            const comment = req.body;

            //decode the urls
            const newImageURLs = [];
            for(const imageURL of comment.imageURLs) {
                newImageURLs.push(utilities.replaceSpacesWithDashes(imageURL));
            }
            comment.imageURLs = newImageURLs;

            const newVideoURLs = [];
            for(const videoURL of comment.videoURLs) {
                newVideoURLs.push(utilities.replaceSpacesWithDashes(videoURL));
            }
            comment.videoURLs = newVideoURLs;

            const newAudioURLs = [];
            for(const audioURL of comment.audioURLs) {
                newAudioURLs.push(utilities.replaceSpacesWithDashes(audioURL));
            }
            comment.audioURLs = newAudioURLs;
            
            const newComment = this.projectManager.updateComment(comment);
            res.json(newComment);
        });
        
        app.put('/commentPosition', (req, res) => {
            //update the position of a comment
            const commentPositionData = req.body;
            this.projectManager.updateCommentPosition(commentPositionData);
            res.sendStatus(200);
        });

        app.delete('/comment', (req, res) => {
            //delete a comment
            const comment = req.body;
            this.projectManager.deleteComment(comment);
            res.sendStatus(200);
        });

        //for serving images
        app.get('/media/images/:filePath', (req, res) => {
            const imageData = this.projectManager.getMediaFile(utilities.replaceSpacesWithDashes(req.path.substring(1)));
            if(imageData) {
                res.send(imageData);
            } else {
                res.status(404).send(`<h2>Uh Oh!</h2><p>Sorry ${req.url} cannot be found here</p>`);
            }
        });
        //for serving videos
        app.get('/media/videos/:filePath', (req, res) => {
            const videoData = this.projectManager.getMediaFile(utilities.replaceSpacesWithDashes(req.path.substring(1)));
            if(videoData) {
                res.send(videoData);
            } else {
                res.status(404).send(`<h2>Uh Oh!</h2><p>Sorry ${req.url} cannot be found here</p>`);
            }
        });
        //for serving audios
        app.get('/media/audios/:filePath', (req, res) => {
            const audioData = this.projectManager.getMediaFile(utilities.replaceSpacesWithDashes(req.path.substring(1)));
            if(audioData) {
                res.send(audioData);
            } else {
                res.status(404).send(`<h2>Uh Oh!</h2><p>Sorry ${req.url} cannot be found here</p>`);
            }
        });

        //for uploading image files
        app.post('/newMedia/image', (req, res) => {
            this.addMediaFiles(req, res, 'images', acceptableImageMimeTypes);
        });

        //for deleting existing image files
        app.delete('/newMedia/image', (req, res) => {
            this.deleteMediaFiles(req, res);
        });
        
        //for uploading video files
        app.post('/newMedia/video', (req, res) => {
            this.addMediaFiles(req, res, 'videos', acceptableVideoMimeTypes);
        });

        //for deleting existing video files
        app.delete('/newMedia/video', (req, res) => {
            this.deleteMediaFiles(req, res);
        });

        //for uploading audio files
        app.post('/newMedia/audio', (req, res) => {
            this.addMediaFiles(req, res, 'audios', acceptableAudioMimeTypes);
        });

        //for deleting existing audio files
        app.delete('/newMedia/audio', (req, res) => {
            this.deleteMediaFiles(req, res);
        });

        //for ai prompt
        app.post('/aiPrompt', async (req, res) => {
            //if the user has supplied a valid OpenAI API key
            if(this.openaiApiKey) {
                const promptObject = req.body;
                //console.log(`Server sends: ${JSON.stringify(promptObject.prompt)}`);
    
                const data = JSON.stringify({
                    messages: [{ role: "user", content: promptObject.prompt }],
                    model: "gpt-4o",
                });
                
                const options = {
                    hostname: 'api.openai.com',
                    port: 443,
                    path: '/v1/chat/completions',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.openaiApiKey}`,
                        'Content-Length': data.length
                    }
                };
                try {
                    const aiResponse = await new Promise((resolve, reject) => {
                        const req = https.request(options, res => {
                            let body = '';
                            res.on('data', chunk => body += chunk);
                            res.on('end', () => {
                                if (res.statusCode >= 200 && res.statusCode <= 299) {
                                    const jsonResponse = JSON.parse(body);
                                    if (jsonResponse.choices && jsonResponse.choices[0] && jsonResponse.choices[0].message) {
                                        resolve({ error: false, response: jsonResponse.choices[0].message.content });
                                    } else {
                                        reject("Unexpected API response: " + body);
                                    }
                                } else {
                                    reject(`HTTP request failed with status ${res.statusCode}: ${res.statusMessage}`);
                                }
                            });
                        });
                    
                        req.on('error', error => {
                            console.error(`Request error: ${error}`);
                            reject(error);
                        });
                        req.write(data);
                        req.end();
                    });

                    //console.log(`\n\n*****\nServer receives: ${aiResponse.response}`);

                    //return the response
                    res.json(aiResponse);
                } catch (error) {
                    res.status(500).json({ error: true, response: 'An error occurred while processing your request.' });
                }
            } else { //no OpenAI API key
                //give them an error message with instructions on how to fix it
                res.status(500).json({ error: true, response: "The OpenAI API key is missing. Please go to the extension's settings and enter a valid OpenAI API key and then restart VS Code." });
            }
        });

        app.post('/tts', async (req, res) => { //v2
            if (this.openaiApiKey) {
                const textObject = req.body;
        
                const data = JSON.stringify({
                    input: textObject.text,
                    voice: "echo",
                    model: "tts-1-hd",
                    speed: 1.2
                });
        
                const options = {
                    hostname: 'api.openai.com',
                    port: 443,
                    path: '/v1/audio/speech',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.openaiApiKey}`,
                        'Content-Length': data.length
                    }
                };
        
                try {
                    const ttsResponse = await new Promise((resolve, reject) => {
                        const req = https.request(options, res => {
                            let body = [];
                            res.on('data', chunk => body.push(chunk));
                            res.on('end', () => {
                                if (res.statusCode >= 200 && res.statusCode <= 299) {
                                    const audioBuffer = Buffer.concat(body);
                                    resolve(audioBuffer);
                                } else {
                                    reject(`HTTP request failed with status ${res.statusCode}: ${res.statusMessage}`);
                                }
                            });
                        });
        
                        req.on('error', error => {
                            console.error(`Request error: ${error}`);
                            reject(error);
                        });
                        req.write(data);
                        req.end();
                    });
        
                    res.set('Content-Type', 'audio/mpeg');
                    res.send(ttsResponse);
                } catch (error) {
                    res.status(500).json({ error: true, response: 'An error occurred while processing your request.' });
                }
            } else {
                res.status(500).json({ error: true, response: "The OpenAI API key is missing. Please go to the extension's settings and enter a valid OpenAI API key and then restart VS Code." });
            }
        });
        
        //for invalid routes
        app.use((req, res) => {
            res.status(404).send(`<h2>Uh Oh!</h2><p>Sorry ${req.url} cannot be found here</p>`);
        });
    }

    addMediaFiles(req, res, mediaString, acceptableMimeTypes) {
        //if there are no files, send a 400
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).send('No files were uploaded.');
        }

        //get the new files from the request
        let newFiles = [];
        //if there were more than one files uploaded then this will be an array
        //if there is no length then only one file is being passed in (see FormData in client)
        if(req.files.newFiles.length === undefined) {
            //store the one file in an array
            newFiles.push(req.files.newFiles);
        } else { //there are an array of files, store them all
            newFiles = req.files.newFiles;
        }

        //verify that every file has an acceptable mime type
        if(newFiles.every(newFile => acceptableMimeTypes.includes(newFile.mimetype))) {
            //all images uploaded together will get the same timestamp
            const timestamp = new Date().getTime();
            
            const addedPaths = [];
            //create a promise for all files
            for(const newFile of newFiles) {
                //create a new file path that includes a timestamp (to show files in order of upload)
                const newFileInfo = path.parse(newFile.name);
                const newFileName = `${timestamp}-${utilities.replaceSpacesWithDashes(newFileInfo.base)}`; 
                
                const pathToNewFile = utilities.normalizeSeparators(path.join('media', mediaString, newFileName));
                this.projectManager.addMediaFile(newFile.data, pathToNewFile);
                addedPaths.push(pathToNewFile);
            }
            //return the web paths of the files
            res.json({filePaths: addedPaths});
        } else { //at least one invalid mimetype
            res.status(415).json({error: `One or more file types not supported`});
        }
    }

    deleteMediaFiles(req, res) {
        //get the file paths to delete
        const filePaths = req.body;
        
        //go through the paths
        for(let i = 0;i < filePaths.length;i++) {
            this.projectManager.deleteMediaFile(utilities.replaceSpacesWithDashes(filePaths[i]));
        }

        //return success
        res.sendStatus(200);
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