const express = require('express');
const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Chat API is working!',
    timestamp: new Date().toISOString()
  });
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Chat service is healthy',
    service: 'chat',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

// Send message (API endpoint - WebSocket is primary)
router.post('/messages', (req, res) => {
  try {
    const { roomId, userId, message } = req.body;
    
    if (!roomId || !userId || !message) {
      return res.status(400).json({
        success: false,
        message: 'roomId, userId, and message are required'
      });
    }
    
    console.log(`📨 API Message from ${userId} in ${roomId}`);
    
    res.status(201).json({
      success: true,
      message: 'Message sent via API',
      data: {
        id: `msg_${Date.now()}`,
        roomId,
        userId,
        message,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
});

module.exports = router;