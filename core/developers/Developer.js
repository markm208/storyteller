const crypto = require('crypto');
/*
 * Every developer has an id, user name, email, platform info, website url, and avatar url.
 */
class Developer {
    constructor(userName, email, platform, platformUsername, websiteUrl, avatarURL, id) {
        this.id = (id || crypto.randomUUID());
        this.userName = userName;
        this.email = email;                    // null if not provided
        this.platform = platform;              // e.g., "github", "gitlab", null if not provided
        this.platformUsername = platformUsername;  // null if not provided
        this.websiteUrl = websiteUrl;          // personal website URL, null if not provided
        this.avatarURL = avatarURL;            // null if no source available
    }
}

module.exports = Developer;