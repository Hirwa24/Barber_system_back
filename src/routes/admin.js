const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const Manager = require('../models/Manager');
const Barber = require('../models/Barber');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const {
  getLoginUrl,
  sendManagerWelcomeEmail,
} = require('../utils/notifications');

const router = express.Router();

const DEFAULT_MANAGER_PASSWORD = process.env.DEFAULT_MANAGER_PASSWORD || 'bsm123';

async function enrichManagers(managers) {
  const managerIds = managers.map((manager) => manager._id);

  const [barberCounts, walletTotals] = await Promise.all([
    Barber.aggregate([
      { $match: { manager: { $in: managerIds } } },
      { $group: { _id: '$manager', count: { $sum: 1 } } },
    ]),
    Transaction.aggregate([
      { $match: { manager: { $in: managerIds } } },
      { $group: { _id: '$manager', walletBalance: { $sum: '$ownerShare' } } },
    ]),
  ]);

  const barberCountMap = new Map(barberCounts.map((item) => [String(item._id), item.count]));
  const walletMap = new Map(walletTotals.map((item) => [String(item._id), item.walletBalance]));
  const activeCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  return managers.map((manager) => ({
    ...manager.toObject(),
    barberCount: barberCountMap.get(String(manager._id)) || 0,
    walletBalance: walletMap.get(String(manager._id)) || 0,
    isActive: Boolean(manager.lastLoginAt && manager.lastLoginAt >= activeCutoff),
  }));
}

router.post(
  '/managers',
  [
    auth,
    admin,
    body('fullName').trim().isLength({ min: 2 }).withMessage('Full name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('phone').matches(/^(\+250|250|0)7\d{8}$/).withMessage('Valid Rwanda phone is required'),
    body('salonName').trim().isLength({ min: 2 }).withMessage('Salon name is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { fullName, email, phone, salonName } = req.body;

    try {
      const existing = await Manager.findOne({ email });
      if (existing) {
        return res.status(409).json({ message: 'Manager with this email already exists' });
      }

      const passwordHash = await bcrypt.hash(DEFAULT_MANAGER_PASSWORD, 10);
      const manager = await Manager.create({
        fullName,
        email,
        phone,
        salonName,
        passwordHash,
        createdByAdmin: true,
        isVerified: true,
        role: 'manager',
      });

      const loginUrl = getLoginUrl();

      const emailResult = await sendManagerWelcomeEmail({
        to: manager.email,
        fullName: manager.fullName,
        email: manager.email,
        password: DEFAULT_MANAGER_PASSWORD,
        loginUrl,
      });

      const notification = {
        email: emailResult,
      };

      return res.status(201).json({
        message: 'Manager created successfully',
        manager: {
          _id: manager._id,
          fullName: manager.fullName,
          email: manager.email,
          phone: manager.phone,
          salonName: manager.salonName,
          address: manager.address,
          role: manager.role,
          createdByAdmin: manager.createdByAdmin,
          barberCount: 0,
          walletBalance: 0,
          isActive: false,
          createdAt: manager.createdAt,
        },
        credentials: {
          email: manager.email,
          temporaryPassword: DEFAULT_MANAGER_PASSWORD,
          loginUrl,
        },
        notification,
      });
    } catch (err) {
      console.error('Create manager error:', err);
      return res.status(500).json({ message: 'Server Error' });
    }
  }
);

// Get all managers (excluding passwords)
router.get('/users', [auth, admin], async (req, res) => {
  try {
    const users = await Manager.find().select('-passwordHash').sort({ createdAt: -1 });
    const enrichedUsers = await enrichManagers(users);
    res.json(enrichedUsers);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/overview', [auth, admin], async (req, res) => {
  try {
    const managers = await Manager.find({ role: 'manager' }).select('-passwordHash');
    const enrichedManagers = await enrichManagers(managers);

    const overview = {
      totalManagers: enrichedManagers.length,
      activeManagers: enrichedManagers.filter((manager) => manager.isActive).length,
      totalBarbers: enrichedManagers.reduce((sum, manager) => sum + manager.barberCount, 0),
      totalWalletBalance: enrichedManagers.reduce((sum, manager) => sum + manager.walletBalance, 0),
    };

    res.json(overview);
  } catch (error) {
    console.error('Overview error:', error);
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
