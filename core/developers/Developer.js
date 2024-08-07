const crypto = require('crypto');
/*
 * Every developer has an id, user name, email, and avatar url.
 */
class Developer {
    constructor(userName, email, avatarURL, id) {
        this.id = (id || crypto.randomUUID());
        this.userName = userName;
        this.email = email;
        this.avatarURL = avatarURL;
    }
}

module.exports = Developer;