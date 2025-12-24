const crypto = require('crypto');
const CryptoJS = require('crypto-js');

// In-memory storage for chats (replace with database in production)
const chatRooms = new Map(); // roomId -> room data
const messages = new Map(); // roomId -> array of messages
const typingIndicators = new Map(); // userId -> typing data

class ChatController {
    /**
     * Create a new chat room
     */
    async createRoom(req, res) {
        try {
            const { userId, targetUserId, roomName, isPrivate = true } = req.body;
            
            console.log(`💬 Creating chat room for users: ${userId}, ${targetUserId}`);
            
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID is required'
                });
            }
            
            // Generate unique room ID
            const roomId = `room_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
            
            // Determine participants
            const participants = targetUserId ? 
                [userId, targetUserId].sort() : 
                [userId];
            
            // Create room object
            const room = {
                id: roomId,
                name: roomName || `Chat ${roomId.substring(0, 8)}`,
                participants,
                createdBy: userId,
                isPrivate,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastMessage: null,
                unreadCount: {},
                encryptionKey: crypto.randomBytes(32).toString('hex') // Unique key for this room
            };
            
            // Initialize unread counts
            participants.forEach(participant => {
                room.unreadCount[participant] = 0;
            });
            
            // Store room
            chatRooms.set(roomId, room);
            
            // Initialize messages array for this room
            messages.set(roomId, []);
            
            console.log(`✅ Chat room created: ${roomId} with ${participants.length} participants`);
            
            res.status(201).json({
                success: true,
                message: 'Chat room created successfully',
                data: {
                    room: {
                        id: room.id,
                        name: room.name,
                        participants: room.participants,
                        isPrivate: room.isPrivate,
                        createdAt: room.createdAt,
                        encryptionKey: room.encryptionKey // In production, encrypt this
                    }
                }
            });
            
        } catch (error) {
            console.error('❌ Create room error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create chat room',
                error: error.message
            });
        }
    }
    
    /**
     * Get user's chat rooms
     */
    async getUserRooms(req, res) {
        try {
            const { userId } = req.params;
            
            console.log(`📂 Fetching rooms for user: ${userId}`);
            
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID is required'
                });
            }
            
            const userRooms = [];
            
            // Find all rooms where user is a participant
            for (let [roomId, room] of chatRooms) {
                if (room.participants.includes(userId)) {
                    userRooms.push({
                        id: room.id,
                        name: room.name,
                        participants: room.participants,
                        isPrivate: room.isPrivate,
                        createdAt: room.createdAt,
                        updatedAt: room.updatedAt,
                        lastMessage: room.lastMessage,
                        unreadCount: room.unreadCount[userId] || 0,
                        totalParticipants: room.participants.length
                    });
                }
            }
            
            // Sort by last activity (most recent first)
            userRooms.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            
            console.log(`✅ Found ${userRooms.length} rooms for user: ${userId}`);
            
            res.status(200).json({
                success: true,
                message: 'User rooms retrieved',
                data: {
                    rooms: userRooms,
                    total: userRooms.length
                }
            });
            
        } catch (error) {
            console.error('❌ Get user rooms error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get user rooms',
                error: error.message
            });
        }
    }
    
    /**
     * Get room details
     */
    async getRoomDetails(req, res) {
        try {
            const { roomId } = req.params;
            const { userId } = req.query; // To check permissions
            
            console.log(`🔍 Fetching details for room: ${roomId}`);
            
            if (!roomId) {
                return res.status(400).json({
                    success: false,
                    message: 'Room ID is required'
                });
            }
            
            const room = chatRooms.get(roomId);
            if (!room) {
                return res.status(404).json({
                    success: false,
                    message: 'Chat room not found'
                });
            }
            
            // Check if user has access to this room
            if (userId && !room.participants.includes(userId)) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied to this room'
                });
            }
            
            console.log(`✅ Room details fetched: ${roomId}`);
            
            res.status(200).json({
                success: true,
                message: 'Room details retrieved',
                data: {
                    room: {
                        id: room.id,
                        name: room.name,
                        participants: room.participants,
                        isPrivate: room.isPrivate,
                        createdAt: room.createdAt,
                        updatedAt: room.updatedAt,
                        createdBy: room.createdBy,
                        lastMessage: room.lastMessage,
                        encryptionKey: room.encryptionKey // In production, handle encryption
                    }
                }
            });
            
        } catch (error) {
            console.error('❌ Get room details error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get room details',
                error: error.message
            });
        }
    }
    
    /**
     * Send message to room
     */
    async sendMessage(req, res) {
        try {
            const { roomId, userId, message, messageType = 'text', encryptedData = null } = req.body;
            
            console.log(`📨 Sending message to room: ${roomId} from user: ${userId}`);
            
            if (!roomId || !userId || !message) {
                return res.status(400).json({
                    success: false,
                    message: 'Room ID, User ID and message are required'
                });
            }
            
            // Get room
            const room = chatRooms.get(roomId);
            if (!room) {
                return res.status(404).json({
                    success: false,
                    message: 'Chat room not found'
                });
            }
            
            // Check if user is a participant
            if (!room.participants.includes(userId)) {
                return res.status(403).json({
                    success: false,
                    message: 'User is not a participant in this room'
                });
            }
            
            // Generate message ID
            const messageId = `msg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
            const timestamp = new Date();
            
            // Encrypt message content (if not already encrypted)
            let finalMessage = message;
            let encryptionInfo = null;
            
            if (!encryptedData && room.encryptionKey) {
                try {
                    const encrypted = this.encryptMessage(message, room.encryptionKey);
                    finalMessage = encrypted.encrypted;
                    encryptionInfo = {
                        iv: encrypted.iv,
                        algorithm: 'AES-256-CBC'
                    };
                } catch (encryptError) {
                    console.warn('⚠️ Encryption failed, sending plain text:', encryptError);
                }
            }
            
            // Create message object
            const messageObj = {
                id: messageId,
                roomId,
                userId,
                content: finalMessage,
                messageType,
                timestamp,
                status: 'sent',
                deliveredTo: [],
                readBy: [userId], // Sender has read it
                encryptionInfo,
                metadata: {
                    originalLength: message.length,
                    encrypted: !!encryptionInfo
                }
            };
            
            // Store message
            const roomMessages = messages.get(roomId) || [];
            roomMessages.push(messageObj);
            messages.set(roomId, roomMessages);
            
            // Update room metadata
            room.lastMessage = {
                id: messageId,
                content: message.length > 50 ? message.substring(0, 50) + '...' : message,
                userId,
                timestamp
            };
            room.updatedAt = timestamp;
            
            // Increment unread count for other participants
            room.participants.forEach(participant => {
                if (participant !== userId) {
                    room.unreadCount[participant] = (room.unreadCount[participant] || 0) + 1;
                }
            });
            
            console.log(`✅ Message sent: ${messageId} to room: ${roomId}`);
            
            res.status(201).json({
                success: true,
                message: 'Message sent successfully',
                data: {
                    message: messageObj,
                    roomUpdate: {
                        lastMessage: room.lastMessage,
                        updatedAt: room.updatedAt
                    }
                }
            });
            
        } catch (error) {
            console.error('❌ Send message error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send message',
                error: error.message
            });
        }
    }
    
    /**
     * Get room messages
     */
    async getRoomMessages(req, res) {
        try {
            const { roomId } = req.params;
            const { 
                userId, 
                limit = 50, 
                offset = 0,
                before = null,
                decrypt = false 
            } = req.query;
            
            console.log(`📜 Fetching messages for room: ${roomId}`);
            
            if (!roomId) {
                return res.status(400).json({
                    success: false,
                    message: 'Room ID is required'
                });
            }
            
            // Get room
            const room = chatRooms.get(roomId);
            if (!room) {
                return res.status(404).json({
                    success: false,
                    message: 'Chat room not found'
                });
            }
            
            // Check if user is a participant
            if (userId && !room.participants.includes(userId)) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied to room messages'
                });
            }
            
            // Get messages for this room
            const roomMessages = messages.get(roomId) || [];
            
            // Filter messages before certain timestamp if provided
            let filteredMessages = roomMessages;
            if (before) {
                const beforeDate = new Date(before);
                filteredMessages = roomMessages.filter(msg => new Date(msg.timestamp) < beforeDate);
            }
            
            // Sort by timestamp (newest first)
            filteredMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // Apply pagination
            const startIndex = parseInt(offset);
            const endIndex = startIndex + parseInt(limit);
            const paginatedMessages = filteredMessages.slice(startIndex, endIndex);
            
            // Decrypt messages if requested and user has permission
            let processedMessages = paginatedMessages;
            if (decrypt === 'true' && room.encryptionKey) {
                processedMessages = paginatedMessages.map(msg => {
                    if (msg.encryptionInfo) {
                        try {
                            const decrypted = this.decryptMessage(
                                msg.content,
                                room.encryptionKey,
                                msg.encryptionInfo.iv
                            );
                            return {
                                ...msg,
                                content: decrypted,
                                decrypted: true
                            };
                        } catch (decryptError) {
                            console.warn('⚠️ Decryption failed for message:', msg.id, decryptError);
                            return {
                                ...msg,
                                decrypted: false,
                                decryptionError: 'Failed to decrypt message'
                            };
                        }
                    }
                    return msg;
                });
            }
            
            // Reset unread count for this user
            if (userId && room.unreadCount[userId]) {
                room.unreadCount[userId] = 0;
            }
            
            console.log(`✅ Retrieved ${processedMessages.length} messages for room: ${roomId}`);
            
            res.status(200).json({
                success: true,
                message: 'Messages retrieved successfully',
                data: {
                    messages: processedMessages,
                    pagination: {
                        total: filteredMessages.length,
                        limit: parseInt(limit),
                        offset: parseInt(offset),
                        hasMore: endIndex < filteredMessages.length
                    },
                    room: {
                        id: room.id,
                        name: room.name,
                        unreadCount: userId ? (room.unreadCount[userId] || 0) : 0
                    }
                }
            });
            
        } catch (error) {
            console.error('❌ Get messages error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get messages',
                error: error.message
            });
        }
    }
    
    /**
     * Update message status (delivered, read)
     */
    async updateMessageStatus(req, res) {
        try {
            const { roomId, messageId, userId, status } = req.body;
            
            console.log(`🔄 Updating message status: ${messageId} to ${status} by ${userId}`);
            
            if (!roomId || !messageId || !userId || !status) {
                return res.status(400).json({
                    success: false,
                    message: 'Room ID, Message ID, User ID and status are required'
                });
            }
            
            // Valid statuses
            const validStatuses = ['delivered', 'read'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status. Use "delivered" or "read"'
                });
            }
            
            // Get room messages
            const roomMessages = messages.get(roomId);
            if (!roomMessages) {
                return res.status(404).json({
                    success: false,
                    message: 'Room not found'
                });
            }
            
            // Find message
            const messageIndex = roomMessages.findIndex(msg => msg.id === messageId);
            if (messageIndex === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'Message not found'
                });
            }
            
            const message = roomMessages[messageIndex];
            
            // Check if user is a participant
            const room = chatRooms.get(roomId);
            if (!room || !room.participants.includes(userId)) {
                return res.status(403).json({
                    success: false,
                    message: 'User is not a participant in this room'
                });
            }
            
            // Update status
            if (status === 'delivered') {
                if (!message.deliveredTo.includes(userId)) {
                    message.deliveredTo.push(userId);
                }
            } else if (status === 'read') {
                if (!message.readBy.includes(userId)) {
                    message.readBy.push(userId);
                    
                    // Decrement unread count for this user
                    if (room.unreadCount[userId] > 0) {
                        room.unreadCount[userId]--;
                    }
                }
            }
            
            message.updatedAt = new Date();
            
            console.log(`✅ Message status updated: ${messageId} -> ${status} by ${userId}`);
            
            res.status(200).json({
                success: true,
                message: 'Message status updated',
                data: {
                    message: {
                        id: message.id,
                        status: message.status,
                        deliveredTo: message.deliveredTo,
                        readBy: message.readBy
                    }
                }
            });
            
        } catch (error) {
            console.error('❌ Update message status error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update message status',
                error: error.message
            });
        }
    }
    
    /**
     * Delete message (soft delete)
     */
    async deleteMessage(req, res) {
        try {
            const { roomId, messageId, userId } = req.body;
            
            console.log(`🗑️  Deleting message: ${messageId} by user: ${userId}`);
            
            if (!roomId || !messageId || !userId) {
                return res.status(400).json({
                    success: false,
                    message: 'Room ID, Message ID and User ID are required'
                });
            }
            
            // Get room messages
            const roomMessages = messages.get(roomId);
            if (!roomMessages) {
                return res.status(404).json({
                    success: false,
                    message: 'Room not found'
                });
            }
            
            // Find message
            const messageIndex = roomMessages.findIndex(msg => msg.id === messageId);
            if (messageIndex === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'Message not found'
                });
            }
            
            const message = roomMessages[messageIndex];
            
            // Check if user is the sender
            if (message.userId !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Only message sender can delete the message'
                });
            }
            
            // Soft delete (mark as deleted)
            message.deleted = true;
            message.deletedAt = new Date();
            message.deletedBy = userId;
            
            // Replace content with deletion notice
            message.content = '[This message was deleted]';
            message.messageType = 'system';
            
            console.log(`✅ Message deleted: ${messageId} by ${userId}`);
            
            res.status(200).json({
                success: true,
                message: 'Message deleted successfully',
                data: {
                    message: {
                        id: message.id,
                        deleted: true,
                        deletedAt: message.deletedAt
                    }
                }
            });
            
        } catch (error) {
            console.error('❌ Delete message error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete message',
                error: error.message
            });
        }
    }
    
    /**
     * Typing indicator
     */
    async typingIndicator(req, res) {
        try {
            const { roomId, userId, isTyping } = req.body;
            
            console.log(`⌨️  Typing indicator: ${userId} is ${isTyping ? 'typing' : 'stopped typing'} in ${roomId}`);
            
            if (!roomId || !userId) {
                return res.status(400).json({
                    success: false,
                    message: 'Room ID and User ID are required'
                });
            }
            
            // Get room
            const room = chatRooms.get(roomId);
            if (!room) {
                return res.status(404).json({
                    success: false,
                    message: 'Chat room not found'
                });
            }
            
            // Check if user is a participant
            if (!room.participants.includes(userId)) {
                return res.status(403).json({
                    success: false,
                    message: 'User is not a participant in this room'
                });
            }
            
            // Update typing indicator
            if (isTyping) {
                typingIndicators.set(userId, {
                    roomId,
                    userId,
                    isTyping: true,
                    timestamp: new Date()
                });
            } else {
                typingIndicators.delete(userId);
            }
            
            res.status(200).json({
                success: true,
                message: `Typing indicator ${isTyping ? 'started' : 'stopped'}`,
                data: {
                    userId,
                    roomId,
                    isTyping,
                    timestamp: new Date()
                }
            });
            
        } catch (error) {
            console.error('❌ Typing indicator error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update typing indicator',
                error: error.message
            });
        }
    }
    
    /**
     * Get typing indicators for a room
     */
    async getTypingIndicators(req, res) {
        try {
            const { roomId } = req.params;
            
            console.log(`👀 Getting typing indicators for room: ${roomId}`);
            
            if (!roomId) {
                return res.status(400).json({
                    success: false,
                    message: 'Room ID is required'
                });
            }
            
            // Get all typing users in this room
            const typingUsers = [];
            for (let [userId, data] of typingIndicators) {
                if (data.roomId === roomId && data.isTyping) {
                    // Check if typing is recent (within last 5 seconds)
                    const fiveSecondsAgo = new Date(Date.now() - 5000);
                    if (new Date(data.timestamp) > fiveSecondsAgo) {
                        typingUsers.push({
                            userId: data.userId,
                            timestamp: data.timestamp
                        });
                    } else {
                        // Remove stale typing indicator
                        typingIndicators.delete(userId);
                    }
                }
            }
            
            console.log(`✅ Found ${typingUsers.length} users typing in room: ${roomId}`);
            
            res.status(200).json({
                success: true,
                message: 'Typing indicators retrieved',
                data: {
                    typingUsers,
                    total: typingUsers.length
                }
            });
            
        } catch (error) {
            console.error('❌ Get typing indicators error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get typing indicators',
                error: error.message
            });
        }
    }
    
    /**
     * Search messages in a room
     */
    async searchMessages(req, res) {
        try {
            const { roomId } = req.params;
            const { query, userId, limit = 20 } = req.query;
            
            console.log(`🔎 Searching messages in room: ${roomId} for: "${query}"`);
            
            if (!roomId || !query) {
                return res.status(400).json({
                    success: false,
                    message: 'Room ID and search query are required'
                });
            }
            
            // Get room
            const room = chatRooms.get(roomId);
            if (!room) {
                return res.status(404).json({
                    success: false,
                    message: 'Chat room not found'
                });
            }
            
            // Check if user is a participant
            if (userId && !room.participants.includes(userId)) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied to room messages'
                });
            }
            
            // Get messages for this room
            const roomMessages = messages.get(roomId) || [];
            
            // Decrypt messages for searching (in real app, you'd have a separate search index)
            const searchResults = [];
            const searchQuery = query.toLowerCase();
            
            for (const message of roomMessages) {
                if (message.deleted) continue;
                
                let contentToSearch = message.content;
                
                // Try to decrypt for searching
                if (message.encryptionInfo && room.encryptionKey) {
                    try {
                        contentToSearch = this.decryptMessage(
                            message.content,
                            room.encryptionKey,
                            message.encryptionInfo.iv
                        );
                    } catch (decryptError) {
                        // Skip encrypted messages that can't be decrypted
                        continue;
                    }
                }
                
                if (contentToSearch.toLowerCase().includes(searchQuery)) {
                    searchResults.push({
                        id: message.id,
                        content: contentToSearch,
                        userId: message.userId,
                        timestamp: message.timestamp,
                        messageType: message.messageType,
                        score: this.calculateSearchScore(contentToSearch, searchQuery)
                    });
                    
                    if (searchResults.length >= limit) {
                        break;
                    }
                }
            }
            
            // Sort by relevance score
            searchResults.sort((a, b) => b.score - a.score);
            
            console.log(`✅ Found ${searchResults.length} search results for: "${query}"`);
            
            res.status(200).json({
                success: true,
                message: 'Search completed',
                data: {
                    results: searchResults,
                    query,
                    total: searchResults.length,
                    limit: parseInt(limit)
                }
            });
            
        } catch (error) {
            console.error('❌ Search messages error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to search messages',
                error: error.message
            });
        }
    }
    
    /**
     * Health check for chat service
     */
    async healthCheck(req, res) {
        try {
            const totalRooms = chatRooms.size;
            let totalMessages = 0;
            
            for (let [_, roomMessages] of messages) {
                totalMessages += roomMessages.length;
            }
            
            res.status(200).json({
                success: true,
                message: 'Chat service is healthy',
                data: {
                    service: 'chat',
                    status: 'operational',
                    timestamp: new Date().toISOString(),
                    stats: {
                        totalRooms,
                        totalMessages,
                        activeTypingIndicators: typingIndicators.size,
                        uptime: process.uptime()
                    }
                }
            });
            
        } catch (error) {
            console.error('❌ Chat health check error:', error);
            res.status(500).json({
                success: false,
                message: 'Chat service health check failed',
                error: error.message
            });
        }
    }
    
    /**
     * Helper: Encrypt message
     */
    encryptMessage(message, key) {
        const iv = CryptoJS.lib.WordArray.random(16);
        const encrypted = CryptoJS.AES.encrypt(
            JSON.stringify({ content: message }),
            key,
            { iv: iv }
        );
        
        return {
            encrypted: encrypted.toString(),
            iv: iv.toString(CryptoJS.enc.Hex)
        };
    }
    
    /**
     * Helper: Decrypt message
     */
    decryptMessage(encryptedData, key, iv) {
        const decrypted = CryptoJS.AES.decrypt(
            encryptedData,
            key,
            { iv: CryptoJS.enc.Hex.parse(iv) }
        );
        
        const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
        if (!decryptedText) {
            throw new Error('Decryption failed');
        }
        
        const parsed = JSON.parse(decryptedText);
        return parsed.content;
    }
    
    /**
     * Helper: Calculate search score
     */
    calculateSearchScore(content, query) {
        const contentLower = content.toLowerCase();
        const queryLower = query.toLowerCase();
        
        let score = 0;
        
        // Exact match bonus
        if (contentLower === queryLower) {
            score += 100;
        }
        
        // Starts with query bonus
        if (contentLower.startsWith(queryLower)) {
            score += 50;
        }
        
        // Contains query
        if (contentLower.includes(queryLower)) {
            score += 10;
        }
        
        // Word boundary matches
        const words = contentLower.split(/\s+/);
        const queryWords = queryLower.split(/\s+/);
        
        queryWords.forEach(queryWord => {
            words.forEach(word => {
                if (word === queryWord) {
                    score += 5;
                } else if (word.startsWith(queryWord)) {
                    score += 3;
                } else if (word.includes(queryWord)) {
                    score += 1;
                }
            });
        });
        
        return score;
    }
    
    /**
     * Helper: Get room by ID
     */
    getRoomById(roomId) {
        return chatRooms.get(roomId);
    }
    
    /**
     * Helper: Get messages by room ID
     */
    getMessagesByRoomId(roomId) {
        return messages.get(roomId) || [];
    }
    
    /**
     * Helper: Add message to room
     */
    addMessageToRoom(roomId, message) {
        const roomMessages = messages.get(roomId) || [];
        roomMessages.push(message);
        messages.set(roomId, roomMessages);
        return message;
    }
}

module.exports = new ChatController();