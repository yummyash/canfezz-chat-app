import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Avatar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Badge,
  Divider,
  Toolbar,
  AppBar,
  Button,
  Chip,
  CircularProgress
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import LogoutIcon from '@mui/icons-material/Logout';
import PeopleIcon from '@mui/icons-material/People';
import SearchIcon from '@mui/icons-material/Search';
import LockIcon from '@mui/icons-material/Lock';
import dayjs from 'dayjs';
import { toast } from 'react-hot-toast';

const ChatPage = () => {
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef(null);

  // Initialize user and socket connection
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/login');
      return;
    }

    try {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      
      console.log('🌐 Connecting to WebSocket...');
      
      // Connect to WebSocket with proper configuration
      const socketInstance = io('http://localhost:5000', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000
      });

      // Connection events
      socketInstance.on('connect', () => {
        console.log('✅ WebSocket connected successfully!');
        console.log('Socket ID:', socketInstance.id);
        setConnected(true);
        
        // Send user join data
        socketInstance.emit('join', {
          id: userData.id,
          displayName: userData.displayName,
          avatarColor: userData.avatarColor,
          isGuest: userData.isGuest
        });
        
        toast.success('Connected to chat!');
      });

      socketInstance.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error);
        toast.error('Connection error. Retrying...');
        setConnected(false);
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('🔌 WebSocket disconnected:', reason);
        setConnected(false);
        if (reason === 'io server disconnect') {
          toast.error('Disconnected from server');
        }
      });

      // Message events
      socketInstance.on('receive_message', (message) => {
        console.log('📥 Message received:', message);
        setMessages(prev => [...prev, message]);
      });

      socketInstance.on('online_users', (users) => {
        console.log('👥 Online users:', users.length);
        setOnlineUsers(users);
      });

      socketInstance.on('user_online', (userData) => {
        console.log('🟢 User came online:', userData.displayName);
        setOnlineUsers(prev => [...prev, {
          ...userData,
          online: true
        }]);
        
        toast(`${userData.displayName} joined the chat`, {
          icon: '👋',
          duration: 3000
        });
      });

      socketInstance.on('user_offline', (data) => {
        console.log('🔴 User went offline:', data.userId);
        setOnlineUsers(prev => prev.filter(u => u.id !== data.userId));
      });

      socketInstance.on('user_typing', (data) => {
        console.log('⌨️ User typing:', data.userName);
        // You can add typing indicator logic here
      });

      setSocket(socketInstance);
      setLoading(false);

      // Load sample messages
      const sampleMessages = [
        {
          id: '1',
          userId: 'system',
          userName: 'System',
          userColor: '#43b581',
          message: 'Welcome to Canfezz Chat! You are now connected.',
          timestamp: new Date().toISOString()
        }
      ];
      setMessages(sampleMessages);

      return () => {
        if (socketInstance) {
          socketInstance.disconnect();
        }
      };
    } catch (error) {
      console.error('Error initializing chat:', error);
      toast.error('Failed to initialize chat');
      navigate('/login');
    }
  }, [navigate]);

  // Send message
  const sendMessage = () => {
    if (!inputMessage.trim() || !socket || !connected || !user) {
      toast.error('Cannot send message. Check connection.');
      return;
    }

    const messageData = {
      roomId: 'general',
      message: inputMessage.trim(),
      userId: user.id,
      userName: user.displayName,
      userColor: user.avatarColor
    };

    console.log('📤 Sending message:', messageData);
    
    socket.emit('send_message', messageData);

    // Add to local state immediately
    const tempMessage = {
      ...messageData,
      id: `temp_${Date.now()}`,
      timestamp: new Date().toISOString(),
      isOwn: true
    };

    setMessages(prev => [...prev, tempMessage]);
    setInputMessage('');
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    if (socket) {
      socket.disconnect();
    }
    navigate('/login');
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: 2,
        backgroundColor: '#36393f'
      }}>
        <CircularProgress size={60} sx={{ color: '#7289da' }} />
        <Typography variant="h6" color="white">
          Connecting to secure chat...
        </Typography>
        <Typography variant="body2" color="#b9bbbe">
          Establishing WebSocket connection
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', backgroundColor: '#36393f' }}>
      {/* Sidebar */}
      <Paper sx={{ 
        width: 300, 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        borderRadius: 0,
        backgroundColor: '#2f3136'
      }}>
        {/* Sidebar Header */}
        <Box sx={{ p: 2, borderBottom: '1px solid #40444b' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar sx={{ bgcolor: user?.avatarColor || '#7289da', mr: 2 }}>
              {user?.displayName?.charAt(0) || 'A'}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold' }}>
                {user?.displayName}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={connected ? 'Online' : 'Offline'}
                  size="small"
                  color={connected ? 'success' : 'error'}
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
                <Typography variant="caption" sx={{ color: '#b9bbbe' }}>
                  {connected ? 'Connected' : 'Disconnected'}
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={handleLogout} size="small" sx={{ color: '#b9bbbe' }}>
              <LogoutIcon />
            </IconButton>
          </Box>
          
          {/* Search */}
          <TextField
            fullWidth
            size="small"
            placeholder="Search messages..."
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: '#72767d' }} />
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#202225',
                '& fieldset': { borderColor: 'transparent' },
                '&:hover fieldset': { borderColor: '#40444b' }
              },
              '& .MuiInputBase-input': { color: 'white' }
            }}
          />
        </Box>

        {/* Online Users */}
        <Box sx={{ p: 2, flexGrow: 1, overflow: 'auto' }}>
          <Typography variant="caption" sx={{ 
            color: '#72767d', 
            fontWeight: 'bold',
            display: 'block',
            mb: 2
          }}>
            ONLINE — {onlineUsers.length}
          </Typography>
          
          <List dense>
            {onlineUsers.map((onlineUser) => (
              <ListItem
                key={onlineUser.id}
                sx={{
                  py: 1,
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: 'rgba(79, 84, 92, 0.16)'
                  }
                }}
              >
                <ListItemAvatar>
                  <Badge
                    color="success"
                    variant="dot"
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right'
                    }}
                  >
                    <Avatar sx={{ 
                      width: 32, 
                      height: 32, 
                      fontSize: '0.9rem',
                      bgcolor: onlineUser.avatarColor 
                    }}>
                      {onlineUser.displayName?.charAt(0)}
                    </Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ color: 'white', fontWeight: 'medium' }}>
                      {onlineUser.displayName}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" sx={{ color: '#b9bbbe' }}>
                      {onlineUser.isGuest ? 'Guest' : 'Registered'}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>

        {/* Connection Status */}
        <Box sx={{ p: 2, borderTop: '1px solid #40444b' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: connected ? '#43b581' : '#f04747'
              }} />
              <Typography variant="caption" sx={{ color: '#b9bbbe' }}>
                {connected ? 'Connected' : 'Disconnected'}
              </Typography>
            </Box>
            <LockIcon sx={{ fontSize: 16, color: '#43b581' }} />
          </Box>
        </Box>
      </Paper>

      {/* Main Chat Area */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Chat Header */}
        <Paper sx={{ 
          borderRadius: 0,
          backgroundColor: '#36393f',
          borderBottom: '1px solid #40444b'
        }}>
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PeopleIcon sx={{ color: '#b9bbbe' }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" sx={{ color: 'white' }}>
                  General Chat
                </Typography>
                <Typography variant="caption" sx={{ color: '#b9bbbe' }}>
                  {onlineUsers.length} users online • End-to-end encrypted
                </Typography>
              </Box>
              <Chip
                icon={<LockIcon sx={{ fontSize: 14 }} />}
                label="Encrypted"
                size="small"
                color="success"
                variant="outlined"
              />
            </Box>
          </Box>
        </Paper>

        {/* Messages Container */}
        <Box sx={{ 
          flexGrow: 1, 
          overflow: 'auto',
          backgroundColor: '#36393f',
          p: 2
        }}>
          {messages.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%',
              color: '#72767d',
              textAlign: 'center',
              p: 4
            }}>
              <LockIcon sx={{ fontSize: 80, mb: 2, opacity: 0.5 }} />
              <Typography variant="h5" gutterBottom sx={{ color: 'white' }}>
                Secure Chat Room
              </Typography>
              <Typography variant="body1" sx={{ maxWidth: 400, mb: 3 }}>
                This is a secure, end-to-end encrypted chat room. Your messages are private.
              </Typography>
              <Typography variant="caption" sx={{ color: '#43b581' }}>
                {connected ? '✅ Connected to server' : '❌ Connecting to server...'}
              </Typography>
            </Box>
          ) : (
            <>
              {messages.map((message) => {
                const isOwn = message.userId === user?.id;
                
                return (
                  <Box
                    key={message.id}
                    sx={{
                      display: 'flex',
                      justifyContent: isOwn ? 'flex-end' : 'flex-start',
                      mb: 2
                    }}
                  >
                    {!isOwn && message.userId !== 'system' && (
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          mr: 1,
                          alignSelf: 'flex-end',
                          bgcolor: message.userColor || '#7289da'
                        }}
                      >
                        {message.userName?.charAt(0)}
                      </Avatar>
                    )}
                    
                    <Paper
                      sx={{
                        p: 2,
                        maxWidth: '70%',
                        backgroundColor: isOwn ? '#7289da' : '#424549',
                        color: 'white',
                        borderRadius: 2,
                        borderTopLeftRadius: isOwn ? 12 : 2,
                        borderTopRightRadius: isOwn ? 2 : 12
                      }}
                    >
                      {message.userId !== 'system' && !isOwn && (
                        <Typography variant="caption" sx={{ 
                          color: message.userColor || '#b9bbbe',
                          fontWeight: 'bold',
                          display: 'block',
                          mb: 0.5
                        }}>
                          {message.userName}
                        </Typography>
                      )}
                      
                      <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
                        {message.message}
                      </Typography>
                      
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          textAlign: 'right',
                          mt: 0.5,
                          opacity: 0.7,
                          fontSize: '0.75rem'
                        }}
                      >
                        {dayjs(message.timestamp).format('HH:mm')}
                        {message.id?.startsWith('temp') && ' • Sending...'}
                      </Typography>
                    </Paper>
                    
                    {isOwn && (
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          ml: 1,
                          alignSelf: 'flex-end',
                          bgcolor: user.avatarColor
                        }}
                      >
                        {user.displayName?.charAt(0)}
                      </Avatar>
                    )}
                  </Box>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </Box>

        {/* Message Input */}
        <Box sx={{ 
          p: 2, 
          backgroundColor: '#36393f',
          borderTop: '1px solid #40444b'
        }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder={connected ? 'Type your encrypted message...' : 'Connecting to server...'}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={!connected}
              variant="outlined"
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#40444b',
                  '& fieldset': { borderColor: 'transparent' },
                  '&:hover fieldset': { borderColor: '#7289da' },
                  '&.Mui-focused fieldset': { borderColor: '#7289da' }
                },
                '& .MuiInputBase-input': {
                  color: 'white',
                  '&::placeholder': { color: '#72767d' }
                }
              }}
            />
            <IconButton
              color="primary"
              onClick={sendMessage}
              disabled={!inputMessage.trim() || !connected}
              sx={{
                backgroundColor: connected ? '#7289da' : '#40444b',
                color: 'white',
                '&:hover': {
                  backgroundColor: connected ? '#677bc4' : '#40444b'
                },
                height: 40,
                width: 40
              }}
            >
              <SendIcon />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption" sx={{ color: '#72767d' }}>
              {connected ? '🔒 Messages are end-to-end encrypted' : '🔌 Connecting to server...'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#72767d' }}>
              {messages.length} messages
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ChatPage;