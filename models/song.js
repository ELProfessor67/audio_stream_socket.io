const mongoose = require("mongoose");

const songSchems = new mongoose.Schema({
    title: {type: String,required: true,trim: true},
    description: {type: String,required: true,trim: true},
    artist: {type: String,required: true},
    cover: {type: String,required: true},
    audio: {type: String,required: true},
    size: {type: Number,required: true},
    type: {type: String,required: true},
    owner: {type: mongoose.Schema.Types.ObjectId,ref: 'user'},
    isAds: {type: Boolean,default: false}
},{timestamps: true});



module.exports = mongoose.model('song',songSchems);