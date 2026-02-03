const express = require('express');
const Manager = require('../models/Manager');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();

// Get all managers (excluding passwords)
router.get('/users', [auth, admin], async (req, res) => {
    try {
        const users = await Manager.find().select('-passwordHash').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// Delete a user
router.delete('/users/:id', [auth, admin], async (req, res) => {
    try {
        await Manager.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// Verify a user manually or change role
router.patch('/users/:id/role', [auth, admin], async (req, res) => {
    try {
        const { role, isVerified } = req.body;
        const updates = {};
        if (role) updates.role = role;
        if (typeof isVerified === 'boolean') updates.isVerified = isVerified;
        
        const user = await Manager.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-passwordHash');
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
