var http = require("http"); //to create a simple playback web server
var fs = require("fs"); //for reading a template html file
var path = require("path"); //for creating valid paths to files

//used to request the most recent playback data from the editor
var editorNode = require('./event-collector');
var sessionState = require('./session-state');

/*
 * create (but don't start) a web server to serve playbacks
 */
var server = http.createServer(function(req, res) {

    //handle the routes

    //check the url to see if it is a request for playback
    if(req.url.startsWith("/playback") && req.method === "GET") {
		
        console.log("Playback started... ");

        //holds playback data that will be added to the served html file
        //get the latest playback data from the editor
        var playbackData = editorNode.getPlaybackData();
        
		//read the playback html file that will drive the playback from the parent folder
		var playbackPage = fs.readFileSync(path.join(__dirname, "..", "playback.html"), "utf8");

        //this will get added to the playback code and is used to detemine whether to 
        //jump to the end of the playback for adding a comment.
        var isComment = "false";

        //if this is a playback for adding a comment 
        if(req.url.startsWith("/playback?comment=true")) {

            //indicate that there should be a jump to the end of the playback to add a comment    
            isComment = "true";
        }

        //replace parts of the template html file
        playbackPage = replaceLoadPlaybackDataFunction(playbackPage, isComment, playbackData);
        playbackPage = replaceCSS(playbackPage);
        playbackPage = replaceJQuery(playbackPage);
        playbackPage = replaceBootstrap(playbackPage);
        playbackPage = replaceMD5(playbackPage);
        playbackPage = replaceJSZip(playbackPage);

        //serve the html with the latest playback data to the browser
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(playbackPage);

    } else if(req.url === "/comment" && req.method === "POST") { //adding a comment from a playback
        
        //body of http request
        var body = [];

        req.on('error', function(err) {
            console.error(err);

            //send an error message
            res.writeHead(404, {"Content-Type": "text/plain"});
            res.end("Problem processing a comment" + err);

        }).on('data', function(chunk) {

            //add a new chunk of data to the body
            body.push(chunk);

        }).on('end', function() {
            
            //turn the body into a string
            body = Buffer.concat(body).toString();

            //turn the string into an object
            var comment = JSON.parse(body);

            //add a comment to the events before writing them all back to the file system
            //get the latest playback data from the editor
            var playbackData = editorNode.getPlaybackData();

            //find the event to add the comment to
            for(var i = 0;i < playbackData.codeEvents.length;i++) {

                //if the event is found
                if(comment.displayCommentEvent.id === playbackData.codeEvents[i].id) {
                    
                    //if there is not an array to hold comments on this event
                    if(!playbackData.comments[comment.displayCommentEvent.id]) {

                        //create an empty array to hold comments keyed by the comment event
                        playbackData.comments[comment.displayCommentEvent.id] = [];
                    }

                    //add the comment to the array of comments for this particular event
                    playbackData.comments[comment.displayCommentEvent.id].push(comment);

                    //stop looking for the event
                    break;
                }
            }

            //copy the new state of the playback data into the other module
            editorNode.setPlaybackData(playbackData);

            sessionState.saveAllStorytellerState();

            //send a success response back
            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(JSON.stringify({"result": "success"}));

        });

    } else if(req.url === "/comment" && req.method === "PUT") { //updating a comment from a playback
        
        //body of http request
        var body = [];

        req.on('error', function(err) {
            console.error(err);

            //send an error message
            res.writeHead(404, {"Content-Type": "text/plain"});
            res.end("Problem processing a comment" + err);

        }).on('data', function(chunk) {

            //add a new chunk of data to the body
            body.push(chunk);

        }).on('end', function() {
            
            //turn the body into a string
            body = Buffer.concat(body).toString();

            //turn the string into an object
            var comment = JSON.parse(body);

            //add a comment to the events before writing them all back to the file system
            //get the latest playback data from the editor
            var playbackData = editorNode.getPlaybackData();

            //if the list of comments exists for the specified event 
            if(playbackData.comments[comment.displayCommentEvent.id]) {

                //get the list of comments for the event
                var allCommentsForAnEvent = playbackData.comments[comment.displayCommentEvent.id];

                //search for the correct comment
                for(var i = 0;i < allCommentsForAnEvent.length;i++) {
    
                    //find the correct comment based on the timestamp when the comment was created
                    if(allCommentsForAnEvent[i].timestamp === comment.timestamp) {

                        //update the comment
                        allCommentsForAnEvent[i] = comment;

                        break;
                    }
                }

                //copy the new state of the playback data into the other module
                editorNode.setPlaybackData(playbackData);

                sessionState.saveAllStorytellerState();
                
                //send a success response back
                res.writeHead(200, {"Content-Type": "application/json"});
                res.end(JSON.stringify({"result": "success"}));

            } else {

                //send an error message
                res.writeHead(404, {"Content-Type": "text/plain"});
                res.end("Problem processing a comment");
            }
        });

    } else if(req.url === "/commentPosition" && req.method === "PUT") { //updating a comment position from a playback   
        
        //body of http request
        var body = [];

        req.on('error', function(err) {
            console.error(err);

            //send an error message
            res.writeHead(404, {"Content-Type": "text/plain"});
            res.end("Problem processing a comment" + err);

        }).on('data', function(chunk) {

            //add a new chunk of data to the body
            body.push(chunk);

        }).on('end', function() {
            
            //turn the body into a string
            body = Buffer.concat(body).toString();

            //turn the string into an object
            var updatedCommentPosition = JSON.parse(body);

            //add a comment to the events before writing them all back to the file system
            //get the latest playback data from the editor
            var playbackData = editorNode.getPlaybackData();

            //if the list of comments exists for the specified event 
            if(playbackData.comments[updatedCommentPosition.eventId]) {

                //get the array of events at the event id
                var arrayOfCommentsAtThisEvent = playbackData.comments[updatedCommentPosition.eventId];                

                //move the comment into its new position
                //get the element to move
                var element = arrayOfCommentsAtThisEvent[updatedCommentPosition.oldCommentPosition];

                //remove it from the array
                arrayOfCommentsAtThisEvent.splice(updatedCommentPosition.oldCommentPosition, 1);

                //add it back in the new postion
                arrayOfCommentsAtThisEvent.splice(updatedCommentPosition.newCommentPosition, 0, element);

                //copy the new state of the playback data into the other module
                editorNode.setPlaybackData(playbackData);

                sessionState.saveAllStorytellerState();
                
                //send a success response back
                res.writeHead(200, {"Content-Type": "application/json"});
                res.end(JSON.stringify({"result": "success"}));

            } else {

                //send an error message
                res.writeHead(404, {"Content-Type": "text/plain"});
                res.end("Problem processing a comment");
            }
        });

    } else if(req.url === "/comment" && req.method === "DELETE") { //removing a comment
                
        //body of http request
        var body = [];

        req.on('error', function(err) {
            console.error(err);

            //send an error message
            res.writeHead(404, {"Content-Type": "text/plain"});
            res.end("Problem processing a comment" + err);

        }).on('data', function(chunk) {

            //add a new chunk of data to the body
            body.push(chunk);

        }).on('end', function() {
            
            //turn the body into a string
            body = Buffer.concat(body).toString();

            //turn the string into an object
            var comment = JSON.parse(body);

            //add a comment to the events before writing them all back to the file system
            //get the latest playback data from the editor
            var playbackData = editorNode.getPlaybackData();

            //get the array of events at the event id
            var arrayOfCommentsAtThisEvent = playbackData.comments[comment.displayCommentEvent.id];
            var indexOfComment = -1;
            
            //go through all of the events at this event
            for(var i = 0;i < arrayOfCommentsAtThisEvent.length;i++) {

                //if the two comments have the same timestamp
                if(arrayOfCommentsAtThisEvent[i].timestamp === comment.timestamp) {

                    //record the position of the comment to remove
                    indexOfComment = i;
                    
                    break;
                }
            }

            //if the comment was found
            if(indexOfComment >= 0) {                    
                    
                //remove the comment
                arrayOfCommentsAtThisEvent.splice(indexOfComment, 1);

                //if there are no more comments at this event
                if(arrayOfCommentsAtThisEvent.length === 0) {

                    //remove the whole collection for this event
                    delete playbackData.comments[comment.displayCommentEvent.id];
                }
            }
            
            //copy the new state of the playback data into the other module
            editorNode.setPlaybackData(playbackData);

            sessionState.saveAllStorytellerState();

            //send a success response back
            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(JSON.stringify({"result": "success"}));
        });

    } else if(req.url === "/playbackDescription" && req.method === "PUT") { //updating the title/description of a playback
        
        //body of http request
        var body = [];

        req.on('error', function(err) {
            console.error(err);

            //send an error message
            res.writeHead(404, {"Content-Type": "text/plain"});
            res.end("Problem processing a title/description change" + err);

        }).on('data', function(chunk) {

            //add a new chunk of data to the body
            body.push(chunk);

        }).on('end', function() {
            
            //turn the body into a string
            body = Buffer.concat(body).toString();

            //turn the string into an object
            var updatedPlaybackDescription = JSON.parse(body);

            //get the latest playback data from the editor
            var playbackData = editorNode.getPlaybackData();

            //store the supplied title and description in the playback data
            playbackData.playbackDescription = updatedPlaybackDescription;

            //copy the new state of the playback data into the other module
            editorNode.setPlaybackData(playbackData);

            sessionState.saveAllStorytellerState();

            //send a success response back
            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(JSON.stringify({"result": "success"}));

        });
        
    } else { //error

        //send an error message
        res.writeHead(404, {"Content-Type": "text/plain"});
        res.end("Data not found");
    }
});

/* 
 * Start the playback server
 */
function startPlaybackServer() {
    
    console.log("Starting web server");

    //start the web server listening on port 3000
    server.listen(3000);
}

/* 
 * Stop the playback server
 */
function stopPlaybackServer() {
    
    console.log("Closing the server");

    //close the server
    server.close();
}

/*
 *
 */
function replaceLoadPlaybackDataFunction(playbackPage, isComment, playbackData) {

    //function to load all of the playback data to the html file. This will be added to the html in playbackPage
    var loadPlaybackDataFunction = `function loadPlaybackData() {

            //collect the playback data from the editor- events and developer info
            playbackData.codeEvents = ${JSON.stringify(playbackData.codeEvents)};
            playbackData.allDevelopers = ${JSON.stringify(playbackData.allDevelopers)}; 
            playbackData.allDeveloperGroups = ${JSON.stringify(playbackData.allDeveloperGroups)};
            playbackData.allFiles = ${JSON.stringify(playbackData.allFiles)};
            playbackData.allDirs = ${JSON.stringify(playbackData.allDirs)};
            playbackData.currentDevGroupId = ${JSON.stringify(playbackData.currentDevGroupId)};
            playbackData.comments = ${JSON.stringify(playbackData.comments)};
            playbackData.playbackDescription = ${JSON.stringify(playbackData.playbackDescription)};
            playbackData.branchId = ${JSON.stringify(playbackData.branchId)};
            
            //setup a new playback with the current data
            getPlaybackWindowsReadyForAnimation(true);
        
            //if this is a playback for a comment
            if(${isComment}) {
            
                //step forward as far as possible
                step("forward", Number.MAX_SAFE_INTEGER);
            }
        }`;				

    //the text in the file to replace
    var templateText = "function loadPlaybackData() {} //!!! string replacement of function here !!!";
    
    //replace the dummy text with the new function
    //javascript's replace() function will replace some special characters, '$&' for example, in the 
    //simplest case with some text. Since many js libraries include '$' we will use another version of replace that doesn't
    //(see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace for more info).   
    return playbackPage.replace(templateText, function() {return loadPlaybackDataFunction;});
}

/*
 *
 */
function replaceCSS(playbackPage) {

    //read the file from the parent folder
	var bootstrapMinCss = '<style type="text/css">' + fs.readFileSync(path.join(__dirname, "..", "css/bootstrap.min.css"), "utf8") + '</style>';

    //the text in the file to replace
    var templateText = '<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u" crossorigin="anonymous">';

    //replace the dummy text with the new css
    //javascript's replace() function will replace some special characters, '$&' for example, in the 
    //simplest case with some text. Since many js libraries include '$' we will use another version of replace that doesn't
    //(see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace for more info).   
    playbackPage = playbackPage.replace(templateText, function() {return bootstrapMinCss;});
    
    //read the file from the parent folder
    var bootstrapThemeMinCss = '<style type="text/css">' + fs.readFileSync(path.join(__dirname, "..", "css/bootstrap-theme.min.css"), "utf8") + '</style>';

    //the text in the file to replace
    templateText = '<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap-theme.min.css" integrity="sha384-rHyoN1iRsVXV4nD0JutlnGaslCJuC7uwjduW9SVrLvRYooPp2bWYgmgJQIXwl/Sp" crossorigin="anonymous">';

    //replace the dummy text with the new css theme
    //javascript's replace() function will replace some special characters, '$&' for example, in the 
    //simplest case with some text. Since many js libraries include '$' we will use another version of replace that doesn't
    //(see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace for more info).   
    return playbackPage.replace(templateText, function() {return bootstrapThemeMinCss;});   
}

/*
 *
 */
function replaceJQuery(playbackPage) {
    
    //read the file
	var jqueryMin = "<script> /* TEST */" + fs.readFileSync(path.join(__dirname, "ext/jquery.min.js"), "utf8") + " /* TEST */ </script>";

    //the text in the file to replace
    var templateText = '<script src="https://code.jquery.com/jquery-3.1.1.min.js" integrity="sha256-hVVnYaiADRTO2PzUGmuLJr8BLUSjGIZsDYGmIJLv2b8=" crossorigin="anonymous"></script>';

    //replace the dummy text with the new jquery
    //javascript's replace() function will replace some special characters, '$&' for example, in the 
    //simplest case with some text. Since many js libraries include '$' we will use another version of replace that doesn't
    //(see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace for more info).   
    return playbackPage.replace(templateText, function() {return jqueryMin;});
}

/*
 *
 */
function replaceBootstrap(playbackPage) {
    
    //read the file
	var bootstrapMin = "<script>" + fs.readFileSync(path.join(__dirname, "ext/bootstrap.min.js"), "utf8") + "</script>";	

    //the text in the file to replace
    var templateText = '<script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js" integrity="sha384-Tc5IQib027qvyjSMfHjOMaLkfuWVxZxUPnCJA7l2mCWNIpG9mGCD8wGNIcPD7Txa" crossorigin="anonymous"></script>';

    //replace the dummy text with the new bootstrap
    //javascript's replace() function will replace some special characters, '$&' for example, in the 
    //simplest case with some text. Since many js libraries include '$' we will use another version of replace that doesn't
    //(see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace for more info).   
    return playbackPage.replace(templateText, function() {return bootstrapMin;});
}

/*
 *
 */
function replaceMD5(playbackPage) {
    
    //read the file
	var md5Min = "<script>" + fs.readFileSync(path.join(__dirname, "ext/md5.min.js"), "utf8") + "</script>";

    //the text in the file to replace
    var templateText = '<script src="https://cdnjs.cloudflare.com/ajax/libs/blueimp-md5/2.3.1/js/md5.min.js"></script>';

    //replace the dummy text with the new md5
    //javascript's replace() function will replace some special characters, '$&' for example, in the 
    //simplest case with some text. Since many js libraries include '$' we will use another version of replace that doesn't
    //(see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace for more info).   
    return playbackPage.replace(templateText, function() {return md5Min;});		
}

/*
 *
 */
function replaceJSZip(playbackPage) {
    
    //read the file
	var jszip = "<script>" + fs.readFileSync(path.join(__dirname, "ext/jszip.min.js"), "utf8") + "</script>";	

    //the text in the file to replace
    var templateText = '<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.3/jszip.min.js"></script>';

    //replace the dummy text with the new jszip
    //javascript's replace() function will replace some special characters, '$&' for example, in the 
    //simplest case with some text. Since many js libraries include '$' we will use another version of replace that doesn't
    //(see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace for more info).   
    return playbackPage.replace(templateText, function() {return jszip;});
}

//for others to call these functions
module.exports = {
    
    //for playback server related functionality
    startPlaybackServer: startPlaybackServer,
    stopPlaybackServer: stopPlaybackServer
};
