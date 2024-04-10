const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
    channel: {
        type: String, 
        required: true
    },
    connectedUsers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ]
});

const Channel = mongoose.model('Channel', channelSchema);

module.exports = Channel;