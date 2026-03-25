const express = require('express');
const { body, validationResult } = require('express-validator');
const Barber = require('../models/Barber');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
	const list = await Barber.find({ manager: req.managerId }).sort({ createdAt: -1 });
	res.json(list);
});

router.post(
	'/',
	auth,
	[
		body('name')
			.isLength({ min: 1 })
			.withMessage('Name is required'),
	],
	async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
	const { name } = req.body;
	const barber = await Barber.create({ manager: req.managerId, name });
	res.status(201).json(barber);
});

router.put('/:id', auth, async (req, res) => {
	const update = {};
	if (typeof req.body.active === 'boolean') update.active = req.body.active;
	if (typeof req.body.name === 'string') {
		const name = req.body.name;
		if (name.length < 1) {
			return res.status(400).json({ message: 'Name is required' });
		}
		update.name = name;
	}
	const barber = await Barber.findOneAndUpdate({ _id: req.params.id, manager: req.managerId }, update, { new: true });
	if (!barber) return res.status(404).json({ message: 'Ntibyabonetse' });
	res.json(barber);
});

router.delete('/:id', auth, async (req, res) => {
	// Note: We do NOT remove transactions for this barber, so totals remain accurate and history is preserved.
	const deleted = await Barber.deleteOne({ _id: req.params.id, manager: req.managerId });
	// Transactions remain in DB, but reference will be missing. Frontend should show barberName for missing barbers.
	res.json({ ok: true });
});

module.exports = router;
