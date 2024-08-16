const mongoose= require("mongoose");

const allPostsSchema=mongoose.Schema({

    allposts :[{
        type: mongoose.Schema.Types.ObjectId,
        ref: "post"
    }]
})

module.exports = mongoose.model("allpost",allPostsSchema);