import React from 'react';
import {
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Badge,
  Typography
} from '@mui/material';

const UserList = ({ users, onSelectUser }) => {
  return (
    <List sx={{ width: '100%' }}>
      {users.map((user) => (
        <ListItem
          key={user.id}
          button
          onClick={() => onSelectUser(user)}
          sx={{
            borderRadius: 1,
            mb: 1,
            '&:hover': {
              backgroundColor: 'action.hover'
            }
          }}
        >
          <ListItemAvatar>
            <Badge
              color="success"
              variant="dot"
              invisible={!user.online}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right'
              }}
            >
              <Avatar
                sx={{
                  bgcolor: user.avatarColor || '#7289da',
                  width: 36,
                  height: 36
                }}
              >
                {user.name?.charAt(0) || 'U'}
              </Avatar>
            </Badge>
          </ListItemAvatar>
          <ListItemText
            primary={
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                {user.name}
              </Typography>
            }
            secondary={
              <Typography variant="caption" color="text.secondary">
                {user.online ? 'Online' : 'Offline'}
              </Typography>
            }
          />
        </ListItem>
      ))}
    </List>
  );
};

export default UserList;