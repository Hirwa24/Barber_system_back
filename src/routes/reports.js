const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Report = require('../models/Report');
const Transaction = require('../models/Transaction');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const list = await Report.find({ manager: req.managerId }).sort({ date: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching reports' });
  }
});

router.post('/generate', auth, async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) return res.status(400).json({ message: 'Date is required (YYYY-MM-DD)' });
    
    // Check if report already exists limits creation, but we can update it if regenerating
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const agg = await Transaction.aggregate([
      { $match: { manager: new mongoose.Types.ObjectId(req.managerId), date: { $gte: start, $lte: end } } },
      { $group: { 
          _id: '$barber', 
          barberName: { $first: '$barberName' },
          total: { $sum: '$amount' }, 
          owner: { $sum: '$ownerShare' }, 
          barber: { $sum: '$barberShare' } 
      } }
    ]);

    let totalEarnings = 0;
    let ownerShareSum = 0;
    let barbersShareSum = 0;
    const performance = agg.map(a => {
      totalEarnings += a.total;
      ownerShareSum += a.owner;
      barbersShareSum += a.barber;
      return { barber: a._id, barberName: a.barberName, total: a.total, owner: a.owner, barber: a.barber };
    });

    const report = await Report.findOneAndUpdate(
      { manager: req.managerId, date },
      { totalEarnings, ownerShare: ownerShareSum, barbersShare: barbersShareSum, barberPerformance: performance },
      { new: true, upsert: true }
    );
    res.json(report);
  } catch (err) {
    console.error('Error generating report:', err);
    res.status(500).json({ message: 'Server error generating report' });
  }
});

module.exports = router;
