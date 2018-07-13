//Using Mongose
var Mongoose = require("mongoose");

//Schema Class gets imported
var Schema = Mongoose.Schema;

//Create the instance of the schema
var ArticleSc = new Schema({
   //Has the 
    headline :{
        type: String,
        required : true
    },
    brief : {
        type :String
    },
    url : {
        type: String
    },
    picUrl :{
        type: String
    },
    archived : {
        type: Boolean,
        default: false
    },
    notes:[{
        type: Schema.Types.ObjectId,
        ref: "Note"
    }]
});

var ArticleHandler = Mongoose.model("ArticleHandler", ArticleSc);

module.exports = ArticleHandler;