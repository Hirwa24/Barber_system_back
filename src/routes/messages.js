const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middleware/auth');

// Send a message
router.post('/send', auth, async (req, res) => {
    try {
        const { receiverId, content } = req.body;
        const message = await Message.create({
            sender: req.managerId,
            receiver: receiverId,
            content
        });
        res.status(201).json(message);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Get conversation with a specific user
router.get('/conversation/:userId', auth, async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [
                { sender: req.managerId, receiver: req.params.userId },
                { sender: req.params.userId, receiver: req.managerId }
            ]
        }).sort({ createdAt: 1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// Get all conversations for the current user (grouped by other party)
// This is useful for the Admin to see who they have talked to, or for a list of recent chats
router.get('/conversations', auth, async (req, res) => {
    try {
        // Find all messages involving the current user
        const messages = await Message.find({
            $or: [{ sender: req.managerId }, { receiver: req.managerId }]
        })
        .populate('sender', 'fullName role')
        .populate('receiver', 'fullName role')
        .sort({ createdAt: -1 });

        // Group by the "other" person
        const conversations = {};
        messages.forEach(msg => {
            const amISender = msg.sender._id.toString() === req.managerId;
            const other = amISender ? msg.receiver : msg.sender;
            const otherId = other._id.toString();
            const otherName = other.role === 'admin' ? 'Admin' : other.fullName;
            
            if (!conversations[otherId]) {
                conversations[otherId] = {
                    userId: otherId,
                    userName: otherName,
                    lastMessage: msg.content,
                    timestamp: msg.createdAt,
                    unread: !msg.isRead && msg.receiver._id.toString() === req.managerId ? 1 : 0
                };
            } else if (!msg.isRead && msg.receiver._id.toString() === req.managerId) {
                conversations[otherId].unread++;
            }
        });

        res.json(Object.values(conversations));

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Mark messages as read
router.patch('/read/:userId', auth, async (req, res) => {
    try {
        await Message.updateMany(
            { sender: req.params.userId, receiver: req.managerId, isRead: false },
            { isRead: true }
        );
        res.json({ message: 'Messages marked as read' });
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
