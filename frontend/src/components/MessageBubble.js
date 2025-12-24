import React from 'react';
import { Box, Paper, Typography, Avatar } from '@mui/material';
import dayjs from 'dayjs';

const MessageBubble = ({ message, isOwn, showSender }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isOwn ? 'flex-end' : 'flex-start',
        mb: 2,
        px: 2
      }}
    >
      {!isOwn && (
        <Avatar
          sx={{
            width: 32,
            height: 32,
            mr: 1,
            alignSelf: 'flex-end',
            bgcolor: message.userColor || '#7289da'
          }}
        >
          {message.userName?.charAt(0) || 'A'}
        </Avatar>
      )}
      
      <Box sx={{ maxWidth: '70%' }}>
        {!isOwn && showSender && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              ml: 1,
              display: 'block',
              fontWeight: 'bold'
            }}
          >
            {message.userName}
          </Typography>
        )}
        
        <Paper
          elevation={1}
          sx={{
            p: 1.5,
            backgroundColor: isOwn ? 'primary.main' : 'background.paper',
            color: isOwn ? 'primary.contrastText' : 'text.primary',
            borderRadius: 2,
            borderTopLeftRadius: isOwn ? 12 : 2,
            borderTopRightRadius: isOwn ? 2 : 12
          }}
        >
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
              fontSize: '0.7rem'
            }}
          >
            {dayjs(message.timestamp).format('HH:mm')}
          </Typography>
        </Paper>
      </Box>
      
      {isOwn && (
        <Avatar
          sx={{
            width: 32,
            height: 32,
            ml: 1,
            alignSelf: 'flex-end',
            bgcolor: '#43b581'
          }}
        >
          You
        </Avatar>
      )}
    </Box>
  );
};

export default MessageBubble;