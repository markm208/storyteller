const crypto = require('crypto');

/*
 * Every developer group has an id and list of member dev ids.
 */
class DeveloperGroup {
    constructor(memberIds, id) {
        this.id = (id || crypto.randomUUID());
        this.memberIds = memberIds;
    }

    /*
     * Adds a developer id to the list of members in the dev group.
     */
    addDeveloperById(developerId) {
        if(this.memberIds.includes(developerId) === false) {
            this.memberIds.push(developerId);
        }
    }

    /*
     * Adds a developer id to the list of members in the dev group.
     */
    addDeveloper(developer) {
        this.addDeveloperById(developer.id);
    }

    /*
     * Adds a collection of developer ids to the list of members in the dev group.
     */
    addDeveloperByIds(developerIds) {
        developerIds.forEach(devId => this.addDeveloperById(devId));
    }

    /*
     * Removes a developer id from the list of members in the dev group.
     */
    removeDeveloperById(developerId) {
        const indexOfDevId = this.memberIds.indexOf(developerId);
        if(indexOfDevId !== -1) {
            this.memberIds.splice(indexOfDevId, 1);
        }
    }

    /*
     * Removes a developer id from the list of members in the dev group.
     */
    removeDeveloper(developer) {
        this.removeDeveloperById(developer.id);
    }

    /*
     * Indicates whether all of the developer ids are part of a dev group.
     */
    containsAllDevelopers(allDeveloperIds) {
        //whether the passed in dev ids match the member ids perfectly
        let retVal = false;

        //if there are exactly the same number of developer ids in the 
        //parameter that are in the members collection, otherwise they 
        //can be exactly equal
        if(allDeveloperIds.length === this.memberIds.length) {
            //find the dev ids who are in the member ids 
            return allDeveloperIds.every(candidateDevId => {
                return this.memberIds.includes(candidateDevId);
            });
        }

        return retVal;
    }
}

module.exports = DeveloperGroup;