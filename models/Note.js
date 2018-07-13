//Using Mongose
var Mongoose = require("mongoose");

//Schema Class gets imported
var Schema = Mongoose.Schema;

var NoteSc = new Schema({
    bodyText : { type:String} ,
    article: {
        type: Schema.Types.ObjectId,
        ref: "Article"
    }

})

var Note = Mongoose.model("Note", NoteSc);

module.exports = Note;