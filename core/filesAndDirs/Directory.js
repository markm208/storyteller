const crypto = require('crypto');

/*
 * This class represents a directory being tracked in a project.
 */
class Directory {
    constructor(parentDirectoryId, currentPath, isDeleted, id) {
        this.id = (id || crypto.randomUUID());
        this.parentDirectoryId = parentDirectoryId;
        this.currentPath = currentPath;
        this.isDeleted = isDeleted;
    }
}

module.exports = Directory;