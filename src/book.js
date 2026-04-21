const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const { MESSAGES, STORYTELLER_DIR } = require('./constants');

/**
 * Global state key for recently used books
 */
const RECENT_BOOKS_KEY = 'storyteller.recentBooks';

/**
 * Converts a title to a filesystem-safe slug
 * @param {string} text - Text to convert
 * @returns {string} Slugified text
 */
function slugify(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') //remove non-word characters except spaces and hyphens, numbers are allowed
        .replace(/\s+/g, '-') //replace spaces with hyphens
        .replace(/-+/g, '-') //replace multiple hyphens with a single one
        .substring(0, 50); //limit length to 50 characters
}

/**
 * Validates the structure of a book.json file
 * @param {Object} bookData - Parsed book.json contents
 * @returns {Object} Validation result with isValid and errors
 */
function validateBookJson(bookData) {
    const errors = [];

    //if no title or title is not a string
    if (!bookData.title || typeof bookData.title !== 'string') {
        errors.push('Missing or invalid "title" field');
    }

    //if no authors or authors is not an array or empty
    if (!Array.isArray(bookData.authors) || bookData.authors.length === 0) {
        errors.push('Missing or invalid "authors" array');
    } else {
        //there are authors but check each one has a name and name is a string
        bookData.authors.forEach((author, i) => {
            if (!author.name || typeof author.name !== 'string') {
                errors.push(`Author ${i + 1} missing "name" field`);
            }
        });
    }

    //if no chapters or chapters is not an array
    if (!Array.isArray(bookData.chapters)) {
        errors.push('Missing or invalid "chapters" array');
    } else {
        //there are chapters but check each one has a title and a (possibly empty) playbacks array
        bookData.chapters.forEach((chapter, i) => {
            if (!chapter.title || typeof chapter.title !== 'string') {
                errors.push(`Chapter ${i + 1} missing "title" field`);
            }
            if (!Array.isArray(chapter.playbacks)) {
                errors.push(`Chapter ${i + 1} missing "playbacks" array`);
            }
        });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Generates the HTML for the book's table of contents
 * @param {Object} bookData - Book data from book.json
 * @returns {string} HTML content
 */
function generateBookIndexHtml(bookData) {
    const templatePath = path.join(__dirname, '..', 'core', 'templates', 'book-index.html');
    let template = fs.readFileSync(templatePath, 'utf8');

    //build author HTML
    const authorsHtml = bookData.authors.map(author => {
        if (author.url) {
            return `<a href="${escapeHtml(author.url)}" target="_blank" rel="noopener">${escapeHtml(author.name)}</a>`;
        }
        return escapeHtml(author.name);
    }).join(', ');

    //build chapters HTML
    let chaptersHtml = '';
    bookData.chapters.forEach((chapter, chapterIndex) => {
        chaptersHtml += `
        <section class="chapter">
            <h2 class="chapter-title">${escapeHtml(chapter.title)}</h2>
            <ol class="playback-list">`;

        chapter.playbacks.forEach((playback, playbackIndex) => {
            //build author string for this playback
            let authorStr = '';
            if (playback.authors && playback.authors.length > 0) {
                const authorNames = playback.authors.map(a => {
                    if (a.url) {
                        return `<a href="${escapeHtml(a.url)}" target="_blank" rel="noopener">${escapeHtml(a.name)}</a>`;
                    }
                    return escapeHtml(a.name);
                }).join(', ');
                authorStr = ` <span class="playback-authors">by ${authorNames}</span>`;
            }

            chaptersHtml += `
                <li>
                    <a href="playbacks/${escapeHtml(playback.slug)}/index.html">${escapeHtml(playback.title)}</a>${authorStr}
                </li>`;
        });

        chaptersHtml += `
            </ol>
        </section>`;
    });

    //replace placeholders (use replaceAll for placeholders that appear multiple times)
    template = template.replaceAll('{{BOOK_TITLE}}', escapeHtml(bookData.title));
    template = template.replaceAll('{{AUTHORS}}', authorsHtml);
    template = template.replaceAll('{{CHAPTERS}}', chaptersHtml);

    return template;
}

/**
 * Generates the HTML for the playback viewer
 * @param {Object} bookData - Book data from book.json
 * @param {string} playbackTitle - Title of the playback
 * @returns {string} HTML content
 */
function generatePlaybackViewerHtml(bookData, playbackTitle) {
    const templatePath = path.join(__dirname, '..', 'core', 'templates', 'playback-viewer.html');
    let template = fs.readFileSync(templatePath, 'utf8');

    // Replace placeholders (use replaceAll for placeholders that may appear multiple times)
    template = template.replaceAll('{{PLAYBACK_TITLE}}', escapeHtml(playbackTitle));
    template = template.replaceAll('{{BOOK_TITLE}}', escapeHtml(bookData.title));
    template = template.replaceAll('{{AI_API_URL}}', bookData.aiApiUrl ? escapeHtml(bookData.aiApiUrl) : '');

    return template;
}

/**
 * Generates the HTML for a standalone playback
 * @param {string} playbackTitle - Title of the playback
 * @returns {string} HTML content
 */
function generateStandalonePlaybackHtml(playbackTitle) {
    const templatePath = path.join(__dirname, '..', 'core', 'templates', 'standalone-playback.html');
    let template = fs.readFileSync(templatePath, 'utf8');

    template = template.replaceAll('{{PLAYBACK_TITLE}}', escapeHtml(playbackTitle));

    return template;
}

/**
 * Generates the README for a standalone playback
 * @param {string} playbackTitle - Title of the playback
 * @param {string} slug - Directory slug for the playback
 * @returns {string} README content
 */
function generateStandaloneReadme(playbackTitle, slug) {
    const templatePath = path.join(__dirname, '..', 'core', 'templates', 'standalone-readme.md');
    let template = fs.readFileSync(templatePath, 'utf8');

    template = template.replaceAll('{{PLAYBACK_TITLE}}', playbackTitle);
    template = template.replaceAll('{{SLUG}}', slug);

    return template;
}

/**
 * Generates the README for a book
 * @param {string} title - Book title
 * @param {Array} authors - Array of author objects with name property
 * @param {string} slug - Directory slug for the book
 * @returns {string} README content
 */
function generateBookReadme(title, authors, slug) {
    const templatePath = path.join(__dirname, '..', 'core', 'templates', 'book-readme.md');
    let template = fs.readFileSync(templatePath, 'utf8');

    const authorNames = authors.map(a => a.name).join(', ');

    template = template.replaceAll('{{BOOK_TITLE}}', title);
    template = template.replaceAll('{{AUTHORS}}', authorNames);
    template = template.replaceAll('{{SLUG}}', slug);

    return template;
}

/**
 * Extracts author information from the project's developers
 * Filters out system and anonymous developers
 * @param {Object} projectManager - The project manager instance
 * @returns {Array} Array of author objects with name and url
 */
function getAuthorsFromPlayback(projectManager) {
    const devManager = projectManager.developerManager;
    const authors = [];

    const platformURLs = {
        'github': (username) => `https://github.com/${username}`,
        'gitlab': (username) => `https://gitlab.com/${username}`
    };

    for (const devId in devManager.allDevelopers) {
        // Skip system and anonymous developers
        if (devId === devManager.systemDeveloperId || devId === devManager.anonymousDeveloperId) {
            continue;
        }

        const dev = devManager.allDevelopers[devId];
        let url = null;

        // Use website URL if provided (preferred)
        if (dev.websiteUrl) {
            url = dev.websiteUrl;
        }
        // Fall back to platform URL
        else if (dev.platform && dev.platformUsername) {
            const urlBuilder = platformURLs[dev.platform];
            url = urlBuilder ? urlBuilder(dev.platformUsername) : null;
        }
        // Fall back to email
        else if (dev.email) {
            url = `mailto:${dev.email}`;
        }

        authors.push({
            name: dev.userName,
            url: url
        });
    }

    return authors;
}

/**
 * Gets playback data as a JavaScript file string
 * This approach works with file:// protocol unlike fetch()
 * @param {Object} projectManager - The project manager instance
 * @param {string} aiApiUrl - Optional AI API URL to include
 * @returns {string} JavaScript code that defines PLAYBACK_DATA constant
 */
function getPlaybackDataAsJs(projectManager, aiApiUrl = null) {
    // Get all events
    const events = projectManager.getAllEvents();
    const comments = projectManager.commentManager.comments;
    const devManager = projectManager.developerManager;

    // Generate JavaScript that creates a global constant (works with file:// protocol)
    const js =
`const PLAYBACK_DATA = {
    events: ${JSON.stringify(events)},
    numEvents: ${events.length},
    comments: ${JSON.stringify(comments)},
    isEditable: false,
    developers: ${JSON.stringify(devManager.allDevelopers)},
    developerGroups: ${JSON.stringify(devManager.allDeveloperGroups)},
    anonymousDeveloperId: ${JSON.stringify(devManager.anonymousDeveloperId)},
    anonymousDeveloperGroupId: ${JSON.stringify(devManager.anonymousDeveloperGroupId)},
    systemDeveloperId: ${JSON.stringify(devManager.systemDeveloperId)},
    systemDeveloperGroupId: ${JSON.stringify(devManager.systemDeveloperGroupId)},
    playbackTitle: ${JSON.stringify(projectManager.project.title)},
    branchId: ${JSON.stringify(projectManager.project.branchId)},
    estimatedReadTime: ${projectManager.getReadTimeEstimate()},
    aiApiUrl: ${aiApiUrl ? JSON.stringify(aiApiUrl) : 'null'},
    aiEnabled: ${aiApiUrl ? 'true' : 'false'}
};`;
    return js;
}

/**
 * Prompts user to select a book directory
 * @param {vscode.ExtensionContext} context - Extension context for state
 * @returns {string|null} Selected book path or null
 */
async function promptForBookSelection(context) {
    // Get recent books from global state
    const recentBooks = context.globalState.get(RECENT_BOOKS_KEY, []);

    // Build quick pick items
    const items = [];

    // Add recent books
    for (const bookPath of recentBooks) {
        if (fs.existsSync(path.join(bookPath, 'book.json'))) {
            try {
                const bookData = JSON.parse(fs.readFileSync(path.join(bookPath, 'book.json'), 'utf8'));
                items.push({
                    label: bookData.title,
                    description: bookPath,
                    bookPath: bookPath
                });
            } catch (e) {
                // Skip invalid books
            }
        }
    }

    // Add option to browse for a book
    items.push({
        label: '$(folder) Browse for book folder...',
        description: 'Select a folder containing book.json',
        bookPath: null
    });

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: MESSAGES.BOOK_SELECT_PROMPT
    });

    if (!selected) return null;

    let bookPath = selected.bookPath;

    if (!bookPath) {
        // Browse for folder
        const folders = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select Book Folder',
            title: 'Select a folder containing book.json'
        });

        if (!folders || folders.length === 0) return null;
        bookPath = folders[0].fsPath;
    }

    // Verify book.json exists
    if (!fs.existsSync(path.join(bookPath, 'book.json'))) {
        vscode.window.showErrorMessage(MESSAGES.ERROR_BOOK_NOT_FOUND);
        return null;
    }

    // Update recent books
    await updateRecentBooks(context, bookPath);

    return bookPath;
}

/**
 * Updates the recent books list in global state
 * @param {vscode.ExtensionContext} context - Extension context
 * @param {string} bookPath - Path to add
 */
async function updateRecentBooks(context, bookPath) {
    let recentBooks = context.globalState.get(RECENT_BOOKS_KEY, []);

    // Remove if already exists
    recentBooks = recentBooks.filter(p => p !== bookPath);

    // Add to front
    recentBooks.unshift(bookPath);

    // Keep only last 10
    recentBooks = recentBooks.slice(0, 10);

    await context.globalState.update(RECENT_BOOKS_KEY, recentBooks);
}

/**
 * Escapes HTML special characters &, <, >, ", ' to prevent injection issues
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;') 
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Parses author info string into name and URL
 * Supports: 'Name', 'Name @username', 'Name @gitlab:username', 'Name email@example.com', 'Name https://...'
 * @param {string} authorString - Author info string
 * @returns {Object} Object with name and url
 */
function parseAuthorInfo(authorString) {
    const trimmed = authorString.trim();
    const parts = trimmed.split(/\s+/);

    if (parts.length === 0 || trimmed === '') {
        return { name: trimmed, url: null };
    }

    const lastPart = parts[parts.length - 1];

    // Check if last part is a URL
    if (lastPart.startsWith('http://') || lastPart.startsWith('https://')) {
        parts.pop();
        return {
            name: parts.join(' '),
            url: lastPart
        };
    }

    // Check if last part is platform username (@username or @platform:username, without dot)
    if (lastPart.startsWith('@') && !lastPart.includes('.')) {
        const platformPart = lastPart.substring(1); // Remove @
        let url;

        // Check for platform:username format (e.g., @gitlab:username)
        if (platformPart.includes(':')) {
            const [platform, username] = platformPart.split(':');
            const platformURLs = {
                'github': `https://github.com/${username}`,
                'gitlab': `https://gitlab.com/${username}`
            };
            url = platformURLs[platform.toLowerCase()] || `https://github.com/${username}`;
        } else {
            // Default to github
            url = `https://github.com/${platformPart}`;
        }

        parts.pop();
        return {
            name: parts.join(' '),
            url: url
        };
    }

    // Check if last part is an email (contains @ and .)
    if (lastPart.includes('@') && lastPart.includes('.')) {
        parts.pop();
        return {
            name: parts.join(' '),
            url: `mailto:${lastPart}`
        };
    }

    // Just a name
    return { name: trimmed, url: null };
}

/*****************************************************************************
 * Command Handlers
 *****************************************************************************/

/**
 * Creates a new book directory structure
 * @param {Object} state - Shared extension state
 * @param {vscode.ExtensionContext} context - Extension context
 */
async function createNewBook(state, context) {
    // Prompt for book title
    const title = await vscode.window.showInputBox({
        prompt: MESSAGES.BOOK_TITLE_PROMPT,
        validateInput: value => value && value.trim() ? null : 'Title is required'
    });
    if (!title) return;

    // Prompt for author name(s)
    const authorInput = await vscode.window.showInputBox({
        prompt: MESSAGES.BOOK_AUTHOR_PROMPT,
        validateInput: value => value && value.trim() ? null : 'At least one author is required'
    });
    if (!authorInput) return;

    // Parse authors (supports: "Name @username" or "Name @gitlab:username" or "Name https://...")
    const authorStrings = authorInput.split(',').map(s => s.trim()).filter(s => s);
    const authors = authorStrings.map(parseAuthorInfo);

    // Prompt for directory slug
    const defaultSlug = slugify(title);
    const slug = await vscode.window.showInputBox({
        prompt: MESSAGES.BOOK_SLUG_PROMPT,
        value: defaultSlug,
        validateInput: value => {
            if (!value || !value.trim()) return 'Directory name is required';
            if (!/^[a-z0-9-]+$/.test(value)) return 'Use only lowercase letters, numbers, and hyphens';
            return null;
        }
    });
    if (!slug) return;

    // Prompt for AI API URL
    const aiApiUrl = await vscode.window.showInputBox({
        prompt: MESSAGES.BOOK_AI_URL_PROMPT
    });

    // Prompt for destination folder
    const folders = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Select Destination',
        title: 'Choose where to create the book folder'
    });

    if (!folders || folders.length === 0) return;

    const destinationPath = folders[0].fsPath;
    const bookPath = path.join(destinationPath, slug);

    // Check if folder already exists
    if (fs.existsSync(bookPath)) {
        vscode.window.showErrorMessage(`Folder "${slug}" already exists in this location`);
        return;
    }

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Creating book structure',
        cancellable: false
    }, async (progress) => {
        try {
            // Create directory structure
            progress.report({ message: 'Creating directories...' });

            fs.mkdirSync(bookPath, { recursive: true });
            fs.mkdirSync(path.join(bookPath, 'assets', 'js'), { recursive: true });
            fs.mkdirSync(path.join(bookPath, 'playbacks'), { recursive: true });

            // Create book.json
            progress.report({ message: 'Creating book.json...' });

            const bookData = {
                title,
                authors,
                aiApiUrl: aiApiUrl || null,
                chapters: []
            };
            fs.writeFileSync(
                path.join(bookPath, 'book.json'),
                JSON.stringify(bookData, null, 2),
                'utf8'
            );

            // Generate index.html
            progress.report({ message: 'Generating index.html...' });

            const indexHtml = generateBookIndexHtml(bookData);
            fs.writeFileSync(path.join(bookPath, 'index.html'), indexHtml, 'utf8');

            // Create README.md
            progress.report({ message: 'Creating README.md...' });

            const readme = generateBookReadme(title, authors, slug);
            fs.writeFileSync(path.join(bookPath, 'README.md'), readme, 'utf8');

            // Copy JavaScript assets
            progress.report({ message: 'Copying JavaScript assets...' });

            const publicJsPath = path.join(__dirname, '..', 'core', 'public', 'js');
            copyDirectoryRecursive(publicJsPath, path.join(bookPath, 'assets', 'js'));

            // Update recent books
            await updateRecentBooks(context, bookPath);

            vscode.window.showInformationMessage(`${MESSAGES.BOOK_CREATED} at ${bookPath} view the README.md in that folder for deployment instructions.`);
        } catch (err) {
            console.error('Error creating book:', err);
            vscode.window.showErrorMessage(`Failed to create book: ${err.message}`);
        }
    });
}

/**
 * Adds the current playback to a book
 * @param {Object} state - Shared extension state
 * @param {vscode.ExtensionContext} context - Extension context
 */
async function addPlaybackToBook(state, context) {
    // Verify Storyteller is active
    if (!state.isActive || !state.projectManager) {
        vscode.window.showErrorMessage(MESSAGES.ERROR_STORYTELLER_REQUIRED);
        return;
    }

    // Select book
    const bookPath = await promptForBookSelection(context);
    if (!bookPath) return;

    // Read and validate book.json
    let bookData;
    try {
        bookData = JSON.parse(fs.readFileSync(path.join(bookPath, 'book.json'), 'utf8'));
        const validation = validateBookJson(bookData);
        if (!validation.isValid) {
            vscode.window.showErrorMessage(`${MESSAGES.ERROR_BOOK_INVALID}: ${validation.errors.join(', ')}`);
            return;
        }
    } catch (err) {
        vscode.window.showErrorMessage(`Error reading book.json: ${err.message}`);
        return;
    }

    // Prompt for playback title
    const defaultTitle = state.projectManager.project.title;
    const playbackTitle = await vscode.window.showInputBox({
        prompt: MESSAGES.BOOK_PLAYBACK_TITLE_PROMPT,
        value: defaultTitle,
        validateInput: value => value && value.trim() ? null : 'Title is required'
    });
    if (!playbackTitle) return;

    // Prompt for chapter selection
    const chapterItems = bookData.chapters.map((ch, i) => ({
        label: ch.title,
        index: i
    }));
    chapterItems.push({
        label: '$(add) Create new chapter...',
        index: -1
    });

    const selectedChapter = await vscode.window.showQuickPick(chapterItems, {
        placeHolder: MESSAGES.BOOK_CHAPTER_PROMPT
    });
    if (!selectedChapter) return;

    let chapterIndex = selectedChapter.index;

    if (chapterIndex === -1) {
        // Create new chapter
        const chapterTitle = await vscode.window.showInputBox({
            prompt: 'Enter new chapter title',
            validateInput: value => value && value.trim() ? null : 'Title is required'
        });
        if (!chapterTitle) return;

        bookData.chapters.push({
            title: chapterTitle,
            playbacks: []
        });
        chapterIndex = bookData.chapters.length - 1;
    }

    // Generate playback slug
    const playbackSlug = slugify(playbackTitle);

    // Check for existing playback with same slug
    const playbackDir = path.join(bookPath, 'playbacks', playbackSlug);
    if (fs.existsSync(playbackDir)) {
        const overwrite = await vscode.window.showQuickPick(
            MESSAGES.YES_NO_OPTIONS,
            { placeHolder: `Playback "${playbackSlug}" already exists. Overwrite?` }
        );
        if (overwrite !== MESSAGES.YES_NO_OPTIONS[0]) return;
    }

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Adding playback to book',
        cancellable: false
    }, async (progress) => {
        try {
            // Create playback directory
            progress.report({ message: 'Creating playback directory...' });

            fs.mkdirSync(playbackDir, { recursive: true });
            fs.mkdirSync(path.join(playbackDir, 'media'), { recursive: true });

            // Generate playback.js (using JS file instead of JSON for file:// compatibility)
            progress.report({ message: 'Generating playback data...' });

            const playbackJs = getPlaybackDataAsJs(state.projectManager, bookData.aiApiUrl);
            fs.writeFileSync(
                path.join(playbackDir, 'playback.js'),
                playbackJs,
                'utf8'
            );

            // Generate playback viewer HTML
            progress.report({ message: 'Generating viewer HTML...' });

            const viewerHtml = generatePlaybackViewerHtml(bookData, playbackTitle);
            fs.writeFileSync(path.join(playbackDir, 'index.html'), viewerHtml, 'utf8');

            // Update JavaScript assets (ensures latest viewer code)
            progress.report({ message: 'Updating JavaScript assets...' });

            const publicJsPath = path.join(__dirname, '..', 'core', 'public', 'js');
            copyDirectoryRecursive(publicJsPath, path.join(bookPath, 'assets', 'js'));

            // Copy media files
            progress.report({ message: 'Copying media files...' });

            const projectDirPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
            copyMediaFiles(projectDirPath, playbackDir);

            // Update book.json
            progress.report({ message: 'Updating book.json...' });

            // Get authors from the playback
            const playbackAuthors = getAuthorsFromPlayback(state.projectManager);

            // Remove any existing entry with same slug in this chapter
            bookData.chapters[chapterIndex].playbacks =
                bookData.chapters[chapterIndex].playbacks.filter(p => p.slug !== playbackSlug);

            // Add new entry with authors
            bookData.chapters[chapterIndex].playbacks.push({
                title: playbackTitle,
                slug: playbackSlug,
                authors: playbackAuthors
            });

            fs.writeFileSync(
                path.join(bookPath, 'book.json'),
                JSON.stringify(bookData, null, 2),
                'utf8'
            );

            // Regenerate index.html
            progress.report({ message: 'Regenerating index...' });

            const indexHtml = generateBookIndexHtml(bookData);
            fs.writeFileSync(path.join(bookPath, 'index.html'), indexHtml, 'utf8');

            vscode.window.showInformationMessage(MESSAGES.BOOK_PLAYBACK_ADDED);
        } catch (err) {
            console.error('Error adding playback to book:', err);
            vscode.window.showErrorMessage(`Failed to add playback: ${err.message}`);
        }
    });
}

/**
 * Regenerates the book's index.html from book.json
 * @param {Object} state - Shared extension state
 * @param {vscode.ExtensionContext} context - Extension context
 */
async function regenerateBookIndex(state, context) {
    // Select book
    const bookPath = await promptForBookSelection(context);
    if (!bookPath) return;

    // Read and validate book.json
    let bookData;
    try {
        bookData = JSON.parse(fs.readFileSync(path.join(bookPath, 'book.json'), 'utf8'));
        const validation = validateBookJson(bookData);
        if (!validation.isValid) {
            vscode.window.showErrorMessage(`${MESSAGES.ERROR_BOOK_INVALID}: ${validation.errors.join(', ')}`);
            return;
        }
    } catch (err) {
        vscode.window.showErrorMessage(`Error reading book.json: ${err.message}`);
        return;
    }

    try {
        // Update JavaScript assets (ensures latest viewer code)
        const publicJsPath = path.join(__dirname, '..', 'core', 'public', 'js');
        copyDirectoryRecursive(publicJsPath, path.join(bookPath, 'assets', 'js'));

        // Regenerate index.html
        const indexHtml = generateBookIndexHtml(bookData);
        fs.writeFileSync(path.join(bookPath, 'index.html'), indexHtml, 'utf8');

        vscode.window.showInformationMessage(MESSAGES.BOOK_INDEX_REGENERATED);
    } catch (err) {
        console.error('Error regenerating book index:', err);
        vscode.window.showErrorMessage(`Failed to regenerate index: ${err.message}`);
    }
}

/**
 * Deletes a playback from a book
 * @param {Object} state - Shared extension state
 * @param {vscode.ExtensionContext} context - Extension context
 */
async function deletePlaybackFromBook(state, context) {
    // Select book
    const bookPath = await promptForBookSelection(context);
    if (!bookPath) return;

    // Read book.json
    let bookData;
    try {
        bookData = JSON.parse(fs.readFileSync(path.join(bookPath, 'book.json'), 'utf8'));
    } catch (err) {
        vscode.window.showErrorMessage(`Error reading book.json: ${err.message}`);
        return;
    }

    // Build list of all playbacks
    const playbackItems = [];
    bookData.chapters.forEach((chapter, chapterIndex) => {
        chapter.playbacks.forEach((playback, playbackIndex) => {
            playbackItems.push({
                label: playback.title,
                description: `Chapter: ${chapter.title}`,
                chapterIndex,
                playbackIndex,
                slug: playback.slug
            });
        });
    });

    if (playbackItems.length === 0) {
        vscode.window.showInformationMessage(MESSAGES.ERROR_NO_PLAYBACKS);
        return;
    }

    // Select playback to delete
    const selected = await vscode.window.showQuickPick(playbackItems, {
        placeHolder: 'Select a playback to delete'
    });
    if (!selected) return;

    // Confirm deletion
    const deleteFiles = await vscode.window.showQuickPick([
        { label: 'Yes, delete files too', deleteFiles: true },
        { label: 'No, only remove from book.json', deleteFiles: false },
        { label: 'Cancel', cancel: true }
    ], {
        placeHolder: 'Also delete the playback files from disk?'
    });

    if (!deleteFiles || deleteFiles.cancel) return;

    try {
        // Remove from book.json
        bookData.chapters[selected.chapterIndex].playbacks.splice(selected.playbackIndex, 1);

        // Remove empty chapters if desired (keep them for now)

        fs.writeFileSync(
            path.join(bookPath, 'book.json'),
            JSON.stringify(bookData, null, 2),
            'utf8'
        );

        // Optionally delete files
        if (deleteFiles.deleteFiles) {
            const playbackDir = path.join(bookPath, 'playbacks', selected.slug);
            if (fs.existsSync(playbackDir)) {
                fs.rmSync(playbackDir, { recursive: true, force: true });
            }
        }

        // Regenerate index.html
        const indexHtml = generateBookIndexHtml(bookData);
        fs.writeFileSync(path.join(bookPath, 'index.html'), indexHtml, 'utf8');

        vscode.window.showInformationMessage(MESSAGES.BOOK_PLAYBACK_DELETED);
    } catch (err) {
        console.error('Error deleting playback:', err);
        vscode.window.showErrorMessage(`Failed to delete playback: ${err.message}`);
    }
}

/**
 * Sets or updates the AI API URL for a book
 * @param {Object} state - Shared extension state
 * @param {vscode.ExtensionContext} context - Extension context
 */
async function setAiApiUrl(state, context) {
    // Select book
    const bookPath = await promptForBookSelection(context);
    if (!bookPath) return;

    // Read book.json
    let bookData;
    try {
        bookData = JSON.parse(fs.readFileSync(path.join(bookPath, 'book.json'), 'utf8'));
    } catch (err) {
        vscode.window.showErrorMessage(`Error reading book.json: ${err.message}`);
        return;
    }

    // Prompt for new URL
    const currentUrl = bookData.aiApiUrl || '';
    const newUrl = await vscode.window.showInputBox({
        prompt: 'Enter AI API URL (leave empty to clear)',
        value: currentUrl
    });

    if (newUrl === undefined) return; // Cancelled

    try {
        // Update book.json
        bookData.aiApiUrl = newUrl || null;
        fs.writeFileSync(
            path.join(bookPath, 'book.json'),
            JSON.stringify(bookData, null, 2),
            'utf8'
        );

        vscode.window.showInformationMessage(MESSAGES.BOOK_AI_URL_UPDATED);
    } catch (err) {
        console.error('Error updating AI API URL:', err);
        vscode.window.showErrorMessage(`Failed to update AI API URL: ${err.message}`);
    }
}

/**
 * Exports the current playback as a standalone GitHub/GitLab Pages site
 * @param {Object} state - Shared extension state
 * @param {vscode.ExtensionContext} context - Extension context
 */
async function exportStandalonePlayback(state, context) {
    // Verify Storyteller is active
    if (!state.isActive || !state.projectManager) {
        vscode.window.showErrorMessage(MESSAGES.ERROR_STORYTELLER_REQUIRED);
        return;
    }

    // Get playback title from project
    const playbackTitle = state.projectManager.project.title;

    // Prompt for directory slug
    const defaultSlug = slugify(playbackTitle);
    const slug = await vscode.window.showInputBox({
        prompt: MESSAGES.STANDALONE_SLUG_PROMPT,
        value: defaultSlug,
        validateInput: value => {
            if (!value || !value.trim()) return 'Directory name is required';
            if (!/^[a-z0-9-]+$/.test(value)) return 'Use only lowercase letters, numbers, and hyphens';
            return null;
        }
    });
    if (!slug) return;

    // Prompt for AI API URL (optional)
    const aiApiUrl = await vscode.window.showInputBox({
        prompt: MESSAGES.STANDALONE_AI_URL_PROMPT
    });

    // Prompt for destination folder
    const folders = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Select Destination',
        title: 'Choose where to create the playback folder'
    });

    if (!folders || folders.length === 0) return;

    const destinationPath = folders[0].fsPath;
    const playbackPath = path.join(destinationPath, slug);

    // Check if folder already exists
    if (fs.existsSync(playbackPath)) {
        const overwrite = await vscode.window.showQuickPick(
            MESSAGES.YES_NO_OPTIONS,
            { placeHolder: `Folder "${slug}" already exists. Overwrite?` }
        );
        if (overwrite !== MESSAGES.YES_NO_OPTIONS[0]) return;

        // Remove existing folder
        fs.rmSync(playbackPath, { recursive: true, force: true });
    }

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Exporting standalone playback',
        cancellable: false
    }, async (progress) => {
        try {
            // Create directory structure
            progress.report({ message: 'Creating directories...' });

            fs.mkdirSync(playbackPath, { recursive: true });
            fs.mkdirSync(path.join(playbackPath, 'js'), { recursive: true });
            fs.mkdirSync(path.join(playbackPath, 'media'), { recursive: true });

            // Copy JavaScript assets
            progress.report({ message: 'Copying JavaScript assets...' });

            const publicJsPath = path.join(__dirname, '..', 'core', 'public', 'js');
            copyDirectoryRecursive(publicJsPath, path.join(playbackPath, 'js'));

            // Generate playback.js
            progress.report({ message: 'Generating playback data...' });

            const playbackJs = getPlaybackDataAsJs(state.projectManager, aiApiUrl || null);
            fs.writeFileSync(path.join(playbackPath, 'playback.js'), playbackJs, 'utf8');

            // Generate index.html
            progress.report({ message: 'Generating index.html...' });

            const indexHtml = generateStandalonePlaybackHtml(playbackTitle);
            fs.writeFileSync(path.join(playbackPath, 'index.html'), indexHtml, 'utf8');

            // Generate README.md
            progress.report({ message: 'Creating README.md...' });

            const readme = generateStandaloneReadme(playbackTitle, slug);
            fs.writeFileSync(path.join(playbackPath, 'README.md'), readme, 'utf8');

            // Create .gitlab-ci.yml
            progress.report({ message: 'Creating .gitlab-ci.yml...' });

            const gitlabCi = `# GitLab Pages deployment - GitHub users can ignore this file
pages:
  stage: deploy
  script:
    - mkdir .public
    - cp -r * .public
    - mv .public public
  artifacts:
    paths:
      - public
`;
            fs.writeFileSync(path.join(playbackPath, '.gitlab-ci.yml'), gitlabCi, 'utf8');

            // Copy media files
            progress.report({ message: 'Copying media files...' });

            const projectDirPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
            copyMediaFiles(projectDirPath, playbackPath);

            vscode.window.showInformationMessage(`${MESSAGES.STANDALONE_CREATED} at ${playbackPath} view the README.md in that folder for deployment instructions.`);
        } catch (err) {
            console.error('Error exporting standalone playback:', err);
            vscode.window.showErrorMessage(`Failed to export playback: ${err.message}`);
        }
    });
}

/*****************************************************************************
 * Helper Functions
 *****************************************************************************/

/**
 * Recursively copies a directory
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 */
function copyDirectoryRecursive(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src);

    for (const entry of entries) {
        const srcPath = path.join(src, entry);
        const destPath = path.join(dest, entry);
        const stats = fs.statSync(srcPath);

        if (stats.isDirectory()) {
            copyDirectoryRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

/**
 * Copies media files from a Storyteller project to a playback directory
 * @param {string} projectDirPath - Project directory path
 * @param {string} playbackDir - Destination playback directory
 */
function copyMediaFiles(projectDirPath, playbackDir) {
    const mediaTypes = ['images', 'videos', 'audios'];

    for (const mediaType of mediaTypes) {
        const sourcePath = path.join(
            projectDirPath,
            STORYTELLER_DIR,
            'comments',
            'media',
            mediaType
        );

        if (!fs.existsSync(sourcePath)) continue;

        const destPath = path.join(playbackDir, 'media', mediaType);
        fs.mkdirSync(destPath, { recursive: true });

        const files = fs.readdirSync(sourcePath);
        for (const file of files) {
            fs.copyFileSync(
                path.join(sourcePath, file),
                path.join(destPath, file)
            );
        }
    }
}

module.exports = {
    slugify,
    validateBookJson,
    generateBookIndexHtml,
    generatePlaybackViewerHtml,
    generateStandalonePlaybackHtml,
    generateStandaloneReadme,
    generateBookReadme,
    getPlaybackDataAsJs,
    getAuthorsFromPlayback,
    promptForBookSelection,
    createNewBook,
    addPlaybackToBook,
    regenerateBookIndex,
    deletePlaybackFromBook,
    setAiApiUrl,
    exportStandalonePlayback
};
