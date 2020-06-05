/*
 * This is the base class for a file or a directory. Every file and directory
 * have a parent directory id, current path, and a boolean indicating whether
 * it has been deleted or not (we keep all deleted files and dirs to recreate
 * them in the history of the system).
 */
class FileSystemElement {
    constructor(parentDirectoryId, currentPath) {
        //store the parent id and current path of the file system element
        this.parentDirectoryId = parentDirectoryId;
        this.currentPath = currentPath;
        //all new files and dirs are NOT deleted
        this.isDeleted = 'false';
    }
}

module.exports = FileSystemElement;