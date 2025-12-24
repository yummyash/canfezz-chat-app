const crypto = require('crypto');

// In-memory storage (replace with DB in production)
const users = new Map(); // userId -> user
const sessions = new Map(); // token -> session

// Helper function to generate random color
function generateRandomColor() {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

class AuthController {
  /**
   * Guest Login
   */
  async guestLogin(req, res) {
    try {
      console.log('🔐 Guest login request');

      const guestId = `guest_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const displayName = `Anonymous_${Math.floor(1000 + Math.random() * 9000)}`;

      const user = {
        id: guestId,
        displayName,
        avatarColor: generateRandomColor(),
        isGuest: true,
        createdAt: new Date(),
        lastSeen: new Date(),
        online: false,
        socketId: null
      };

      users.set(guestId, user);

      const token = `guest_token_${crypto.randomBytes(16).toString('hex')}`;

      sessions.set(token, {
        userId: guestId,
        token,
        createdAt: new Date(),
        lastActive: new Date()
      });

      console.log(`✅ Guest created: ${displayName}`);

      res.status(200).json({
        success: true,
        message: 'Guest login successful',
        token,
        user: {
          id: user.id,
          displayName: user.displayName,
          avatarColor: user.avatarColor,
          isGuest: user.isGuest
        }
      });

    } catch (error) {
      console.error('❌ Guest login error:', error);
      res.status(500).json({
        success: false,
        message: 'Guest login failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * User Registration
   */
  async register(req, res) {
    try {
      const { email, password, displayName } = req.body;

      console.log('📝 Registration request for:', email);

      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
      }

      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      }

      for (let user of users.values()) {
        if (user.email === email) {
          return res.status(409).json({ success: false, message: 'Email already registered' });
        }
      }

      const userId = `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      // Hash password (use bcrypt in production)
      const passwordHash = crypto.createHash('sha256').update(password + (process.env.JWT_SECRET || 'secret')).digest('hex');

      const user = {
        id: userId,
        email,
        passwordHash,
        displayName: displayName || `User_${Math.floor(1000 + Math.random() * 9000)}`,
        avatarColor: generateRandomColor(),
        isGuest: false,
        createdAt: new Date(),
        lastSeen: new Date(),
        online: false,
        socketId: null
      };

      users.set(userId, user);

      const token = `user_token_${crypto.randomBytes(16).toString('hex')}`;
      sessions.set(token, { userId, token, createdAt: new Date(), lastActive: new Date() });

      console.log(`✅ User registered: ${user.displayName}`);

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarColor: user.avatarColor,
          isGuest: user.isGuest
        }
      });

    } catch (error) {
      console.error('❌ Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * User Login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;
      console.log('🔑 Login attempt for:', email);

      if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });

      let foundUser = null;
      for (let user of users.values()) {
        if (user.email === email && !user.isGuest) {
          foundUser = user;
          break;
        }
      }

      if (!foundUser) return res.status(401).json({ success: false, message: 'Invalid email or password' });

      const passwordHash = crypto.createHash('sha256').update(password + (process.env.JWT_SECRET || 'secret')).digest('hex');

      if (passwordHash !== foundUser.passwordHash) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      foundUser.lastSeen = new Date();
      const token = `user_token_${crypto.randomBytes(16).toString('hex')}`;
      sessions.set(token, { userId: foundUser.id, token, createdAt: new Date(), lastActive: new Date() });

      console.log(`✅ User logged in: ${foundUser.displayName}`);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: foundUser.id,
          email: foundUser.email,
          displayName: foundUser.displayName,
          avatarColor: foundUser.avatarColor,
          isGuest: foundUser.isGuest
        }
      });

    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(500).json({ success: false, message: 'Login failed' });
    }
  }

  /**
   * Validate Token
   */
  async validateToken(req, res) {
    try {
      const { token, userId } = req.body;
      if (!token || !userId) return res.status(400).json({ success: false, message: 'Token and userId required' });

      const session = sessions.get(token);
      if (!session || session.userId !== userId) return res.status(401).json({ success: false, message: 'Invalid or expired token' });

      session.lastActive = new Date();
      const user = users.get(userId);
      if (!user) {
        sessions.delete(token);
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.status(200).json({
        success: true,
        message: 'Token is valid',
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarColor: user.avatarColor,
          isGuest: user.isGuest
        }
      });

    } catch (error) {
      console.error('❌ Token validation error:', error);
      res.status(500).json({ success: false, message: 'Token validation failed' });
    }
  }

  /**
   * Logout
   */
  async logout(req, res) {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ success: false, message: 'Token is required' });

      sessions.delete(token);
      console.log('👋 User logged out');
      res.status(200).json({ success: true, message: 'Logout successful' });

    } catch (error) {
      console.error('❌ Logout error:', error);
      res.status(500).json({ success: false, message: 'Logout failed' });
    }
  }

  /**
   * Get Online Users
   */
  async getOnlineUsers(req, res) {
    try {
      const onlineUsersList = Array.from(users.values()).filter(u => u.online).map(u => ({
        id: u.id,
        displayName: u.displayName,
        avatarColor: u.avatarColor,
        isGuest: u.isGuest,
        lastSeen: u.lastSeen
      }));

      res.status(200).json({
        success: true,
        message: 'Online users retrieved',
        onlineUsers: onlineUsersList,
        total: onlineUsersList.length
      });

    } catch (error) {
      console.error('❌ Get online users error:', error);
      res.status(500).json({ success: false, message: 'Failed to get online users' });
    }
  }

  /**
   * Health Check
   */
  async healthCheck(req, res) {
    try {
      const totalUsers = users.size;
      const totalSessions = sessions.size;
      const onlineCount = Array.from(users.values()).filter(u => u.online).length;

      res.status(200).json({
        success: true,
        message: 'Auth service is healthy',
        service: 'auth',
        status: 'operational',
        timestamp: new Date().toISOString(),
        stats: { totalUsers, totalSessions, onlineUsers: onlineCount, uptime: process.uptime() }
      });
    } catch (error) {
      console.error('❌ Health check error:', error);
      res.status(500).json({ success: false, message: 'Auth service health check failed' });
    }
  }
}

module.exports = new AuthController();
