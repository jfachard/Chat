const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
    },
});

app.use(cors());

mongoose
    .connect('mongodb://localhost:27017/chatApp', {})
    .then(() => console.log('Connected to MongoDB!'))
    .catch((error) => console.error('MongoDB connection error:', error.message));


const Message = require('./models/message');
const User = require('./models/user');
const Channel = require('./models/channel');

const sendPrivateMessage = async (socket, data) => {
    try {
        const message = new Message({ content: data.content, id_channel: data.id_channel,username: data.username});
        await message.save();

        socket.to(data.id_channel).emit('private_message', { 
            content: data.content, 
            _id: message._id, 
            id_channel: data.id_channel, 
            username: data.username 
        });
    } catch (error) {
        console.error('Error saving or broadcasting message:', error.message);
    }
};

const handleChatMessage = async (socket, data) => {
    try {
        const message = new Message({ content: data.content, id_channel: data.channel, username: data.username});
        await message.save();

        socket.to(data.channel).emit('receive_message', { content: data.content, _id: message._id, id_channel: data.channel, username: data.username});
    } catch (error) {
        console.error('Error saving or broadcasting message:', error.message);
    }
};

const fetchExistingMessages = async (channelId) => {
    try {
        const messages = await Message.find({ id_channel: channelId });
        return messages;
    } catch (error) {
        console.error('Error fetching existing messages:', error.message);
        return [];
    }
};

const sendExistingMessages = async (socket, channelId) => {
    try {
        const messages = await fetchExistingMessages(channelId);
        socket.emit('existing messages', messages);
    } catch (error) {
        console.error('Error sending existing messages:', error.message);
    }
};

const handleNewChannel = async (socket, data) => {
    try {
        let channel = await Channel.findOne({ channel: data.channel });

        if (!channel) {
            channel = new Channel({ channel: data.channel });
            await channel.save();

            socket.emit('channel created', { channel: data.channel, _id: channel._id });
            console.log("Channel created !!!");
        } else {
            console.log('Channel already exists');
        }
    } catch (error) {
        console.error('Error saving channel:', error.message);
    }
};

const handleChannel = async (username, room) => {  
    try {
        const user = await User.findOne({ username: username });
        if (!user) {
            throw new Error(`User ${username} not found.`);
        }

        const updatedUser = await User.findOneAndUpdate(
            { username: username },
            { id_channel: room.channel },
            { new: true }
        );

        if (!updatedUser) {
            throw new Error(`Failed to update user ${username}.`);
        }

    }
    catch (error) {
        console.error('Error updating user channel:', error.message);
    }
};

const handleLeaveChannel = async (socket, data) => {
    try {
        socket.leave(data.channel);

        console.log(`User left channel: ${data.channel}`);
        socket.emit('leave room', { channel: data.channel });
    } catch (error) {
        console.error('Error leaving channel:', error.message);
    }
};

const handleJoinChannel = async (socket, data) => {
    try {
        socket.join(data.channel);

        console.log(`User joined channel: ${data.channel}`);
        socket.emit('join room', { channel: data.channel });
    } catch (error) {
        console.error('Error joining channel:', error.message);
    }
};

const leavePrivateChannel = async (socketId, channelName) => {
    try {
        const user = await User.findOneAndUpdate({ username: socketId }, { id_channel: null });
    } catch (error) {
        console.error('Error leaving channel:', error.message);
    }
};

const handleDeleteChannel = async (socket, data) => {
    try {
        const channelName = data.channel;
        
        await Channel.findOneAndDelete({ channel: channelName });

        socket.emit('channel deleted', { channel: channelName });

    } catch (error) {
        console.error('Error deleting channel:', error.message);
    }
};

const handleNewUser = async (socket, data) => {
    try {
        let existingUser = await User.findOne({ username: data.username });

        if (!existingUser) {
            const newUser = new User({ username: data.username });
            await newUser.save();
            socket.emit('user created', { username: data.username, _id: newUser._id});
        } else {
            console.log('User already exists');
            socket.emit('user exists', { message: 'Username already taken', username: data.username });
        }
    } catch (error) {
        console.error('Error saving user:', error.message);
        socket.emit('user error', { message: 'Error saving user' });
    }
};

const handlePrivateMessage = async (senderUsername, receiverUsername, messageContent) => {
    try {
        const privateChannelName = `private${senderUsername}${receiverUsername}`;

        await handleNewChannel(io, { channel: privateChannelName });

        await handleChannel(senderUsername, { channel: privateChannelName });
        await handleChannel(receiverUsername, { channel: privateChannelName });
        
        console.log(`Joining private channel ${privateChannelName}`);

        await sendPrivateMessage(io, { content: messageContent, id_channel: privateChannelName, username: senderUsername });
        console.log(`Sending private message to ${receiverUsername}: ${messageContent}`);

        await sendExistingMessages(io, privateChannelName);
        
        setTimeout(async () => {
            await leavePrivateChannel(senderUsername, privateChannelName);
            await leavePrivateChannel(receiverUsername, privateChannelName);
            console.log(`Leaving private channel ${privateChannelName}`);
            await handleDeleteChannel(io, { channel: privateChannelName });
            console.log(`Deleting private channel ${privateChannelName}`);
        }, 6000);
    } catch (error) {
        console.error('Erreur lors de la gestion du message privé :', error.message);
    }
};

io.on('connection', async (socket) => {
    socket.emit('clear messages');

    socket.on('join room', (data) => {
        handleJoinChannel(socket, data);
    
        socket.username = data.username;

        console.log(data.username, data.room);
    
        handleChannel(data.username, data.room);
    
        sendExistingMessages(socket, data.channelId);
    });

    socket.on('leave room', (room) => {
        handleLeaveChannel(socket, room);
    });

    socket.on('chat message', async (data) => {
        handleChatMessage(socket, data);
    });

    socket.on('chat message to user', async (data) => {
        try {
            const { sender, username, content } = data;
    
            const receiverUser = await User.findOne({ username: username });
            if (!receiverUser) {
                throw new Error(`Receiver user ${username} not found.`);
            }
    
            handlePrivateMessage(sender, username, content);
        } catch (error) {
            console.error('Error sending message to user:', error.message);
        }
    });

    socket.on('list channels', async () => {
        try {
            const channels = await Channel.find();
            socket.emit('channel list', channels);
        } catch (error) {
            console.error('Error fetching channels:', error.message);
        }
    });

    socket.on('list users', async () => {
        try {
            const users = await User.find();
            socket.emit('user list', users);
        } catch (error) {
            console.error('Error fetching users:', error.message);
        }
    });

    socket.on('create channel', (channel) => {
        handleNewChannel(socket, channel);
    });

    socket.on('delete channel', (channel) => {
        handleDeleteChannel(socket, channel);
    });

    socket.on('set username', (username) => {
        socket.username = username;
        //userSockets[username] = socket.id;
        handleNewUser(socket, username );

    });

    socket.on('start-typing', () => {
        socket.broadcast.emit('start-typing-from-server');
    });

    socket.on('stop-typing', () => {
        socket.broadcast.emit('stop-typing-from-server');
    });

    socket.on('list rooms', () => {
        const rooms = Object.keys(socket.adapter.rooms);
        socket.emit('room list', rooms);
    });

    socket.on('leave private room', async () => {
        try {
            const user = await User.findOneAndUpdate(
                { username: socket.username },
                { id_channel: null },
                { new: true }
            );
        } catch (error) {
            console.error('Error updating user channel:', error.message);
        }
    });
});

server.listen(3001, () => {
    console.log('Server running at http://localhost:3001');
});
