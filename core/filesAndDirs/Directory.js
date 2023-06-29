/*
 * This class represents a directory being tracked in a project.
 */
class Directory {
    constructor(parentDirectoryId, currentPath, isDeleted, id) {
        this.id = id;
        this.parentDirectoryId = parentDirectoryId;
        this.currentPath = currentPath;
        this.isDeleted = isDeleted;
    }
}

module.exports = Directory;