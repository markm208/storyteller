const crypto = require('crypto');
const utilities = require('../utilities.js');

/*
 * This class stores information about the project (title, description, 
 * branch id).
 */
class Project {
    constructor(title, description, version, branchId, id) {
        //create a title, description, and initial 8 digit branch id
        this.id = (id || crypto.randomUUID());
        this.title = title;
        this.description = description;
        this.version = version;
        this.branchId = branchId || utilities.createRandomNumberBase62(8);;
    }
}

module.exports = Project;