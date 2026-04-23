/**
 * Import Playback from URL functionality
 */

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const { MESSAGES, STORYTELLER_DIR } = require('./constants');
const { slugify, parseAuthorInfo } = require('./utils');
const File = require('../core/filesAndDirs/File');
const DeveloperManager = require('../core/developers/DeveloperManager');

/**
 * Resolves the playback.js URL from a given playback page URL
 * Works for both book view and standalone view
 * @param {string} inputUrl - The URL of the playback page
 * @returns {string} The resolved playback.js URL
 * @throws {Error} If the URL is invalid or points to localhost
 */
function resolvePlaybackJsUrl(inputUrl) {
    const url = new URL(inputUrl);

    // Reject localhost
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        throw new Error(MESSAGES.IMPORT_LOCALHOST_ERROR);
    }

    // If already pointing to playback.js, use it
    if (url.pathname.endsWith('playback.js')) {
        return url.href;
    }

    // Strip index.html if present
    if (url.pathname.endsWith('index.html')) {
        url.pathname = url.pathname.replace('index.html', '');
    }

    // Ensure trailing slash for directory
    if (!url.pathname.endsWith('/')) {
        url.pathname += '/';
    }

    // playback.js is always in the same directory as index.html
    // This works for BOTH book view and standalone view
    return new URL('playback.js', url.href).href;
}

/**
 * Fetches content from a URL using Node's http/https modules
 * @param {string} url - The URL to fetch
 * @returns {Promise<string>} The response body as a string
 */
function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;

        protocol.get(url, (res) => {
            // Handle redirects
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                fetchUrl(res.headers.location).then(resolve).catch(reject);
                return;
            }

            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}: Failed to fetch ${url}`));
                return;
            }

            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

/**
 * Fetches binary content from a URL
 * @param {string} url - The URL to fetch
 * @returns {Promise<Buffer>} The response body as a Buffer
 */
function fetchBinary(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;

        protocol.get(url, (res) => {
            // Handle redirects
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                fetchBinary(res.headers.location).then(resolve).catch(reject);
                return;
            }

            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}: Failed to fetch ${url}`));
                return;
            }

            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
        }).on('error', reject);
    });
}

/**
 * Parses PLAYBACK_DATA from a JavaScript file content
 * @param {string} jsContent - The content of playback.js
 * @returns {Object} The parsed playback data
 */
function parsePlaybackData(jsContent) {
    // The format is: const PLAYBACK_DATA = {...};
    // We execute the JS and extract the PLAYBACK_DATA constant

    // Verify it looks like a playback.js file
    if (!jsContent.includes('PLAYBACK_DATA')) {
        throw new Error(MESSAGES.IMPORT_PARSE_ERROR);
    }

    try {
        // Use Function constructor to execute the JS and return PLAYBACK_DATA
        // This creates a function that declares PLAYBACK_DATA and returns it
        const fn = new Function(`
            ${jsContent}
            return PLAYBACK_DATA;
        `);
        const data = fn();

        if (!data || !data.events) {
            throw new Error('Invalid playback data structure');
        }

        return data;
    } catch (err) {
        throw new Error(`${MESSAGES.IMPORT_PARSE_ERROR}: ${err.message}`);
    }
}

/**
 * Extracts all media URLs from comments
 * @param {Object} comments - The comments object from playback data
 * @returns {Array<{url: string, type: string}>} Array of media URLs with their types
 */
function extractMediaUrls(comments) {
    const mediaItems = [];

    for (const eventId in comments) {
        const commentsAtEvent = comments[eventId];

        for (const comment of commentsAtEvent) {
            // Check imageURLs
            if (comment.imageURLs && Array.isArray(comment.imageURLs)) {
                for (const url of comment.imageURLs) {
                    mediaItems.push({ url, type: 'images' });
                }
            }

            // Check videoURLs
            if (comment.videoURLs && Array.isArray(comment.videoURLs)) {
                for (const url of comment.videoURLs) {
                    mediaItems.push({ url, type: 'videos' });
                }
            }

            // Check audioURLs
            if (comment.audioURLs && Array.isArray(comment.audioURLs)) {
                for (const url of comment.audioURLs) {
                    mediaItems.push({ url, type: 'audios' });
                }
            }
        }
    }

    return mediaItems;
}

/**
 * Downloads media assets and updates references in playback data
 * @param {Object} playbackData - The playback data object
 * @param {string} baseUrl - The base URL for resolving relative paths
 * @param {string} mediaDir - The local directory to save media files
 * @returns {Promise<void>}
 */
async function downloadMediaAssets(playbackData, baseUrl, mediaDir) {
    const mediaItems = extractMediaUrls(playbackData.comments);

    if (mediaItems.length === 0) {
        return;
    }

    // Create media subdirectories
    const mediaTypes = ['images', 'videos', 'audios'];
    for (const type of mediaTypes) {
        fs.mkdirSync(path.join(mediaDir, type), { recursive: true });
    }

    // Track URL to local path mapping for updating references
    const urlToLocalPath = {};

    for (const item of mediaItems) {
        try {
            // Resolve relative URL against base
            const absoluteUrl = new URL(item.url, baseUrl).href;
            const filename = path.basename(new URL(absoluteUrl).pathname);
            const localPath = path.join(mediaDir, item.type, filename);
            const relativePath = `media/${item.type}/${filename}`;

            // Download the file
            const buffer = await fetchBinary(absoluteUrl);
            fs.writeFileSync(localPath, buffer);

            // Store mapping
            urlToLocalPath[item.url] = relativePath;
        } catch (err) {
            console.warn(`Failed to download media: ${item.url}`, err.message);
            // Continue with other files
        }
    }

    // Update references in comments
    for (const eventId in playbackData.comments) {
        const commentsAtEvent = playbackData.comments[eventId];

        for (const comment of commentsAtEvent) {
            if (comment.imageURLs) {
                comment.imageURLs = comment.imageURLs.map(url => urlToLocalPath[url] || url);
            }
            if (comment.videoURLs) {
                comment.videoURLs = comment.videoURLs.map(url => urlToLocalPath[url] || url);
            }
            if (comment.audioURLs) {
                comment.audioURLs = comment.audioURLs.map(url => urlToLocalPath[url] || url);
            }
        }
    }
}

/**
 * Adds an import note to the first comment in the playback
 * @param {Object} playbackData - The playback data object
 * @param {string} sourceUrl - The URL where the playback was imported from
 */
function addImportNote(playbackData, sourceUrl) {
    // Find the first comment (lowest event sequence number)
    const eventIds = Object.keys(playbackData.comments);
    if (eventIds.length === 0) {
        return; // No comments to modify
    }

    // Sort by the display event sequence number to find the first comment
    let firstEventId = eventIds[0];
    let firstSequenceNum = playbackData.comments[firstEventId][0].displayCommentEventSequenceNumber;

    for (const eventId of eventIds) {
        const seqNum = playbackData.comments[eventId][0].displayCommentEventSequenceNumber;
        if (seqNum < firstSequenceNum) {
            firstSequenceNum = seqNum;
            firstEventId = eventId;
        }
    }

    // Add import note to the first comment, respecting the text format
    const firstComment = playbackData.comments[firstEventId][0];

    let importNote;
    if (firstComment.textFormat === 'html') {
        importNote = `<hr><p><em>This playback was imported from <a href="${sourceUrl}">${sourceUrl}</a></em></p>`;
    } else {
        // Default to markdown
        importNote = `\n\n---\n*This playback was imported from [${sourceUrl}](${sourceUrl})*`;
    }

    firstComment.commentText += importNote;
}

/**
 * Reconstructs file contents and File objects by replaying events
 * @param {Array} events - The events array from playback data
 * @returns {Object} Object with fileContents (path -> content) and fileObjects (fileId -> File)
 */
function reconstructFilesFromEvents(events) {
    // Track files using the File class
    const files = {}; // fileId -> File instance
    const fileMetadata = {}; // fileId -> {currentPath, isDeleted}
    const directories = {}; // directoryId -> {currentPath, parentDirectoryId, isDeleted}

    // Process each event
    for (let i = 0; i < events.length; i++) {
        const event = events[i];

        try {
            if (event.type === 'CREATE DIRECTORY') {
                directories[event.directoryId] = {
                    currentPath: event.directoryPath,
                    parentDirectoryId: event.parentDirectoryId,
                    isDeleted: false
                };
            } else if (event.type === 'DELETE DIRECTORY') {
                if (directories[event.directoryId]) {
                    directories[event.directoryId].isDeleted = true;
                }
            } else if (event.type === 'RENAME DIRECTORY') {
                if (directories[event.directoryId]) {
                    directories[event.directoryId].currentPath = event.newDirectoryPath;
                }
            } else if (event.type === 'MOVE DIRECTORY') {
                if (directories[event.directoryId]) {
                    directories[event.directoryId].currentPath = event.newDirectoryPath;
                    directories[event.directoryId].parentDirectoryId = event.newParentDirectoryId;
                }
            } else if (event.type === 'CREATE FILE') {
                // Create a new File instance with empty textFileInsertEvents
                files[event.fileId] = new File(
                    event.parentDirectoryId,
                    event.filePath,
                    [], // empty - we'll build it up via addInsertEventByPos
                    false,
                    event.fileId
                );
                fileMetadata[event.fileId] = {
                    currentPath: event.filePath,
                    isDeleted: false
                };
            } else if (event.type === 'DELETE FILE') {
                if (fileMetadata[event.fileId]) {
                    fileMetadata[event.fileId].isDeleted = true;
                }
                if (files[event.fileId]) {
                    files[event.fileId].isDeleted = true;
                }
            } else if (event.type === 'RENAME FILE') {
                if (fileMetadata[event.fileId]) {
                    fileMetadata[event.fileId].currentPath = event.newFilePath;
                }
                if (files[event.fileId]) {
                    files[event.fileId].currentPath = event.newFilePath;
                }
            } else if (event.type === 'MOVE FILE') {
                if (fileMetadata[event.fileId]) {
                    fileMetadata[event.fileId].currentPath = event.newFilePath;
                }
                if (files[event.fileId]) {
                    files[event.fileId].currentPath = event.newFilePath;
                    files[event.fileId].parentDirectoryId = event.newParentDirectoryId;
                }
            } else if (event.type === 'INSERT') {
                const file = files[event.fileId];
                if (file) {
                    // File class uses 0-based indexing, events use 1-based
                    file.addInsertEventByPos(
                        event.id,
                        event.character,
                        event.lineNumber - 1,
                        event.column - 1
                    );
                }
            } else if (event.type === 'DELETE') {
                const file = files[event.fileId];
                if (file) {
                    // File class uses 0-based indexing, events use 1-based
                    file.removeInsertEventByPos(
                        event.lineNumber - 1,
                        event.column - 1
                    );
                }
            }
        } catch (err) {
            console.error(`Error processing event ${i} (${event.type}):`, err.message);
            // Continue processing other events
        }
    }

    // Build file contents result: filepath -> content (only non-deleted files)
    const fileContents = {};
    for (const fileId in files) {
        const metadata = fileMetadata[fileId];
        if (metadata && !metadata.isDeleted) {
            fileContents[metadata.currentPath] = files[fileId].getText();
        }
    }

    return {
        fileContents,
        files,           // File instances with correct textFileInsertEvents
        directories      // Directory info
    };
}

/**
 * Imports a playback from a public URL
 * @param {Object} state - Shared extension state
 * @param {vscode.ExtensionContext} context - Extension context
 */
async function importPlaybackFromUrl(state, context) {
    // Prompt for playback URL
    const inputUrl = await vscode.window.showInputBox({
        prompt: MESSAGES.IMPORT_URL_PROMPT,
        validateInput: (value) => {
            if (!value || !value.trim()) {
                return 'URL is required';
            }
            try {
                const url = new URL(value);
                if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
                    return MESSAGES.IMPORT_LOCALHOST_ERROR;
                }
            } catch (e) {
                return 'Invalid URL format';
            }
            return null;
        }
    });

    if (!inputUrl) return;

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Importing playback',
        cancellable: false
    }, async (progress) => {
        try {
            // Resolve playback.js URL
            progress.report({ message: 'Resolving playback URL...' });
            const playbackJsUrl = resolvePlaybackJsUrl(inputUrl);
            const baseUrl = playbackJsUrl.replace('playback.js', '');

            // Fetch playback.js
            progress.report({ message: 'Fetching playback data...' });
            const jsContent = await fetchUrl(playbackJsUrl);

            // Parse PLAYBACK_DATA
            progress.report({ message: 'Parsing playback data...' });
            const playbackData = parsePlaybackData(jsContent);

            // Prompt for importing author info
            progress.report({ message: 'Waiting for author info...' });
            const authorInput = await vscode.window.showInputBox({
                prompt: MESSAGES.IMPORT_AUTHOR_PROMPT,
                validateInput: (value) => {
                    if (!value || !value.trim()) {
                        return 'Author name is required';
                    }
                    return null;
                }
            });

            if (!authorInput) {
                vscode.window.showInformationMessage('Import cancelled.');
                return;
            }

            // Parse author info
            const authorInfo = parseAuthorInfo(authorInput);

            // Generate a folder name from the playback title
            const defaultSlug = slugify(playbackData.playbackTitle || 'imported-playback');

            // Prompt for folder name
            const folderSlug = await vscode.window.showInputBox({
                prompt: MESSAGES.IMPORT_FOLDER_PROMPT,
                value: defaultSlug,
                validateInput: (value) => {
                    if (!value || !value.trim()) return 'Folder name is required';
                    return null;
                }
            });

            if (!folderSlug) {
                vscode.window.showInformationMessage('Import cancelled.');
                return;
            }

            // Prompt for destination folder
            const folders = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Select Destination',
                title: MESSAGES.IMPORT_DESTINATION_PROMPT
            });

            if (!folders || folders.length === 0) {
                vscode.window.showInformationMessage('Import cancelled.');
                return;
            }

            const destinationPath = folders[0].fsPath;
            const projectPath = path.join(destinationPath, folderSlug);

            // Check if folder already exists
            if (fs.existsSync(projectPath)) {
                const overwrite = await vscode.window.showQuickPick(
                    MESSAGES.YES_NO_OPTIONS,
                    { placeHolder: `Folder "${folderSlug}" already exists. Overwrite?` }
                );
                if (overwrite !== MESSAGES.YES_NO_OPTIONS[0]) {
                    vscode.window.showInformationMessage('Import cancelled.');
                    return;
                }
                fs.rmSync(projectPath, { recursive: true, force: true });
            }

            // Create project directory
            progress.report({ message: 'Creating project directory...' });
            fs.mkdirSync(projectPath, { recursive: true });

            // Create .storyteller directory structure (must match DBAbstraction.js expectations)
            const storytellerDir = path.join(projectPath, STORYTELLER_DIR);
            fs.mkdirSync(storytellerDir, { recursive: true });
            fs.mkdirSync(path.join(storytellerDir, 'comments'), { recursive: true });
            fs.mkdirSync(path.join(storytellerDir, 'comments', 'media'), { recursive: true });
            fs.mkdirSync(path.join(storytellerDir, 'comments', 'media', 'audios'), { recursive: true });
            fs.mkdirSync(path.join(storytellerDir, 'comments', 'media', 'images'), { recursive: true });
            fs.mkdirSync(path.join(storytellerDir, 'comments', 'media', 'videos'), { recursive: true });
            fs.mkdirSync(path.join(storytellerDir, 'devs'), { recursive: true });
            fs.mkdirSync(path.join(storytellerDir, 'events'), { recursive: true });
            fs.mkdirSync(path.join(storytellerDir, 'fs'), { recursive: true });
            fs.mkdirSync(path.join(storytellerDir, 'project'), { recursive: true });

            // Download media assets
            progress.report({ message: 'Downloading media assets...' });
            const mediaDir = path.join(storytellerDir, 'comments', 'media');
            await downloadMediaAssets(playbackData, baseUrl, mediaDir);

            // Add import note to first comment
            addImportNote(playbackData, inputUrl);

            // Create a DeveloperManager and load the playback's developer data
            const devManager = new DeveloperManager();
            devManager.load({
                allDevelopers: playbackData.developers,
                allDeveloperGroups: playbackData.developerGroups,
                activeDeveloperGroupId: playbackData.anonymousDeveloperGroupId,
                systemDeveloperGroupId: playbackData.systemDeveloperGroupId,
                anonymousDeveloperGroupId: playbackData.anonymousDeveloperGroupId,
                systemDeveloperId: playbackData.systemDeveloperId,
                anonymousDeveloperId: playbackData.anonymousDeveloperId
            });

            // Extract identifying info from author input
            let authorEmail = null;
            let authorPlatform = null;
            let authorPlatformUsername = null;
            let authorWebsiteUrl = null;

            if (authorInfo.url) {
                if (authorInfo.url.startsWith('mailto:')) {
                    authorEmail = authorInfo.url.replace('mailto:', '');
                } else if (authorInfo.url.includes('github.com/')) {
                    authorPlatform = 'github';
                    authorPlatformUsername = authorInfo.url.split('github.com/')[1];
                } else if (authorInfo.url.includes('gitlab.com/')) {
                    authorPlatform = 'gitlab';
                    authorPlatformUsername = authorInfo.url.split('gitlab.com/')[1];
                } else {
                    authorWebsiteUrl = authorInfo.url;
                }
            }

            // Search for existing developer by platform username or email
            let existingDev = null;
            for (const devId in devManager.allDevelopers) {
                const dev = devManager.allDevelopers[devId];

                // Skip system and anonymous developers
                if (devId === devManager.systemDeveloperId || devId === devManager.anonymousDeveloperId) {
                    continue;
                }

                // Match by platform username
                if (authorPlatform && authorPlatformUsername &&
                    dev.platform === authorPlatform &&
                    dev.platformUsername === authorPlatformUsername) {
                    existingDev = dev;
                    break;
                }

                // Match by email
                if (authorEmail && dev.email === authorEmail) {
                    existingDev = dev;
                    break;
                }
            }

            let importingDevGroupId;

            if (existingDev) {
                // Use existing developer, find or create their solo group
                const devGroup = devManager.createNewDeveloperGroupByDevIds([existingDev.id]);
                importingDevGroupId = devGroup.id;
            } else {
                // Create new developer and group using DeveloperManager
                // This handles avatar fetching automatically
                const result = await devManager.createNewDeveloper(
                    authorInfo.name,
                    authorEmail,
                    authorPlatform,
                    authorPlatformUsername,
                    authorWebsiteUrl
                );

                if (result) {
                    importingDevGroupId = result.newDeveloperGroup.id;
                } else {
                    // Developer with same username already exists, find them
                    const devByName = devManager.getDeveloperByUserName(authorInfo.name);
                    const devGroup = devManager.createNewDeveloperGroupByDevIds([devByName.id]);
                    importingDevGroupId = devGroup.id;
                }
            }

            // Set the importing author's group as active
            devManager.setActiveDeveloperGroup(devManager.allDeveloperGroups[importingDevGroupId]);

            // Write project/project.json (wrapped in project object)
            progress.report({ message: 'Writing project files...' });
            const projectData = {
                project: {
                    title: playbackData.playbackTitle,
                    description: `Imported from ${inputUrl}`,
                    branchId: playbackData.branchId,
                    id: `project-${Date.now()}`
                }
            };
            fs.writeFileSync(
                path.join(storytellerDir, 'project', 'project.json'),
                JSON.stringify(projectData, null, 2),
                'utf8'
            );

            // Write events/events.txt (one JSON object per line, not an array)
            const eventsText = playbackData.events.map(event => JSON.stringify(event)).join('\n') + '\n';
            fs.writeFileSync(
                path.join(storytellerDir, 'events', 'events.txt'),
                eventsText,
                'utf8'
            );

            // Write comments/comments.json (wrapped in comments object)
            const commentsData = {
                comments: playbackData.comments
            };
            fs.writeFileSync(
                path.join(storytellerDir, 'comments', 'comments.json'),
                JSON.stringify(commentsData, null, 2),
                'utf8'
            );

            // Write devs/devs.json using data from devManager
            const devsData = {
                allDevelopers: devManager.allDevelopers,
                allDeveloperGroups: devManager.allDeveloperGroups,
                activeDeveloperGroupId: devManager.activeDeveloperGroupId,
                anonymousDeveloperId: devManager.anonymousDeveloperId,
                anonymousDeveloperGroupId: devManager.anonymousDeveloperGroupId,
                systemDeveloperId: devManager.systemDeveloperId,
                systemDeveloperGroupId: devManager.systemDeveloperGroupId
            };
            fs.writeFileSync(
                path.join(storytellerDir, 'devs', 'devs.json'),
                JSON.stringify(devsData, null, 2),
                'utf8'
            );

            // Reconstruct final file state and get File objects
            progress.report({ message: 'Reconstructing files...' });
            const reconstruction = reconstructFilesFromEvents(playbackData.events);

            // Build and write fs/filesAndDirs.json using the reconstructed File objects
            // This ensures textFileInsertEvents has the correct 2D structure
            const allFiles = {};
            const allDirs = {};
            const pathToFileIdMap = {};
            const pathToDirIdMap = {};

            // Process directories
            for (const dirId in reconstruction.directories) {
                const dir = reconstruction.directories[dirId];
                allDirs[dirId] = {
                    id: dirId,
                    parentDirectoryId: dir.parentDirectoryId,
                    currentPath: dir.currentPath,
                    isDeleted: dir.isDeleted
                };
                if (!dir.isDeleted) {
                    pathToDirIdMap[dir.currentPath] = dirId;
                }
            }

            // Process files - use the File instances which have correct textFileInsertEvents
            for (const fileId in reconstruction.files) {
                const file = reconstruction.files[fileId];
                allFiles[fileId] = {
                    id: file.id,
                    parentDirectoryId: file.parentDirectoryId,
                    currentPath: file.currentPath,
                    textFileInsertEvents: file.textFileInsertEvents,
                    isDeleted: file.isDeleted
                };
                if (!file.isDeleted) {
                    pathToFileIdMap[file.currentPath] = fileId;
                }
            }

            const fsData = { allFiles, allDirs, pathToFileIdMap, pathToDirIdMap };
            fs.writeFileSync(
                path.join(storytellerDir, 'fs', 'filesAndDirs.json'),
                JSON.stringify(fsData, null, 2),
                'utf8'
            );

            // Write reconstructed files to disk
            for (const filePath in reconstruction.fileContents) {
                const fullPath = path.join(projectPath, filePath);
                fs.mkdirSync(path.dirname(fullPath), { recursive: true });
                fs.writeFileSync(fullPath, reconstruction.fileContents[filePath], 'utf8');
            }

            // Success!
            const openFolder = await vscode.window.showInformationMessage(
                `${MESSAGES.IMPORT_SUCCESS} at ${projectPath}`,
                'Open Folder'
            );

            if (openFolder === 'Open Folder') {
                await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(projectPath), false);
            }

        } catch (err) {
            console.error('Error importing playback:', err);
            vscode.window.showErrorMessage(`Failed to import playback: ${err.message}`);
        }
    });
}

module.exports = {
    importPlaybackFromUrl
};
