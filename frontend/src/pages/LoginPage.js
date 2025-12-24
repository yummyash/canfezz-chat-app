import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Divider,
  Link,
  Grid,
  Avatar,
  Fade,
  Zoom
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import SecurityIcon from '@mui/icons-material/Security';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SendIcon from '@mui/icons-material/Send';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const LoginPage = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  // Guest Login
  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/guest`);
      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        toast.success('Welcome to Canfezz!');
        navigate('/chat');
      }
    } catch (error) {
      toast.error('Failed to connect. Starting in offline mode...');
      const fallbackUser = {
        id: `guest_${Date.now()}`,
        displayName: `Anonymous_${Math.floor(1000 + Math.random() * 9000)}`,
        avatarColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        isGuest: true
      };
      localStorage.setItem('user', JSON.stringify(fallbackUser));
      navigate('/chat');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced Login/Register Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    console.log('📝 Submit clicked - Mode:', isLogin ? 'Login' : 'Register');
    console.log('📧 Email:', email);
    console.log('🔑 Password length:', password.length);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      console.log('🌐 API URL:', apiUrl);

      if (isLogin) {
        // Login
        console.log('🔐 Attempting login...');
        const response = await axios.post(`${apiUrl}/api/auth/login`, { email, password });
        console.log('✅ Login response:', response.data);

        if (response.data.success) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          toast.success('Login successful!');
          navigate('/chat');
        } else {
          toast.error(response.data.message || 'Login failed');
        }
      } else {
        // Registration
        console.log('📋 Attempting registration...');
        console.log('📋 Registration data:', { email, password, displayName });

        try {
          const response = await axios.post(`${apiUrl}/api/auth/register`, { email, password, displayName });
          console.log('📦 Full response:', response);
          console.log('✅ Registration response data:', response.data);
          console.log('✅ Response status:', response.status);

          if (response.data && response.data.success) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            toast.success('Registration successful! 🎉');
            navigate('/chat');
          } else {
            const errorMsg = response.data?.message || 'Registration failed';
            console.error('❌ Registration failed:', errorMsg);
            toast.error(errorMsg);
          }
        } catch (axiosError) {
          console.error('❌ Axios error:', axiosError);
          console.error('❌ Error response:', axiosError.response?.data);
          console.error('❌ Error status:', axiosError.response?.status);

          if (axiosError.response?.data?.message) {
            toast.error(axiosError.response.data.message);
          } else if (axiosError.response?.status === 409) {
            toast.error('Email already registered');
          } else if (axiosError.response?.status === 400) {
            toast.error('Invalid email or password format');
          } else if (axiosError.message.includes('Network Error')) {
            toast.error('Cannot connect to server. Please try again.');
          } else {
            toast.error('Registration failed. Please try again.');
          }
        }
      }
    } catch (error) {
      console.error('❌ General error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Grid container spacing={4}>
        {/* Left - Info */}
        <Grid item xs={12} md={6}>
          <Fade in timeout={1000}>
            <Box sx={{ color: 'white', textAlign: 'center', mb: 4 }}>
              <Avatar sx={{ width: 80, height: 80, bgcolor: '#7289da', margin: '0 auto 20px', boxShadow: '0 4px 20px rgba(114, 137, 218, 0.3)' }}>
                <LockIcon sx={{ fontSize: 40 }} />
              </Avatar>
              <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>Canfezz</Typography>
              <Typography variant="h6" sx={{ mb: 3, opacity: 0.9 }}>Secure Anonymous Chat</Typography>

              <Box sx={{ maxWidth: 500, margin: '0 auto', textAlign: 'left' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <SecurityIcon sx={{ mr: 2, color: '#43b581' }} />
                  <Typography variant="body1"><strong>End-to-End Encryption</strong> - Your messages are encrypted and private</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <VisibilityOffIcon sx={{ mr: 2, color: '#7289da' }} />
                  <Typography variant="body1"><strong>Complete Anonymity</strong> - No personal information required</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <SendIcon sx={{ mr: 2, color: '#faa61a' }} />
                  <Typography variant="body1"><strong>Real-time Chat</strong> - Instant message delivery</Typography>
                </Box>
              </Box>
            </Box>
          </Fade>
        </Grid>

        {/* Right - Form */}
        <Grid item xs={12} md={6}>
          <Zoom in timeout={800}>
            <Paper elevation={10} sx={{ p: 4, borderRadius: 3 }}>
              <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </Typography>

              <Alert severity="info" sx={{ mb: 3 }}>
                Your privacy is protected. Messages are encrypted and never stored.
              </Alert>

              <form onSubmit={handleSubmit}>
                {!isLogin && (
                  <TextField
                    fullWidth
                    label="Display Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    margin="normal"
                    required
                    disabled={loading}
                  />
                )}

                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  margin="normal"
                  required
                  disabled={loading}
                />

                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  margin="normal"
                  required
                  disabled={loading}
                />

                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{ mt: 3, mb: 2, py: 1.5 }}
                >
                  {loading ? 'Please wait...' : isLogin ? 'Login' : 'Register'}
                </Button>
              </form>

              <Divider sx={{ my: 3 }}>
                <Typography variant="body2" color="text.secondary">OR</Typography>
              </Divider>

              <Button
                fullWidth
                variant="outlined"
                size="large"
                onClick={handleGuestLogin}
                disabled={loading}
                sx={{ mb: 2, py: 1.5 }}
              >
                Continue as Anonymous Guest
              </Button>

              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <Link component="button" variant="body2" onClick={() => setIsLogin(!isLogin)} sx={{ fontWeight: 'bold' }}>
                    {isLogin ? 'Register here' : 'Login here'}
                  </Link>
                </Typography>
              </Box>

              <Box sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" align="center" display="block">
                  By continuing, you agree to our Privacy Policy and Terms of Service
                </Typography>
                <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 1 }}>
                  Canfezz v1.0 • All rights reserved
                </Typography>
              </Box>
            </Paper>
          </Zoom>
        </Grid>
      </Grid>
    </Container>
  );
};

export default LoginPage;
