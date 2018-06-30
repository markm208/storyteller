//'vscode' contains the VS Code extensibility API
var vscode = require('vscode');

//used for all file system manipulation
var fs = require('fs'); 

//used for file path manipulation in create/delete/move/rename file/dir watching
var path = require('path'); 

//for spawning a browser window to display a playback
var spawn = require('child_process').spawn;

//this is my node module with functions to manage editor data. All 'node' capable 
//editors can use these functions if they can get data from the editor in the 
//correct format
var eventCollector = require('./st-core/js/event-collector');

//used to request that the playback server be started
var playbackServer = require('./st-core/js/playback-server');

//used to save/retrieve/reconcile data from multiple programming sessions
var sessionState = require('./st-core/js/session-state');

//keeps track if storyteller is currently active in a directory
var isStorytellerCurrentlyActive = false;

//this is an array of file/dir paths of recently created items. A create event happens in 
//two distinct circumstances. A create event occurs when a file/dir is created but also when 
//a file/dir is moved/renamed. 
//All moves/renames happen with a create event (with info about where the file/dir moved to) followed 
//by a delete event (with info about the old, deleted file/dir). 
//Since we don't know which circumstance it is until we either receive a delete event or don't, 
//we store the path and make a determination later (in either a timeout function or the handle 
//delete function) 
var recentlyCreatedFileOrDir = [];

//this is the number of milliseconds to wait after receiving a create event to see if there is 
//a corresponding delete event indicating a move/rename
var waitForDeleteEventTimeout = 5;

//this is an array of paths to files that were added to the file system by storyteller because 
//the files/dirs were being tracked (in the db) but were not present in the file system when the project 
//was loaded. The file system watcher will attempt to record these as new files/dirs but we do not want that
//to happen. When adding create file/dir events we check to make sure the path to the file is not in this
//array- we don't create events for files/dirs in this array.   
var newFilesDirsToIgnoreDueToReconciliation = [];

//this holds information about code copied to the clipboard. This is used to track cut/copy and pastes
var clipboardData = {
    text: "",
    eventIds: [],
    activePaste: false
};

//status bar
var storytellerStatusBarItem = null;

/*
 * This method is called when the extension is activated. We register *commands* and register our interest in:
 * - text changes in the documents
 * - when a save occurs (we save our storyteller data at this time)
 * - changes to the file system with a 'file system watcher'
 * 
 * Finally we add a status bar item that tells the user that storyteller is starting up and then we asynchronously start
 * the reconciliation process which can be expensive.
 */
function activate(context) {
    
    //commands for this plugin  
    context.subscriptions.push(vscode.commands.registerCommand('storyteller.startPlaybackNoComment', startPlaybackNoComment));
    context.subscriptions.push(vscode.commands.registerCommand('storyteller.startPlaybackToMakeAComment', startPlaybackToMakeAComment));
    context.subscriptions.push(vscode.commands.registerCommand('storyteller.storytellerState', storytellerState));
    context.subscriptions.push(vscode.commands.registerCommand('storyteller.currentActiveDevelopers', currentActiveDevelopers));
    context.subscriptions.push(vscode.commands.registerCommand('storyteller.createNewDeveloper', createNewDeveloper));
    context.subscriptions.push(vscode.commands.registerCommand('storyteller.addDevelopersToActiveGroup', addDevelopersToActiveGroup));
    context.subscriptions.push(vscode.commands.registerCommand('storyteller.removeDevelopersFromActiveGroup', removeDevelopersFromActiveGroup));
    context.subscriptions.push(vscode.commands.registerCommand('storyteller.startTrackingProject', startTrackingProject));
    context.subscriptions.push(vscode.commands.registerCommand('storyteller.stopTrackingProject', stopTrackingProject));
    
    //for copy and paste (users must map keyboard shortcuts to these commands)
    context.subscriptions.push(vscode.commands.registerCommand('storyteller.st-copy', storytellerCopy));
    context.subscriptions.push(vscode.commands.registerCommand('storyteller.st-cut', storytellerCut));
    context.subscriptions.push(vscode.commands.registerCommand('storyteller.st-paste', storytellerPaste));

    //alternate copy/paste functionality- this seemed to work but I am not sure if it the best thing to do right now
    //cut/copy/paste overides
    //override the editor.action.clipboardCopyAction with our own
    // var clipboardCopyDisposable = vscode.commands.registerTextEditorCommand('editor.action.clipboardCopyAction', overriddenClipboardCopyAction); 
    // context.subscriptions.push(clipboardCopyDisposable);

    // //override the editor.action.clipboardCutAction with our own
    // var clipboardCutDisposable = vscode.commands.registerTextEditorCommand('editor.action.clipboardCutAction', overriddenClipboardCutAction); 
    // context.subscriptions.push(clipboardCutDisposable);

    // //override the editor.action.clipboardPasteAction with our own
    // var clipboardPasteDisposable = vscode.commands.registerTextEditorCommand('editor.action.clipboardPasteAction', overriddenClipboardPasteAction); 
    // context.subscriptions.push(clipboardPasteDisposable);

    //register a handler to capture changes to files in the editor
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(handleTextEditorChange));

    //register a handler to be called whenever the user saves one or more files
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(handleFileSave));

    //TODO use the whitelist of files here???
    //create a file system watcher for all of the files in this workspace
    var fsWatcher = vscode.workspace.createFileSystemWatcher("**/*");
    
    //handle file/dir creates and deletes (translate these to create, delete, move, rename events) 
    context.subscriptions.push(fsWatcher.onDidCreate(addRecentCreate));
    context.subscriptions.push(fsWatcher.onDidDelete(addRecentDelete));

    //if there is an open workspace (folder) we will start storyteller. This workspace requirement is because
    //the workspace is where we will store the event data in a hidden filder called .storyteller. Without a workspace 
    //we have no where to store data persistently.
    if(vscode.workspace.rootPath) {
        
        //get an OS independent project root path
        var workspaceRootPath = getWorkspaceRootPath();
        
        //start using storyteller in workspaces only
        console.log(`Storyteller is active in the workspace: ${workspaceRootPath}`);
        
        //check to see if this is an existing storyteller project (with a hidden .storyteller dir) 
        var existingProject = sessionState.isStorytellerDataPresent(workspaceRootPath);

        //if there is a hidden storyteller dir or required files, then this is an existing project
        if(existingProject) {

            //don't want to slow down the init of the system so we do the more expensive operations a little later
            setTimeout(function() {

                //open up existing project in the correct state
                openExistingStorytellerProject();

            }, 1);

        } else { //there is no existing project

            console.log("There is an open workspace but it is not being tracked by storyteller");
            
            //no tracking if there is no workspace
            isStorytellerCurrentlyActive = false;    

            //update the status bar
            updateStorytellerStatusBar("Start Storyteller", "Start using Storyteller in this workspace", "storyteller.startTrackingProject");   

            //display a message about how to use storyteller
            setTimeout(function() {

                //prompt to ask if the user wants to use storyteller
                promptInformingAboutUsingStoryteller(false);

            }, 1);
        }

    } else { //there is no open workspace

        //prompt to ask if the user wants to use storyteller
        console.log("There is no open workspace!!! We are not starting Storyteller");

        //no tracking if there is no workspace
        isStorytellerCurrentlyActive = false;    

        //update the status bar
        updateStorytellerStatusBar("Start Storyteller", "Open a workspace and start using Storyteller", "storyteller.startTrackingProject");   

        //display a message about how to use storyteller
        setTimeout(function() {

            //prompt to tell the user they need to open a folder to use storyteller
            promptInformingAboutUsingStoryteller(true);

        }, 1);
    }
}

/* 
 * This method is called when your extension is deactivated. This happens if the editor is closed or a 
 * workspace folder has been closed.
 */
function deactivate() {
    
    //deactivate the storyteller extension
    console.log("Deactiviating storyteller extension--");
    
    //if there is anything in the list of recently created file paths
    if(recentlyCreatedFileOrDir.length > 0) {
        
        //clear out any old info from previous workspaces
        recentlyCreatedFileOrDir.splice(0, recentlyCreatedFileOrDir.length);        
    }
    
    //if we are tracking changes
    if(isStorytellerCurrentlyActive) {
        
        //get an OS independent project root path
        var workspaceRootPath = getWorkspaceRootPath();
                
        //save the state of the storyteller data in the hidden folder for this project
        sessionState.saveAllStorytellerState(workspaceRootPath);
    }

    //we should not be tracking anymore
    isStorytellerCurrentlyActive = false;
    
    //stop the server
    playbackServer.stopPlaybackServer();
}

/*
 * Returns an OS independent workspace root path with /'s as the separator. On windows the path may contain \ as a separator. 
 * However, in order to make a single Storyteller project editable on multiple platform/OS's the path separators have to be the 
 * same for file/dir identification.
 * 
 * If there is not a workspace open then null is returned.
 */
function getWorkspaceRootPath() {

    //an OS independent project root path
    var workspaceRootpath = null;

    //if there is an open workspace
    if(vscode.workspace.rootPath) {
        
        //on windows the path separator may be \, split up the sections and use a / instead   
        workspaceRootpath = vscode.workspace.rootPath.split("\\").join("/");
    
        //console.log("Original: " + vscode.workspace.rootPath + " OS independent: " + workspaceRootpath);

    } //else- there is not an open workspace path

    return workspaceRootpath;
}

/* 
 * Open an existing Storyteller workspace. If there is a storyteller directory then we will read in the data from the two files, 
 * playbackData.json and editorState.json, and pass it on to the editor. 
 * 
 * Finally, the reconciliation process is started to identify any changes that occured to the file system while storyteller was
 * not active.
 */
function openExistingStorytellerProject() {

    //storyteller will track the state of this workspace
    isStorytellerCurrentlyActive = true;

    //get an OS independent workspace root path
    var workspaceRootPath = getWorkspaceRootPath();
                    
    //load the storyteller data (events, files, devs) from the contents of the files
    var state = sessionState.readAllStorytellerState(workspaceRootPath);

    //load the data from the files into the editor
    eventCollector.setPlaybackData(state.playbackData);
    eventCollector.setEditorState(state.editorState);   
    
    //load the st-ignore file (if there is one)
    eventCollector.loadStorytellerIgnoreFile(sessionState.readStorytellerIgnoreFile(workspaceRootPath));

    //timestamp for new project creation and any reconciliation events that are generated
    var initTimestamp = new Date().getTime();

    //start the reconciliation process (handle changes to the file system that happened when storyteller wasn't active)
    startReconcile(initTimestamp, true);

    //start the playback server 
    playbackServer.startPlaybackServer();
}

/*
 * Creates a new Storyteller project in an open workspace
 */
function startTrackingProject() {

    //if there is an open workspace
    if(vscode.workspace.rootPath) {
        
        //get an OS independent project root path
        var workspaceRootPath = getWorkspaceRootPath();

        //check to see if this is an existing storyteller project (with a hidden .storyteller dir) 
        var existingProject = sessionState.isStorytellerDataPresent(workspaceRootPath);

        //if there is a hidden storyteller dir or required files, then this is an existing project
        if(existingProject) {

            //open up existing project in the correct state
            openExistingStorytellerProject();
        
        } else { //there is no existing project in this open workspace

            //storyteller will track the state of this directory
            isStorytellerCurrentlyActive = true;
            
            //get the name of the root dir
            var workspaceDirName = path.parse(workspaceRootPath).base;        

            //load the st-ignore file (if there is one)
            eventCollector.loadStorytellerIgnoreFile(sessionState.readStorytellerIgnoreFile(workspaceRootPath));

            //get the relative path of the project dir (the relative root path "/")
            var strippedPathToRootDir = "/";

            //create an initial branch id for this repo's first branch
            eventCollector.createRandomBranchId();

            //create an anonymous developer
            eventCollector.createAnonymousDeveloper();

            //timestamp for new project creation and any reconciliation events that are generated
            var initTimestamp = new Date().getTime();

            //make the first create directory event for the root of the project
            //init the storyteller plugin by creating the root directory (null for a parent path since the root dir has no parent)        
            eventCollector.createDirectory(strippedPathToRootDir, workspaceDirName, null, initTimestamp, false);             

            //start the reconciliation process (handle changes to the file system that happened when storyteller wasn't active)
            startReconcile(initTimestamp, false);

            //start the playback server 
            playbackServer.startPlaybackServer();    

            //update the status bar
            updateStorytellerStatusBar("Storyteller", "Get the status", "storyteller.storytellerState");

            //can't pause the initialization to prompt, so we will prompt for the default developer after the system settles down
            setTimeout(function() {

                //prompt for the first developer in the system
                createFirstDeveloper();

            }, 1); //prompt for the dev's info 1 ms after init is complete
        }
    } else { //there is no open workspace

        //tell the user they need to open a workspace in order to use Storyteller
        promptInformingAboutUsingStoryteller(true);
    }
}

/*
 * A command used to stop tracking a project
 */
function stopTrackingProject() {
    
    //if there is an open workspace
    if(vscode.workspace.rootPath) {

        //if storyteller is active
        if(isStorytellerCurrentlyActive) {

            //dectivate the plugin
            deactivate();
            
            //update the status bar
            updateStorytellerStatusBar("Start Storyteller", "Start using Storyteller in this workspace", "storyteller.startTrackingProject");   

        } 

        //tell the user they need to open a workspace in order to use Storyteller
        promptInformingAboutUsingStoryteller(false);
    
    } else { //there is no open workspace

        //tell the user they need to open a workspace in order to use Storyteller
        promptInformingAboutUsingStoryteller(true);
    }
}

/*
 * Reconcile the file system and the storyteller database. There are three types of reconciliation that might occur:
 * - a new file/dir was added to the file system when storyteller was not active (reconcileFileSystemToStoryteller)
 * - an existing file/dir that was tracked by storyteller was deleted when storyteller was not active 
 *   (reconcileStorytellerToFileSystem)
 * - the text inside an existing file has been changed when storyteller was not active
 * 
 * In the case of new file/dirs being added (reconcileFileSystemToStoryteller), events will be added to the storyteller
 * database to represent their creation. For text files, the contents of each file will be added to the storyteller 
 * database in order all with the same timestamp.
 * 
 * In the case when a file/dir has been deleted (reconcileStorytellerToFileSystem), the user will be prompted to see if
 * they want to add the last known version of the file back to the file system. This changes the file system so we 
 * prompt rather than just change the file system. If the user want to add the file/dirs back they will be recreated from 
 * the last known state of the file/dirs in the storyteller database.
 * 
 * In the case when an exsiting file has been edited, a diff will be performed and the changes will be added to the 
 * storyteller database. 
 */
function startReconcile(initTimestamp, existingProject) {

    //get an OS independent project root path
    var workspaceRootPath = getWorkspaceRootPath();
        
    //holds any info/error messages from the fs to storyteller reconciliation process
    var messages = [];
    
    //handle any files/dirs that have been added to the file system but are not tracked in storyteller
    sessionState.reconcileFileSystemToStoryteller(workspaceRootPath, initTimestamp, messages);
    
    //if there are any messages, let the user know about the reconciliation
    for(var i = 0;i < messages.length;i++) {

        vscode.window.showInformationMessage(messages[i]);
    }

    //handle and files/dirs that are in the storyteller db but are not in the file system
    if(sessionState.reconcileStorytellerToFileSystem(workspaceRootPath, initTimestamp)) {
        
        //prompt to see if the user would like to reconcile the file system
        vscode.window.showQuickPick(["Yes", "No"], {placeHolder: `Some files/dirs have been deleted outside of Storyteller. Would you like to add them back?`})
        .then(function success(selectedOption) {
    
            //if they want to add the files back
            if(selectedOption && selectedOption === "Yes") {
                
                //empty the messages                    
                messages = [];

                //restore the files/dirs to the file system
                sessionState.restoreFilesDirsToFileSystem(workspaceRootPath, initTimestamp, newFilesDirsToIgnoreDueToReconciliation, messages);

                //if there are any messages, let the user know about the reconciliation
                for(var i = 0;i < messages.length;i++) {

                    vscode.window.showInformationMessage(messages[i]);
                }
            }

            //reconciliation is complete
            //if this is an existing project, show the user some info about storyteller
            if(existingProject) {
                
                //show the state of the system
                storytellerState();

                //init is complete, let the user know
                updateStorytellerStatusBar("Storyteller", "Get the status", "storyteller.storytellerState");   

            } //else- new project, wait until they have created the first user before displaying the info 
        });

    } else { //no more reconciliation is needed
        
        //reconciliation is complete
        //if this is an existing project, show the user some info about storyteller
        if(existingProject) {
            
            //show the state of the system
            storytellerState();

            //init is complete, let the user know
            updateStorytellerStatusBar("Storyteller", "Get the status", "storyteller.storytellerState");   
            
        } //else- new project, wait until they have created the first user before displaying the info 
    }    
}

/* 
 * This function makes a few changes to the UI to indicate that storyteller is fully initialized and 
 * the user can start making changes to the files.
 */
function updateStorytellerStatusBar(text, tooltip, command) {

    //if the status bar has not been created yet
    if(storytellerStatusBarItem === null) {

        //add a storyteller item to the status bar
        storytellerStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10);    
        storytellerStatusBarItem.text = text;
        storytellerStatusBarItem.tooltip = tooltip;
        storytellerStatusBarItem.command = command;
        storytellerStatusBarItem.show();

    } else { //the status bar has been created

        //update the existing status bar
        storytellerStatusBarItem.text = text;
        storytellerStatusBarItem.tooltip = tooltip;
        storytellerStatusBarItem.command = command;        
    }
}

//****************************** Command Implementations ****************************** 
/*
 * Start a playback in the browser. If the user passes in true for playbackIsForAComment then the
 * playback starts at the end and a user can add a comment to the latest code. Otherwise it starts
 * at the beginning.
 */ 
function startPlayback(playbackIsForAComment) {

    //Display a message box to the user fo 10000 ms (10 s)
    vscode.window.setStatusBarMessage('Storyteller Playback Server at localhost:3000/playback', 10000);
        
    //open a browser window with the playback's URL (at the beginning if not for comments, at the end if it is for comments)
    openPlaybackInBrowser(playbackIsForAComment);  
}

/*
 * Start at the beginning to view the whole playback
 */
function startPlaybackNoComment() {
    
    if(isStorytellerCurrentlyActive) {
        
        //start a playback at the beginning
        startPlayback(false);
    
    } else { //storyteller not active

        //tell the user how they can use storyteller
        promptInformingAboutUsingStoryteller(true);
    }
}

/*
 * Start at the end so the user can add a comment
 */
function startPlaybackToMakeAComment() {
    
    if(isStorytellerCurrentlyActive) {

        //start a playback at the end so the user can add a comment to the latest code
        startPlayback(true);

    } else { //storyteller not active

        //tell the user how they can use storyteller
        promptInformingAboutUsingStoryteller(true);
    }
}

/*
 * Prompt the user and tell them about how to start using Storyteller
 */
function promptInformingAboutUsingStoryteller(warnAboutOpeningAProject) {

    //notify the user that they can use storyteller
    var message = "You can use Storyteller by selecting 'Storyteller: Start Tracking This Project' from the command palette or clicking the 'Start Storyteller' button below. ";

    if(warnAboutOpeningAProject) {
        message = "You must open a folder to use Storyteller. " + message;
    }

    //show the message
    vscode.window.showInformationMessage(message);
}

/*
 * Get some info about the storyteller project 
 */
function storytellerState() {
    
    //if storyteller is active
    if(isStorytellerCurrentlyActive) {
            
        //get the active developer group devs
        var activeDevs = getListOfDevNames(eventCollector.getAllDevsInActiveDevGroup());
        
        //display the working dir and the active devs
        vscode.window.showInformationMessage(`Storyteller is active. The developers are: ${activeDevs.join(", ")}`);  
        
    } else { //storyteller not active

        //tell the user how they can use storyteller
        promptInformingAboutUsingStoryteller(true);
    }

}

/*
 * Display the currently active developers 
 */
function currentActiveDevelopers() {
    
    if(isStorytellerCurrentlyActive) {

        //get the active developer group devs
        var activeDevs = getListOfDevNames(eventCollector.getAllDevsInActiveDevGroup());
        
        //create a message with the dev info
        var msg = `The active developers are: ${activeDevs.join(", ")}`;
                
        //show the message
        vscode.window.showInformationMessage(msg);

    } else { //storyteller not active

        //tell the user how they can use storyteller
        promptInformingAboutUsingStoryteller(true);
    }

}

/*
 * Prompt for a new developer and store it.
 */
function createNewDeveloper() {

    if(isStorytellerCurrentlyActive) {

        //prompt for the name and email of a developer
        vscode.window.showInputBox({prompt: "Enter in a single developer's info like this: John Doe jdoe@mail.com"})
        .then(function success(devInfoString){
            
            //if there is anything in the string                
            if(devInfoString) {
                    
                //dev info in object form
                var developerInfoObject = {
                    email: "",
                    first: "",
                    last: ""
                };
                
                //parse the dev info
                getDevInfo(devInfoString, developerInfoObject);
                                                            
                //create a developer 
                eventCollector.createDeveloper(developerInfoObject.first, developerInfoObject.last, developerInfoObject.email);
                
                //allow the user to select the new user if they'd like
                vscode.commands.executeCommand("storyteller.addDevelopersToActiveGroup");
                    
            } else { //string is empty
                    
                //show error message
                vscode.window.showErrorMessage("Please enter in the name and email of a developer");
            }
        }, 
        function error(err){
            
            //show error message
            vscode.window.showErrorMessage("Error adding a developer");
        });       

    } else { //storyteller not active

        //tell the user how they can use storyteller
        promptInformingAboutUsingStoryteller(true);
    }

}

/*
 * Prompt for the first developer and overwrite the anonymous developer.
 */
function createFirstDeveloper() {

    if(isStorytellerCurrentlyActive) {

        //prompt for the name and email of a developer
        vscode.window.showInputBox({prompt: "Enter in a single developer's info like this: John Doe jdoe@mail.com"})
        .then(function success(devInfoString) {

            //if there is anything in the string                
            if(devInfoString) {

                //a dev's required info in an object
                var developerInfoObject = {
                    email: "",
                    first: "",
                    last: ""
                };
                
                //parse the dev info
                getDevInfo(devInfoString, developerInfoObject);
                
                //overwrite the anonymous developer in the editor with the new dev info
                eventCollector.overwriteAnonDev(developerInfoObject.email, developerInfoObject.first, developerInfoObject.last);  
            
            } //else- they want to remain anonymous

            //init is complete, let the user know
            updateStorytellerStatusBar("Storyteller", "Get the status", "storyteller.storytellerState");   
            
            //notify the new user that storyteller is ready to be used
            storytellerState();
        }, 
        function error(err){
            
            //there is a default anonymous developer
            //show error message
            vscode.window.showErrorMessage("Error adding a developer");
        });  

    } else { //storyteller not active

        //tell the user how they can use storyteller
        promptInformingAboutUsingStoryteller(true);
    }

}

/*
 * Display the developers who can be activated and let the user choose one to make active.
 */
function addDevelopersToActiveGroup() {

    if(isStorytellerCurrentlyActive) {

        //get the non-active devs
        var devNames = getListOfDevNames(eventCollector.getAllDevsExceptThoseInActiveDevGroup());
        
        //get the active developer group devs
        var activeDevs = getListOfDevNames(eventCollector.getAllDevsInActiveDevGroup());
        
        //make a list of inactive devs to choose from
        vscode.window.showQuickPick(devNames, {placeHolder: `Choose a developer to add to the active developer group. Currently active: ${activeDevs.join(", ")}`})
        .then(function success(selectedOption) {
            
            //if there was a dev selected
            if(selectedOption) {
                
                //find the email portion of the dev
                var startOfEmail = selectedOption.indexOf("<");
                var endOfEmail = selectedOption.indexOf(">");
                
                //if the email was found
                if(startOfEmail >= 0 && endOfEmail >= 0) {
                    
                    //extract the email
                    var email = selectedOption.substr(startOfEmail + 1, endOfEmail - startOfEmail - 1);
                    
                    //add to an array of devs to add (the function to make devs active takes an array
                    //even though with this UI we can only select one at a time)
                    var emails = [email];
                    
                    //message to display to the user
                    var msg = "";
                    
                    //add the dev to the active list
                    if(eventCollector.addDeveloperToActiveDeveloperGroup(emails)) {
                        
                        //get the new active devs
                        var devNames = getListOfDevNames(eventCollector.getAllDevsInActiveDevGroup());

                        //success message
                        msg += `${selectedOption} was successfully added to the active developer group. The new active developer group is ${devNames.join(", ")}`;    
                                                    
                        //show the message
                        vscode.window.showInformationMessage(msg);

                    } else {
                        
                        //get the old active devs
                        var devNames = getListOfDevNames(eventCollector.getAllDevsInActiveDevGroup());
                        
                        //error message
                        msg += `The developer ${selectedOption} could not be added to the active developer group. The existing developer group is ${devNames.join(", ")}`;
                                                    
                        //show the message
                        vscode.window.showErrorMessage(msg);                                    
                    }                        
                }
            }
        },
        function failure(err) {
            
            console.log("Error on adding dev to active dev group");
        });
    
    } else { //storyteller not active

        //tell the user how they can use storyteller
        promptInformingAboutUsingStoryteller(true);
    }

}

/*
 *  Display the active developers and let the user choose one to make inactive.
 */
function removeDevelopersFromActiveGroup() {
    
    if(isStorytellerCurrentlyActive) {

        //get the active devs
        var devNames = getListOfDevNames(eventCollector.getAllDevsInActiveDevGroup());

        //make a list of active devs to choose from
        vscode.window.showQuickPick(devNames, {placeHolder: "Choose a developer to remove from the active developer group"})
        .then(function success(selectedOption) {
            
            //if there was a dev selected
            if(selectedOption) {
                
                //find the email portion of the dev
                var startOfEmail = selectedOption.indexOf("<");
                var endOfEmail = selectedOption.indexOf(">");
                
                //if the email was found
                if(startOfEmail >= 0 && endOfEmail >= 0) {
                    
                    //extract the email
                    var email = selectedOption.substr(startOfEmail + 1, endOfEmail - startOfEmail - 1);
                    
                    //add to an array of devs to remove (the function to make devs inactive takes an array
                    //even though with this UI we can only select one at a time)
                    var emails = [email];
                    
                    //message to display to the user
                    var msg = "";
                    
                    //remove the selected dev from the active dev group 
                    if(eventCollector.removeDeveloperFromActiveDeveloperGroup(emails)) {
                        
                        //get the new active devs
                        var devNames = getListOfDevNames(eventCollector.getAllDevsInActiveDevGroup());

                        //success message
                        msg += `${selectedOption} was successfully removed from the active developer group. The new active developer group is ${devNames.join(", ")}`;    
                        
                        //show the message
                        vscode.window.showInformationMessage(msg);
                        
                    } else {

                        //get the new active devs
                        var devNames = getListOfDevNames(eventCollector.getAllDevsInActiveDevGroup());
                        
                        //error message
                        msg += `The developer ${selectedOption} could not be removed from the active developer group. The existing developer group is ${devNames.join(", ")}`;
                        
                        //show the message
                        vscode.window.showErrorMessage(msg);            
                    }
                }                    
            }
        },
        function failure(err) {
            
            console.log("Error on removing dev from active dev group");                
        });                   

    } else { //storyteller not active

        //tell the user how they can use storyteller
        promptInformingAboutUsingStoryteller(true);
    }

}
//****************************** Command Implementations ****************************** 

//****************************** File/Dir Changes ****************************** 
/*
 * This function is called whenever a new file/dir has been noticed by vs code. 
 * 
 * Create event might be because:
 * -- a new file/dir is created
 * -- a file/dir was moved (create event followed by a delete event)
 * -- a file/dir was renamed (create event followed by a delete event)
 * 
 * If the latter two happen (create event followed by a delete event) then this is not really a new file/dir. It is either a
 * move or rename. We record that the file/dir was created and then check if the file/dir is still present after a short period
 * of time. 
 * 
 * addRecentCreate() and addRecentDelete() are called in succession for file/dir renames and moves. After a create is 
 * recognized it is assumed that the delete function will be called soon after. The anonymous function checks to see 
 * if the file/dir path is still present (indicating a true new file/dir).
 * 
 * This function also ignores files that have been added due to reconciliation.
 */
function addRecentCreate(createEvent) {
    
    if(isStorytellerCurrentlyActive) {

        //get an OS independent project root path
        var workspaceRootPath = getWorkspaceRootPath();
        
        //get the OS independent path of the recently created file/dir
        var newFullPath = createEvent.fsPath.split("\\").join("/");

        //path to storyteller hidden dir
        var storytellerPath = path.join(workspaceRootPath, ".storyteller").split("\\").join("/");

        //if the path of the new file/dir is not in the hidden .storyteller dir (we don't track changes in this folder)
        if(newFullPath.startsWith(storytellerPath) === false) {
            
            //check the array of file/dir paths that were added because they were stored in the storyteller db but
            //were not in the file system (this check happens on startup to reconcile differences between the db
            //and the file system)  
            var indexOfReconciledPath = newFilesDirsToIgnoreDueToReconciliation.indexOf(newFullPath);
            
            //if this is a new file added because of reconciliation between the storyteller database and the file system on startup
            if(indexOfReconciledPath >= 0) {
                
                //do not record this as a new file since it is already in the db
                
                //we've handled this case by ignoring the file/dir, remove the path of the new file to ignore
                newFilesDirsToIgnoreDueToReconciliation.splice(indexOfReconciledPath, 1);
                
                //console.log(`Ignoring ${newFullPath} since it is not really new`);
                
            } else { //check if this is a new file/dir (not due to reconciliation) or a move/rename 

                //add the path to an array where it might be removed if this event is followed by a delete 
                recentlyCreatedFileOrDir.push(newFullPath);
                
                //give some time for the addRecentDelete() function to remove this new path if this happens
                //to be a rename or a move. Currently, giving 5ms for the delete handler to run.
                
                //in the future, check to see if the path is still in the array. Give addRecentDelete() a chance 
                //to run and remove the path. If it is still present, it is a new file/dir
                setTimeout(function () {            
                        
                    //look for the entry with the new path
                    var index = recentlyCreatedFileOrDir.indexOf(newFullPath);
                    
                    //if the path is still in the array of recently added items then this is a true create
                    //new file/dir event not a move or rename
                    if(index >= 0) {
                        
                        //used to determine if the new path is to a file or directory
                        var stats = fs.statSync(newFullPath);
                        
                        //breaks up the path of the file/dir
                        var parsedPath = path.parse(newFullPath);        
                        var newPathFileName = parsedPath.base.split("\\").join("/");
                        var newPathParentPath = parsedPath.dir.split("\\").join("/");
                        //get the relative path to the file or directory
                        var relativePathToFileOrDir = sessionState.stripWorkspaceRootPath(workspaceRootPath, newFullPath);
                        //get the relative path to the parent directory
                        var relativePathToParent = sessionState.stripWorkspaceRootPath(workspaceRootPath, newPathParentPath);

                        //if newFullPath is a file
                        if(stats.isFile()) {
                            
                            //console.log(`Creating a file: ${newFullPath}`);

                            //make a create file event 
                            eventCollector.createFile(newFullPath, relativePathToFileOrDir, newPathFileName, relativePathToParent, new Date().getTime(), false);
                            
                        } else if(stats.isDirectory()) { //newFullPath is a dir 
                            
                            //console.log(`Creating a dir: ${newFullPath}`);

                            //make a create directory event 
                            eventCollector.createDirectory(relativePathToFileOrDir, newPathFileName, relativePathToParent, new Date().getTime(), false);                        
                        }
                                    
                        //remove the path since we have handled it
                        recentlyCreatedFileOrDir.splice(index, 1);
                                
                    } else { 
                        
                        //console.log(`The file: ${newFullPath} is not present in recentlyCreatedFileOrDir- it was moved/renamed`);

                        //if the path is gone it is because the create event was followed by a delete 
                        //event (a move or rename) that was handled in the delete function
                        
                        //console.log("File is not present in recentlyCreatedFileOrDir[]");                        
                    }

                    //eventCollector.printAllPathToIdMappings();
                    
                }, waitForDeleteEventTimeout);
            }    

        } //else- this is a change in the hidden .storyteller dir that is ignored by the tool
    }
}

/*
 * This function is called whenever vs code notices that a file/dir has been deleted.
 *
 * delete event might be because:
 * -- a file/dir was deleted
 * -- a file/dir was moved (create event followed by a delete event)
 * -- a file/dir was renamed (create event followed by a delete event)
 * 
 * If the latter two happen (create event followed by a delete event) then this is not really a file/dir delete. It is either a
 * move or rename. 
 * 
 * addRecentCreate() and addRecentDelete() are called in succession for file/dir renames and moves. After a create is 
 * recognized it is assumed that the delete function will be called soon after. This function checks to see if the delete
 * was from a file that was just added in addRecentCreate() (indicating a rename/move). If there are no paths that were
 * added very recently we assume it is a real delete. 
 */
function addRecentDelete(deleteEvent) {
    
    if(isStorytellerCurrentlyActive) {

        //console.log(`\n\nDelete file/dir: ${deleteEvent}`);

        //path of the deleted file/dir
        var deleteFullPath = deleteEvent.fsPath.split("\\").join("/");
        
        //get an OS independent project root path
        var workspaceRootPath = getWorkspaceRootPath();

        //if there are any elements on this array we are going to assume this delete is part of a move or rename
        if(recentlyCreatedFileOrDir.length > 0) {
            
            //get the first entry- this is the path that has changed. I am assuming that with a move the create 
            //and delete events are queued right next to each other and will be handled in sequence by calling
            //addRecentCreate() immediately followed by addRecentDelete()
            var newFullPath = recentlyCreatedFileOrDir.shift();
                    
            //parse the path of the old and new file path
            var parsedNewPath = path.parse(newFullPath);
            var parsedOldPath = path.parse(deleteFullPath);
            
            //get the name of the file/dir
            var newName = parsedNewPath.base.split("\\").join("/");
            //get the path up to but not including the name
            var fullPathUpToNewName = parsedNewPath.dir.split("\\").join("/");
            
            //get the name of the file/dir
            var oldName = parsedOldPath.base.split("\\").join("/");
            //get the path up to but not including the name
            var fullPathUpToOldName = parsedOldPath.dir.split("\\").join("/");

            //get the relative path to the file or directory
            var relativePathToNewFileOrDir = sessionState.stripWorkspaceRootPath(workspaceRootPath, newFullPath);
            var relativePathToDeleteFileOrDir = sessionState.stripWorkspaceRootPath(workspaceRootPath, deleteFullPath);
            //get the relative path to the parent directory
            var relativePathToNewParent = sessionState.stripWorkspaceRootPath(workspaceRootPath, fullPathUpToNewName);
            var relativePathToDeleteParent = sessionState.stripWorkspaceRootPath(workspaceRootPath, fullPathUpToOldName);
            
            //used to determine if the path is to a file or directory
            var stats = fs.statSync(newFullPath);

            //if newFullPath is a file
            if(stats.isFile()) {
                
                //if the file ends up in the same parent dir AND the name is different, then this is a rename
                if(fullPathUpToNewName === fullPathUpToOldName && newName !== oldName) {
                    
                    //console.log("Rename file- old path: " + deleteFullPath + " new path: " + newFullPath);  

                    //make a rename file event                 
                    eventCollector.renameFile(relativePathToNewFileOrDir, newName, relativePathToDeleteFileOrDir, new Date().getTime());              
                
                } else { //file has moved from one parent dir to another
                    
                    //console.log("Move file- old path: " + deleteFullPath + " new path: " + newFullPath);

                    //make a move file event                 
                    eventCollector.moveFile(relativePathToNewFileOrDir, relativePathToNewParent, relativePathToDeleteFileOrDir, relativePathToDeleteParent, new Date().getTime());
                }

            } else if(stats.isDirectory()) { //newFullPath is a dir 

                //if the dir ends up in the same parent dir AND the name is different, then this is a rename
                if(fullPathUpToNewName === fullPathUpToOldName && newName !== oldName) {

                    //console.log("Rename dir- old path: " + deleteFullPath + " new path: " + newFullPath);

                    //make a rename dir event                 
                    eventCollector.renameDir(relativePathToNewFileOrDir, newName, relativePathToDeleteFileOrDir, new Date().getTime());      
                        
                } else { //dir has moved from one parent dir to another
                    
                    //console.log("Move dir- old path: " + deleteFullPath + " new path: " + newFullPath);

                    //make a move dir event                 
                    eventCollector.moveDir(relativePathToNewFileOrDir, relativePathToNewParent, relativePathToDeleteFileOrDir, relativePathToDeleteParent, new Date().getTime());
                }

            } else { //newFullPath is not a file or dir- something is wrong

                //console.log("Rename or move: Not a file or a dir????");
                //console.log(stats);
            }
            
        } else { //this is a true delete, there are no file paths in the recentlyCreatedFileOrDir array
            
            //get the relative path to the file or dir being deleted
            var relativePathToDeleteFileOrDir = sessionState.stripWorkspaceRootPath(workspaceRootPath, deleteFullPath);

            //since the deleted file/dir is gone we can't check to see if it is a file or dir so
            //we will let storyteller check the type based on the path and call the correct delete
            //function         
            eventCollector.deleteFileOrDirectory(relativePathToDeleteFileOrDir, new Date().getTime());
                
            //console.log("Delete File or Directory- path: " + deleteFullPath);
        }
        
        //eventCollector.printAllPathToIdMappings();
    }
}

//****************************** File/Dir Changes ****************************** 

//****************************** Text Editor Changes ****************************** 
/*
 * This function is called whenever code is added or removed from an editor.
 */
function handleTextEditorChange(event) {
    
    if(isStorytellerCurrentlyActive) {

        //name of the file that is being edited
        var filePath = event.document.fileName.split("\\").join("/");
        //console.log("Change to the file: " + filePath);

        //get an OS independent project root path
        var workspaceRootPath = getWorkspaceRootPath();
        
        //the path relative to the workspace
        var relativeFilePath = sessionState.stripWorkspaceRootPath(workspaceRootPath, filePath);

        //if the file is in this project
        if(relativeFilePath !== null) {

            //go through each of the changes in this change event (there can be more than one if there are multiple cursors)
            for(var i = 0;i < event.contentChanges.length;i++) {
                
                //get the change object
                var change = event.contentChanges[i];
                
                //if no text has been added, then this is a delete
                if(change.text.length === 0) {
                    
                    //get some data about the delete
                    var numCharactersDeleted = change.rangeLength;
                    var deleteTextStartLine = change.range.start.line;
                    var deleteTextStartColumn = change.range.start.character;
                    
                    //console.log("Deleting text (" + numCharactersDeleted + " characters) from: (line: " + deleteTextStartLine + " col: " + deleteTextStartColumn + " )");            
                    
                    //delete the text
                    eventCollector.deleteText(relativeFilePath, deleteTextStartLine, deleteTextStartColumn, numCharactersDeleted, new Date().getTime(), false);
                    
                } else { //new text has been added in this change, this is an insert
                    
                    //if there was some text that was selected and replaced (deleted and then added)
                    if(change.rangeLength > 0) {

                        //get some data about the delete
                        var numCharactersDeleted = change.rangeLength;
                        var deleteTextStartLine = change.range.start.line;
                        var deleteTextStartColumn = change.range.start.character;
                        
                        //console.log("Replacing text: " + change.rangeLength + " characters starting at (line: " + change.range.start.line + " col: " + change.range.start.character + ")");
                        
                        //first delete the selected code (insert of new text to follow)                
                        eventCollector.deleteText(relativeFilePath, deleteTextStartLine, deleteTextStartColumn, numCharactersDeleted, new Date().getTime(), false);
                    } 
                    
                    //get some data about the insert
                    var newText = change.text;
                    var newTextStartLine = change.range.start.line;
                    var newTextStartColumn = change.range.start.character;
                    
                    //a set of all the event ids from a copy/cut
                    var pastedInsertEventIds = [];
                    var isPaste = false;

                    //if this was a paste
                    if(clipboardData.activePaste) { 
                        
                        //this is a paste
                        isPaste = true;

                        //if the new text is exactly the same as what was on our clipboard
                        if(newText === clipboardData.text) {
            
                            //store the pasted event ids
                            pastedInsertEventIds = clipboardData.eventIds;

                        } else { //this is a paste but it doesn't match the last storyteller copy/cut (pasted from another source)
                            
                            //clear out any old data
                            clipboardData.text = "";
                            clipboardData.eventIds = [];
                        }

                        //we handled the most current paste, set this back to false
                        clipboardData.activePaste = false;
                    }
                    //console.log("at (line: " + newTextStartLine + " col: " + newTextStartColumn + ")");      
                    //insert the new text  
                    eventCollector.insertText(relativeFilePath, newText, newTextStartLine, newTextStartColumn, isPaste, pastedInsertEventIds, new Date().getTime(), false);        
                }
            }
        }
    }

    //console.log(event);
}
//****************************** Text Editor Changes ****************************** 

/*
 * This function is called whenever code is saved.
 */
function handleFileSave(event) {
    
    if(isStorytellerCurrentlyActive) {

        //get an OS independent project root path
        var workspaceRootPath = getWorkspaceRootPath();
        
        //console.log("saved file");

        //if we are tracking changes
        if(isStorytellerCurrentlyActive) {
                
            //save the state of the storyteller data in the hidden folder for this project
            sessionState.saveAllStorytellerState(workspaceRootPath);
        }
    }
}

/*
 * Opens a browser window to display a playback
 */
function openPlaybackInBrowser(playbackForComment) {

    //the platform dependent command to start the browser
    var command;

    //if it is a mac
    if(process.platform === "darwin") {
        
        command = "open";
        
    } else if(process.platform === "win32") { //windows
        
        command = "explorer.exe";
        
    } else if(process.platform === "linux") { //linux
        
        command = "xdg-open";
        
    } else { //some other exotic platform
        
        console.log("Unsupported platform: " + process.platform);        
    }
    
    //if there was a valid platform
    if(command) {
        
        //if the user wants to add a comment with this playback
        if(playbackForComment) {

            //now start the browser with the URL of the latest playback
            spawn(command, ["http://localhost:3000/playback?comment=true "]);        

        } else { //no comment, just a regular playback

            //now start the browser with the URL of the latest playback
            spawn(command, ["http://localhost:3000/playback"]);        
        }
    }
}

/*
 * Returns an array of dev names from a group of dev objects.
 */
function getListOfDevNames(devs) {
    
    //displayable names and emails of developers
    var devNames = [];

    //build up strings with dev names
    for(var i = 0;i < devs.length;i++) {

        var fullDevInfo = "";
        
        if(devs[i].firstName) {
            fullDevInfo += devs[i].firstName + " ";
        }
        
        if(devs[i].lastName) {
            fullDevInfo += devs[i].lastName + " ";
        }
        
        if(devs[i].email) {
            fullDevInfo += "<" + devs[i].email + ">";
        }                        
        
        //add to the list for display
        devNames.push(fullDevInfo);
    }
    
    return devNames;
}

/*
 * Add parse a string for dev info.
 */
function getDevInfo(devInfoString, devInfoObject) {

    //get rid of any space around the info
    devInfoString = devInfoString.trim();
                
    //if there is anything left after the trim
    if(devInfoString !== "") {
        
        //empty out the passed in dev parts
        devInfoObject.email = "";
        devInfoObject.first = "";
        devInfoObject.last = "";
        
        //split the string around interior spaces
        var devInfoParts = devInfoString.split(/\s+/);
        
        //last is always email
        devInfoObject.email = devInfoParts.pop();
        
        //if anything left
        if(devInfoParts.length > 0) {
            
            //penultimate always last name
            devInfoObject.last = devInfoParts.pop();
            
            //if anything left
            if(devInfoParts.length > 0) {
                
                //make it all part of the first name
                devInfoObject.first = devInfoParts.join(" ");
            }
        }
    }
    //else- no change to the dev info object      
}

//****************************** Cut/Copy/Paste Changes ****************************** 
/*
 * Used to handle a storyteller copy operation. It will gather any selected text and the insert
 * events that were used to create them and add them to the storyteller clipboard data. This
 * will be used during a paste to identify pasted insert events.
 */
function storytellerCopy() {
    
    //console.log("Storyteller Copy");

    //get the events that were copied and then execute vs code's copy command
    //we override the default behavior of copying a whole line when no text is selected
    //nothing will be copied unless there is a selection
    getCurrentSelectionEvents("editor.action.clipboardCopyAction");
}
/*
 * Used to handle a storyteller cut operation. It will gather any selected text and the insert
 * events that were used to create them and add them to the storyteller clipboard data. This
 * will be used during a paste to identify pasted insert events.
 */
function storytellerCut() {
    
    //console.log("Storyteller Cut");

    //get the events that were cut and then execute vs code's cut command
    //we override the default behavior of cutting a whole line when no text is selected
    //nothing will be cut unless there is a selection
    getCurrentSelectionEvents("editor.action.clipboardCutAction");
}
/*
 * Used to handle a storyteller paste operation. We indicate that a paste has occured.
 * This info will be used when new text is noticed in the editor.
 */
function storytellerPaste() {
    
    //console.log("Storyteller Paste");
    
    //indicate that there was a paste operation
    clipboardData.activePaste = true;

    //let the editor execute the paste
    vscode.commands.executeCommand("editor.action.clipboardPasteAction");
}
/*
 * This function gets any selected text in the current open editor and then copies the 
 * data about the insert events that will get placed on the clipboard.
 */
function getCurrentSelectionEvents(actionIfSelectedText) {

    //get the active editor
    var editor = vscode.window.activeTextEditor;

    //if there is an active text editor
    if(editor) {
                
        //get the editor selection (we only handle a single selection)
        var selection = editor.selection;

        //if there is a selection
        if(!selection.isEmpty) {

            //if there are some selected characters in the selection
            if(!selection.start.isEqual(selection.end)) {
                
                //get an OS independent project root path
                var workspaceRootPath = getWorkspaceRootPath();

                //name of the file where the copy occured and strip the leading part of the path 
                var filePath = sessionState.stripWorkspaceRootPath(workspaceRootPath, editor.document.fileName.split("\\").join("/"));
                
                //get the storyteller events associated with the selected text
                var selectedEvents = eventCollector.getInsertEventsByPos(filePath, selection.start.line, selection.start.character, selection.end.line, selection.end.character);        
                
                //clear out any old data
                clipboardData.text = "";
                clipboardData.eventIds = [];

                //var selectedText = "";

                //go through the selected events
                for(var j = 0;j < selectedEvents.length;j++) {
                    
                    //debug
                    // if(selectedEvents[j].character === "\r") {
                    //     selectedText = selectedText + selectedEvents[j].id + ": \\r ";

                    // } else if(selectedEvents[j].character === "\n") {
                    //     selectedText = selectedText + selectedEvents[j].id + ": \\n\n";

                    // } else {
                    //     selectedText = selectedText + selectedEvents[j].id + ": '" + selectedEvents[j].character +"' ";            
                    // }

                    //append the individual selected characters to the clipboard data
                    clipboardData.text = clipboardData.text + selectedEvents[j].character;
                    
                    //add the event id to the clipboard data
                    clipboardData.eventIds.push(selectedEvents[j].id);
                }

                //debug
                //console.log(selectedText);

                //if these is a command to execute
                if(actionIfSelectedText && actionIfSelectedText.length > 0) {

                    //execute the vscode command only if there was some selected text
                    vscode.commands.executeCommand(actionIfSelectedText);
                }
            }
        }
    }
}

// /*
//  * Function that overrides the default copy behavior. We get the selection and use it, dispose of this registered
//  * command (returning to the default editor.action.clipboardCopyAction), invoke
//  */
// function overriddenClipboardCopyAction(textEditor, edit, params) {
    
//     //debug
//     console.log("---COPY TEST---");
    
//     //use the selected text that is being copied here
//     getCurrentSelectionEvents();

//     //dispose of the overridden editor.action.clipboardCopyAction- back to default copy behavior
//     clipboardCopyDisposable.dispose();

//     //execute the default editor.action.clipboardCopyAction to copy
//     vscode.commands.executeCommand("editor.action.clipboardCopyAction").then(function(){
        
//         console.log("After Copy");

//         //add the overridden editor.action.clipboardCopyAction back
//         clipboardCopyDisposable = vscode.commands.registerTextEditorCommand('editor.action.clipboardCopyAction', overriddenClipboardCopyAction);
//         context.subscriptions.push(clipboardCopyDisposable);
//     }); 
// }

// /*
//  * Function that overrides the default cut behavior. We get the selection and use it, dispose of this registered
//  * command (returning to the default editor.action.clipboardCutAction), invoke
//  */
// function overriddenClipboardCutAction(textEditor, edit, params) {
    
//     //debug
//     console.log("---CUT TEST---");
    
//     //use the selected text that is being cut here
//     getCurrentSelectionEvents();

//     //dispose of the overridden editor.action.clipboardCutAction- back to default cut behavior
//     clipboardCutDisposable.dispose();

//     //execute the default editor.action.clipboardCutAction to cut
//     vscode.commands.executeCommand("editor.action.clipboardCutAction").then(function(){
        
//         console.log("After Cut");

//         //add the overridden editor.action.clipboardCutAction back
//         clipboardCutDisposable = vscode.commands.registerTextEditorCommand('editor.action.clipboardCutAction', overriddenClipboardCutAction);
//         context.subscriptions.push(clipboardCutDisposable);
//     }); 
// }

// /*
//  * Function that overrides the default paste behavior. We get the selection and use it, dispose of this registered
//  * command (returning to the default editor.action.clipboardPasteAction), invoke
//  */
// function overriddenClipboardPasteAction(textEditor, edit, params) {
    
//     //debug
//     console.log("---PASTE TEST---");
    
//     //use the selected text that is being copied here
//     //indicate that there was a paste operation
//     clipboardData.activePaste = true;

//     //dispose of the overridden editor.action.clipboardPasteAction- back to default paste behavior
//     clipboardPasteDisposable.dispose();

//     //execute the default editor.action.clipboardPasteAction to paste
//     vscode.commands.executeCommand("editor.action.clipboardPasteAction").then(function(){
        
//         console.log("After Paste");

//         //add the overridden editor.action.clipboardPasteAction back
//         clipboardPasteDisposable = vscode.commands.registerTextEditorCommand('editor.action.clipboardPasteAction', overriddenClipboardPasteAction);
//         context.subscriptions.push(clipboardPasteDisposable);
//     }); 
// }

exports.activate = activate;
exports.deactivate = deactivate;