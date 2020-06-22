async function step(numSteps) {

    //fetch all events that are needed
    try {
        
        const nextEvents = await Promise.all([
            fetch(`/event/start/${nextEventPosition}/numEvents/${nextEventPosition+numSteps}`)
        ]);


        const results = await Promise.all([
            nextEvents[0].json()
        ]);

        eventsObject.events = results[0];


    } catch(err) {
        console.log(`Error retrieving data`);
    }

    //put returned events into  eventsObject.events

    //move forward
    if(numSteps > 0) {
        stepForward(numSteps);
    } else if(numSteps < 0) { //move backward
        stepBackward(-numSteps);
    } //else- no need to move at all
    
    //update the position of the slider
    playbackSlider.value = nextEventPosition;
}

function stepForward(numSteps) {
    //if there is room to move in the forward direction
    if(nextEventPosition < numEvents) {
        //holds the next event to animate
        let nextEvent;

        //timing for debug purposes
        //const t0 = performance.now();

        //go through the requested number of steps
        for(let i = 0;i < numSteps;i++) {
            //grab the next event to animate
            nextEvent = eventsObject.events[i];

            //check the event type and call the corresponding function for that event type
            switch (nextEvent.type)
            {
                case 'INSERT':
                //call the insertEvent function found in playbackEventFunctions.js
                insertEvent(nextEvent);
                break;

                case 'DELETE':
                //call the deleteEvent function found in playbackEventFunctions.js
                deleteEvent(nextEvent);
                break;

                case 'CREATE FILE':
                //call the createFileEvent function found in playbackEventFunctions.js
                createFileEvent(nextEvent);
                break;
            }
            
            //move the next event
            nextEventPosition++;

            //if we played the last event
            if(nextEventPosition === eventsObject.events.length) {
                break;
            }
        }

        //const t1 = performance.now();
        //console.log(`step forward took: ${t1-t0} ms`);
    }
}

function stepBackward(numSteps) {
    //if there is room to move backwards
    if(nextEventPosition > 0) {
        //holds the next event to animate
        let nextEvent;

        //to account for the fact that nextEventPosition always 
        //refers to the next event to animate in the forward 
        //direction I move it back by one position
        nextEventPosition--;

        //go through the requested number of steps
        for(let i = 0;i < numSteps;i++) {
            //grab the next event to de-animate
            nextEvent = eventsObject.events[i];

            //check the event type and call the corresponding function for that event type
            switch (nextEvent.type)
            {
                case 'INSERT':
                //call the deleteEvent function found in playbackEventFunctions.js
                deleteEvent(nextEvent);
                break;

                case 'DELETE':
                //call the insertEvent function found in playbackEventFunctions.js
                insertEvent(nextEvent);
                break;

                case 'CREATE FILE':
                //call the deleteFileEvent function found in playbackEventFunctions.js
                deleteFileEvent(nextEvent);
                break;
            }

            //move to the previous event
            nextEventPosition--;

            //if we just played back the first event and then decremented
            if(nextEventPosition < 0) {
                break;
            }
        }

        //after moving backwards, account for the fact that this
        //always refers to the next index to animate in the forward
        //direction
        nextEventPosition++;
    }
}