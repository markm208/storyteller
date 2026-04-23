/**
 * Shared utility functions for Storyteller
 */

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

module.exports = {
    slugify,
    escapeHtml,
    parseAuthorInfo
};
