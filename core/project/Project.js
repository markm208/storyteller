const utilities = require('../utilities.js');

/*
 * This class stores information about the project (title and 
 * branch id).
 */
class Project {
    constructor() {
        //create a title and initial 6 digit branch id
        this.title = 'Playback';
        this.branchId = utilities.createRandomNumberBase62(6);
    }
}

module.exports = Project;