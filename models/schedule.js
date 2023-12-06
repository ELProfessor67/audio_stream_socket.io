const mongoose = require("mongoose");
const songSchema = require('./song');

const scheduleSchems = new mongoose.Schema({
    date: {type: String,required: true},
    time: {type: String, required: true},
    songs: [{type: mongoose.Schema.Types.ObjectId, ref: songSchema}],
    owner: {type: mongoose.Schema.Types.ObjectId,ref: 'user'},
    songsPerAds: {type: Number,required: true},
    status: {type: String,enum: ['pending','processing','complete'],default: 'pending'}
},{timestamps: true});



module.exports = mongoose.model('schedule',scheduleSchems);