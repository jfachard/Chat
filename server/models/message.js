const mongoose = require('mongoose');
const messageSchema = new mongoose.Schema({
    content: {
        type: String, 
        required: true
    },

    username: {
        type: String, 
        required: true
    },

    timestamp: { 
        type: Date, 
        default: Date.now 
    },

    id_channel: {
        type: String,
        ref: 'Channel'
    }

});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
