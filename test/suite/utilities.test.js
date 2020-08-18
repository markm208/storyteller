'use strict';

const assert = require('assert');
const path = require('path');
const utilities = require('../../core/utilities.js');

suite('Utilities Tests', function () {
    const rando5 = utilities.createRandomNumberBase62(5);
    const rando6 = utilities.createRandomNumberBase62(6);

    test('random length check', function () {
        assert.equal(rando5.length, 5);
        assert.equal(rando6.length, 6);
    });

    test('random character check', function () {
        const validDigits = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        
        for(let i = 0;i < rando5.length;i++) {
            if(validDigits.includes(rando5[i]) === false) {
                assert.fail('Invalid character in random string');
            }
        }

        for(let i = 0;i < rando6.length;i++) {
            if(validDigits.includes(rando6[i]) === false) {
                assert.fail('Invalid character in random string');
            }
        }
    });

    test('Escapes and unescapes special characters', function () {
        assert.equal(utilities.escapeSpecialCharacter('m'), 'm');
        assert.equal(utilities.escapeSpecialCharacter('\n'), 'NEWLINE');
        assert.equal(utilities.escapeSpecialCharacter('\r\n'), 'CR-LF');
        assert.equal(utilities.escapeSpecialCharacter('\t'), 'TAB');

        assert.equal(utilities.unescapeSpecialCharacter('m'), 'm');
        assert.equal(utilities.unescapeSpecialCharacter('NEWLINE'), '\n');
        assert.equal(utilities.unescapeSpecialCharacter('CR-LF'), '\r\n');
        assert.equal(utilities.unescapeSpecialCharacter('TAB'), '\t');
    });

    test('adds a slash to the end of a directory', function () {
        //parts of a path to a dir
        const dirPathParts = ['', 'path', 'to', 'a', 'dir'];
        
        //join the parts with the separator /path/to/a/dir
        let dirPath = dirPathParts.join(utilities.storytellerPathSeparator);
        
        //add the ending path separator
        // /path/to/a/dir/
        let newDirPath = utilities.addEndingPathSeparator(dirPath);
        //make sure the last character is the separator
        assert.equal(newDirPath[newDirPath.length - 1], utilities.storytellerPathSeparator)
        
        //add an extra segment to the array to get a separator at the end of the dir path
        dirPathParts.push('');
        // /path/to/a/dir/
        dirPath = dirPathParts.join(utilities.storytellerPathSeparator);

        //the separator is there already so nothing should be added
        newDirPath = utilities.addEndingPathSeparator(dirPath);

        //verify that the last character is the separator and the second to last is not
        assert.equal(newDirPath[newDirPath.length - 1], utilities.storytellerPathSeparator)
        assert.notEqual(newDirPath[newDirPath.length - 2], utilities.storytellerPathSeparator);
    });

    test('normalize path separators', function () {
        //parts of a path to a dir
        const dirPathParts = ['', 'path', 'to', 'a', 'dir'];
        
        //join the parts with a unix separator and a win separator 
        let unixDirPath = dirPathParts.join(path.posix.sep);
        let winDirPath = dirPathParts.join(path.win32.sep);
        //join with the storyteller separator
        let storytellerDirPath = dirPathParts.join(utilities.storytellerPathSeparator);

        assert.equal(utilities.normalizeSeparators(unixDirPath), storytellerDirPath);
        assert.equal(utilities.normalizeSeparators(winDirPath), storytellerDirPath);
    });
});