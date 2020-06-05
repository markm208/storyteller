'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const File = require('../../core/filesAndDirs/File.js');
const Directory = require('../../core/filesAndDirs/Directory.js');
const FileSystemManager = require('../../core/filesAndDirs/FileSystemManager.js');

suite('File System Tests', function () {
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
    
    //fs structure:
    // /
    // /test0.txt
    // /test1.txt
    //
    // /testDir1/
    // /testDir1/test2.txt
    //
    // /testDir2/
    // /testDir2/test3.txt
    //
    // /testDir2/testDir3/
    // /testDir2/testDir3/test4.txt
    const testRootDir  = { id: 'dirId-0', parentDirectoryId: null, path: '/'};
    const testDir1  = { id: 'dirId-1', parentDirectoryId: 'dirId-0', path: '/testDir1/'};
    const testDir2  = { id: 'dirId-2', parentDirectoryId: 'dirId-0', path: '/testDir2/'};
    const testDir3  = { id: 'dirId-3', parentDirectoryId: 'dirId-2', path: '/testDir2/testDir3/'};
    const testFile0  = { id: 'fileId-0', parentDirectoryId: 'dirId-0', path: '/test0.txt'};
    const testFile1  = { id: 'fileId-1', parentDirectoryId: 'dirId-0', path: '/test1.txt'};
    const testFile2  = { id: 'fileId-2', parentDirectoryId: 'dirId-1', path: '/testDir1/test2.txt'};
    const testFile3  = { id: 'fileId-3', parentDirectoryId: 'dirId-2', path: '/testDir2/test3.txt'};
    const testFile4  = { id: 'fileId-4', parentDirectoryId: 'dirId-3', path: '/testDir2/testDir3/test4.txt'};

    //reference to the file manager
    let fsManager;
    //references to dirs and files
    let rootDir;
    let file0;
    let file1;
    let dir1;
    let file2;
    let dir2;
    let file3;
    let dir3;
    let file4;

     setup(function() {
        //make a directory to hold the test data that is generated
        fs.mkdirSync(pathToTestDir, {recursive: true});
        
        //reset the auto-generated ids
        Directory.nextId = 0;
        File.nextId = 0;

        //create the file manager
        fsManager = new FileSystemManager(pathToTestDir);
        
        //create the root dir and a file inside of it
        // /
        // /test0.txt
        // /test1.txt
        //dir created above
        rootDir = fsManager.addDirectory(testRootDir.path);

        //create the files on the fs and then record their creation
        fs.writeFileSync(path.join(pathToTestDir, testFile0.path), '');
        file0 = fsManager.addFile(testFile0.path);
        
        fs.writeFileSync(path.join(pathToTestDir, testFile1.path), '');
        file1 = fsManager.addFile(testFile1.path);

        //create another group of dirs and files
        // /testDir1/
        // /testDir1/test2.txt
        //create the directory on the fs and then record its creation
        fs.mkdirSync(path.join(pathToTestDir, testDir1.path));
        dir1 = fsManager.addDirectory(testDir1.path);
        
        //create the file on the fs and then record its creation
        fs.writeFileSync(path.join(pathToTestDir, testFile2.path), '');
        file2 = fsManager.addFile(testFile2.path);

        //create another group of dirs and files
        // /testDir2/
        // /testDir2/test3.txt
        //create the directory on the fs and then record its creation
        fs.mkdirSync(path.join(pathToTestDir, testDir2.path));
        dir2 = fsManager.addDirectory(testDir2.path);
        
        //create the file on the fs and then record its creation
        fs.writeFileSync(path.join(pathToTestDir, testFile3.path), '');
        file3 = fsManager.addFile(testFile3.path);

        //create another group of dirs and files
        // /testDir2/testDir3/
        // /testDir2/testDir3/test4.txt
        //create the directory on the fs and then record its creation
        fs.mkdirSync(path.join(pathToTestDir, testDir3.path));
        dir3 = fsManager.addDirectory(testDir3.path);
        
        //create the file on the fs and then record its creation
        fs.writeFileSync(path.join(pathToTestDir, testFile4.path), '');
        file4 = fsManager.addFile(testFile4.path);
    });

     teardown(function() {
        //remove any previous data
        deleteAllHelper(pathToTestDir);
    });

    test('Creating files and directories (no fs manager)', function() {
        //reset the auto-generated ids because of the setup() setup
        Directory.nextId = 0;
        File.nextId = 0;
        
        //create a dir and file without a manager
        const dir = new Directory(null, testRootDir.path);
        const file = new File(testRootDir.id, testFile0.path, 123);

        //check default and set values
        assert.equal(dir.id, testRootDir.id);
        assert.equal(dir.parentDirectoryId, null);
        assert.equal(dir.currentPath, testRootDir.path);
        assert.equal(dir.isDeleted, 'false');

        assert.equal(file.id, testFile0.id);
        assert.equal(file.parentDirectoryId, testRootDir.id);
        assert.equal(file.currentPath, testFile0.path);
        assert.equal(file.isDeleted, 'false');
    });

    test('Add a file and dir', function() {
        //test that the returned objects have the correct data in them
        assert.equal(rootDir.id, testRootDir.id);
        assert.equal(rootDir.parentDirectoryId, null);
        assert.equal(rootDir.currentPath, testRootDir.path);
        assert.equal(rootDir.isDeleted, 'false');

        assert.equal(file0.id, testFile0.id);
        assert.equal(file0.parentDirectoryId, testRootDir.id);
        assert.equal(file0.currentPath, testFile0.path);
        assert.equal(file0.isDeleted, 'false');

        assert.equal(file1.id, testFile1.id);
        assert.equal(file1.parentDirectoryId, testRootDir.id);
        assert.equal(file1.currentPath, testFile1.path);
        assert.equal(file1.isDeleted, 'false');

        //next batch
        assert.equal(dir1.id, testDir1.id);
        assert.equal(dir1.parentDirectoryId, testRootDir.id);
        assert.equal(dir1.currentPath, testDir1.path);
        assert.equal(dir1.isDeleted, 'false');

        assert.equal(file2.id, testFile2.id);
        assert.equal(file2.parentDirectoryId, testDir1.id);
        assert.equal(file2.currentPath, testFile2.path);
        assert.equal(file2.isDeleted, 'false');

        //next batch
        assert.equal(dir2.id, testDir2.id);
        assert.equal(dir2.parentDirectoryId, testRootDir.id);
        assert.equal(dir2.currentPath, testDir2.path);
        assert.equal(dir2.isDeleted, 'false');

        assert.equal(file3.id, testFile3.id);
        assert.equal(file3.parentDirectoryId, testDir2.id);
        assert.equal(file3.currentPath, testFile3.path);
        assert.equal(file3.isDeleted, 'false');

        //next batch
        assert.equal(dir3.id, testDir3.id);
        assert.equal(dir3.parentDirectoryId, testDir2.id);
        assert.equal(dir3.currentPath, testDir3.path);
        assert.equal(dir3.isDeleted, 'false');

        assert.equal(file4.id, testFile4.id);
        assert.equal(file4.parentDirectoryId, testDir3.id);
        assert.equal(file4.currentPath, testFile4.path);
        assert.equal(file4.isDeleted, 'false');

        //check the the fs manager is storing the correct data
        assert.equal(fsManager.allDirs[rootDir.id].id, testRootDir.id);
        assert.equal(fsManager.allDirs[rootDir.id].parentDirectoryId, null);
        assert.equal(fsManager.allDirs[rootDir.id].currentPath, testRootDir.path);
        assert.equal(fsManager.allDirs[rootDir.id].isDeleted, 'false');

        assert.equal(fsManager.allFiles[file0.id].id, testFile0.id);
        assert.equal(fsManager.allFiles[file0.id].parentDirectoryId, testRootDir.id);
        assert.equal(fsManager.allFiles[file0.id].currentPath, testFile0.path);
        assert.equal(fsManager.allFiles[file0.id].isDeleted, 'false');

        assert.equal(fsManager.allFiles[file1.id].id, testFile1.id);
        assert.equal(fsManager.allFiles[file1.id].parentDirectoryId, testRootDir.id);
        assert.equal(fsManager.allFiles[file1.id].currentPath, testFile1.path);
        assert.equal(fsManager.allFiles[file1.id].isDeleted, 'false');

        //next batch
        assert.equal(fsManager.allDirs[dir1.id].id, testDir1.id);
        assert.equal(fsManager.allDirs[dir1.id].parentDirectoryId, testRootDir.id);
        assert.equal(fsManager.allDirs[dir1.id].currentPath, testDir1.path);
        assert.equal(fsManager.allDirs[dir1.id].isDeleted, 'false');

        assert.equal(fsManager.allFiles[file2.id].id, testFile2.id);
        assert.equal(fsManager.allFiles[file2.id].parentDirectoryId, testDir1.id);
        assert.equal(fsManager.allFiles[file2.id].currentPath, testFile2.path);
        assert.equal(fsManager.allFiles[file2.id].isDeleted, 'false');

        //next batch
        assert.equal(fsManager.allDirs[dir2.id].id, testDir2.id);
        assert.equal(fsManager.allDirs[dir2.id].parentDirectoryId, testRootDir.id);
        assert.equal(fsManager.allDirs[dir2.id].currentPath, testDir2.path);
        assert.equal(fsManager.allDirs[dir2.id].isDeleted, 'false');

        assert.equal(fsManager.allFiles[file3.id].id, testFile3.id);
        assert.equal(fsManager.allFiles[file3.id].parentDirectoryId, testDir2.id);
        assert.equal(fsManager.allFiles[file3.id].currentPath, testFile3.path);
        assert.equal(fsManager.allFiles[file3.id].isDeleted, 'false');

        //next batch
        assert.equal(fsManager.allDirs[dir3.id].id, testDir3.id);
        assert.equal(fsManager.allDirs[dir3.id].parentDirectoryId, testDir2.id);
        assert.equal(fsManager.allDirs[dir3.id].currentPath, testDir3.path);
        assert.equal(fsManager.allDirs[dir3.id].isDeleted, 'false');

        assert.equal(fsManager.allFiles[file4.id].id, testFile4.id);
        assert.equal(fsManager.allFiles[file4.id].parentDirectoryId, testDir3.id);
        assert.equal(fsManager.allFiles[file4.id].currentPath, testFile4.path);
        assert.equal(fsManager.allFiles[file4.id].isDeleted, 'false');

        //make sure the path to id mappings are correct
        assert.equal(fsManager.pathToDirIdMap[rootDir.currentPath], rootDir.id);
        assert.equal(fsManager.pathToDirIdMap[dir1.currentPath], dir1.id);
        assert.equal(fsManager.pathToDirIdMap[dir2.currentPath], dir2.id);
        assert.equal(fsManager.pathToDirIdMap[dir3.currentPath], dir3.id);
        assert.equal(fsManager.pathToFileIdMap[file0.currentPath], file0.id);
        assert.equal(fsManager.pathToFileIdMap[file1.currentPath], file1.id);
        assert.equal(fsManager.pathToFileIdMap[file2.currentPath], file2.id);
        assert.equal(fsManager.pathToFileIdMap[file3.currentPath], file3.id);
        assert.equal(fsManager.pathToFileIdMap[file4.currentPath], file4.id);
    });

    test('Delete a file and dir', function() {
        //delete the root dir
        fsManager.removeDirectory(rootDir.currentPath);

        //verify all the dirs and files have been marked as deleted but are still present
        assert.equal(fsManager.allDirs[rootDir.id].isDeleted, 'true');
        assert.equal(fsManager.allDirs[dir1.id].isDeleted, 'true');
        assert.equal(fsManager.allDirs[dir2.id].isDeleted, 'true');
        assert.equal(fsManager.allDirs[dir3.id].isDeleted, 'true');
        assert.equal(fsManager.allFiles[file0.id].isDeleted, 'true');
        assert.equal(fsManager.allFiles[file1.id].isDeleted, 'true');
        assert.equal(fsManager.allFiles[file2.id].isDeleted, 'true');
        assert.equal(fsManager.allFiles[file3.id].isDeleted, 'true');
        assert.equal(fsManager.allFiles[file4.id].isDeleted, 'true');

        //verify that the path to id mappings have been removed
        assert.equal(fsManager.pathToDirIdMap[rootDir.currentPath], undefined);
        assert.equal(fsManager.pathToDirIdMap[dir1.currentPath], undefined);
        assert.equal(fsManager.pathToDirIdMap[dir2.currentPath], undefined);
        assert.equal(fsManager.pathToDirIdMap[dir3.currentPath], undefined);
        assert.equal(fsManager.pathToFileIdMap[file0.currentPath], undefined);
        assert.equal(fsManager.pathToFileIdMap[file1.currentPath], undefined);
        assert.equal(fsManager.pathToFileIdMap[file2.currentPath], undefined);
        assert.equal(fsManager.pathToFileIdMap[file3.currentPath], undefined);
        assert.equal(fsManager.pathToFileIdMap[file4.currentPath], undefined);
    });

    test('Rename a file and dir', function() {
        //rename the directory /testDir2/ to /testDir2NEW/
        const newDirPath = '/testDir2NEW/';
        fsManager.renameDirectory(dir2.currentPath, newDirPath);

        //test that the files and dirs have new paths and the path to id mappings are correct
        assert.equal(fsManager.allDirs[dir2.id].currentPath, testDir2.path.replace(testDir2.path, newDirPath));
        assert.equal(fsManager.allDirs[dir3.id].currentPath, testDir3.path.replace(testDir2.path, newDirPath));
        assert.equal(fsManager.allFiles[file3.id].currentPath, testFile3.path.replace(testDir2.path, newDirPath));
        assert.equal(fsManager.allFiles[file4.id].currentPath, testFile4.path.replace(testDir2.path, newDirPath));

        //verify that the path to id mappings have been removed
        assert.equal(fsManager.pathToDirIdMap[dir2.currentPath], testDir2.id);
        assert.equal(fsManager.pathToDirIdMap[dir3.currentPath], testDir3.id);
        assert.equal(fsManager.pathToFileIdMap[file3.currentPath], testFile3.id);
        assert.equal(fsManager.pathToFileIdMap[file4.currentPath], testFile4.id);

        //rename the file /test0.txt to /test0NEW.txt
        const newFilePath = '/testDir2NEW/';
        fsManager.renameFile(file0.currentPath, newFilePath);
        
        //test that the files and dirs have new paths and the path to id mappings are correct
        assert.equal(fsManager.allFiles[file0.id].currentPath, testFile0.path.replace(testFile0.path, newFilePath));
        assert.equal(fsManager.pathToFileIdMap[file0.currentPath], testFile0.id);
    });

    test('Move a file up a dir', function() {
        //move /testDir2/testDir3/test4.txt up to /test4.txt
        const newFilePath = '/test4.txt';
        fsManager.moveFile(testFile4.path, newFilePath);

        //test that the files and dirs have new paths and the path to id mappings are correct
        assert.equal(fsManager.allFiles[file4.id].currentPath, newFilePath);
        assert.equal(fsManager.pathToFileIdMap[file4.currentPath], testFile4.id);
        //make sure the old path to id mapping is gone
        assert.equal(fsManager.pathToFileIdMap[testFile4.path], null);
    });

    test('Move a file down a dir', function() {
        //move /test0.txt to /testDir1/test0.txt
        const newFilePath = '/testDir1/test0.txt';
        fsManager.moveFile(testFile0.path, newFilePath);

        //test that the files and dirs have new paths and the path to id mappings are correct
        assert.equal(fsManager.allFiles[file0.id].currentPath, newFilePath);
        assert.equal(fsManager.pathToFileIdMap[file0.currentPath], testFile0.id);
        //make sure the old path to id mapping is gone
        assert.equal(fsManager.pathToFileIdMap[testFile0.path], null);
    });

    test('Move a dir up a dir', function() {
        //move /testDir2/testDir3/ to /
        const newDirPath = '/testDir3/';
        fsManager.moveDirectory(testDir3.path, newDirPath);

        //test that the files and dirs have new paths and the path to id mappings are correct
        assert.equal(fsManager.allDirs[dir3.id].currentPath, testDir3.path.replace(testDir3.path, newDirPath));
        assert.equal(fsManager.allFiles[file4.id].currentPath, testFile4.path.replace(testDir3.path, newDirPath));

        //verify that the path to id mappings have been updated
        assert.equal(fsManager.pathToDirIdMap[dir3.currentPath], testDir3.id);
        assert.equal(fsManager.pathToFileIdMap[file4.currentPath], testFile4.id);
        //make sure the old path to id mapping is gone
        assert.equal(fsManager.pathToDirIdMap[testDir3.path], null);
        assert.equal(fsManager.pathToFileIdMap[testFile4.path], null);
    });

    test('Move a dir down a dir', function() {
        //move /testDir1/ to /testDir2/testDir1/
        const newDirPath = '/testDir2/testDir1/';
        fsManager.moveDirectory(testDir1.path, newDirPath);

        //test that the files and dirs have new paths and the path to id mappings are correct
        assert.equal(fsManager.allDirs[dir1.id].currentPath, testDir1.path.replace(testDir1.path, newDirPath));
        assert.equal(fsManager.allFiles[file2.id].currentPath, testFile2.path.replace(testDir1.path, newDirPath));

        //verify that the path to id mappings have been updated
        assert.equal(fsManager.pathToDirIdMap[dir1.currentPath], testDir1.id);
        assert.equal(fsManager.pathToFileIdMap[file2.currentPath], testFile2.id);
        //make sure the old path to id mapping is gone
        assert.equal(fsManager.pathToDirIdMap[testDir1.path], null);
        assert.equal(fsManager.pathToFileIdMap[testFile2.path], null);
    });

    test('Read fs state from file', function() {
        fsManager.write();
        fsManager.read();
        //test that the returned objects have the correct data in them
        assert.equal(fsManager.allDirs[testRootDir.id].id, testRootDir.id);
        assert.equal(fsManager.allFiles[testFile0.id].id, testFile0.id);
        assert.equal(fsManager.allFiles[testFile1.id].id, testFile1.id);
        assert.equal(fsManager.allDirs[testDir1.id].id, testDir1.id);
        assert.equal(fsManager.allFiles[testFile2.id].id, testFile2.id);
        assert.equal(fsManager.allDirs[testDir2.id].id, testDir2.id);
        assert.equal(fsManager.allFiles[testFile3.id].id, testFile3.id);
        assert.equal(fsManager.allDirs[testDir3.id].id, testDir3.id);
        assert.equal(fsManager.allFiles[testFile4.id].id, testFile4.id);

        //make sure the path to id mappings are correct
        assert.equal(fsManager.pathToDirIdMap[testRootDir.path], testRootDir.id);
        assert.equal(fsManager.pathToDirIdMap[testDir1.path], testDir1.id);
        assert.equal(fsManager.pathToDirIdMap[testDir2.path], testDir2.id);
        assert.equal(fsManager.pathToDirIdMap[testDir3.path], testDir3.id);
        assert.equal(fsManager.pathToFileIdMap[testFile0.path], testFile0.id);
        assert.equal(fsManager.pathToFileIdMap[testFile1.path], testFile1.id);
        assert.equal(fsManager.pathToFileIdMap[testFile2.path], testFile2.id);
        assert.equal(fsManager.pathToFileIdMap[testFile3.path], testFile3.id);
        assert.equal(fsManager.pathToFileIdMap[testFile4.path], testFile4.id);

    });

    test('insert text left-to-right', function () {
        //in order
        //abc\n
        //def
        file0.addInsertEventByPos('ev-0', 'a', 0, 0);
        file0.addInsertEventByPos('ev-1', 'b', 0, 1);
        file0.addInsertEventByPos('ev-2', 'c', 0, 2);
        file0.addInsertEventByPos('ev-3', '\n', 0, 3);
        file0.addInsertEventByPos('ev-4', 'd', 1, 0);
        file0.addInsertEventByPos('ev-5', 'e', 1, 1);
        file0.addInsertEventByPos('ev-6', 'f', 1, 2);

        assert.equal(file0.getText(), 'abc\ndef');
    });

    test('insert text all at beginning (reverse order)', function () {
        //reverse
        //abc\n
        //def
        file0.addInsertEventByPos('ev-6', 'f', 0, 0);
        file0.addInsertEventByPos('ev-5', 'e', 0, 0);
        file0.addInsertEventByPos('ev-4', 'd', 0, 0);
        file0.addInsertEventByPos('ev-3', '\n', 0, 0);
        file0.addInsertEventByPos('ev-2', 'c', 0, 0);
        file0.addInsertEventByPos('ev-1', 'b', 0, 0);
        file0.addInsertEventByPos('ev-0', 'a', 0, 0);
        
        assert.equal(file0.getText(), 'abc\ndef');
    });

    test('insert text out-of-order 1', function () {
        //out of order
        //abc\n
        //def
        file0.addInsertEventByPos('ev-2', 'c', 0, 0);
        file0.addInsertEventByPos('ev-1', 'b', 0, 0);
        file0.addInsertEventByPos('ev-0', 'a', 0, 0);
        file0.addInsertEventByPos('ev-6', 'f', 0, 3);
        file0.addInsertEventByPos('ev-5', 'e', 0, 3);
        file0.addInsertEventByPos('ev-4', 'd', 0, 3);
        file0.addInsertEventByPos('ev-3', '\n', 0, 3);

        assert.equal(file0.getText(), 'abc\ndef');
    });

    test('insert text out-of-order 2', function () {
        //out of order
        //abc\n
        //def
        file0.addInsertEventByPos('ev-5', 'e', 0, 0);
        file0.addInsertEventByPos('ev-0', 'a', 0, 0);
        file0.addInsertEventByPos('ev-3', '\n', 0, 1);
        file0.addInsertEventByPos('ev-6', 'f', 1, 1);
        file0.addInsertEventByPos('ev-1', 'b', 0, 1);
        file0.addInsertEventByPos('ev-4', 'd', 1, 0);
        file0.addInsertEventByPos('ev-2', 'c', 0, 2);
        
        assert.equal(file0.getText(), 'abc\ndef');
    });

    test('insert text out-of-order 3', function () {
        //out of order
        //abc\n
        //def
        file0.addInsertEventByPos('ev-3', '\n', 0, 0);
        file0.addInsertEventByPos('ev-5', 'e', 1, 0);
        file0.addInsertEventByPos('ev-4', 'd', 1, 0);
        file0.addInsertEventByPos('ev-6', 'f', 1, 2);
        file0.addInsertEventByPos('ev-1', 'b', 0, 0);
        file0.addInsertEventByPos('ev-0', 'a', 0, 0);
        file0.addInsertEventByPos('ev-2', 'c', 0, 2);

        assert.equal(file0.getText(), 'abc\ndef');
    });

    test('insert text out-of-order multiple newlines 4', function () {
        //out of order multiple newlines
        //\n
        //\n
        //abc\n
        //def\n\n
        file0.addInsertEventByPos('ev-3', '\n', 0, 0);
        file0.addInsertEventByPos('ev-5', 'e', 1, 0);
        file0.addInsertEventByPos('ev-4', 'd', 1, 0);
        file0.addInsertEventByPos('ev-6', 'f', 1, 2);
        file0.addInsertEventByPos('ev-1', 'b', 0, 0);
        file0.addInsertEventByPos('ev-0', 'a', 0, 0);
        file0.addInsertEventByPos('ev-2', 'c', 0, 2);
        file0.addInsertEventByPos('ev-7', '\n', 0, 0);
        file0.addInsertEventByPos('ev-8', '\n', 2, 3);
        file0.addInsertEventByPos('ev-9', '\n', 0, 0);
        file0.addInsertEventByPos('ev-10', '\n', 3, 4);

        assert.equal(file0.getText(), '\n\nabc\ndef\n\n');
    });

    test('insert text outside bounds', function () {
        //attempt to insert outside the bounds
        //build up some good text
        //abc\n
        //def
        file0.addInsertEventByPos('ev-0', 'a', 0, 0);
        file0.addInsertEventByPos('ev-1', 'b', 0, 1);
        file0.addInsertEventByPos('ev-2', 'c', 0, 2);
        file0.addInsertEventByPos('ev-3', '\n', 0, 3);
        file0.addInsertEventByPos('ev-4', 'd', 1, 0);
        file0.addInsertEventByPos('ev-5', 'e', 1, 1);
        file0.addInsertEventByPos('ev-6', 'f', 1, 2);

        //valid new row but col not 0
        assert.throws(() => {file0.addInsertEventByPos('ev-7', 'g', 2, 100)});
        //existing row, col out of bounds
        assert.throws(() => {file0.addInsertEventByPos('ev-7', 'g', 0, 100)});
        //row out of bounds
        assert.throws(() => {file0.addInsertEventByPos('ev-7', 'g', 100, 0)});
        //row and col out of bounds
        assert.throws(() => {file0.addInsertEventByPos('ev-7', 'g', 100, 100)});
    });

    test('remove text 1', function () {
        //removing text
        //abc\n
        //def
        file0.addInsertEventByPos('ev-0', 'a', 0, 0);
        file0.addInsertEventByPos('ev-1', 'b', 0, 1);
        file0.addInsertEventByPos('ev-2', 'c', 0, 2);
        file0.addInsertEventByPos('ev-3', '\n', 0, 3);
        file0.addInsertEventByPos('ev-4', 'd', 1, 0);
        file0.addInsertEventByPos('ev-5', 'e', 1, 1);
        file0.addInsertEventByPos('ev-6', 'f', 1, 2);

        //verify the inserts were good
        assert.equal(file0.getText(), 'abc\ndef');

        //repeatedly remove
        file0.removeInsertEventByPos(0, 2);
        assert.equal(file0.getText(), 'ab\ndef');

        file0.removeInsertEventByPos(1, 0);
        assert.equal(file0.getText(), 'ab\nef');

        file0.removeInsertEventByPos(1, 1);
        assert.equal(file0.getText(), 'ab\ne');

        file0.removeInsertEventByPos(0, 2);
        assert.equal(file0.getText(), 'abe');

        file0.removeInsertEventByPos(0, 0);
        assert.equal(file0.getText(), 'be');

        file0.removeInsertEventByPos(0, 1);
        assert.equal(file0.getText(), 'b');

        file0.removeInsertEventByPos(0, 0);
        assert.equal(file0.getText(), '');
    });

    test('remove text 2', function () {
        //removing text
        //abc\n
        //def\n
        file0.addInsertEventByPos('ev-0', 'a', 0, 0);
        file0.addInsertEventByPos('ev-1', 'b', 0, 1);
        file0.addInsertEventByPos('ev-2', 'c', 0, 2);
        file0.addInsertEventByPos('ev-3', '\n', 0, 3);
        file0.addInsertEventByPos('ev-4', 'd', 1, 0);
        file0.addInsertEventByPos('ev-5', 'e', 1, 1);
        file0.addInsertEventByPos('ev-6', 'f', 1, 2);
        file0.addInsertEventByPos('ev-7', '\n', 1, 3);

        //verify the inserts were good
        assert.equal(file0.getText(), 'abc\ndef\n');

        //repeatedly remove
        file0.removeInsertEventByPos(1, 3);
        assert.equal(file0.getText(), 'abc\ndef');

        file0.removeInsertEventByPos(0, 3);
        assert.equal(file0.getText(), 'abcdef');

        file0.removeInsertEventByPos(0, 0);
        assert.equal(file0.getText(), 'bcdef');

        file0.removeInsertEventByPos(0, 4);
        assert.equal(file0.getText(), 'bcde');

        file0.removeInsertEventByPos(0, 0);
        assert.equal(file0.getText(), 'cde');

        file0.removeInsertEventByPos(0, 2);
        assert.equal(file0.getText(), 'cd');

        file0.removeInsertEventByPos(0, 0);
        assert.equal(file0.getText(), 'd');

        file0.removeInsertEventByPos(0, 0);
        assert.equal(file0.getText(), '');
    });

    test('remove text outside bounds', function () {
        //attempt to remove outside the bounds
        //abc\n
        //def
        file0.addInsertEventByPos('ev-0', 'a', 0, 0);
        file0.addInsertEventByPos('ev-1', 'b', 0, 1);
        file0.addInsertEventByPos('ev-2', 'c', 0, 2);
        file0.addInsertEventByPos('ev-3', '\n', 0, 3);
        file0.addInsertEventByPos('ev-4', 'd', 1, 0);
        file0.addInsertEventByPos('ev-5', 'e', 1, 1);
        file0.addInsertEventByPos('ev-6', 'f', 1, 2);

        //verify the inserts were good
        assert.equal(file0.getText(), 'abc\ndef');

        //existing row, col out of bounds
        assert.throws(() => {file0.removeInsertEventByPos(0, 100)});
        //row out of bounds
        assert.throws(() => {file0.removeInsertEventByPos(100, 0)});
        //row and col out of bounds
        assert.throws(() => {file0.removeInsertEventByPos(100, 100)});
    });

    test('get event by pos', function () {
        //get the event by position
        //abc\n
        //def
        file0.addInsertEventByPos('ev-0', 'a', 0, 0);
        file0.addInsertEventByPos('ev-1', 'b', 0, 1);
        file0.addInsertEventByPos('ev-2', 'c', 0, 2);
        file0.addInsertEventByPos('ev-3', '\n', 0, 3);
        file0.addInsertEventByPos('ev-4', 'd', 1, 0);
        file0.addInsertEventByPos('ev-5', 'e', 1, 1);
        file0.addInsertEventByPos('ev-6', 'f', 1, 2);

        //verify that the ids of the returned events are correct
        assert.equal(file0.getEvent(0, 0).id, 'ev-0');
        assert.equal(file0.getEvent(0, 1).id, 'ev-1');
        assert.equal(file0.getEvent(0, 2).id, 'ev-2');
        assert.equal(file0.getEvent(0, 3).id, 'ev-3');
        assert.equal(file0.getEvent(1, 0).id, 'ev-4');
        assert.equal(file0.getEvent(1, 1).id, 'ev-5');
        assert.equal(file0.getEvent(1, 2).id, 'ev-6');
    });

    test('get previous neighbor', function () {
        //get the previous neighbors
        //abc\n
        //def
        file0.addInsertEventByPos('ev-0', 'a', 0, 0);
        file0.addInsertEventByPos('ev-1', 'b', 0, 1);
        file0.addInsertEventByPos('ev-2', 'c', 0, 2);
        file0.addInsertEventByPos('ev-3', '\n', 0, 3);
        file0.addInsertEventByPos('ev-4', 'd', 1, 0);
        file0.addInsertEventByPos('ev-5', 'e', 1, 1);
        file0.addInsertEventByPos('ev-6', 'f', 1, 2);

        assert.equal(file0.getPreviousNeighborId(0, 0), 'none');
        assert.equal(file0.getPreviousNeighborId(0, 1), 'ev-0');
        assert.equal(file0.getPreviousNeighborId(0, 2), 'ev-1');
        assert.equal(file0.getPreviousNeighborId(0, 3), 'ev-2');
        assert.equal(file0.getPreviousNeighborId(1, 0), 'ev-3');
        assert.equal(file0.getPreviousNeighborId(1, 1), 'ev-4');
        assert.equal(file0.getPreviousNeighborId(1, 2), 'ev-5');
    });

    test('get group of events by pos', function () {
        //get groups of text
        //abc\n
        //def
        file0.addInsertEventByPos('ev-0', 'a', 0, 0);
        file0.addInsertEventByPos('ev-1', 'b', 0, 1);
        file0.addInsertEventByPos('ev-2', 'c', 0, 2);
        file0.addInsertEventByPos('ev-3', '\n', 0, 3);
        file0.addInsertEventByPos('ev-4', 'd', 1, 0);
        file0.addInsertEventByPos('ev-5', 'e', 1, 1);
        file0.addInsertEventByPos('ev-6', 'f', 1, 2);

        //grab rows and cols
        const row1 = file0.getInsertEventsByPos(0, 0, 0, 3);
        const row2 = file0.getInsertEventsByPos(1, 0, 1, 2);
        const row1And2 = file0.getInsertEventsByPos(0, 0, 1, 2);
        const halfRow1HalfRow2 = file0.getInsertEventsByPos(0, 1, 1, 1);
        
        //test that the right events are coming back
        assert.equal(row1.length, 3);
        assert.equal(row1[0].id, 'ev-0');
        assert.equal(row1[1].id, 'ev-1');
        assert.equal(row1[2].id, 'ev-2');

        assert.equal(row2.length, 2);
        assert.equal(row2[0].id, 'ev-4');
        assert.equal(row2[1].id, 'ev-5');

        assert.equal(row1And2.length, 6);
        assert.equal(row1And2[0].id, 'ev-0');
        assert.equal(row1And2[1].id, 'ev-1');
        assert.equal(row1And2[2].id, 'ev-2');
        assert.equal(row1And2[3].id, 'ev-3');
        assert.equal(row1And2[4].id, 'ev-4');
        assert.equal(row1And2[5].id, 'ev-5');
        
        assert.equal(halfRow1HalfRow2.length, 4);
        assert.equal(halfRow1HalfRow2[0].id, 'ev-1');
        assert.equal(halfRow1HalfRow2[1].id, 'ev-2');
        assert.equal(halfRow1HalfRow2[2].id, 'ev-3');
        assert.equal(halfRow1HalfRow2[3].id, 'ev-4');
    });
    // test('', function() {
    // });
});
