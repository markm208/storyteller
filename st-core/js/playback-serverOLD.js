var http = require("http"); //to create a simple playback web server
var fs = require("fs"); //for reading a template html file
var path = require("path"); //for creating valid paths to files

//used to request the most recent playback data from the editor
var editorNode = require('./event-collector');

//create (but don't start) a web server to serve playbacks
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

        //this will get added to the playback code below and is used to detemine whether to 
        //jump to the end of the playback for adding a comment.
        var isComment = "false";

        //if this is a playback for adding a comment 
        if(req.url.startsWith("/playback?comment=true")) {

            //indicate that there should be a jump to the end of the playback to add a comment    
            isComment = "true";
        }

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

                //setup a new playback with the current data
                getPlaybackWindowsReadyForAnimation(true);
            
                //if this is a playback for a comment
                if(${isComment}) {
                
                    //step forward as far as possible
                    step("forward", Number.MAX_SAFE_INTEGER);
                }
            }`;				

        //add the playback data via a new function to the html file
		playbackPage = playbackPage.replace("//function loadPlaybackData() {} //!!! string replacement of function here !!!", loadPlaybackDataFunction);

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
                }
            }

            //send a success response back
            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(JSON.stringify({"result": "success"}));
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

            //send a success response back
            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(JSON.stringify({"result": "success"}));
        });

    } else if (req.url === "/css/bootstrap.min.css" && req.method === "GET") { //bootstrap css
        
        //read the file from the parent folder
		var bootstrapMinCss = fs.readFileSync(path.join(__dirname, "..", "css/bootstrap.min.css"), "utf8");
		
        //serve the css to the browser
        res.writeHead(200, {"Content-Type": "text/css"});
        res.end(bootstrapMinCss);

    } else if (req.url === "/css/bootstrap-theme.min.css" && req.method === "GET") { //bootstrap theme

        //read the file from the parent folder
		var bootstrapThemeMinCss = fs.readFileSync(path.join(__dirname, "..", "css/bootstrap-theme.min.css"), "utf8");
		
        //serve the css to the browser
        res.writeHead(200, {"Content-Type": "text/css"});
        res.end(bootstrapThemeMinCss);

    } else if (req.url === "/js/jquery.min.js" && req.method === "GET") { //jquery js
        
        //read the file
		var jqueryMin = fs.readFileSync(path.join(__dirname, "ext/jquery.min.js"), "utf8");
		
        //serve the js to the browser
        res.writeHead(200, {"Content-Type": "text/js"});
        res.end(jqueryMin);

    } else if (req.url === "/js/bootstrap.min.js" && req.method === "GET") { //bootstrap js
        
        //read the file
		var bootstrapMin = fs.readFileSync(path.join(__dirname, "ext/bootstrap.min.js"), "utf8");
		
        //serve the js to the browser
        res.writeHead(200, {"Content-Type": "text/js"});
        res.end(bootstrapMin);

    } else if (req.url === "/js/md5.min.js" && req.method === "GET") { //md5 js

        //read the file
		var md5Min = fs.readFileSync(path.join(__dirname, "ext/md5.min.js"), "utf8");
		
        //serve the js to the browser
        res.writeHead(200, {"Content-Type": "text/js"});
        res.end(md5Min);

    } else if (req.url === "/js/jszip.min.js" && req.method === "GET") { //js zip

        //read the file
		var jszip = fs.readFileSync(path.join(__dirname, "ext/jszip.min.js"), "utf8");
		
        //serve the js to the browser
        res.writeHead(200, {"Content-Type": "text/js"});
        res.end(jszip);

    } else if(req.url.startsWith("/fonts/") && req.method === "GET") { //bootstrap/glyphicons
        
        //read the file (in binary format)
		var glyphicon = fs.readFileSync(path.join(__dirname, "..", req.url));
        
        //mime tpyes in the glyphicon files
        var mimeTypes = {
            ".eot": "application/vnd.ms-fontobject",
            ".svg": "image/svg+xml",
            ".ttf": "application/x-font-ttf",
            ".woff": "application/x-font-woff",
            ".woff2": "font/woff2"
        }

        //serve the fonts to the browser
        res.writeHead(200, {"Content-Type": mimeTypes[path.extname(req.url)]});
        res.end(glyphicon);

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

//for others to call these functions
module.exports = {
    
    //for playback server related functionality
    startPlaybackServer: startPlaybackServer,
    stopPlaybackServer: stopPlaybackServer
};
