/*
 * Every developer group has an id and list of member dev ids.
 * A developer's id is auto-generated.
 */
class DeveloperGroup {
    constructor(id, memberIds) {
        //generate an id if one is not supplied
        this.id = id || this.generateId();
        //if the member ids are supplied use them
        if(memberIds) {
            this.memberIds = memberIds;
        } else {
            //create an empty array of member ids
            this.memberIds = [];
        }
    }

    generateId() {
        //use the static nextId to generate a string with a dev group id
        const newId = `devGroupId-${DeveloperGroup.nextId}`;
        
        //increase for the next dev group
        DeveloperGroup.nextId++;
        
        return newId;
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
            const presentDevIds = allDeveloperIds.filter(candidateDevId => {
                return this.memberIds.includes(candidateDevId);
            });
            //if the number present is the same as the number of members
            retVal = presentDevIds.length === allDeveloperIds.length;
        }

        return retVal;
    }
}
//used to autogenerate ids
DeveloperGroup.nextId = 0;

module.exports = DeveloperGroup;