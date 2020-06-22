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


async function InitializePlayback()
{
    try {
        const eventsList = await Promise.all([
            fetch('/event')
        ]);

        const results = await Promise.all([
            eventsList[0].json()
        ]);

        eventsObject.events = results[0];

        AddEventListeners();


    } catch(err) {
        console.log(`Error retrieving data`);
    }
}

function AddEventListeners()
{
    //get the controls
    const stepBackOne = document.getElementById("stepBackOne");
    const stepForwardOne = document.getElementById("stepForwardOne");
    const restartButton = document.getElementById("restartButton");
    const playbackSlider = document.getElementById("playbackSlider");
    const highlightButton = document.getElementById("highlightButton");

    //Get references to the tabs and where the tabs get their content
    const tabsList = document.getElementById("tabsList");
    const tabContent = document.getElementById("tabContent");

    playbackSlider.setAttribute("max", eventsObject.events.length);
    
    //add event handlers for clicking the buttons
    stepBackOne.addEventListener("click", event => {
        step(-1);
    });

    stepForwardOne.addEventListener("click", event => {
        step(1);
    });

    //The restart will be depreciated soon
    restartButton.addEventListener("click", event => {
        
        //reset the next event and the slider
        nextEventPosition = 0;
        playbackSlider.value = 0;

        //for measuring which approach is faster
        //get the starting timestamp
        const t0 = performance.now();

        editor.setValue("");

        //get the ending timestamp
        const t1 = performance.now();

        //print the duration in ms
        console.log(`Reset took: ${(t1 - t0)} ms`);
    });

    //add event handler to listen for changes to the slider
    playbackSlider.addEventListener("input", event => {
        //DEBUG
        // console.log(`slide: ${playbackSlider.value}`);
        
        //take the slider value and subtract the next event's position
        step(playbackSlider.value - nextEventPosition);
    });

    highlightButton.addEventListener("click", event =>{
        //get the selected code
        //const selection = editor.getSession().getSelection().getRange();
        const selections = editor.getSession().getSelection().getAllRanges();

        //clear any existing highlights
        clearHighlights();
        
        for (let i = 0; i < selections.length; i++){
            //add the highlight to the selected code
            addHighlight(selections[i].start.row, selections[i].start.column, selections[i].end.row, selections[i].end.column);
        }
    });
}
