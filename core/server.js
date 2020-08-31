'use strict'

const express = require('express');
const morgan = require('morgan');
const bodyParser = require("body-parser");

const stProject = require('./project.js');
const devAndDevGroups = require('./developersAndGroups.js');

const app = express();

app.use(morgan('dev'));

app.use(express.static('public'));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//request a playback page
app.get('/playback', (req, res) => {
    res.send('~~Storyteller Playback~~');
});

//project related
app.post('/open-project', (req, res) => {
    //get the project directory 
    const projectDir = req.body.projectDir; 

    //create the project
    const retVal = stProject.startStoryteller(projectDir);
    
    //res.status(200).end();
    res.json(retVal);
    //res.json({success: 'success'});
});

app.get('/close-project', (req, res) => {
    //stop storyteller
    stProject.stopStoryteller();

    res.status(200).end();
    //res.json({success: 'success'});
});

app.get('/active-devs', (req, res) => {
    //get all the active devs
    res.json({allActiveDevs: devAndDevGroups.getAllDevsInActiveDevGroup()});
});

app.get('/inactive-devs', (req, res) => {
    //get all the inactive devs
    res.json({allInactiveDevs: devAndDevGroups.getAllDevsExceptThoseInActiveDevGroup()});
});

//developer related /dev
app.post('/update-first-developer', (req, res) => {
    //get the project directory 
    const dev = req.body.devInfo; 

    //update the developer in the current dev group
    devAndDevGroups.updateAnonymousDeveloper(dev.userName, dev.email);

    res.status(200).end();
});

app.post('/add-new-developer', (req, res) => {
    const devInfo = req.body.devInfo;
    devAndDevGroups.createDeveloper(devInfo.userName, devInfo.email);
    devAndDevGroups.addDeveloperToActiveDeveloperGroup([devInfo.email]);
    //get all the active devs
    res.json({allActiveDevs: devAndDevGroups.getAllDevsInActiveDevGroup()});
});

app.post('/add-dev-to-active-dev-group', (req, res) => {
    const devEmails = req.body.devEmails;
    devAndDevGroups.addDeveloperToActiveDeveloperGroup(devEmails);
    //get all the active devs
    res.json({allActiveDevs: devAndDevGroups.getAllDevsInActiveDevGroup()});
});

app.post('/remove-dev-from-active-dev-group', (req, res) => {
    const devEmails = req.body.devEmails;
    devAndDevGroups.removeDeveloperFromActiveDeveloperGroup(devEmails);
    //get all the active devs
    res.json({allActiveDevs: devAndDevGroups.getAllDevsInActiveDevGroup()});
});

//file system /fs
app.get('/save-all', (req, res) => {
    //save the test file state
    stProject.saveTextFileState();

    res.status(200).end();
});

app.post('/create-file', (req, res) => {
    //get the file path 
    const filePath = req.body.filePath;
    
    stProject.createFile(filePath);
    
    res.status(200).end();
});
app.post('/delete-file', (req, res) => {
    //get the file path 
    const filePath = req.body.filePath;
    
    stProject.deleteFile(filePath);

    res.status(200).end();
});
app.post('/rename-file', (req, res) => {
    //get the file paths 
    const oldFilePath = req.body.oldFilePath;
    const newFilePath = req.body.newFilePath;
    
    stProject.renameFile(oldFilePath, newFilePath);

    res.status(200).end();
});
app.post('/move-file', (req, res) => {
    //get the file path 
    const oldFilePath = req.body.oldFilePath;
    const newFilePath = req.body.newFilePath;
    
    stProject.moveFile(oldFilePath, newFilePath);

    res.status(200).end();
});
app.post('/create-directory', (req, res) => {
    //get the dir path 
    const dirPath = req.body.dirPath;

    stProject.createDirectory(dirPath);

    res.status(200).end();
});
app.post('/delete-directory', (req, res) => {
    //get the dir path 
    const dirPath = req.body.dirPath;
    
    stProject.deleteDirectory(dirPath);

    res.status(200).end();
});
app.post('/rename-directory', (req, res) => {
    //get the dir path 
    const oldDirPath = req.body.oldDirPath;
    const newDirPath = req.body.newDirPath;
    
    stProject.renameDirectory(oldDirPath, newDirPath);

    res.status(200).end();
});
app.post('/move-directory', (req, res) => {
    //get the dir path 
    const oldDirPath = req.body.oldDirPath;
    const newDirPath = req.body.newDirPath;
    
    stProject.moveDirectory(oldDirPath, newDirPath);

    res.status(200).end();
});
app.post('/delete-file-or-directory', (req, res) => {
    //get the path 
    const aPath = req.body.aPath;
    
    stProject.deleteFileOrDirectory(aPath);

    res.status(200).end();
});


//text related /text
app.post('/insert-text', (req, res) => {
    const filePath = req.body.filePath;
    const insertedText = req.body.insertedText;
    const startRow = req.body.startRow;
    const startCol = req.body.startCol;
    const pastedInsertEventIds = req.body.pastedInsertEventIds;

    stProject.handleInsertedText(filePath, insertedText, startRow, startCol, pastedInsertEventIds);

    res.status(200).end();
});

app.post('/delete-text', (req, res) => {
    const filePath = req.body.filePath;
    const startRow = req.body.startRow;
    const startCol = req.body.startCol;
    const numElementsToDelete = req.body.numElementsToDelete;

    stProject.handleDeletedText(filePath, startRow, startCol, numElementsToDelete);

    res.status(200).end();
});

//title and description related /title

//comment related /comment
//-- new comment
//-- update comment
//-- -- text, highlighting, image, video
//-- -- order within group
//-- delete comment


app.use((req, res) => {
    res.status(404).send(`<h2>Uh Oh!</h2><p>Sorry ${req.url} cannot be found here</p>`);
});

app.listen(53140, () => console.log('The server is up and running...'));
