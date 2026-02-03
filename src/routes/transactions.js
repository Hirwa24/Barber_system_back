const express = require('express');
const { body } = require('express-validator');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Barber = require('../models/Barber');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, [ body('barber').notEmpty(), body('amount').isNumeric(), body('date').notEmpty() ], async (req, res) => {
	const { barber, amount, date } = req.body;
	const ownerShare = Math.round(Number(amount) * 0.6);
	const barberShare = Math.round(Number(amount) * 0.4);
	let barberName;
	try {
		const b = await Barber.findOne({ _id: barber, manager: req.managerId });
		barberName = b ? b.name : undefined;
	} catch {}
	const tx = await Transaction.create({ manager: req.managerId, barber, barberName, amount, date, ownerShare, barberShare });
	res.status(201).json(tx);
});

router.get('/', auth, async (req, res) => {
	const { barber, start, end, month } = req.query;
	const filter = { manager: req.managerId };
	if (barber) filter.barber = barber;
	if (month) {
		const [y, m] = month.split('-').map(Number);
		const from = new Date(y, m - 1, 1);
		const to = new Date(y, m, 0, 23, 59, 59, 999);
		filter.date = { $gte: from, $lte: to };
	} else if (start && end) {
		filter.date = { $gte: new Date(start), $lte: new Date(end) };
	}
	const list = await Transaction.find(filter).sort({ date: -1 }).populate('barber', 'name');
	// map fallback barber name if barber removed
	const result = list.map(t => ({
		...t.toObject(),
		barber: t.barber || null,
		barberDisplayName: t.barber?.name || t.barberName || null,
	}));
	res.json(result);
});

router.post('/:id/paid', auth, async (req, res) => {
	const tx = await Transaction.findOneAndUpdate({ _id: req.params.id, manager: req.managerId }, { paid: true }, { new: true });
	if (!tx) return res.status(404).json({ message: 'Ntibyabonetse' });
	res.json(tx);
});

router.post('/mark-paid/day', auth, async (req, res) => {
	const { barber, date } = req.body;
	const start = new Date(date);
	start.setHours(0,0,0,0);
	const end = new Date(date);
	end.setHours(23,59,59,999);
	await Transaction.updateMany({ manager: req.managerId, barber, date: { $gte: start, $lte: end } }, { paid: true });
	res.json({ ok: true });
});

router.get('/totals', auth, async (req, res) => {
	try {
		const { barber, start, end, month } = req.query;
		const match = { manager: new mongoose.Types.ObjectId(req.managerId) };
		if (barber) match.barber = new mongoose.Types.ObjectId(barber);
		if (month) {
			const [y, m] = month.split('-').map(Number);
			const from = new Date(y, m - 1, 1);
			const to = new Date(y, m, 0, 23, 59, 59, 999);
			match.date = { $gte: from, $lte: to };
		} else if (start && end) {
			match.date = { $gte: new Date(start), $lte: new Date(end) };
		}
		const agg = await Transaction.aggregate([
			{ $match: match },
			{ $group: { _id: null, total: { $sum: '$amount' }, owner: { $sum: '$ownerShare' }, barberSum: { $sum: '$barberShare' } } }
		]);
		const resObj = agg[0] || { total: 0, owner: 0, barberSum: 0 };
		res.json(resObj);
	} catch (e) {
		console.error('Totals aggregation failed', e);
		res.status(500).json({ message: 'Totals failed' });
	}
});

module.exports = router;
