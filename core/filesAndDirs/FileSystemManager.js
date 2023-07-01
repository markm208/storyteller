const path = require('path');
const File  = require('./File.js');
const Directory = require('./Directory.js');
const utilities = require('../utilities.js');

/*
 * This class manages the state of the files and directories that storyteller
 * is tracking. Files and directories may be moved, renamed, and deleted over 
 * time but only one object is stored in memory/db for each one. These are used
 * to keep track of the history of all files and directories over time.
 * There are two collections, allFiles and allDirs, that store File and 
 * Directory objects for the file system elements that have been created. 
 * Storyteller tracks objects by their ids. There are two other objects, 
 * pathToFileIdMap and pathToDirIdMap, that map actual file and directory 
 * paths to storyteller file and dir ids. 
 */
class FileSystemManager {
    constructor(db) {
        this.db = db;
        this.allFiles = {};
        this.allDirs = {};
        this.pathToFileIdMap = {};
        this.pathToDirIdMap = {};
    }

    init(isNewProject) {
        return new Promise(async (resolve, reject) => {
            try {
                if(isNewProject === false) { //existing project
                    //load data from the db
                    this.loadDataFromDb();
                }
                resolve();
            } catch(err) {
                reject(err);
            }
        });
    }

    //this goes through all of the events and slowly inserts and deletes
    //all of them until the files are filled with file events (inserts)
    loadDataFromDb() {
        return new Promise(async (resolve, reject) => {
            try {
                //get all the files and dirs stored in the db
                const allFiles = await this.db.getAllFiles();
                const allDirs = await this.db.getAllDirectories();

                //add each of the files
                for(const file of allFiles) {
                    const newFile = new File(file.parentDirectoryId, file.currentPath, [], file.isDeleted, file.id);
                    this.allFiles[newFile.id] = newFile;
                    this.pathToFileIdMap[newFile.currentPath] = newFile.id;
                }

                //add each of the dirs
                for(const dir of allDirs) {
                    const newDir = new Directory(dir.parentDirectoryId, dir.currentPath, dir.isDeleted, dir.id);
                    this.allDirs[newDir.id] = newDir;
                    this.pathToDirIdMap[newDir.currentPath] = newDir.id;
                }

                //get all of the events
                const allEvents = await this.db.getAllEventsFromNonDeletedFiles();
                
                //for inserts and deletes add the characters to each file
                for(const event of allEvents) {
                    if(event.type === 'INSERT' || event.type === 'DELETE') {
                        const file = this.allFiles[event.fileId];

                        if(event.type === 'INSERT') {
                            file.addInsertEventByPos(event.id, event.character, event.lineNumber - 1, event.column - 1);
                        } else {
                            file.removeInsertEventByPos(event.lineNumber - 1, event.column - 1);
                        }
                    }
                }

                resolve();
            } catch(err) {
                reject(err);
            }
        });
    }
    
    /*
     * Adds a new file to the file system
     */
    async addFile(newFilePath) {
        let newFile = null;

        //if the file does not already exist
        if(this.getFileIdFromFilePath(newFilePath) === null) {
            //pick apart the relative file path
            const fileInfo = path.posix.parse(newFilePath);
            //get the path to the containing directory (make sure it ends with a separator)
            const newFileParentPath = utilities.addEndingPathSeparator(fileInfo.dir);
            //retrieve the parent dir id based on the path to the parent dir
            const newFileParentDirId = this.getDirIdFromDirPath(newFileParentPath);
            
            //if the parent dir is being tracked
            if(this.allDirs[newFileParentDirId]) {
                //create a new file object from the db
                newFile = await this.db.createFile(newFileParentDirId, newFilePath);

                //make a connection between the file path and an id 
                this.pathToFileIdMap[newFilePath] = newFile.id;

                //add the file to the object of all files
                this.allFiles[newFile.id] = newFile;
            } else {
                throw new Error(`A new file cannot be created because the parent dir ${newFileParentPath} does not exist`);
            }
        } else {
            throw new Error(`A new file cannot be created because on already exists at ${newFilePath}`);
        }
        //return the newly created file object
        return newFile;
    }

    /*
     * Marks a file from the file system as deleted and removes its path to
     * id mapping.
     */
    async removeFile(deletedFilePath) {
        //get the file id based on the file path
        const deletedFileId = this.getFileIdFromFilePath(deletedFilePath);
    
        //if the file is being tracked
        if(this.allFiles[deletedFileId]) {
            //remove the file from the db (mark it as deleted)
            await this.db.removeFile(this.allFiles[deletedFileId]);
            
            //delete the mapping from the old file path 
            delete this.pathToFileIdMap[deletedFilePath];

            //update the file in the collection of all files to be marked as deleted
            this.allFiles[deletedFileId].isDeleted = 'true';
        } else {
            throw new Error(`File: ${deletedFilePath} not tracked, cannot be removed`);
        }
    }

    /*
     * Renames a file.
     */
    async renameFile(oldFilePath, newFilePath) {
        //get the id of the renamed file
        const fileId = this.getFileIdFromFilePath(oldFilePath);
    
        //if the file is being tracked
        if(this.allFiles[fileId]) {
            //update the file in the db
            await this.db.renameFile(this.allFiles[fileId], newFilePath);

            //update the mapping from path to id
            this.replaceFilePathWithAnother(oldFilePath, newFilePath);

            //update the current name of the file in the collection of all files
            this.allFiles[fileId].currentPath = newFilePath;
        } else {
            throw new Error(`File: ${oldFilePath} not tracked, cannot be renamed`);
        }
    }

    /*
     * Moves a file.
     */
    async moveFile(oldFilePath, newFilePath) {
        //get the id of the moved file
        const fileId = this.getFileIdFromFilePath(oldFilePath);
    
        //if the file is being tracked
        if(this.allFiles[fileId]) {
            //get the new parent path (with an ending path separator)
            const fileInfo = path.posix.parse(newFilePath);
            const newFileParentPath = utilities.addEndingPathSeparator(fileInfo.dir);
            const newFileParentId = this.getDirIdFromDirPath(newFileParentPath);
            
            //if the parent dir is being tracked
            if(this.allDirs[newFileParentId]/* && this.allDirs[newFileParentId].isDeleted === 'false'*/) {
                //update the file in the db
                await this.db.moveFile(this.allFiles[fileId], newFileParentId, newFilePath);
                
                //update the mapping from path to id
                this.replaceFilePathWithAnother(oldFilePath, newFilePath);
        
                //update the new parent of the file in the collection of all files
                this.allFiles[fileId].parentDirectoryId = this.getDirIdFromDirPath(newFileParentPath);
                //update the current path of the file
                this.allFiles[fileId].currentPath = newFilePath;
            } else {
                throw new Error(`A new file cannot be moved because the new parent dir ${newFileParentPath} does not exist`);
            }
        } else {
            throw new Error(`File: ${oldFilePath} not tracked, cannot be moved`);
        }
    }

    /*
     * Adds a directory to the file system.
     */
    async addDirectory(newDirPath) {
        let newDirectory = null;

        //if the dir does not already exist
        if(this.getDirIdFromDirPath(newDirPath) === null) {
            //pick apart the directory path 
            const dirInfo = path.posix.parse(newDirPath);
            //get the path to the containing directory (make sure it ends with a separator)
            const newDirParentPath = utilities.addEndingPathSeparator(dirInfo.dir);
            //holds the parent dir id
            let newDirParentDirId = -1;
            //the root dir will have no name, a non-root dir will have one
            if(dirInfo.name !== '') {
                //retrieve the parent dir id based on the path to the parent dir
                newDirParentDirId = this.getDirIdFromDirPath(newDirParentPath);

                //if the parent is missing throw an exception
                if(newDirParentDirId === null) {
                    throw new Error(`A new file cannot be created because the parent dir ${newDirParentPath} does not exist`);
                }
            } //else- it is the root dir and its parent dir id will be null

            //create a new directory object from the db
            newDirectory = await this.db.createDirectory(newDirParentDirId, newDirPath);

            //make a connection between the dir path and an id 
            this.pathToDirIdMap[newDirPath] = newDirectory.id;

            //add the directory to the object of all directories
            this.allDirs[newDirectory.id] = newDirectory;
        } else {
            throw new Error(`A new directory cannot be created because on already exists at ${newDirPath}`);
        }
        //return the newly created dir object
        return newDirectory;
    }

    /*
     * Marks a directory as deleted in the file system and removes the path  to
     * if mapping.
     */
    async removeDirectory(deletedDirPath) {
        //get the deleted dir id based on the dir path
        const deletedDirId = this.getDirIdFromDirPath(deletedDirPath);
    
        //if the directory is being tracked
        if(this.allDirs[deletedDirId]) {
            //update the dir in the db
            await this.db.removeDirectory(this.allDirs[deletedDirId]);
            
            //delete the mapping from the old dir path
            delete this.pathToDirIdMap[deletedDirPath];
            
            //update the dir in the collection of all dirs to be marked as deleted
            this.allDirs[deletedDirId].isDeleted = 'true';
    
            //recursively remove the children files and dirs
            await this.removeDirectoryHelper(deletedDirId);
        } else {
            throw new Error(`Dir: ${deletedDirPath} not tracked, cannot be deleted`);
        }
    }

    /*
     * Helper that recursively removes the contents of a directory.
     */
    async removeDirectoryHelper(deletedParentDirId) {
        //delete the child files
        for(const fileId in this.allFiles) {
            //if the file is a child of the deleted parent
            if(this.allFiles[fileId].parentDirectoryId === deletedParentDirId) {
                //remove all files in the passed in parent dir
                await this.removeFile(this.allFiles[fileId].currentPath)
            }
        }
    
        //delete the child dirs
        for(const dirId in this.allDirs) {
            //if the directory is a child of the deleted parent
            if(this.allDirs[dirId].parentDirectoryId === deletedParentDirId) {
                //remove the dir (and its children recursively) 
                await this.removeDirectory(this.allDirs[dirId].currentPath);
            }
        }
    }

    /*
     * Rename a directory.
     */
    async renameDirectory(oldDirPath, newDirPath) {
        //get the id of the renamed dir
        const dirId = this.getDirIdFromDirPath(oldDirPath);
    
        //if the directory is being tracked
        if(this.allDirs[dirId]) {
            //update the dir in the db
            await this.db.renameDirectory(this.allDirs[dirId], newDirPath);

            //update all of the path to id mappings for the renamed dir
            this.replaceDirectoryPathWithAnother(oldDirPath, newDirPath);

            //update the current path of the dir in the collection of all dirs
            this.allDirs[dirId].currentPath = newDirPath;

            //update the children recursively
            await this.renameMoveDirectoryHelper(dirId, oldDirPath, newDirPath);
        } else {
            throw new Error(`Dir: ${oldDirPath} not tracked, cannot be renamed`);
        }
    }

    /*
     * Helper that recursively updates the paths to the contents of a renamed
     * directory.
     */
    async renameMoveDirectoryHelper(renamedDirId, oldDirPath, newDirPath) {
        //rename the child files
        for(const fileId in this.allFiles) {
            //if the file is a child of the deleted parent
            if(this.allFiles[fileId].parentDirectoryId === renamedDirId) {
                //get the file's current path
                const originalFilePath = this.allFiles[fileId].currentPath;
                
                //if the file path begins with the old dir path 
                if(originalFilePath.startsWith(oldDirPath)) {
                    //swap out the old parent dir with the new one
                    const updatedFilePath = originalFilePath.replace(oldDirPath, newDirPath);
                    
                    //delete the mapping from the old dir path 
                    this.replaceFilePathWithAnother(originalFilePath, updatedFilePath);
        
                    //update the file in the collection of all files
                    this.allFiles[fileId].currentPath = updatedFilePath;
                    
                    //update the file in the db
                    await this.db.renameFile(this.allFiles[fileId], updatedFilePath);
                }
            }
        }
    
        //rename the child dirs
        for(const dirId in this.allDirs) {
            //if the directory is a child of the deleted parent
            if(this.allDirs[dirId].parentDirectoryId === renamedDirId) {
                //get the dir's current path
                const originalDirPath = this.allDirs[dirId].currentPath;

                //if the dir path begins with the old dir path ()
                if(originalDirPath.startsWith(oldDirPath)) {
                    //swap out the old parent dir with the new one
                    const updatedDirPath = originalDirPath.replace(oldDirPath, newDirPath);
                    
                    //delete the mapping from the old dir path 
                    this.replaceDirectoryPathWithAnother(originalDirPath, updatedDirPath);
        
                    //update the dir in the collection of all files
                    this.allDirs[dirId].currentPath = updatedDirPath;
                    
                    //update the dir in the db
                    await this.db.renameDirectory(this.allDirs[dirId], updatedDirPath);

                    //recursively rename the children
                    await this.renameMoveDirectoryHelper(dirId, originalDirPath, updatedDirPath);
                }
            }
        }
    }
    
    /*
     * Moves a directory.
     */
    async moveDirectory(oldDirPath, newDirPath) {
        //get the id of the moved dir
        const dirId = this.getDirIdFromDirPath(oldDirPath);
    
        //if the dir is being tracked
        if(this.allDirs[dirId]) {
            //get the new parent path of the dir (make sure it ends with a separator)
            const dirInfo = path.posix.parse(newDirPath);
            const newDirParentPath = utilities.addEndingPathSeparator(dirInfo.dir);
            const newDirParentId = this.getDirIdFromDirPath(newDirParentPath);

            //if the new parent dir is being tracked
            if(this.allDirs[newDirParentId]/* && this.allDirs[newDirParentId].isDeleted === 'false'*/) {
                //update the dir in the db
                await this.db.moveDirectory(this.allDirs[dirId], newDirParentId, newDirPath);
                
                //update the mapping from path to id
                this.replaceDirectoryPathWithAnother(oldDirPath, newDirPath);

                //update the new parent of the dir in the collection of all dirs
                this.allDirs[dirId].parentDirectoryId = newDirParentId;
                //update the current path of the dir in the collection of all dirs
                this.allDirs[dirId].currentPath = newDirPath;
        
                //recursively update the child files and dirs
                await this.renameMoveDirectoryHelper(dirId, oldDirPath, newDirPath);
            } else {
                throw new Error(`A dir cannot be moved because the new parent dir ${newDirParentPath} does not exist`);
            }
        } else {
            throw new Error(`Dir: ${oldDirPath} not tracked, cannot be moved`);
        }
    }
    
    /*
     * Returns a File object based on its id.
     */
    getFileInfo(fileId) {
        //attempt to get the file info based on its id
        const retVal = this.allFiles[fileId];
    
        //if the file cannot be retrieved
        if(!retVal) {
            throw new Error(`Cannot retrieve a file for the file id ${fileId}.`);
        }
    
        return retVal;
    }
    
    /*
     * Returns a File object based on the path to the file.
     */
    getFileInfoFromFilePath(filePath) {
        //use getFileInfo to get the id from the file path 
        return this.getFileInfo(this.getFileIdFromFilePath(filePath));
    }

    /*
     * Returns a directory object based on its id.
     */
    getDirInfo(dirId) {
        //attempt to get the dir info based on its id
        const retVal = this.allDirs[dirId];
    
        //if the dir cannot be retrieved
        if(!retVal) {
            throw new Error(`Cannot retrieve a dir for the dir id ${dirId}.`);
        }
    
        return retVal;
    }

    /*
     * Returns a Directory object based on its path.
     */
    getDirInfoFromDirPath(dirPath) {
        //use getDirInfo to get the id from the dir path 
        return this.getDirInfo(this.getDirIdFromDirPath(dirPath));
    }

    /*
     * Gets the file id from a file path.
     */
    getFileIdFromFilePath(filePath) {
        //retrieve the id from the path
        let retVal = this.pathToFileIdMap[filePath];
    
        //if the path is not present
        if(!retVal) {
            //explicitly store null
            retVal = null;
        }
        return retVal;
    }

    /*
     * Gets a directory id from a directory path.
     */
    getDirIdFromDirPath(dirPath) {
        //retrieve the id from the path
        let retVal = this.pathToDirIdMap[dirPath];
        
        //if the path is not present
        if(!retVal) {
            //explicitly store null
            retVal = null;
        }
        return retVal;
    }

    /*
     * Used when you aren't sure if you have a file or a directory path
     * to retrieve the id.
     */
    getIdFromFileOrDirPath(path) {
        //hold the id of the file or directory in the path parameter
        let retVal;
    
        //first try the path as a file path
        retVal = this.getFileIdFromFilePath(path);
        
        //if there is not id for the file path
        if(retVal === null) {
            //attempt tp retrieve the id as a dir path
            retVal = this.getDirIdFromDirPath(path);
        }
    
        return retVal;
    }

    /*
     * Replaces a mapping from a file path to id.
     */
    replaceFilePathWithAnother(oldFilePath, newFilePath) {
        //if the path to id mapping exists
        if(this.pathToFileIdMap[oldFilePath]) {
            //get the file id based on the old path
            const id = this.pathToFileIdMap[oldFilePath];
    
            //delete the mapping from the old path 
            delete this.pathToFileIdMap[oldFilePath];
            
            //create a new mapping from the new file/dir path to the id 
            this.pathToFileIdMap[newFilePath] = id;
        } else {
            throw new Error(`No path to id mapping exists for '${oldFilePath}'`);
        }
    }

    /*
     * Replaces a mapping from a directory path to id.
     */
    replaceDirectoryPathWithAnother(oldDirPath, newDirPath) {
        //if the path to id mapping exists
        if(this.pathToDirIdMap[oldDirPath]) {
            //get the file id based on the old path
            const id = this.pathToDirIdMap[oldDirPath];
    
            //delete the mapping from the old path 
            delete this.pathToDirIdMap[oldDirPath];
            
            //create a new mapping from the new file/dir path to the id 
            this.pathToDirIdMap[newDirPath] = id;
        } else {
            throw new Error(`No path to id mapping exists for '${oldDirPath}'`);
        }
    }

    doesFilePathExist(filePath) {
        let retVal = false;
        //if there is a mapping from the file path to an id
        if(this.pathToFileIdMap[filePath] !== undefined) {
            //get the file id
            const fileId = this.pathToFileIdMap[filePath];
            //if the file is not deleted
            if(this.allFiles[fileId].isDeleted === 'false') {
                retVal = true;
            }
        }
        return retVal;
    }

    doesFileIdExist(fileId) {
        let retVal = false;
        //if the file id exists
        if(this.allFiles[fileId] !== undefined) {
            //if the file is not deleted
            if(this.allFiles[fileId].isDeleted === 'false') {
                retVal = true;
            }
        }
        return retVal;
    }

    doesDirPathExist(dirPath) {
        let retVal = false;
        //if there is a mapping from the dir path to an id
        if(this.pathToDirIdMap[dirPath] !== undefined) {
            //get the dir id
            const dirId = this.pathToDirIdMap[dirPath];
            //if the dir is not deleted
            if(this.allDirs[dirId].isDeleted === 'false') {
                retVal = true;
            }
        }
        return retVal;
    }

    doesDirIdExist(dirId) {
        let retVal = false;
        //if the dir id exists
        if(this.allDirs[dirId] !== undefined) {
            //if the dir is not deleted
            if(this.allDirs[dirId].isDeleted === 'false') {
                retVal = true;
            }
        }
        return retVal;
    }
}

module.exports = FileSystemManager;