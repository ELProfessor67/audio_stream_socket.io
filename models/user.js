const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {type: String,required: true},
    email: {type: String,required: true,unique: true,trim: true},
    password: {type: String,required: true},
    country: {type: String,required: true},
    station_name: {type: String,required: true},
    website_url: {type: String,required: false,default: undefined},
    timezone: {type: String,required: true},
    avatar: {
        public_id: {type: String,default: undefined},
        url: {type: String,default: undefined}
    },
    subscription: {
        subscription_id: {type: String,default: undefined},
        date: {type: Date, default: undefined},
    },
    isSubscriber: {type: Boolean, default: false },
    resetPasswordToken: {type: String,default: undefined},
    resetPasswordExpire: {type: Date,default: undefined},
    isDJ: {type: Boolean,default: false},
    djOwner: {type: mongoose.Schema.Types.ObjectId,ref: 'user',default: undefined},
    djPermissions: [{type: String,enum: ['songs','playlists','schedules','live','dashboard','requests','ads']}],
    djStartTime: {type: String,default: undefined},
    djEndTime: {type: String,default: undefined}
},{timestamps: true});


module.exports = mongoose.model('user',userSchema);