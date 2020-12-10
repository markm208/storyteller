const md5 = require('md5');
/*
 * Every developer has an id, user name, email, and avatar url.
 * A developer's id is auto-generated.
 */
class Developer {
    constructor(userName, email, avatarURL, id) {
        //generate an id if one is not supplied
        this.id = id || this.generateId(); 
        //set the user name and email
        this.userName = userName;
        this.email = email.toLowerCase().trim();
        //url for a gravatar avatar 
        if(avatarURL) {
            this.avatarURL = avatarURL;
        } else {
            //generate a gravatar url with a md5 hash of the email
            this.avatarURL = `https://www.gravatar.com/avatar/${md5(this.email)}`;
        }
    }

    generateId() {
        //use the static nextId to generate a string with a dev id
        const newId = `devId-${Developer.nextId}`;
        
        //increase for the next dev
        Developer.nextId++;

        return newId;
    }
}
//used to autogenerate ids
Developer.nextId = 0;

module.exports = Developer;