const FileSystemElement = require('./FileSystemElement.js');

/*
 * This class represents a directory being tracked in a storyteller project.
 * It extends the FileSystemElement class and adds only an id to it.
 */
class Directory extends FileSystemElement {
    constructor(parentDirectoryId, currentPath, isDeleted, id) {
        super(parentDirectoryId, currentPath);
        
        //generate an id if one is not supplied
        this.id = id || this.generateId();

        //if the isDeleted value is supplied, use it
        if(isDeleted) {
            this.isDeleted = isDeleted;
        } else {
            this.isDeleted = 'false';
        }
    }

    /*
     * Generates an id for the directory.
     */
    generateId() {
        const newId = `dirId-${Directory.nextId}`;
        Directory.nextId++;
        return newId;
    }
}
//used to autogenerate ids
Directory.nextId = 0;

module.exports = Directory;