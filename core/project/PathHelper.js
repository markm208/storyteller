const utilities = require('../utilities.js');

/*
 * This class is used to help normalize file paths on different OS's so that
 * in storyteller they all look the same. The methods 
 */
class PathHelper {
    constructor(projDirPath) {
        //store a normalized full project path with storyteller separators and an ending slash
        this.normalizedProjectDirectoryPath = utilities.addEndingPathSeparator(utilities.normalizeSeparators(projDirPath));
    }

    /*
     * Takes a file path and changes it to use the storyteller path separator.
     * Then it removes the path leading up to the open storyteller project
     * directory. A path to a file is returned that should be consistent on
     * any OS.
     */
    normalizeFilePath(filePath) {
        //make sure the separators are the same as the storyteller separator
        filePath = utilities.normalizeSeparators(filePath);
    
        //remove the project path if it is present
        return this.removeProjectPath(filePath);
    }
    /*
     * Takes a dir path and changes it to use the storyteller path separator.
     * Then it removes the path leading up to the open storyteller project
     * directory. A path to a dir is returned that should be consistent on
     * any OS.
     */
    normalizeDirPath(dirPath) {
        //make sure the separators are the same as the storyteller separator
        //and that the dir path ends with a separator
        dirPath = utilities.addEndingPathSeparator(utilities.normalizeSeparators(dirPath));
    
        //remove the project path if it is present
        return this.removeProjectPath(dirPath);
    }

    /*
     * Removes the open storyteller dir from the path.
     */
    removeProjectPath(fileOrDirPath) {
        //if the passed in path has the project dir at the very beginning
        if(this.normalizedProjectDirectoryPath.length > 0 && 
           fileOrDirPath.length > 0 &&
           fileOrDirPath.startsWith(this.normalizedProjectDirectoryPath)) {
            //remove the project path but leave the beginning path separator to 
            //act as a root separator character (like in a unix system /)
            fileOrDirPath = fileOrDirPath.substring(this.normalizedProjectDirectoryPath.length - 1);
        }
    
        return fileOrDirPath;
    }
}

module.exports = PathHelper;