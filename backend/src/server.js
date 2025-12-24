const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body));
  }
  next();
});

// Import routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Canfezz Chat API',
    version: '1.0.0',
    endpoints: {
      auth: [
        'POST /api/auth/guest - Guest login',
        'POST /api/auth/register - User registration',
        'POST /api/auth/login - User login'
      ],
      chat: [
        'GET /api/chat/health - Chat health'
      ]
    }
  });
});

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Canfezz API',
    timestamp: new Date().toISOString()
  });
});

// WebSocket (Socket.IO) integration
io.on('connection', (socket) => {
  console.log('🔗 New WebSocket connection:', socket.id);

  socket.on('send_message', (data) => {
    console.log('💬 Message received:', data);
    io.emit('receive_message', data); // Broadcast to all clients
  });

  socket.on('disconnect', () => {
    console.log('🔌 User disconnected:', socket.id);
  });
});

// 404 Handler
app.use((req, res) => {
  console.log('❌ Route not found:', req.method, req.url);
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`
🚀 CANFEZZ BACKEND RUNNING
==========================
📡 Port: ${PORT}
🔗 API: http://localhost:${PORT}

✅ ENDPOINTS:
   POST /api/auth/guest
   POST /api/auth/register
   POST /api/auth/login
==========================
`);
});
