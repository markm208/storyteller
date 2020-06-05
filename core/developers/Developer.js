/*
 * Every developer has an id, user name, and an email.
 * A developer's id is auto-generated.
 */
class Developer {
    constructor(userName, email, id) {
        //if an id is supplied, use it
        if(id) {
            this.id = id;
        } else {
            //generate an id
            this.id = this.generateId();
        }
        //set the user name and email
        this.userName = userName;
        this.email = email;
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