

// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
//App start 
var port = process.env.PORT || 6969;
var fs = require('fs');
//App server handler using express
var AppHelper = express();
var MongooseHelper = require("mongoose");
//Dependencies ==============================
//Dependency 
var path = require("path");
//Model Helpers
var NoteHelper = require("./models/Note.js");
var ArticleHelper = require("./models/Article.js");
// Set Handlebars and point at the partial dir
var exHandlebars = require("express-handlebars");
AppHelper.engine("handlebars", exHandlebars({
    defaultLayout: "main",
    partialsDir: path.join(__dirname, "/views/layouts/partials")
}));
AppHelper.set("view engine", "handlebars");
//Scraping 
var request = require("request");
var cheerio = require("cheerio");
//Make sure we make a Promises is supported in the mongoose helper
MongooseHelper.Promise = Promise;
// Usebody parser with our app
AppHelper.use(bodyParser.urlencoded({
    extended: false
}));
//Define to the App helper where the static resources are at "in the public folder"
AppHelper.use(express.static("public"));
//Local Connection DB Starts Here
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";
MongooseHelper.connect(MONGODB_URI);
var Db = MongooseHelper.connection;

var axios = require("axios");
Db.on("error", function (error) {
    console.log("Mongoose Error: ", error);
    // Succees and Error Logger
    var stream = fs.createWriteStream("my_serverLog.txt");
    stream.once('open', function (fd) {
        stream.write("Error\n");
        stream.write(Math.floor(Date.now() / 1000) + "\n");
        stream.end();
    });
});

Db.once("open", function () {
    console.log("Mongoose connection successful.");
    var stream = fs.createWriteStream("my_serverLog.txt");
    stream.once('open', function (fd) {
        stream.write("Success\n");
        stream.write(Math.floor(Date.now() / 1000) + "\n");
        stream.end();
    });
});
//ROUTES ==============================
// Meat of the code, where the html and api routes happen
// A GET request to scrape the echojs website
AppHelper.get("/scrape", function (req, res) {
    // First, we grab the body of the html with request
    axios.get("https://www.npr.org/").then(function (response) {
        var $ = cheerio.load(response.data);

        $("article .story-wrap").each(function (i, element) {
            // Save an empty result object
            var result = {};

            result.headline = $(this)
                .children(".story-text")
                .children("a")
                .children("h3")
                .text();
            result.brief = $(this)
                .has(".teaser")
                .text();
            result.url = $(this)
                .children(".story-text")
                .children("a")
                .attr("href");
            result.picUrl = $(this)
                .children("figure")
                .children("div")
                .children("div")
                .children("a")
                .children("img")
                .attr("src");

            console.log(result.picUrl);
            try{
            if(typeof result.picUrl != 'undefined' && result.brief.length > 4){
           
            var entry = new ArticleHelper(result);

            // Now, save that entry to the db
            entry.save(function (err, doc) {
                // Log any errors
                if (err) {
                    console.log(err);
                }
                // Or log the doc
                else {
                    console.log(doc);
                }
            });}
            }catch(err){

            }
        });
        res.send("Scrape Complete");
    });
});

//Gets us all the articles
AppHelper.get("/articles", function (req, res) {
    ArticleHelper.find({}, function (error, result) {
        // Log any errors
        if (error) {
            console.log(error);
        }
        else {
            res.json(result);
        }
    });
});

//Gets us a specific article
AppHelper.get("/articles/:id", function (req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
    ArticleHelper.findOne({ "_id": req.params.id })
        .populate("note")
        .exec(function (error, result) {
            if (error) {
                console.log(error);
            }
            else {
                res.json(result);
            }
        });
});

//Save an article
AppHelper.post("/articles/save/:id", function (req, res) {
    // Use the article id to find and update its saved boolean
    ArticleHelper.findOneAndUpdate({ "_id": req.params.id }, { "archived": true })
        // Execute the above query
        .exec(function (err, result) {
            if (err) {
                console.log(err);
            }
            else {
                res.send(result);
            }
        });
});
// Delete an article
AppHelper.post("/articles/delete/:id", function (req, res) {
    // Use the article id to find and update its saved boolean
    ArticleHelper.findOneAndUpdate({ "_id": req.params.id }, { "archived": false, "notes": [] })
        // Execute the above query
        .exec(function (err, doc) {
            // Log any errors
            if (err) {
                console.log(err);
            }
            else {
                // Or send the document to the browser
                res.send(doc);
            }
        });
});

//NOTES ==============================
// Create a new note
AppHelper.post("/notes/save/:id", function (req, res) {
    var tempNote = new NoteHelper({
        bodyText: req.body.text,
        article: req.params.id
    });

    tempNote.save(function (error, note) {
        if (error) {
            console.log(error);
        }

        else {
            ArticleHelper.findOneAndUpdate({ "_id": req.params.id }, { $push: { "notes": note } })
                .exec(function (err) {

                    if (err) {
                        console.log(err);
                        res.send(err);
                    }
                    else {
                        console.log(note);
                        res.send(note);
                    }
                });
        }
    });
});

AppHelper.delete("/notes/delete/:note_id/:article_id", function (req, res) {
    // Use the note id to find and delete it
    NoteHelper.findOneAndRemove({ "_id": req.params.note_id }, function (err) {
        // Log any errors
        if (err) {
            console.log("Error"+err);
            res.send(err);
        }
        else {
            ArticleHelper.findOneAndUpdate({ "_id": req.params.article_id }, { $pull: { "notes": req.params.note_id } })
                .exec(function (err) {
                    // Log any errors
                    if (err) {
                        console.log(err);
                        res.send(err);
                    }
                    else {
                        res.send("Note Deleted correctly");
                    }
                });
        }
    });
});

//HandBars Render the main page
AppHelper.get("/", function (req, res) {
    ArticleHelper.find({ "archived": false }, function (error, data) {
        var passObject = {
            article: data
        };
        console.log(passObject);
        res.render("home", passObject);
    });
});

//Handle the favorites page
AppHelper.get("/archived", function (req, res) {
    ArticleHelper.find({ "archived": true })
        .populate("notes")
        .exec(function (error, articles) {
            var passObject = {
                article: articles
            };
            res.render("saved", passObject);
        });
});

// Listen on port
AppHelper.listen(port, function () {
    console.log("App running on port " + port);
});