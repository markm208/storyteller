const utilities = require('../utilities.js');

/*
 * This class stores information about the project (title, description, 
 * branch id).
 */
class Project {
    constructor() {
        //create a title, description, and initial 6 digit branch id
        this.title = 'Playback';
        this.description = 'Playback Description';
        this.branchId = utilities.createRandomNumberBase62(6);
    }
}

module.exports = Project;