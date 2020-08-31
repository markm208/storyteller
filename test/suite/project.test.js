'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const File = require('../../core/filesAndDirs/File.js');
const Directory = require('../../core/filesAndDirs/Directory.js');
const Developer = require('../../core/developers/Developer.js');
const DeveloperGroup = require('../../core/developers/DeveloperGroup.js');
const EventManager = require('../../core/events/EventManager.js');

const ProjectManager = require('../../core/project/ProjectManager.js');

suite('Project Tests', function () {
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
    const pathToTestDir = path.join(__dirname, 'data', 'fsData');
    
    setup(function() {
        //make a directory to hold the test data that is generated
        fs.mkdirSync(pathToTestDir, {recursive: true});

        Developer.nextId = 0;
        DeveloperGroup.nextId = 0;
        File.nextId = 0;
        Directory.nextId = 0;
        EventManager.next = 0;
    });

    teardown(function() {
        //remove any previous data
        deleteAllHelper(pathToTestDir);
    });

    test('Start New Project', function() {
        //path to a new test directory, use it to make a new test directory
        const createProjectTestPath = path.join(pathToTestDir, 'new-project-test');

        //create the project dir
        fs.mkdirSync(createProjectTestPath);

        //create a new project manager
        const projectManager = new ProjectManager(createProjectTestPath);

        //test the default title and description
        assert.equal(projectManager.project.title, 'Playback');
        assert.equal(projectManager.project.description, 'Playback Description');

        //change the title and description
        const title = 'Test Title';
        const description = 'Test description';
        projectManager.project.title = title;
        projectManager.project.description = description;

        //verify the title and description in-memory and from the db is correct
        assert.equal(projectManager.project.title, title);
        assert.equal(projectManager.project.description, description);

        //get the current dev group
        const currentDevGroup = projectManager.developerManager.getCurrentDeveloperGroup();
        //there is one dev in the current dev group
        assert.equal(currentDevGroup.id, 'devGroupId-1');
        assert.equal(currentDevGroup.memberIds.length, 1);
        assert.equal(currentDevGroup.memberIds[0], 'devId-1');
        
        //get the dev in the current dev group
        const currentDev = projectManager.developerManager.getDeveloperById(projectManager.developerManager.getCurrentDeveloperGroup().memberIds[0]);
        assert.equal(currentDev.userName, 'Anonymous Developer');
        assert.equal(currentDev.email, '');

        //get all of the events 
        let allEvents = projectManager.eventManager.read();
        
        //there should be one create dir event
        assert.equal(allEvents.length, 1);
        assert.equal(allEvents[0].type, 'CREATE DIRECTORY');

        //get all of the directory info
        let rootDir = projectManager.fileSystemManager.allDirs['dirId-0'];
        //there should be one unnamed dir
        assert.equal(rootDir.id, 'dirId-0');
        assert.equal(rootDir.parentDirectoryId, null);
        assert.equal(rootDir.currentPath, '/');
        assert.equal(rootDir.isDeleted, 'false');

        //create a subDir in the test dir on the file system
        const subDir1Path = path.join(createProjectTestPath, 'subDir1');
        fs.mkdirSync(subDir1Path);

        //record the creating of the new subDirectory
        projectManager.createDirectory(subDir1Path);
        
        //there should be two create dir events
        allEvents = projectManager.eventManager.read();
        assert.equal(allEvents.length, 2);
        assert.equal(allEvents[0].type, 'CREATE DIRECTORY');
        assert.equal(allEvents[1].type, 'CREATE DIRECTORY');

        //get the dir info from the db
        let subDir1 = projectManager.fileSystemManager.allDirs['dirId-1'];
        rootDir = projectManager.fileSystemManager.allDirs['dirId-0'];//verify the root dir and subDir1
        assert.equal(rootDir.id, 'dirId-0');
        assert.equal(rootDir.currentPath, '/');
        assert.equal(subDir1.id, 'dirId-1');
        assert.equal(subDir1.currentPath, '/subDir1/');

        //create a new file inside subDir1 on the file system
        const testFile1Path = path.join(subDir1Path, 'testFile1.txt');
        fs.writeFileSync(testFile1Path, '', 'utf8');
        //record the creation of the new file
        projectManager.createFile(testFile1Path);

        //there should be three events
        allEvents = projectManager.eventManager.read();
        assert.equal(allEvents.length, 3);
        assert.equal(allEvents[2].type, 'CREATE FILE');

        //get the file info from the db
        let testFile1 = projectManager.fileSystemManager.allFiles['fileId-0'];
        //verify the file name
        assert.equal(testFile1.id, 'fileId-0');
        assert.equal(testFile1.parentDirectoryId, subDir1.id);
        assert.equal(testFile1.currentPath, '/subDir1/testFile1.txt');
        assert.equal(testFile1.isDeleted, 'false');
        
        //close the project
        projectManager.stopStoryteller();
    });

    test('Open Existing Project', function() {
        //path to a new test directory, use it to make a new test directory
        const openProjectTestPath = path.join(pathToTestDir, 'open-project-test');

        //create the project dir
        fs.mkdirSync(openProjectTestPath);

        //create a new project manager
        let projectManager = new ProjectManager(openProjectTestPath);
                
        //create a subDir in the test dir on the file system
        const subDir1Path = path.join(openProjectTestPath, 'subDir1');
        fs.mkdirSync(subDir1Path);
        
        //record the creating of the new subDirectory
        projectManager.createDirectory(subDir1Path);
        
        //create a new file inside subDir1 on the file system
        const testFile1Path = path.join(subDir1Path, 'testFile1.txt');
        fs.writeFileSync(testFile1Path, '', 'utf8');
        //record the creation of the new file
        projectManager.createFile(testFile1Path);

        //stop storyteller
        projectManager.stopStoryteller();
        
        //restart the existing project
        projectManager = new ProjectManager(openProjectTestPath);
            
        //get all of the events from the database
        let allEvents = projectManager.eventManager.read();

        //there should be two create dir events and a create file event
        assert.equal(allEvents.length, 3);
        assert.equal(allEvents[0].type, 'CREATE DIRECTORY');
        assert.equal(allEvents[1].type, 'CREATE DIRECTORY');
        assert.equal(allEvents[2].type, 'CREATE FILE');

        //get the dir info from the db
        let subDir1 = projectManager.fileSystemManager.allDirs['dirId-1'];
        let rootDir = projectManager.fileSystemManager.allDirs['dirId-0'];
        
        //verify the root dir and subDir1
        assert.equal(rootDir.id, 'dirId-0');
        assert.equal(rootDir.currentPath, '/');
        assert.equal(subDir1.id, 'dirId-1');
        assert.equal(subDir1.currentPath, '/subDir1/');

        //get the file info from the db
        let testFile1 = projectManager.fileSystemManager.allFiles['fileId-0'];
        //verify the file name
        assert.equal(testFile1.id, 'fileId-0');
        assert.equal(testFile1.parentDirectoryId, subDir1.id);
        assert.equal(testFile1.currentPath, '/subDir1/testFile1.txt');
        assert.equal(testFile1.isDeleted, 'false');
        
        //close the project
        projectManager.stopStoryteller();
    });

    test('Delete a file', function() {
        //path to a new test directory, use it to make a new test directory
        const projectTestPath = path.join(pathToTestDir, 'delete-file-test');

        //create the project dir
        fs.mkdirSync(projectTestPath);

        //create a new project manager
        let projectManager = new ProjectManager(projectTestPath);

        //build up some dirs and files
        buildTestProject(projectTestPath, projectManager);

        //build up the path to test file 1
        const deletedFilePath = path.join(projectTestPath, 'subDir1', 'testFile1.txt');
        const deletedFilePathNormalized = projectManager.pathHelper.normalizeFilePath(deletedFilePath);
        
        //actually delete the file
        fs.unlinkSync(deletedFilePath);

        //record deleting the file
        projectManager.deleteFile(deletedFilePath);

        //get all the events from the database and make sure last one is correct
        let allEvents = projectManager.eventManager.read();
        assert.equal(allEvents[allEvents.length - 1].type, 'DELETE FILE');

        //get the file info from the db
        //verify the file is gone
        assert.equal(projectManager.fileSystemManager.allFiles['fileId-0'].currentPath, '/subDir1/testFile1.txt');
        assert.equal(projectManager.fileSystemManager.allFiles['fileId-0'].isDeleted, 'true');
        assert.equal(projectManager.fileSystemManager.pathToFileIdMap[deletedFilePathNormalized], undefined);

        //close the project
        projectManager.stopStoryteller();
    });

    test('Rename a file', function() {
        //path to a new test directory, use it to make a new test directory
        const projectTestPath = path.join(pathToTestDir, 'rename-file-test');

        //create the project dir
        fs.mkdirSync(projectTestPath);

        //create a new project manager
        let projectManager = new ProjectManager(projectTestPath);

        //build up some dirs and files
        buildTestProject(projectTestPath, projectManager);

        //rename testFile1.txt to testFile1NEWNAME.txt, create some paths
        const oldFilePath = path.join(projectTestPath, 'subDir1', 'testFile1.txt');
        const newFilePath = path.join(projectTestPath, 'subDir1', 'testFile1NEWNAME.txt');
        const oldFilePathNormalized = projectManager.pathHelper.normalizeFilePath(oldFilePath);
        const newFilePathNormalized = projectManager.pathHelper.normalizeFilePath(newFilePath);
        
        //rename the file
        fs.renameSync(oldFilePath, newFilePath);

        //record renaming a file
        projectManager.renameFile(oldFilePath, newFilePath);

        //get the events and verify the last one is correct
        let allEvents = projectManager.eventManager.read();
        assert.equal(allEvents[allEvents.length - 1].type, 'RENAME FILE');
        assert.equal(allEvents[allEvents.length - 1].oldFilePath, oldFilePathNormalized);
        assert.equal(allEvents[allEvents.length - 1].newFilePath, newFilePathNormalized);

        //verify the file is renamed
        assert.equal(projectManager.fileSystemManager.allFiles['fileId-0'].currentPath, '/subDir1/testFile1NEWNAME.txt');
        assert.equal(projectManager.fileSystemManager.pathToFileIdMap[oldFilePathNormalized], undefined);
        assert.equal(projectManager.fileSystemManager.pathToFileIdMap[newFilePathNormalized], 'fileId-0');

        //close the project
        projectManager.stopStoryteller();
    });

    test('Move a file', function() {
        //path to a new test directory, use it to make a new test directory
        const projectTestPath = path.join(pathToTestDir, 'move-file-test');

        //create the project dir
        fs.mkdirSync(projectTestPath);

        //create a new project manager
        let projectManager = new ProjectManager(projectTestPath);

        //build up some dirs and files
        buildTestProject(projectTestPath, projectManager);

        //move a file from subDir1 to subDir2
        const oldFilePath = path.join(projectTestPath, 'subDir1', 'testFile1.txt');
        const newFilePath = path.join(projectTestPath, 'subDir2', 'testFile1.txt');
        const oldFilePathNormalized = projectManager.pathHelper.normalizeFilePath(oldFilePath);
        const newFilePathNormalized = projectManager.pathHelper.normalizeFilePath(newFilePath);
        
        //move the file
        fs.renameSync(oldFilePath, newFilePath);

        //record moving the file
        projectManager.moveFile(oldFilePath, newFilePath);

        //get all the events and verify the last events
        let allEvents = projectManager.eventManager.read();
        assert.equal(allEvents[allEvents.length - 1].type, 'MOVE FILE');
        assert.equal(allEvents[allEvents.length - 1].oldFilePath, oldFilePathNormalized);
        assert.equal(allEvents[allEvents.length - 1].newFilePath, newFilePathNormalized);

        //verify the file is moved
        assert.equal(projectManager.fileSystemManager.allFiles['fileId-0'].parentDirectoryId, 'dirId-2');
        assert.equal(projectManager.fileSystemManager.allFiles['fileId-0'].currentPath, newFilePathNormalized);

        assert.equal(projectManager.fileSystemManager.pathToFileIdMap[oldFilePathNormalized], undefined);
        assert.equal(projectManager.fileSystemManager.pathToFileIdMap[newFilePathNormalized], 'fileId-0');

        //close the project
        projectManager.stopStoryteller();
    });

    test('Delete a directory', function() {
        //path to a new test directory, use it to make a new test directory
        const projectTestPath = path.join(pathToTestDir, 'delete-dir-test');

        //create the project dir
        fs.mkdirSync(projectTestPath);

        //create a new project manager
        let projectManager = new ProjectManager(projectTestPath);

        //build up some dirs and files
        buildTestProject(projectTestPath, projectManager);

        //delete subDir1
        const deletedDirPath = path.join(projectTestPath, 'subDir1');
        const deletedFilePath = path.join(deletedDirPath, 'testFile1.txt');
        const deletedSubPath = path.join(deletedDirPath, 'subDir3');
        const deletedSubDirFilePath1 = path.join(deletedSubPath, 'testFile2.txt');
        const deletedSubDirFilePath2 = path.join(deletedSubPath, 'testFile3.txt');

        const normalizedDeletedDirPath = projectManager.pathHelper.normalizeDirPath(deletedDirPath);
        const normalizedDeletedFilePath = projectManager.pathHelper.normalizeFilePath(deletedFilePath);
        const normalizedDeletedSubPath = projectManager.pathHelper.normalizeDirPath(deletedSubPath);
        const normalizedDeletedSubDirFilePath1 = projectManager.pathHelper.normalizeFilePath(deletedSubDirFilePath1);
        const normalizedDeletedSubDirFilePath2 = projectManager.pathHelper.normalizeFilePath(deletedSubDirFilePath2);

        //remove the directory
        //fs.rmdirSync(deletedDirPath, { recursive: true });
        deleteAllHelper(deletedDirPath);
        //record deleting a directory
        projectManager.deleteDirectory(deletedDirPath);

        //get all the events and cerify the last one
        let allEvents = projectManager.eventManager.read();
        assert.equal(allEvents[allEvents.length - 1].type, 'DELETE DIRECTORY');
        
        //verify the directory and files in it are gone
        assert.equal(projectManager.fileSystemManager.allDirs['dirId-1'].currentPath, normalizedDeletedDirPath); //'/subDir1/'
        assert.equal(projectManager.fileSystemManager.allDirs['dirId-1'].isDeleted, 'true');
        assert.equal(projectManager.fileSystemManager.allDirs['dirId-3'].currentPath, normalizedDeletedSubPath); //'/subDir1/subDir3/'
        assert.equal(projectManager.fileSystemManager.allDirs['dirId-1'].isDeleted, 'true');
        assert.equal(projectManager.fileSystemManager.allFiles['fileId-0'].currentPath, normalizedDeletedFilePath); //'/subDir1/testFile1.txt'
        assert.equal(projectManager.fileSystemManager.allFiles['fileId-0'].isDeleted, 'true');
        assert.equal(projectManager.fileSystemManager.allFiles['fileId-1'].currentPath, normalizedDeletedSubDirFilePath1); //'/subDir1/subDir3/testFile2.txt'
        assert.equal(projectManager.fileSystemManager.allFiles['fileId-1'].isDeleted, 'true');
        assert.equal(projectManager.fileSystemManager.allFiles['fileId-2'].currentPath, normalizedDeletedSubDirFilePath2); //'/subDir1/subDir3/testFile3.txt'
        assert.equal(projectManager.fileSystemManager.allFiles['fileId-2'].isDeleted, 'true');

        //there should only be two dirs /, /subDir2
        assert.equal(Object.keys(projectManager.fileSystemManager.pathToDirIdMap).length, 2);
        //there should only be one file left /subDir2/testFile4.txt
        assert.equal(Object.keys(projectManager.fileSystemManager.pathToFileIdMap).length, 1);

        //close the project
        projectManager.stopStoryteller();
    });

    test('Rename a directory', function() {
        //path to a new test directory, use it to make a new test directory
        const projectTestPath = path.join(pathToTestDir, 'rename-dir-test');

        //create the project dir
        fs.mkdirSync(projectTestPath);

        //create a new project manager
        let projectManager = new ProjectManager(projectTestPath);

        //build up some dirs and files
        buildTestProject(projectTestPath, projectManager);

        //paths to rename a dir
        const oldDirPath = path.join(projectTestPath, 'subDir1');
        const oldFilePath = path.join(oldDirPath, 'testFile1.txt');
        const oldSubDirPath = path.join(oldDirPath, 'subDir3');
        const oldSubDirFilePath1 = path.join(oldSubDirPath, 'testFile2.txt');
        const oldSubDirFilePath2 = path.join(oldSubDirPath, 'testFile3.txt');
        
        const newDirPath = path.join(projectTestPath, 'subDir1NEWNAME');
        const newFilePath = path.join(newDirPath, 'testFile1.txt');
        const newSubDirPath = path.join(newDirPath, 'subDir3');
        const newSubDirFilePath1 = path.join(newSubDirPath, 'testFile2.txt');
        const newSubDirFilePath2 = path.join(newSubDirPath, 'testFile3.txt');
        
        const oldDirPathNormalized = projectManager.pathHelper.normalizeDirPath(oldDirPath);
        const newDirPathNormalized = projectManager.pathHelper.normalizeDirPath(newDirPath);
        const oldTestFile1PathNormalized = projectManager.pathHelper.normalizeFilePath(oldFilePath);
        const newTestFile1PathNormalized = projectManager.pathHelper.normalizeFilePath(newFilePath);
        const oldSubDir3PathNormalized = projectManager.pathHelper.normalizeDirPath(oldSubDirPath);;
        const newSubDir3PathNormalized = projectManager.pathHelper.normalizeDirPath(newSubDirPath);;
        const oldTestFile2PathNormalized = projectManager.pathHelper.normalizeFilePath(oldSubDirFilePath1);
        const newTestFile2PathNormalized = projectManager.pathHelper.normalizeFilePath(newSubDirFilePath1);
        const oldTestFile3PathNormalized = projectManager.pathHelper.normalizeFilePath(oldSubDirFilePath2);
        const newTestFile3PathNormalized = projectManager.pathHelper.normalizeFilePath(newSubDirFilePath2);

        fs.renameSync(oldDirPath, newDirPath);
        //record the renaming of a directory
        projectManager.renameDirectory(oldDirPath, newDirPath);

        //get all the events and check the last events
        let allEvents = projectManager.eventManager.read();
        assert.equal(allEvents[allEvents.length - 1].type, 'RENAME DIRECTORY');
        assert.equal(allEvents[allEvents.length - 1].oldDirectoryPath, oldDirPathNormalized);
        assert.equal(allEvents[allEvents.length - 1].newDirectoryPath, newDirPathNormalized);
        
        //verify the directory and files in it are renamed
        assert.equal(projectManager.fileSystemManager.allDirs['dirId-1'].currentPath, newDirPathNormalized);
        assert.equal(projectManager.fileSystemManager.pathToDirIdMap[oldDirPathNormalized], undefined);
        assert(projectManager.fileSystemManager.pathToDirIdMap[newDirPathNormalized]);
        assert(projectManager.fileSystemManager.pathToFileIdMap[newTestFile1PathNormalized]);
        assert(projectManager.fileSystemManager.pathToDirIdMap[newSubDir3PathNormalized]);
        assert(projectManager.fileSystemManager.pathToFileIdMap[newTestFile2PathNormalized]);
        assert(projectManager.fileSystemManager.pathToFileIdMap[newTestFile3PathNormalized]);

        //close the project
        projectManager.stopStoryteller();
    });

    test('Move a directory', function() {
        //path to a new test directory, use it to make a new test directory
        const projectTestPath = path.join(pathToTestDir, 'move-dir-test');

        //create the project dir
        fs.mkdirSync(projectTestPath);

        //create a new project manager
        let projectManager = new ProjectManager(projectTestPath);

        //build up some dirs and files
        buildTestProject(projectTestPath, projectManager);
    
        //move subDir1 into subDir2
        const oldDirPath = path.join(projectTestPath, 'subDir1');
        const oldFilePath = path.join(oldDirPath, 'testFile1.txt');
        const oldSubDirPath = path.join(oldDirPath, 'subDir3');
        const oldSubDirFilePath1 = path.join(oldSubDirPath, 'testFile2.txt');
        const oldSubDirFilePath2 = path.join(oldSubDirPath, 'testFile3.txt');

        const newDirPath = path.join(projectTestPath, 'subDir2', 'subDir1');
        const newFilePath = path.join(newDirPath, 'testFile1.txt');
        const newSubDirPath = path.join(newDirPath, 'subDir3');
        const newSubDirFilePath1 = path.join(newSubDirPath, 'testFile2.txt');
        const newSubDirFilePath2 = path.join(newSubDirPath, 'testFile3.txt');
        
        const oldDirPathNormalized = projectManager.pathHelper.normalizeDirPath(oldDirPath);
        const newDirPathNormalized = projectManager.pathHelper.normalizeDirPath(newDirPath);
        const oldTestFile1PathNormalized = projectManager.pathHelper.normalizeFilePath(oldFilePath);
        const newTestFile1PathNormalized = projectManager.pathHelper.normalizeFilePath(newFilePath);
        const oldSubDir3PathNormalized = projectManager.pathHelper.normalizeDirPath(oldSubDirPath);;
        const newSubDir3PathNormalized = projectManager.pathHelper.normalizeDirPath(newSubDirPath);;
        const oldTestFile2PathNormalized = projectManager.pathHelper.normalizeFilePath(oldSubDirFilePath1);
        const newTestFile2PathNormalized = projectManager.pathHelper.normalizeFilePath(newSubDirFilePath1);
        const oldTestFile3PathNormalized = projectManager.pathHelper.normalizeFilePath(oldSubDirFilePath2);
        const newTestFile3PathNormalized = projectManager.pathHelper.normalizeFilePath(newSubDirFilePath2);

        fs.renameSync(oldDirPath, newDirPath);

        //record moving a directory
        projectManager.moveDirectory(oldDirPath, newDirPath);

        //get all the events and check the last one
        let allEvents = projectManager.eventManager.read();
        assert.equal(allEvents[allEvents.length - 1].type, 'MOVE DIRECTORY');
        assert.equal(allEvents[allEvents.length - 1].oldDirectoryPath, oldDirPathNormalized);
        assert.equal(allEvents[allEvents.length - 1].newDirectoryPath, newDirPathNormalized);

        //verify the directory is moved
        assert.equal(projectManager.fileSystemManager.allDirs['dirId-1'].parentDirectoryId, 'dirId-2');
        assert.equal(projectManager.fileSystemManager.pathToDirIdMap[oldSubDir3PathNormalized], undefined);
        assert(projectManager.fileSystemManager.pathToDirIdMap[newSubDir3PathNormalized]);
        assert.equal(projectManager.fileSystemManager.pathToFileIdMap[oldTestFile1PathNormalized], undefined);
        assert(projectManager.fileSystemManager.pathToFileIdMap[newTestFile1PathNormalized]);
        assert.equal(projectManager.fileSystemManager.pathToFileIdMap[oldTestFile2PathNormalized], undefined);
        assert(projectManager.fileSystemManager.pathToFileIdMap[newTestFile2PathNormalized]);
        assert.equal(projectManager.fileSystemManager.pathToFileIdMap[oldTestFile3PathNormalized], undefined);
        assert(projectManager.fileSystemManager.pathToFileIdMap[newTestFile3PathNormalized]);

        //close the project
        projectManager.stopStoryteller();
    });

    test('Insert and delete text', function() {
        //path to a new test directory, use it to make a new test directory
        const projectTestPath = path.join(pathToTestDir, 'insert-delete-text-test');

        //create the project dir
        fs.mkdirSync(projectTestPath);

        //create a new project manager
        let projectManager = new ProjectManager(projectTestPath);

        //create a subDir in the test dir on the file system
        const subDir1Path = path.join(projectTestPath, 'subDir1');
        fs.mkdirSync(subDir1Path);
        
        //record the creating of the new subDirectory
        projectManager.createDirectory(subDir1Path);
        
        //create a new file inside subDir1 on the file system
        const testFile1Path = path.join(subDir1Path, 'testFile1.txt');
        fs.writeFileSync(testFile1Path, '', 'utf8');
        //record the creation of the new file
        projectManager.createFile(testFile1Path);

        fs.writeFileSync(testFile1Path, 'abc\ndef', 'utf8');
        projectManager.handleInsertedText(testFile1Path, 'abc', 0, 0, '', 'false');
        projectManager.handleInsertedText(testFile1Path, '\n', 0, 3, '', 'false');
        projectManager.handleInsertedText(testFile1Path, 'def', 1, 0, '', 'false');
        //abc\n
        //def

        fs.writeFileSync(testFile1Path, '1a2b3c\ndef', 'utf8');
        projectManager.handleInsertedText(testFile1Path, '1', 0, 0, '', 'false');
        projectManager.handleInsertedText(testFile1Path, '2', 0, 2, '', 'false');
        projectManager.handleInsertedText(testFile1Path, '3', 0, 4, '', 'false');
        //1a2b3c\n
        //def

        fs.writeFileSync(testFile1Path, '1a2b3c\nd4e5f6', 'utf8');
        projectManager.handleInsertedText(testFile1Path, '6', 1, 3, '', 'false');
        projectManager.handleInsertedText(testFile1Path, '5', 1, 2, '', 'false');
        projectManager.handleInsertedText(testFile1Path, '4', 1, 1, '', 'false');
        //1a2b3c\n
        //d4e5f6

        //get all the events and check the last one
        let allEvents = projectManager.eventManager.read();
        assert.equal(allEvents[0].type, 'CREATE DIRECTORY');
        assert.equal(allEvents[1].type, 'CREATE DIRECTORY');
        assert.equal(allEvents[2].type, 'CREATE FILE');
        assert.equal(allEvents[3].type, 'INSERT');
        assert.equal(allEvents[3].character, 'a');
        assert.equal(allEvents[4].type, 'INSERT');
        assert.equal(allEvents[4].character, 'b');
        assert.equal(allEvents[5].type, 'INSERT');
        assert.equal(allEvents[5].character, 'c');
        assert.equal(allEvents[6].type, 'INSERT');
        assert.equal(allEvents[6].character, 'NEWLINE');
        assert.equal(allEvents[7].type, 'INSERT');
        assert.equal(allEvents[7].character, 'd');
        assert.equal(allEvents[8].type, 'INSERT');
        assert.equal(allEvents[8].character, 'e');
        assert.equal(allEvents[9].type, 'INSERT');
        assert.equal(allEvents[9].character, 'f');
        assert.equal(allEvents[10].type, 'INSERT');
        assert.equal(allEvents[10].character, '1');
        assert.equal(allEvents[11].type, 'INSERT');
        assert.equal(allEvents[11].character, '2');
        assert.equal(allEvents[12].type, 'INSERT');
        assert.equal(allEvents[12].character, '3');
        assert.equal(allEvents[13].type, 'INSERT');
        assert.equal(allEvents[13].character, '6');
        assert.equal(allEvents[14].type, 'INSERT');
        assert.equal(allEvents[14].character, '5');
        assert.equal(allEvents[15].type, 'INSERT');
        assert.equal(allEvents[15].character, '4');
        
        //write the contents of the file to the database
        projectManager.saveTextFileState();
        
        //get the file info from the db
        //get the text for the test file
        let text = projectManager.fileSystemManager.allFiles['fileId-0'].getText();
        //make sure it is what is expected
        assert.equal(text, '1a2b3c\nd4e5f6');
        //1a2b3c\n
        //d4e5f6

        //delete some text
        projectManager.handleDeletedText(testFile1Path, 0, 0, 3, 'false');
        //write the contents of the file to the database
        projectManager.saveTextFileState();
        
        //get all the events and check that the deleted inserts 1a2 are marked as deleted
        allEvents = projectManager.eventManager.read();

        //get the text for the test file
        text = projectManager.fileSystemManager.allFiles['fileId-0'].getText();
        //make sure it is what is expected
        assert.equal(text, 'b3c\nd4e5f6');
        //b3c\n
        //d4e5f6

        //delete some text
        projectManager.handleDeletedText(testFile1Path, 1, 2, 1, 'false');
        //write the contents of the file to the database
        projectManager.saveTextFileState();

        //get the text for the test file
        text = projectManager.fileSystemManager.allFiles['fileId-0'].getText();
        //make sure it is what is expected
        assert.equal(text, 'b3c\nd45f6');
        //b3c\n
        //d45f6

        //delete some text
        projectManager.handleDeletedText(testFile1Path, 0, 2, 4, 'false');
        //write the contents of the file to the database
        projectManager.saveTextFileState();

        //get the text for the test file
        text = projectManager.fileSystemManager.allFiles['fileId-0'].getText();
        //make sure it is what is expected
        assert.equal(text, 'b35f6');
        //b35f6

        //delete some text
        projectManager.handleDeletedText(testFile1Path, 0, 0, 5, 'false');
        //write the contents of the file to the database
        projectManager.saveTextFileState();

        //get the text for the test file
        text = projectManager.fileSystemManager.allFiles['fileId-0'].getText();
        //make sure it is what is expected
        assert.equal(text, '');

        //stop storyteller
        projectManager.stopStoryteller();
    });

    test('Identifies reconciliation- added files', function() {
        //path to a new test directory, use it to make a new test directory
        const createProjectTestPath = path.join(pathToTestDir, 'reconcile-test-added');

        //create the project dir
        fs.mkdirSync(createProjectTestPath);

        //create a new project manager
        let projectManager = new ProjectManager(createProjectTestPath);

        //create a subDir in the test dir on the file system
        const subDir1Path = path.join(createProjectTestPath, 'subDir1');
        fs.mkdirSync(subDir1Path);
        //record the creating of the new subDirectory
        projectManager.createDirectory(subDir1Path);

        //create a subDir in the test dir on the file system
        const subDir2Path = path.join(createProjectTestPath, 'subDir2');
        fs.mkdirSync(subDir2Path);
        //record the creating of the new subDirectory
        projectManager.createDirectory(subDir2Path);

        //create a subDir in the test dir on the file system
        const subDir3Path = path.join(createProjectTestPath, 'subDir3');
        fs.mkdirSync(subDir3Path);
        //record the creating of the new subDirectory
        projectManager.createDirectory(subDir3Path);

        //create a subDir in the test dir on the file system
        const subDir4Path = path.join(createProjectTestPath, 'subDir4');
        fs.mkdirSync(subDir4Path);
        //record the creating of the new subDirectory
        projectManager.createDirectory(subDir4Path);
        
        //create a new file inside subDir1 on the file system
        const testFile1Path = path.join(createProjectTestPath, 'testFile1.txt');
        fs.writeFileSync(testFile1Path, 'abc', 'utf8');
        //record the creation of the new file
        projectManager.createFile(testFile1Path);

        //create a new file inside subDir1 on the file system
        const testFile2Path = path.join(subDir1Path, 'testFile2.txt');
        fs.writeFileSync(testFile2Path, '123', 'utf8');
        //record the creation of the new file
        projectManager.createFile(testFile2Path);

        //create a new file inside subDir2 on the file system
        const testFile3Path = path.join(subDir2Path, 'testFile3.txt');
        fs.writeFileSync(testFile3Path, 'xyz', 'utf8');
        //record the creation of the new file
        projectManager.createFile(testFile3Path);

        //stop storyteller
        projectManager.stopStoryteller();
        
        //original state:
        // /
        // /testFile1.txt
        // /subDir1/
        // /subDir1/testFile2.txt
        // /subDir2/ 
        // /subDir2/testFile3.txt 
        // /subDir3/
        // /subDir4/
        //changes made through fs calls in the test
        // /testFile4.txt ADDED NEW FILE
        // /subDir1/testFile5.txt ADDED NEW FILE
        // /subDir5/ ADDED NEW DIRECTORY
        // /subDir6/ ADDED NEW DIRECTORY
        //after resolving
        // /testFile4.txt CREATED AND STORED IN STORYTELLER
        // /subDir1/testFile5.txt DELETED 
        // /subDir5/ CREATED AND STORED IN STORYTELLER
        // /subDir6/ DELETED

        //add a new file /testFile4.txt
        const testFile4Path = path.join(createProjectTestPath, 'testFile4.txt');
        fs.writeFileSync(testFile4Path, '456', 'utf8');

        //add a new file /testFile5.txt
        const testFile5Path = path.join(subDir1Path, 'testFile5.txt');
        fs.writeFileSync(testFile5Path, '789', 'utf8');

        //add a new dir /subDir5/
        const subDir5Path = path.join(createProjectTestPath, 'subDir5');
        fs.mkdirSync(subDir5Path);

        //add a new dir /subDir6/
        const subDir6Path = path.join(createProjectTestPath, 'subDir6');
        fs.mkdirSync(subDir6Path);

        //restart the existing project
        projectManager = new ProjectManager(createProjectTestPath);

        //get all the discrepancies made from the code above
        const discrepancies = projectManager.reconciler.findDiscrepancies();

        //correct new dirs
        assert.equal(discrepancies.fullDirPathsPresentButNotTracked.length, 2); 
        assert(discrepancies.fullDirPathsPresentButNotTracked.includes(subDir5Path)); //subDir5Path ADDED
        assert(discrepancies.fullDirPathsPresentButNotTracked.includes(subDir6Path)); //subDir6Path ADDED

        //correct new files
        assert.equal(discrepancies.fullFilePathsPresentButNotTracked.length, 2);
        assert(discrepancies.fullFilePathsPresentButNotTracked.includes(testFile4Path)); //testFile4Path ADDED
        assert(discrepancies.fullFilePathsPresentButNotTracked.includes(testFile5Path)); //testFile5Path ADDED

        //resolve the discrepancies
        projectManager.reconciler.resolveNewDirectory(subDir5Path, 'create');
        projectManager.reconciler.resolveNewDirectory(subDir6Path, 'delete');
        projectManager.reconciler.resolveNewFile(testFile4Path, 'create');
        projectManager.reconciler.resolveNewFile(testFile5Path, 'delete');
        
        //verify that the new dir and file have been created 
        assert.equal(projectManager.fileSystemManager.allDirs['dirId-5'].currentPath, '/subDir5/');
        assert.equal(projectManager.fileSystemManager.allDirs['dirId-6'], undefined);

        assert.equal(projectManager.fileSystemManager.allFiles['fileId-3'].currentPath, '/testFile4.txt');
        assert.equal(projectManager.fileSystemManager.allFiles['fileId-3'].getText(), '456');
        assert.equal(projectManager.fileSystemManager.allFiles['fileId-4'], undefined);

        //get all the events and check them
        const allEvents = projectManager.eventManager.read();
        assert.equal(allEvents[allEvents.length - 5].type, 'CREATE DIRECTORY');
        assert.equal(allEvents[allEvents.length - 4].type, 'CREATE FILE');
        assert.equal(allEvents[allEvents.length - 3].type, 'INSERT');
        assert.equal(allEvents[allEvents.length - 2].type, 'INSERT');
        assert.equal(allEvents[allEvents.length - 1].type, 'INSERT');
        
        //stop storyteller
        projectManager.stopStoryteller();
    });

    test('Identifies reconciliation- missing files', function() {
        //path to a new test directory, use it to make a new test directory
        const createProjectTestPath = path.join(pathToTestDir, 'reconcile-test-missing');

        //create the project dir
        fs.mkdirSync(createProjectTestPath);

        //create a new project manager
        let projectManager = new ProjectManager(createProjectTestPath);

        //create a subDir in the test dir on the file system
        const subDir1Path = path.join(createProjectTestPath, 'subDir1');
        fs.mkdirSync(subDir1Path);
        //record the creating of the new subDirectory
        projectManager.createDirectory(subDir1Path);

        //create a subDir in the test dir on the file system
        const subDir2Path = path.join(createProjectTestPath, 'subDir2');
        fs.mkdirSync(subDir2Path);
        //record the creating of the new subDirectory
        projectManager.createDirectory(subDir2Path);

        //create a subDir in the test dir on the file system
        const subDir3Path = path.join(createProjectTestPath, 'subDir3');
        fs.mkdirSync(subDir3Path);
        //record the creating of the new subDirectory
        projectManager.createDirectory(subDir3Path);

        //create a subDir in the test dir on the file system
        const subDir4Path = path.join(createProjectTestPath, 'subDir4');
        fs.mkdirSync(subDir4Path);
        //record the creating of the new subDirectory
        projectManager.createDirectory(subDir4Path);
        
        //create a new file inside subDir1 on the file system
        const testFile1Path = path.join(createProjectTestPath, 'testFile1.txt');
        fs.writeFileSync(testFile1Path, 'abc', 'utf8');
        //record the creation of the new file
        projectManager.createFile(testFile1Path);

        //create a new file inside subDir1 on the file system
        const testFile2Path = path.join(subDir1Path, 'testFile2.txt');
        fs.writeFileSync(testFile2Path, '123', 'utf8');
        //record the creation of the new file
        projectManager.createFile(testFile2Path);

        //create a new file inside subDir2 on the file system
        const testFile3Path = path.join(subDir2Path, 'testFile3.txt');
        fs.writeFileSync(testFile3Path, 'xyz', 'utf8');
        //record the creation of the new file
        projectManager.createFile(testFile3Path);

        //stop storyteller
        projectManager.stopStoryteller();
        
        //original state:
        // /
        // /testFile1.txt
        // /subDir1/
        // /subDir1/testFile2.txt
        // /subDir2/ 
        // /subDir2/testFile3.txt 
        // /subDir3/
        // /subDir4/
        //changes made through fs calls in the test
        // /
        // /testFile1.txt DELETED FILE
        // /subDir1/testFile2.txt DELETED FILE
        // /subDir2/ DELETED DIRECTORY 
        // /subDir2/testFile3.txt DELETED FILE (due to deleted dir /subDir2/)
        // /subDir4/ DELETED DIRECTORY
        //after resolving
        // /
        // /testFile1.txt RECREATED
        // /subDir1/testFile2.txt DELETED
        // /subDir2/ RECREATED 
        // /subDir2/testFile3.txt RECREATED FILE (due to recreate dir /subDir2/)
        // /subDir4/ REMOVED FROM STORYTELLER DATA

        //delete /testFile1.txt from the file system
        fs.unlinkSync(testFile1Path);

        //delete subDir1/testFile2.txt from the file system
        fs.unlinkSync(testFile2Path);

        //delete /subDir2/ from the file system along with /subDir2/testFile3.txt
        //fs.rmdirSync(subDir2Path, {recursive: true});
        deleteAllHelper(subDir2Path);
        //delete /subDir4/ from the file system
        //fs.rmdirSync(subDir4Path);
        deleteAllHelper(subDir4Path);
        //restart the existing project
        projectManager = new ProjectManager(createProjectTestPath);

        //get all the discrepancies made from the code above
        const discrepancies = projectManager.reconciler.findDiscrepancies();

        //correct missing files
        assert.equal(discrepancies.missingFileIds.length, 3); 
        assert(discrepancies.missingFileIds.includes('fileId-0')); //testFile1Path DELETED
        assert(discrepancies.missingFileIds.includes('fileId-1')); //testFile2Path DELETED
        assert(discrepancies.missingFileIds.includes('fileId-2')); //testFile3Path DELETED

        //correct missing dirs
        assert.equal(discrepancies.missingDirectoryIds.length, 2);
        assert(discrepancies.missingDirectoryIds.includes('dirId-2')); //subDir2Path DELETED
        assert(discrepancies.missingDirectoryIds.includes('dirId-4')); //subDir4Path DELETED
        
        //resolve the discrepancies
        //recreate the deleted /subDir2/ and /subDir2/testFile3.txt
        projectManager.reconciler.resolveDeletedDirectory('dirId-2', 'recreate');
        projectManager.reconciler.resolveDeletedFile('fileId-2', 'recreate');
        
        //accept the deleted dir /subDir4/
        projectManager.reconciler.resolveDeletedDirectory('dirId-4', 'accept-delete');

        //recreate the missing file (/testFile1.txt)
        projectManager.reconciler.resolveDeletedFile('fileId-0', 'recreate');

        //accept the deleted file /subDir1/testFile2.txt
        projectManager.reconciler.resolveDeletedFile('fileId-1', 'accept-delete');
        
        //verify that the /subDir2/ and /subDir2/testFile3.txt have been recreated
        assert.equal(fs.existsSync(subDir2Path), true);
        assert.equal(fs.existsSync(testFile3Path), true);
        assert.equal(fs.readFileSync(testFile3Path), 'xyz');
        
        //verify the recreated dir and file have not been changed
        assert.equal(projectManager.fileSystemManager.allDirs['dirId-2'].isDeleted, 'false');
        assert.equal(projectManager.fileSystemManager.allFiles['fileId-2'].isDeleted, 'false');
        assert.equal(projectManager.fileSystemManager.allFiles['fileId-2'].getText(), 'xyz');
        
        //verify that the deleted dir stays deleted
        assert.equal(projectManager.fileSystemManager.allDirs['dirId-4'].isDeleted, 'true');

        //verify that the first deleted file is recreated and the second one is deleted
        assert.equal(projectManager.fileSystemManager.allFiles['fileId-0'].isDeleted, 'false');
        assert.equal(projectManager.fileSystemManager.allFiles['fileId-1'].isDeleted, 'true');

        //get all the events and check them
        const allEvents = projectManager.eventManager.read();
        assert.equal(allEvents[allEvents.length - 2].type, 'DELETE DIRECTORY');
        assert.equal(allEvents[allEvents.length - 1].type, 'DELETE FILE');

        //stop storyteller
        projectManager.stopStoryteller();
    });

    test('Identifies reconciliation- modified files', function() {
        //path to a new test directory, use it to make a new test directory
        const createProjectTestPath = path.join(pathToTestDir, 'reconcile-test-modified');

        //create the project dir
        fs.mkdirSync(createProjectTestPath);

        //create a new project manager
        let projectManager = new ProjectManager(createProjectTestPath);

        //create a new file inside subDir1 on the file system
        const testFile1Path = path.join(createProjectTestPath, 'testFile1.txt');
        fs.writeFileSync(testFile1Path, 'abc', 'utf8');
        //record the creation of the new file
        projectManager.createFile(testFile1Path);

        const testFile2Path = path.join(createProjectTestPath, 'testFile2.txt');
        fs.writeFileSync(testFile2Path, 'def', 'utf8');
        //record the creation of the new file
        projectManager.createFile(testFile2Path);

        //stop storyteller
        projectManager.stopStoryteller();
        
        //change the text inside /testFile1.txt from abc to 1ac3
        fs.writeFileSync(testFile1Path, '1ac3', 'utf8');
        
        //change the text inside /testFile2.txt from def to dexyz
        fs.writeFileSync(testFile2Path, 'dexyz', 'utf8');

        //restart the existing project
        projectManager = new ProjectManager(createProjectTestPath);
        
        //get all the discrepancies made from the code above
        const discrepancies = projectManager.reconciler.findDiscrepancies();

        //correct modified files
        assert.equal(discrepancies.modifiedFileIds.length, 2);
        assert(discrepancies.modifiedFileIds.includes('fileId-0')); //testFile1Path MODIFIED
        assert(discrepancies.modifiedFileIds.includes('fileId-1')); //testFile2Path MODIFIED
        
        //resolve the discrepancies
        //accept the updated file
        projectManager.reconciler.resolveFileChanges('fileId-0', 'accept-changes');
        projectManager.reconciler.resolveFileChanges('fileId-1', 'recreate');

        //verify that the modified file's text has changes
        assert.equal(projectManager.fileSystemManager.allFiles['fileId-0'].getText(), '1ac3');
        //verify that the modified file's text has changes
        assert.equal(projectManager.fileSystemManager.allFiles['fileId-1'].getText(), 'def');

        //get all the events and check them
        const allEvents = projectManager.eventManager.read();
        assert.equal(allEvents[allEvents.length - 3].type, 'INSERT');
        assert.equal(allEvents[allEvents.length - 2].type, 'DELETE');
        assert.equal(allEvents[allEvents.length - 1].type, 'INSERT');
        
        //stop storyteller
        projectManager.stopStoryteller();
    });

    function buildTestProject(projectTestPath, projectManager) {
        //fs:
        // /
        
        //create a subDir1 in the test dir on the file system
        const subDir1Path = path.join(projectTestPath, 'subDir1');
        fs.mkdirSync(subDir1Path);
        //record the creating of the new subDirectory
        projectManager.createDirectory(subDir1Path);

        //create a subDir2 in the test dir on the file system
        const subDir2Path = path.join(projectTestPath, 'subDir2');
        fs.mkdirSync(subDir2Path);
        //record the creating of the new subDirectory
        projectManager.createDirectory(subDir2Path);
        //fs:
        // - /
        //   +- subDir1
        //   +- subDir2

        //create a new file inside subDir1 on the file system
        const testFile1Path = path.join(subDir1Path, 'testFile1.txt');
        fs.writeFileSync(testFile1Path, '', 'utf8');
        //record the creation of the new file
        projectManager.createFile(testFile1Path);

        //create a subDir3 in subDir1 the file system
        const subDir3Path = path.join(subDir1Path, 'subDir3');
        fs.mkdirSync(subDir3Path);
        //record the creating of the new subDirectory
        projectManager.createDirectory(subDir3Path);

        //create a new file inside subDir3 on the file system
        const testFile2Path = path.join(subDir3Path, 'testFile2.txt');
        const testFile3Path = path.join(subDir3Path, 'testFile3.txt');
        fs.writeFileSync(testFile2Path, '', 'utf8');
        fs.writeFileSync(testFile3Path, '', 'utf8');
        //record the creation of the new file
        projectManager.createFile(testFile2Path);
        projectManager.createFile(testFile3Path);
        //fs:
        // - /
        //   +- subDir1
        //      --  testFile1.txt
        //      +- subDir3
        //         -- testFile2.txt
        //         -- testFile3.txt
        //   +- subDir2
        
        //create a new file inside subDir2 on the file system
        const testFile4Path = path.join(subDir2Path, 'testFile4.txt');
        fs.writeFileSync(testFile4Path, '', 'utf8');
        //record the creation of the new file
        projectManager.createFile(testFile4Path);
        //fs:
        // - /
        //   +- subDir1
        //      --  testFile1.txt
        //      +- subDir3
        //         -- testFile2.txt
        //         -- testFile3.txt
        //   +- subDir2
        //      -- testFile4.txt
    }

});
