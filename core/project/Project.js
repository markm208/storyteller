/*
 * This class stores information about the project (title, description, 
 * branch id).
 */
class Project {
    constructor(title, description, branchId, id) {
        //create a title, description, and initial 8 digit branch id
        this.id = id;
        this.title = title;
        this.description = description;
        this.branchId = branchId;
    }
}

module.exports = Project;