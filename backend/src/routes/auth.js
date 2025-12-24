const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Test route - to check if auth routes are working
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Auth API is working!',
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'POST /api/auth/guest - Guest login (no credentials needed)',
      'POST /api/auth/register - Register with email/password',
      'POST /api/auth/login - Login with email/password',
      'POST /api/auth/validate - Validate token',
      'POST /api/auth/logout - Logout user',
      'GET /api/auth/online-users - Get online users',
      'GET /api/auth/health - Health check'
    ]
  });
});

// Guest login (Anonymous user)
router.post('/guest', authController.guestLogin);

// User registration
router.post('/register', authController.register);

// User login
router.post('/login', authController.login);

// Validate token
router.post('/validate', authController.validateToken);

// Logout
router.post('/logout', authController.logout);

// Get online users
router.get('/online-users', authController.getOnlineUsers);

// Health check
router.get('/health', authController.healthCheck);

module.exports = router;