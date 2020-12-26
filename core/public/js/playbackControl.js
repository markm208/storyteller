function step(numSteps) {
    //clear any existing highlights
    clearHighlights();
    removeActiveCommentAndGroup();
    if(numSteps !== 0) {
        clearNewCodeHighlights();
        clearInsertLineNumbers();
        clearDeleteLineNumbers();
        clearHighlightChangedFiles();
    } 
    //move forward
    if(numSteps > 0) {
        stepForward(numSteps);
    } else if(numSteps < 0) { //move backward
        stepBackward(-numSteps);
    } //else- no need to move at all
}
/*
 * Handles moving forward through some events.
 */
function stepForward(numSteps) {
    const firstEvent = playbackData.nextEventPosition === 1;

    //if there is room to move in the forward direction
    if(playbackData.nextEventPosition < playbackData.numEvents) {
        //holds the next event to animate
        let nextEvent;
        
        //the id of the file and dir to make active
        let activeFileId;
        let activeDirId;
        //the line number to scroll to
        let activeLineNumber;
        let activeColumn;
        //current developer group id
        let currentDeveloperGroupId;

        //timing for debug purposes
        //const t0 = performance.now();

        //only in the forward direction create an object to track and highlight new changes
        const newCodeMarkers = new NewCodeMarkerGenerator();

        //go through the requested number of steps
        for(let i = 0;i < numSteps;i++) {
            //grab the next event to animate
            nextEvent = playbackData.events[playbackData.nextEventPosition];
            //set the current developer group
            currentDeveloperGroupId = nextEvent.createdByDevGroupId;

            //reset the active file and dir ids (update them based on the next event)
            activeFileId = 'no-file-id';
            activeLineNumber = 0;
            activeDirId = 'no-dir-id';
            activeColumn = 0;

            //check the event type and call the corresponding function for that event type
            
            switch (nextEvent.type)
            {
                case 'INSERT':
                    //set the active file and line number
                    activeFileId = nextEvent.fileId;
                    activeLineNumber = nextEvent.lineNumber;
                    activeColumn = nextEvent.column;
                    //mark the new code
                    newCodeMarkers.insert(nextEvent);
                    //handle the latest event
                    insertEvent(nextEvent);
                    break;

                case 'DELETE':
                    //set the active file and line number
                    activeFileId = nextEvent.fileId;
                    activeLineNumber = nextEvent.lineNumber;
                    activeColumn = nextEvent.column;
                    //mark the new code
                    newCodeMarkers.delete(nextEvent);
                    //handle the latest event
                    deleteEvent(nextEvent);
                    break;

                case 'CREATE FILE':
                    //set the active file
                    activeFileId = nextEvent.fileId;
                    //mark the new file
                    newCodeMarkers.touchFile(nextEvent);
                    //handle the latest event
                    createFileEvent(nextEvent);
                    break;

                case 'DELETE FILE':
                    //set the active dir to be the one where the delete happened
                    activeDirId = nextEvent.parentDirectoryId;
                    //handle the latest event
                    deleteFileEvent(nextEvent);
                    break;

                case 'RENAME FILE':
                    //set the active file
                    activeFileId = nextEvent.fileId;
                    //mark the new file
                    newCodeMarkers.touchFile(nextEvent);
                    //handle the latest event
                    renameFileEvent(nextEvent);
                    break;

                case 'MOVE FILE':
                    //set the active file
                    activeFileId = nextEvent.fileId;
                    //mark the new file
                    newCodeMarkers.touchFile(nextEvent);
                    //handle the latest event
                    moveFileEvent(nextEvent);
                    break;

                case 'CREATE DIRECTORY':
                    //set the active dir
                    activeDirId = nextEvent.directoryId;
                    //handle the latest event
                    createDirectoryEvent(nextEvent);
                    break;

                case 'DELETE DIRECTORY':
                    //set the active dir to be the one where the delete happened
                    activeDirId = nextEvent.parentDirectoryId;
                    //handle the latest event
                    deleteDirectoryEvent(nextEvent);
                    break;

                case 'RENAME DIRECTORY':
                    //set the active dir
                    activeDirId = nextEvent.directoryId;
                    //handle the latest event
                    renameDirectoryEvent(nextEvent);
                    break;

                case 'MOVE DIRECTORY':
                    //set the active dir
                    activeDirId = nextEvent.directoryId;
                    //handle the latest event
                    moveDirectoryEvent(nextEvent);
                    break;
            }
            
            //move the next event
            playbackData.nextEventPosition++;

            //if we played the last event
            if(playbackData.nextEventPosition === playbackData.events.length) {
                break;
            }
        }

        //this is a fix for an issue where, if the playback is at the first event and a comment that has highlighted code is clicked
        //it would have to be clicked again to get the code window to scroll to the highlighted code
        if (firstEvent) {
            setTimeout(() => {
                scrollToLine(activeFileId, activeLineNumber, activeColumn);
            }, 1);
        }

        //make the correct editor active
        addFocusToTab(activeFileId);
        scrollToLine(activeFileId, activeLineNumber, activeColumn);

        //highlight the new code
        highlightNewCode(newCodeMarkers.getAllNewCodeMarkers());
        highlightInsertLineNumbers(newCodeMarkers.getAllInsertLineNumbers());
        highlightDeleteLineNumbers(newCodeMarkers.getAllDeleteLineNumbers());
        //tabs and fs view
        highlightChangedFiles(newCodeMarkers.getAllChangedFileIds());
        
        //update the current dev group avatars
        updateCurrentDeveloperGroupAvatars(currentDeveloperGroupId);
        
        //update the position of the slider
        const slider = document.getElementById('slider');
        slider.noUiSlider.set(playbackData.nextEventPosition);

        //store the latest dev group id
        playbackData.currentDeveloperGroupId = currentDeveloperGroupId;

        //highlight latest file and dir
        //addActiveFileStyling(activeFileId);
        //addActiveDirectoryStyling(activeDirId);

        //const t1 = performance.now();
        //console.log(`step forward took: ${t1-t0} ms`);
    } else {
        stopAutomaticPlayback();
    }
}
/*
 * Handles moving backward through some events.
 */
function stepBackward(numSteps) {
    //if there is room to move backwards
    if(playbackData.nextEventPosition > playbackData.numNonRelevantEvents) {
        //holds the next event to animate
        let nextEvent;

        //the id of the file to make active
        let activeFileId = 'no-file-id';
        //current developer group id
        let currentDeveloperGroupId;

        activeLineNumber = 0;
        activeColumn = 0;

        //to account for the fact that nextEventPosition always 
        //refers to the next event to animate in the forward 
        //direction I move it back by one position
        playbackData.nextEventPosition--;

        //go through the requested number of steps
        for(let i = 0;i < numSteps;i++) {
            //grab the next event to de-animate
            nextEvent = playbackData.events[playbackData.nextEventPosition];
            //set the current developer group
            currentDeveloperGroupId = nextEvent.createdByDevGroupId;

            //check the event type and call the corresponding function for that event type
            switch (nextEvent.type)
            {
                case 'INSERT':
                    //set the active file
                    activeFileId = nextEvent.fileId;
                    activeLineNumber = nextEvent.lineNumber;
                    activeColumn = nextEvent.column;
                    //inverse operation
                    insertEventReverse(nextEvent);
                    break;

                case 'DELETE':
                    //set the active file
                    activeFileId = nextEvent.fileId;
                    activeLineNumber = nextEvent.lineNumber;
                    activeColumn = nextEvent.column;
                    //inverse operation
                    deleteEventReverse(nextEvent);
                    break;

                case 'CREATE FILE':
                    //set the active file
                    activeFileId = 'no-file-id';
                    //inverse operation
                    createFileEventReverse(nextEvent);
                    break;

                case 'DELETE FILE':
                    //set the active file
                    activeFileId = nextEvent.fileId;
                    //inverse operation
                    deleteFileEventReverse(nextEvent);
                    break;

                case 'RENAME FILE':
                    //set the active file
                    activeFileId = nextEvent.fileId;
                    renameFileEventReverse(nextEvent);
                    break;

                case 'MOVE FILE':
                    //set the active file
                    activeFileId = nextEvent.fileId;
                    //inverse operation
                    moveFileEventReverse(nextEvent);
                    break;

                case 'CREATE DIRECTORY':
                    //set the active file
                    activeFileId = 'no-file-id';
                    //inverse operation
                    createDirectoryEventReverse(nextEvent);
                    break;

                case 'DELETE DIRECTORY':
                    //set the active file
                    activeFileId = 'no-file-id';
                    //inverse operation
                    deleteDirectoryEventReverse(nextEvent);
                    break;

                case 'RENAME DIRECTORY':
                    //set the active file
                    activeFileId = 'no-file-id';
                    //inverse operation
                    renameDirectoryEventReverse(nextEvent);
                    break;

                case 'MOVE DIRECTORY':
                    //set the active file
                    activeFileId = 'no-file-id';
                    //inverse operation
                    moveDirectoryEventReverse(nextEvent);
                    break;
            }

            //move to the previous event
            playbackData.nextEventPosition--;

            //if we just played back the first event and then decremented
            if(playbackData.nextEventPosition < 0) {
                break;
            }
        }

        //make the correct editor active
        addFocusToTab(activeFileId);
        scrollToLine(activeFileId, activeLineNumber, activeColumn);

        //update the current dev group avatars
        updateCurrentDeveloperGroupAvatars(currentDeveloperGroupId);
        
        //update the position of the slider
        const slider = document.getElementById('slider');
        slider.noUiSlider.set(playbackData.nextEventPosition + 1);
        
        //store the latest dev group id
        playbackData.currentDeveloperGroupId = currentDeveloperGroupId;
        
        //after moving backwards, account for the fact that this
        //always refers to the next index to animate in the forward
        //direction
        playbackData.nextEventPosition++;
    }
}
