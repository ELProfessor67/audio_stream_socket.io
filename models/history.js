const mongoose = require("mongoose");
const songSchema = require('./song');

const historySchema = new mongoose.Schema({
  title: {type: String,required: true},
  artist: {type: String,required: true},
  audio: {type: String,required: true},
  album: {type: String,required: true},
  cover: {type: String,required: true},
  date: {type: Date, default: new Date().getTime()},
    
  owner: {type: mongoose.Schema.Types.ObjectId,ref: 'user'},
},{timestamps: true});



module.exports = mongoose.model('history',historySchema);