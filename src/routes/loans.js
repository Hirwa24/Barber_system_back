const express = require('express');
const { body, validationResult } = require('express-validator');
const Loan = require('../models/Loan');
const Barber = require('../models/Barber');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
	const list = await Loan.find({ manager: req.managerId }).populate('barber', 'name').sort({ createdAt: -1 });
	res.json(list);
});

router.post('/', auth, [ body('barber').notEmpty(), body('amount').isNumeric() ], async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
	const { barber, amount, note } = req.body;
	const numericAmount = Number(amount);
	if (numericAmount <= 0) return res.status(400).json({ message: 'Loan amount must be greater than 0' });
	const barberDoc = await Barber.findOne({ _id: barber, manager: req.managerId });
	if (!barberDoc) return res.status(404).json({ message: 'Barber not found' });
	const loan = await Loan.create({ manager: req.managerId, barber, amount: numericAmount, note, remaining: numericAmount });
	res.status(201).json(loan);
});

router.put('/:id', auth, async (req, res) => {
	const { remaining, note } = req.body;
	const update = {};
	if (remaining !== undefined) {
		const numericRemaining = Number(remaining);
		if (!Number.isFinite(numericRemaining) || numericRemaining < 0) {
			return res.status(400).json({ message: 'Remaining must be a valid number >= 0' });
		}
		update.remaining = numericRemaining;
	}
	if (note !== undefined) update.note = note;
	const loan = await Loan.findOneAndUpdate({ _id: req.params.id, manager: req.managerId }, update, { new: true });
	if (!loan) return res.status(404).json({ message: 'Ntibyabonetse' });
	res.json(loan);
});

router.delete('/:id', auth, async (req, res) => {
  const result = await Loan.deleteOne({ _id: req.params.id, manager: req.managerId });
  if (result.deletedCount === 0) return res.status(404).json({ message: 'Ntibyabonetse' });
  res.json({ ok: true });
});

module.exports = router;
