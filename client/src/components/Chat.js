import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { Box, Typography, FilledInput, InputAdornment, IconButton, InputLabel, Card, Avatar, /*Stack*/ } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
//import UserIcon from '../assets/icons8-user-100.png';

const socket = io('http://localhost:3001');

const Chat = () => {

    const [room, setRoom] = useState("");
    const [message, setMessage] = useState("");
    const [channel, setChannel] = useState("");
    const [username, setUsername] = useState("");
    const [chat, setChat] = useState([]);
    const [typing, setTyping] = useState(false);
    const [time, setTime] = useState(null);
    //const [currentChannelId, setCurrentChannelId] = useState("");

    const commands = {
        '/nick': (args) => {
            setUsername(args);
            setMessage('');
            userName(args);
        },
        '/list': () => {
            listChannels();
        },
        '/create': (args) => {
            createRoom(args);
        },
        '/delete': (args) => {
            deleteRoom(args);
        },
        '/join': (args) => {
            joinRoom(args);
        },
        '/quit': (args) => {
            leaveRoom(args);
        },
        '/users': (args) => {
            listUsers(args);
        },
        '/msg': (args) => {
            sendMessageTo(args, username);
        },

    };

    const processCommand = () => {
        const [command, ...args] = message.split(' ');

        if (command.startsWith('/') && commands[command]) {
            commands[command](args.join(' '), username);
        } else {
            sendMessage();
        }
    };

    const sendMessage = () => {
        socket.emit('chat message', { content: message, id_channel: channel, username: username });
        setMessage('');
    }

    const sendMessageTo = (args, senderUsername) => {
        const match = args.match(/^(\S+)\s(.*)$/);
        if (match) {
            const [, receiverUsername, message] = match;
            if (receiverUsername && message) {
                const data = { content: message, room: room, username: receiverUsername, sender: senderUsername };
                socket.emit('chat message to user', data);
            } else {
                console.error('Invalid command format. Usage: /msg <username> <message>');
            }
        } else {
            console.error('Invalid command format. Usage: /msg <username> <message>');
        }
    }

    const joinRoom = (roomName) => {
        setChannel(roomName);
        socket.emit('join room', { room: roomName, username: username });
    }

    const listChannels = (channel) => {
        socket.emit('list channels', { channel: channel });
    }

    const listUsers = (username) => {
        socket.emit('list users', { username: username });
    }

    const createRoom = (newRoom) => {
        socket.emit('create channel', { channel: newRoom });
    }

    const deleteRoom = (room) => {
        socket.emit('delete channel', { channel: room });
    }

    const userName = (username) => {
        socket.emit('set username', { username: username });
    }

    const leaveRoom = (room) => {
        socket.emit('leave room', { room: room });
    }

    function handleFormSubmit(e) {
        e.preventDefault();
        processCommand();
        setChat((prevChat) => [...prevChat, { message, received: false, username }]);
        setMessage('');
    }

    function handleKeyPress(e) {
        if (e.keyCode === 13) {
            processCommand();
            setChat((prevChat) => [...prevChat, { message, received: false, username }]);
            setMessage('');
        }
    }

    function handleInput(e) {

        setMessage(e.target.value);
        socket.emit('start-typing');

        if (time) {
            clearTimeout(time);
        }

        setTime(setTimeout(() => {
            socket.emit('stop-typing');
        }, 1000));
    }

    const handleMessageReceive = (data) => {
        if (data.sender !== socket.id) {
            setChat((prevChat) => [...prevChat, { message: data.content }]);
        }
    };

    useEffect(() => {
        socket.on('receive_message', (data) => {
            setChat((prev) => [...prev, { message: data.content, received: true, username: data.username, channel: data.channel }]);

        });

        socket.on('private channel messages', (messages) => {
            const privateChannelMessages = messages.map(message => ({
                message: message.content,
                received: true,
                username: message.username,
                channel: message.channel
            }));
            console.log(privateChannelMessages);
            setChat(prevChat => [...prevChat, { message: privateChannelMessages.message, received: true, username: privateChannelMessages.username, channel: privateChannelMessages.channel}]);
        });
    
        socket.on('private_message', (data) => {
            if (data.sender !== socket.id) {
                setChat((prevChat) => [...prevChat, { message: data.content, received: true, username: data.sender, id_channel: data.id_channel }]);
            }
        });

        socket.on('start-typing-from-server', () => {
            setTyping(true);
        });

        socket.on('stop-typing-from-server', () => {
            setTyping(false);
        });

        socket.on('room list', (rooms) => {
            setRoom(rooms);
        });

        socket.on('channel list', (channel) => {
            const channelNames = channel.map(channel => channel.channel);
            const channelListMessage = `Channels available ${channelNames.join(', ')}`;
            setChat((prevChat) => [...prevChat, { message: channelListMessage, received: true, username: 'System' }]);
        });

        socket.on('user list', (users) => {
            const userNames = users.map(user => user.username);
            const userListMessage = `Users: ${userNames.join(', ')}`;
            setChat((prevChat) => [...prevChat, { message: userListMessage, received: true, username: 'System' }]);
        });

        socket.on('user created', () => {
            setChat((prevChat) => [...prevChat, { message: `User created`, received: true, username: 'System' }]);
        });

        socket.on('user exists', () => {
            setChat((prevChat) => [...prevChat, { message: `Username already exists.`, received: true, username: 'System' }]);
        });

        socket.on('join room', () => {
            setChat((prevChat) => [...prevChat, { message: `You joined the room`, received: true, username: 'System' }]);
        });
    
        socket.on('leave room', () => {
            setChat((prevChat) => [...prevChat, { message: `You left the room`, received: true, username: 'System' }]);
        });
    
        socket.on('channel created', () => {
            setChat((prevChat) => [...prevChat, { message: `channel created`, received: true, username: 'System' }]);
        });
    
        socket.on('channel deleted', () => {
            setChat((prevChat) => [...prevChat, { message: `channel deleted`, received: true, username: 'System' }]);
        });

        return () => {
            socket.off('receive_message', handleMessageReceive);
            socket.off('channel list');
            socket.off('user list');
        };
    }, []);
    
    return (
        <>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
                {/* <Card sx={{ padding: 2, marginTop: 10, width: '20%', backgroundColor: 'ghostwhite' }} variant='outlined'>
                    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly' }}>
                        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                            <Avatar src={UserIcon} sx={{ width: 56, height: 56 }} />
                            <Typography variant='h6'>{username}</Typography>
                        </Stack>
                    </Box>
                </Card> */}

                <Card sx={{ padding: 2, marginTop: 2, width: '100%', backgroundColor: 'ghostwhite' }} variant='outlined'>
                    <Box sx={{ flex: '1', overflowY: 'auto', padding: 2 }}>
                        {
                            chat.map((data, index) => (
                                <Box key={index} sx={{ display: 'flex', justifyContent: data.received ? 'flex-start' : 'flex-end', alignItems: 'center', marginBottom: 1 }}>
                                    {data.received && (
                                        <Avatar sx={{ width: 56, height: 56, marginRight: 1, backgroundColor: data.username === 'System' ? 'darkslategray' : 'darkseagreen' }}>
                                            {data.username === 'System' ? (data.username && data.username.substring(0, 3)) : (data.username && data.username.substring(0, 2))}
                                        </Avatar>
                                    )}
                                    <Card sx={{ padding: 1, backgroundColor: data.received ? 'lightgrey' : 'lightskyblue', maxWidth: '80%', borderRadius: 2 }}>
                                        <Typography variant='caption' sx={{ alignSelf: 'flex-end', marginTop: 1 }}>{data.username}</Typography>
                                        <Typography variant='body1'>{data.message}</Typography>
                                    </Card>
                                    {!data.received && (
                                        <Avatar sx={{ width: 56, height: 56, marginLeft: 1, backgroundColor: 'lightsalmon' }}>
                                            {data.username ? data.username.substring(0, 2): 'Me'}
                                        </Avatar>
                                    )}
                                </Box>
                            ))
                        }
                    </Box>
                    <Box sx={{ marginTop: 30 }}>
                        {
                            typing && <InputLabel sx={{ textAlign: "left" }}> Typing...</InputLabel>
                        }
                        <FilledInput
                            id="filled-adornment-message"
                            value={message}
                            placeholder='Type a message...'
                            onChange={handleInput}
                            onKeyDown={handleKeyPress}
                            variant="filled"
                            fullWidth
                            endAdornment={
                                <InputAdornment position="end">
                                    <IconButton onClick={handleFormSubmit}>
                                        <SendIcon />
                                    </IconButton>
                                </InputAdornment>
                            }
                        />
                    </Box>
                </Card>
            </Box>
        </>
    )
}

export default Chat
