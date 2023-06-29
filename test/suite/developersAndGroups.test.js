'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const Developer = require('../../core/developers/Developer.js');
const DeveloperGroup = require('../../core/developers/DeveloperGroup.js');
const DeveloperManager = require('../../core/developers/DeveloperManager.js');

suite('Developer and Developer Group Tests', function () {
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
    const pathToTestDir = path.join(__dirname, 'data', 'devData');
    
    setup(function() {
        //make a directory to hold the test data that is generated
        fs.mkdirSync(pathToTestDir, {recursive: true});
    });

    teardown(function() {
        //remove any previous data
        deleteAllHelper(pathToTestDir);
    });

    test('Creating devs and dev groups (no dev manager)', function() {
        //create the first developer
        const dev1 = new Developer('Mark', 'mark@mail.com');

        //verify that the userName and email can be retrieved
        assert.equal('Mark', dev1.userName);
        assert.equal('mark@mail.com', dev1.email);
        //all devIds start the same way
        assert(dev1.id.startsWith('devId-'));

        //create some more devs
        const dev2 = new Developer('Laura', 'laura@mail.com');
        const dev3 = new Developer('Buddy', 'buddy@mail.com');
        const dev4 = new Developer('Partick', 'patrick@mail.com');
        
        //create a dev group and add all the devs (duplicates should be ignored)
        const devGroup1 = new DeveloperGroup();
        //all devIds start the same way
        assert(devGroup1.id.startsWith('devGroupId-'));
        
        //add some devs to the dev group
        devGroup1.addDeveloper(dev1);
        devGroup1.addDeveloper(dev1); //duplicate, ignored
        devGroup1.addDeveloper(dev2);
        //add devs to the group by dev id
        devGroup1.addDeveloperById(dev2.id); //duplicate, ignored
        devGroup1.addDeveloperById(dev3.id);
        devGroup1.addDeveloperById(dev4.id);

        //should be 4 devs, with no dups
        assert.equal(devGroup1.memberIds.length, 4);
        //correct dev ids
        assert.equal(devGroup1.containsAllDevelopers([dev1.id, dev2.id, dev3.id, dev4.id]), true);
        //none of the correct devs
        assert.equal(devGroup1.containsAllDevelopers(['tom', 'dick', 'harry']), false);
        //some but not all of the devs
        assert.equal(devGroup1.containsAllDevelopers([dev1.id, dev2.id]), false);
        //all the right devs with an extra that is not in the group
        assert.equal(devGroup1.containsAllDevelopers([dev1.id, dev2.id, dev3.id, dev4.id, 'devId-5']), false);
    });

    test('Creating dev manager- default anonymous dev group', function() {
        //create a new dev manager
        const devManager = new DeveloperManager(pathToTestDir);
        
        //default dev group should have the anonymous developer
        assert.equal(devManager.getActiveDeveloperGroup().memberIds.length,  1);
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(devManager.anonymousDeveloper.id));

        //get the developer in the current dev group
        const currentDev = devManager.getDeveloperById(devManager.getActiveDeveloperGroup().memberIds[0]);
        
        //should be anon dev
        assert.equal(currentDev.userName, 'Anonymous Developer');
    });

    test('switch from anon to system dev group', function() {
        //create a new dev manager
        const devManager = new DeveloperManager(pathToTestDir);

        //default dev group should have the anonymous developer
        assert.equal(devManager.getActiveDeveloperGroup().memberIds.length,  1);
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(devManager.anonymousDeveloper.id));

        //get the system developer group
        const systemDevGroup = devManager.systemDeveloperGroup;
        //set it as the current developer group
        devManager.setActiveDeveloperGroup(systemDevGroup);

        //verify that the current dev group has changed
        assert.equal(devManager.getActiveDeveloperGroup().memberIds.length,  1);
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(devManager.systemDeveloper.id));

        //attempt to set to an invalid group id, should throw an exception
        assert.throws(() => {devManager.setActiveDeveloperGroupById('nonsense')});;

        //verify that the current dev group has NOT changed
        assert.equal(devManager.getActiveDeveloperGroup().memberIds.length,  1);
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(devManager.systemDeveloper.id));
    });

    test('Adding developers and group with the dev manager', function() {
        //create a new dev manager
        const devManager = new DeveloperManager(pathToTestDir);

        //create a new dev
        const dev1 = devManager.createNewDeveloper('Mark', 'mark@mail.com');
        assert.equal(dev1.userName, 'Mark');
        assert.equal(dev1.email, 'mark@mail.com');

        //can't add the same dev twice
        assert.throws(() => {devManager.createNewDeveloper('Mark', 'mark@mail.com')});

        //create a few more devs with the dev manager
        const dev2 = devManager.createNewDeveloper('Laura', 'laura@mail.com');
        const dev3 = devManager.createNewDeveloper('Buddy', 'buddy@mail.com');
        const dev4 = devManager.createNewDeveloper('Patrick', 'patrick@mail.com');

        //create a new dev group with mark and laura
        const devGroup1 = devManager.createNewDeveloperGroup([dev1, dev2]);
        devManager.setActiveDeveloperGroup(devGroup1);
        //affirm the correct current dev group
        assert.equal(devManager.getActiveDeveloperGroup(), devGroup1);
        assert.equal(devManager.getActiveDeveloperGroup().memberIds.length, 2);
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(dev1.id));
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(dev2.id));

        //create a new dev group with buddy and patrick
        const devGroup2 = devManager.createNewDeveloperGroupByDevUserName(['Buddy', 'Patrick']);
        devManager.setActiveDeveloperGroup(devGroup2);
        //affirm the correct current dev group
        assert.equal(devManager.getActiveDeveloperGroup(), devGroup2);
        assert.equal(devManager.getActiveDeveloperGroup().memberIds.length, 2);
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(dev3.id));
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(dev4.id));
        
        //create a new dev group with mark, laura, buddy, and patrick by id
        const devGroup3 = devManager.createNewDeveloperGroupByDevIds([dev1.id, dev2.id, dev3.id, dev4.id]);
        devManager.setActiveDeveloperGroup(devGroup3);
        //affirm the correct current dev group
        assert.equal(devManager.getActiveDeveloperGroup(), devGroup3);
        assert.equal(devManager.getActiveDeveloperGroup().memberIds.length, 4);
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(dev1.id));
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(dev2.id));
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(dev3.id));
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(dev4.id));

        //create a new dev group based on the ids of mark, laura, and buddy
        devManager.setCurrentDevGroupWithDevIds([dev1.id, dev2.id, dev3.id]);
        //affirm the correct current dev group
        assert.equal(devManager.getActiveDeveloperGroup().memberIds.length, 3);
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(dev1.id));
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(dev2.id));
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(dev3.id));
    });

    test('Activate and deactivate devs with the dev manager', function() {
        //create a new dev manager
        const devManager = new DeveloperManager(pathToTestDir);

        //create a few devs
        const dev1 = devManager.createNewDeveloper('Mark', 'mark@mail.com');
        const dev2 = devManager.createNewDeveloper('Laura', 'laura@mail.com');
        const dev3 = devManager.createNewDeveloper('Buddy', 'buddy@mail.com');
        const dev4 = devManager.createNewDeveloper('Patrick', 'patrick@mail.com');

        //create a new dev group with mark and laura
        const devGroup1 = devManager.createNewDeveloperGroup([dev1, dev2]);
        devManager.setActiveDeveloperGroup(devGroup1);
        
        //add two new devs buddy and patricl
        devManager.addDevelopersToActiveGroup([dev3.id, dev4.id]);
        //there should be four active devs
        assert.equal(devManager.getActiveDeveloperGroup().memberIds.length, 4);
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(dev1.id));
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(dev2.id));
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(dev3.id));
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(dev4.id));

        //attempt to add two devs already in the group
        devManager.addDevelopersToActiveGroup([dev3.id, dev4.id]);
        //there should still be four active devs
        assert.equal(devManager.getActiveDeveloperGroup().memberIds.length, 4);
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(dev1.id));
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(dev2.id));
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(dev3.id));
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(dev4.id));
        
        //remove all but dev1
        devManager.removeDevelopersFromActiveGroup([dev2.id, dev3.id, dev4.id]);
        //there should be one active dev
        assert.equal(devManager.getActiveDeveloperGroup().memberIds.length, 1);
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(dev1.id));

        //attempt to remove the last active dev (should not happen)
        devManager.removeDevelopersFromActiveGroup([dev1.id]);
        assert.equal(devManager.getActiveDeveloperGroup().memberIds.length, 1);
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(dev1.id));

        //attempt to remove devs not in the group
        devManager.removeDevelopersFromActiveGroup([dev2.id, dev3.id, dev4.id]);
        //there should be one active dev
        assert.equal(devManager.getActiveDeveloperGroup().memberIds.length, 1);
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(dev1.id));
    });

    test('Reading and writing to the file', function() {
        //create a new dev manager
        let devManager = new DeveloperManager(pathToTestDir);

        //create a few devs
        const dev1 = devManager.createNewDeveloper('Mark', 'mark@mail.com');
        const dev2 = devManager.createNewDeveloper('Laura', 'laura@mail.com');
        const dev3 = devManager.createNewDeveloper('Buddy', 'buddy@mail.com');

        //create a new dev group with mark and laura and make the current group
        const devGroup1 = devManager.createNewDeveloperGroup([dev1, dev2]);
        devManager.setActiveDeveloperGroup(devGroup1);
        
        //write the data to the file system
        devManager.write();
        //now read from the file system
        devManager.read();

        //verify that the dev group is correct
        assert.equal(devManager.activeDeveloperGroupId, devGroup1.id);
        assert.equal(devManager.getActiveDeveloperGroup().memberIds.length, devGroup1.memberIds.length);
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(dev1.id));
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(dev2.id));

        //create a new dev group based on the ids
        devManager.setCurrentDevGroupWithDevIds([dev1.id, dev2.id, dev3.id]);
        
        //write the data to the file system
        devManager.write();
        //now read from the file system
        devManager.read();

        //make sure the current dev group has the right makeup
        assert.equal(devManager.getActiveDeveloperGroup().memberIds.length, 3);
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(dev1.id));
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(dev2.id));
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(dev3.id));
        
        //now create a new instance of a dev manager 
        devManager = new DeveloperManager(pathToTestDir);
        //make sure the current dev group has the right makeup
        assert.equal(devManager.getActiveDeveloperGroup().memberIds.length, 3);
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(dev1.id));
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(dev2.id));
        assert(devManager.getActiveDeveloperGroup().memberIds.includes(dev3.id));
    });
});