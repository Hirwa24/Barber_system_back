const express = require('express');
const { body } = require('express-validator');
const Loan = require('../models/Loan');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
	const list = await Loan.find({ manager: req.managerId }).populate('barber', 'name').sort({ createdAt: -1 });
	res.json(list);
});

router.post('/', auth, [ body('barber').notEmpty(), body('amount').isNumeric() ], async (req, res) => {
	const { barber, amount, note } = req.body;
	const loan = await Loan.create({ manager: req.managerId, barber, amount, note, remaining: amount });
	res.status(201).json(loan);
});

router.put('/:id', auth, async (req, res) => {
	const { remaining, note } = req.body;
	const loan = await Loan.findOneAndUpdate({ _id: req.params.id, manager: req.managerId }, { remaining, note }, { new: true });
	if (!loan) return res.status(404).json({ message: 'Ntibyabonetse' });
	res.json(loan);
});

router.delete('/:id', auth, async (req, res) => {
  const result = await Loan.deleteOne({ _id: req.params.id, manager: req.managerId });
  if (result.deletedCount === 0) return res.status(404).json({ message: 'Ntibyabonetse' });
  res.json({ ok: true });
});

module.exports = router;
