const mongoose = require('mongoose');
const userSchema = require('./user');
const songSchema = require('./song');

const playlistSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: userSchema },
    songs: [{ type: mongoose.Schema.Types.ObjectId, ref: songSchema }],
    isTemp: { type: Boolean, default: false },
    artist: { type: String, trim: true },
    album: { type: String, trim: true },
    cover: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('playlist', playlistSchema);
