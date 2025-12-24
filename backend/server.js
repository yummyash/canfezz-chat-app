const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path'); // ✅ added

const app = express();
const server = http.createServer(app);

// ================= SOCKET.IO =================
const io = socketIo(server, {
  cors: {
    origin:
      process.env.NODE_ENV === 'production'
        ? '*'
        : 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// ================= MIDDLEWARE =================
app.use(express.json());

app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? '*'
        : 'http://localhost:3000',
    credentials: true
  })
);

// Log all requests
app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.url}`
  );
  next();
});

// ================= PRODUCTION FRONTEND =================
if (process.env.NODE_ENV === 'production') {
  console.log('🚀 Serving React frontend build');

  app.use(
    express.static(
      path.join(__dirname, '../frontend/build')
    )
  );

  // React Router support
  app.get('*', (req, res) => {
    res.sendFile(
      path.join(__dirname, '../frontend/build', 'index.html')
    );
  });
}

// ================= DATA STORE =================
const connectedUsers = new Map();

// ================= REST API =================

app.get('/', (req, res) => {
  res.json({
    message: 'Canfezz Chat API',
    version: '1.0.0',
    websocket: 'ws://localhost:5000',
    connectedUsers: connectedUsers.size
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    websocket: 'active',
    connectedUsers: connectedUsers.size,
    timestamp: new Date().toISOString()
  });
});

// Register
app.post('/api/auth/register', (req, res) => {
  const { email, password, displayName } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }

  const user = {
    id: `user_${Date.now()}`,
    email,
    displayName:
      displayName || `User_${Math.floor(Math.random() * 10000)}`,
    avatarColor: '#7289da',
    isGuest: false,
    createdAt: new Date().toISOString()
  };

  res.json({
    success: true,
    message: 'Registration successful!',
    token: `token_${Date.now()}`,
    user
  });
});

// Guest login
app.post('/api/auth/guest', (req, res) => {
  const user = {
    id: `guest_${Date.now()}`,
    displayName: `Anonymous_${Math.floor(
      Math.random() * 9000
    ) + 1000}`,
    avatarColor: '#43b581',
    isGuest: true,
    createdAt: new Date().toISOString()
  };

  res.json({
    success: true,
    message: 'Guest login successful',
    token: `guest_token_${Date.now()}`,
    user
  });
});

// ================= WEBSOCKET =================
io.on('connection', (socket) => {
  console.log('🔗 WebSocket connected:', socket.id);

  socket.on('join', (userData) => {
    connectedUsers.set(socket.id, {
      ...userData,
      socketId: socket.id,
      connectedAt: new Date(),
      online: true
    });

    socket.broadcast.emit('user_online', {
      userId: userData.id,
      displayName: userData.displayName,
      avatarColor: userData.avatarColor
    });

    const onlineUsers = Array.from(connectedUsers.values()).map(
      (u) => ({
        id: u.id,
        displayName: u.displayName,
        avatarColor: u.avatarColor,
        online: true
      })
    );

    socket.emit('online_users', onlineUsers);
  });

  socket.on('send_message', (messageData) => {
    io.emit('receive_message', {
      ...messageData,
      id: `msg_${Date.now()}`,
      timestamp: new Date().toISOString(),
      delivered: true
    });
  });

  socket.on('typing', (data) => {
    socket.broadcast.emit('user_typing', data);
  });

  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      socket.broadcast.emit('user_offline', {
        userId: user.id
      });
      connectedUsers.delete(socket.id);
    }
    console.log('🔌 Disconnected:', socket.id);
  });

  socket.on('error', (err) => {
    console.error('Socket error:', err);
  });
});

// WebSocket engine errors
io.engine.on('connection_error', (err) => {
  console.error(
    'WebSocket connection error:',
    err.code,
    err.message
  );
});

// ================= START SERVER =================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
  🚀 CANFEZZ BACKEND RUNNING
  =================================
  🌐 REST API: http://localhost:${PORT}
  🔗 WebSocket: ws://localhost:${PORT}
  🌍 Mode: ${process.env.NODE_ENV || 'development'}
  =================================
  `);
});
