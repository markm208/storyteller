'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const FileSystemManager = require('../../core/filesAndDirs/FileSystemManager.js');
const EventManager = require('../../core/events/EventManager.js');

suite('Events Tests', function () {
    //function to delete the contents of a dir and then the dir itself
    function deleteAllHelper(pathToTestDir) {
        const dirContents = fs.readdirSync(pathToTestDir);
        for(let i = 0;i < dirContents.length;i++) {
            const aPath = path.join(pathToTestDir, dirContents[i]);
            const fileDirInfo = fs.statSync(aPath);

            if(fileDirInfo.isFile()) {
                fs.unlinkSync(aPath);
            } else if(fileDirInfo.isDirectory()) {
                deleteAllHelper(aPath);
            }
        }
        fs.rmdirSync(pathToTestDir, {recursive: true});
    }

    //path to a test dir
    const pathToTestDir = path.join(__dirname, 'data', 'eventData');
    
    setup(function() {
        //make a directory to hold the test data that is generated
        fs.mkdirSync(pathToTestDir, {recursive: true});
    });

    teardown(function() {
        //remove any previous data
        deleteAllHelper(pathToTestDir);
    });

    test('Create events, force write to intermediate file', function() {
        //create a file system manager
        const fileSystemManager = new FileSystemManager(pathToTestDir);
        //create an event manager
        const eventManager = new EventManager(pathToTestDir);
        
        //create a directory
        const dirObj = fileSystemManager.addDirectory('/');
        
        //create a timestamp for the events
        const timestamp = new Date().getTime();

        //add the create directory event
        eventManager.insertCreateDirectoryEvent(dirObj, timestamp, 'devGroupId-0', 'branchId-0', 'false');
        
        //create the file
        fs.writeFileSync(path.join(pathToTestDir, '/test.txt'), 'inserted text\r\n');
        
        //next create a file
        const fileObj = fileSystemManager.addFile('/test.txt');
        
        //create an event for the new file
        eventManager.insertCreateFileEvent(fileObj, timestamp, 'devGroupId-0', 'branchId-0');

        //add a group of 14 insert events (newlines count as one)
        eventManager.insertTextEvents(fileObj, timestamp, 'devGroupId-0', 'branchId-0', 'inserted text\r\n', 0, 0, [], 'false');
        
        //force the events in memory to go to the intermediate file
        eventManager.writeEventsBufferToFileSystem(true);

        //write from the intermediate file to the json file
        eventManager.write();

        //read the data from the json file
        const allEvents = eventManager.read();

        //there should be 16 events read from the file
        assert.equal(allEvents.length, 16);
    });

    test('Create enough events to write to intermediate file', function() {
        //create a file system manager
        const fileSystemManager = new FileSystemManager(pathToTestDir);
        //create an event manager
        const eventManager = new EventManager(pathToTestDir);
        
        //create a directory
        const dirObj = fileSystemManager.addDirectory('/');
        
        //create a timestamp for the events
        const timestamp = new Date().getTime();

        //add the create directory event
        eventManager.insertCreateDirectoryEvent(dirObj, timestamp, 'devGroupId-0', 'branchId-0', 'false');
        
        //create the file
        fs.writeFileSync(path.join(pathToTestDir, '/test.txt'), 'inserted text\r\ninserted text\r\ninserted text\r\ninserted text\r\ninserted text\r\ninserted text\r\ninserted text\r\n');

        //next create a file
        const fileObj = fileSystemManager.addFile('/test.txt');
        
        //add 7 groups of 14 insert events (newlines count as one) should cause an automatic push of events into the intermediate file
        eventManager.insertTextEvents(fileObj, timestamp, 'devGroupId-0', 'branchId-0', 'inserted text\r\n', 0, 0, [], 'false');
        eventManager.insertTextEvents(fileObj, timestamp, 'devGroupId-0', 'branchId-0', 'inserted text\r\n', 0, 0, [], 'false');
        eventManager.insertTextEvents(fileObj, timestamp, 'devGroupId-0', 'branchId-0', 'inserted text\r\n', 0, 0, [], 'false');
        eventManager.insertTextEvents(fileObj, timestamp, 'devGroupId-0', 'branchId-0', 'inserted text\r\n', 0, 0, [], 'false');
        eventManager.insertTextEvents(fileObj, timestamp, 'devGroupId-0', 'branchId-0', 'inserted text\r\n', 0, 0, [], 'false');
        eventManager.insertTextEvents(fileObj, timestamp, 'devGroupId-0', 'branchId-0', 'inserted text\r\n', 0, 0, [], 'false');
        eventManager.insertTextEvents(fileObj, timestamp, 'devGroupId-0', 'branchId-0', 'inserted text\r\n', 0, 0, [], 'false');
        
        //the latest events should be empty and the intermediate file should exist
        assert.equal(eventManager.latestEvents.length, 0);
        assert(fs.existsSync(eventManager.fullPathToIntermediateEventsFile));

        //write from the intermediate file to the json file
        eventManager.write();

        //read the data from the json file
        const allEvents = eventManager.read();

        //there should be 99 events read from the file
        assert.equal(allEvents.length, 99);
    });

    test('Create events to write twice', function() {
        //create a file system manager
        const fileSystemManager = new FileSystemManager(pathToTestDir);
        //create an event manager
        const eventManager = new EventManager(pathToTestDir);
        
        //create a directory
        const dirObj = fileSystemManager.addDirectory('/');
        
        //create a timestamp for the events
        const timestamp = new Date().getTime();

        //add the create directory event
        eventManager.insertCreateDirectoryEvent(dirObj, timestamp, 'devGroupId-0', 'branchId-0', 'false');
        
        //create the file
        fs.writeFileSync(path.join(pathToTestDir, '/test.txt'), 'inserted text\r\ninserted text\r\n');

        //next create a file
        const fileObj = fileSystemManager.addFile('/test.txt');
        
        //add a group of 14 insert events (newlines count as one)
        eventManager.insertTextEvents(fileObj, timestamp, 'devGroupId-0', 'branchId-0', 'inserted text\r\n', 0, 0, [], 'false');

        //force the events in memory to go to the intermediate file
        eventManager.writeEventsBufferToFileSystem(true);

        //add a group of 14 insert events (newlines count as one)
        eventManager.insertTextEvents(fileObj, timestamp, 'devGroupId-0', 'branchId-0', 'inserted text\r\n', 0, 0, [], 'false');

        //force the events in memory to go to the intermediate file
        eventManager.writeEventsBufferToFileSystem(true);

        //read the intermediate file contents and turn them into events
        const fileContents = fs.readFileSync(eventManager.fullPathToIntermediateEventsFile, 'utf8');
        const allEventsInIntermediateFile = fileContents.split('\n').map(eventLine => JSON.parse(eventLine));
        //make sure there are 29 events in the file
        assert.equal(allEventsInIntermediateFile.length, 29);
        
        //write from the intermediate file to the json file
        eventManager.write();

        //read the data from the json file
        const allEvents = eventManager.read();

        //there should be 29 events read from the file
        assert.equal(allEvents.length, 29);
    });

    test('Simulate crash of system without proper writing of intermediate file', function() {
        //create a file system manager
        const fileSystemManager = new FileSystemManager(pathToTestDir);
        //create an event manager (this will be removed)
        let eventManager = new EventManager(pathToTestDir);
        
        //create a directory
        const dirObj = fileSystemManager.addDirectory('/');
        
        //create a timestamp for the events
        const timestamp = new Date().getTime();

        //add the create directory event
        eventManager.insertCreateDirectoryEvent(dirObj, timestamp, 'devGroupId-0', 'branchId-0', 'false');
        
        //create the file
        fs.writeFileSync(path.join(pathToTestDir, '/test.txt'), 'inserted text\r\ninserted text\r\n');
        
        //next create a file
        const fileObj = fileSystemManager.addFile('/test.txt');
        
        //add a group of 14 insert events (newlines count as one)
        eventManager.insertTextEvents(fileObj, timestamp, 'devGroupId-0', 'branchId-0', 'inserted text\r\n', 0, 0, [], 'false');

        //force the events in memory to go to the intermediate file
        eventManager.writeEventsBufferToFileSystem(true);

        //simulate a crash where the open event manager disappears 
        eventManager = null;
        EventManager.nextId = 0;
        
        //create a new event manager (represents a restart)
        const eventManager2 = new EventManager(pathToTestDir, 'events', 'events.json');
        
        //add a group of 14 insert events (newlines count as one)
        eventManager2.insertTextEvents(fileObj, timestamp, 'devGroupId-0', 'branchId-0', 'inserted text\r\n', 0, 0, [], 'false');

        //force the events in memory to go to the intermediate file
        eventManager2.writeEventsBufferToFileSystem(true);
        
        //write to the file
        eventManager2.write();

        //read the data from the json file
        const allEvents = eventManager2.read();

        //there should be 29 events read from the file
        assert.equal(allEvents.length, 29);
    });

    // test('', function() {
    // });

});
