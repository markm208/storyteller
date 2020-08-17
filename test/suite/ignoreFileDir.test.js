'use strict';

const assert = require('assert');
const path = require('path');
const IgnorePath = require('../../core/project/IgnorePath.js');
const utilities = require('../../core/utilities.js');

suite('Ignoring files in \'st-ignore.json\' Tests', function () {
    //path to dir with a valid st-ignore.json
    const pathToProject1 = path.join(__dirname, 'data', 'st-ignoreData', 'st-ignoreData1');
    //path to dir without a st-ignore.json
    const pathToProject2 = path.join(__dirname, 'data', 'st-ignoreData', 'st-ignoreData2');
    //path to a dir with a malformed st-ignore.json
    const pathToProject3 = path.join(__dirname, 'data', 'st-ignoreData', 'st-ignoreData3');
    
    test('check file extensions', function () {
        const ignore = new IgnorePath(pathToProject1);

        // /src/main.cpp
        const mainCpp = ['', 'src', 'main.cpp'].join(utilities.storytellerPathSeparator);
        //check file extensions
        //ignore
        assert.equal(ignore.ignoreThisFileOrDir(mainCpp), true);
        assert.equal(ignore.ignoreThisFileOrDir('/src/main.java'), true);
        //don't ignore
        assert.equal(ignore.ignoreThisFileOrDir('/docs/README.md'), false);
        assert.equal(ignore.ignoreThisFileOrDir('/README.md'), false);
    });

    test('check files', function () {
        const ignore = new IgnorePath(pathToProject1);

        //check files
        //ignore
        assert.equal(ignore.ignoreThisFileOrDir('/logs/server.log'), true);
        assert.equal(ignore.ignoreThisFileOrDir('sales.db'), true);
        //don't ignore
        assert.equal(ignore.ignoreThisFileOrDir('/docs/README.md'), false);
    });

    test('check directories', function () {
        const ignore = new IgnorePath(pathToProject1);

        //check directories
        //ignore
        assert.equal(ignore.ignoreThisFileOrDir('/bin/main.o'), true);
        assert.equal(ignore.ignoreThisFileOrDir('/bin/foo.obj'), true);
        assert.equal(ignore.ignoreThisFileOrDir('/node_modules/coolPackage/README.md'), true);
        assert.equal(ignore.ignoreThisFileOrDir('/.git/text.txt'), true);
        //don't ignore
        assert.equal(ignore.ignoreThisFileOrDir('/project/docs/README.md'), false);
    });

    test('ok to not have a st-ignore.json file', function() {
        //there is no st-ignore.json in this path
        const ignore = new IgnorePath(pathToProject2);

        //no files or directories should be ignored
        assert.equal(ignore.ignoreThisFileOrDir('/src/main.cpp'),  false);
        assert.equal(ignore.ignoreThisFileOrDir('/logs/server.log'),  false);
        assert.equal(ignore.ignoreThisFileOrDir('/bin/main.o'),  false);
        //still ignore changes to /st-ignore.json and anything in /.storyteller/
        assert.equal(ignore.ignoreThisFileOrDir('/st-ignore.json'), true);
        assert.equal(ignore.ignoreThisFileOrDir('/.storyteller/st.db'), true);
    });
    test('ignore changes to /st-ignore.json file', function() {
        const ignore = new IgnorePath(pathToProject1);

        //ignore changes to the file /st-ignore.json and anything inside /.storyteller/
        assert.equal(ignore.ignoreThisFileOrDir('/st-ignore.json'), true);
        assert.equal(ignore.ignoreThisFileOrDir('/.storyteller/st.db'), true);
    });

    test('ok to have an invalid st-ignore.json file', function() {
        //this directory has a malformed st-ignore.json that should throw an exception
        assert.throws(() => {const ignore = new IgnorePath(pathToProject3)});
    });
});