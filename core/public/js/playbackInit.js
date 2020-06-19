//this is a sample js file that can be served for playback. All js files added
//for playback should be placed in /core/public/js/ and the storyteller server
//will serve these. 

//We can use classes here instead of plain functions

//global array of events
let comments;
let developers;
let develeperGroups;
let events;
let files;
let directories;
let project;

async function init() {
    try {
        //use fetch to get the all the playback data
        const responses = await Promise.all([
            fetch('/comment'), 
            fetch('/developer'), 
            fetch('/developerGroup'), 
            fetch('/event'), 
            fetch('/file'), 
            fetch('/directory'), 
            fetch('/project')
        ]);

        //turn the responses into js objects
        const results = await Promise.all([
            responses[0].json(), 
            responses[1].json(), 
            responses[2].json(), 
            responses[3].json(), 
            responses[4].json(), 
            responses[5].json(), 
            responses[6].json()
        ]);

        //store the events in the global
        comments = results[0];
        developers = results[1];
        develeperGroups = results[2];
        events = results[3];
        files = results[4];
        directories = results[5];
        project = results[6];

        //debug
        console.log('Comments:');
        console.log(comments);
        console.log('Developers');
        console.log(developers);
        console.log('Developer Groups');
        console.log(develeperGroups);
        console.log('Events');
        console.log(events);
        console.log('Files (in the editor)');
        console.log(files);
        console.log('Directories (in the editor)');
        console.log(directories);
        console.log('Project');
        console.log(project);

    } catch(err) {
        console.log(`Error retrieving data`);
    }
}
