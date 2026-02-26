const express = require('express');
const { body, validationResult } = require('express-validator');
const Barber = require('../models/Barber');
const auth = require('../middleware/auth');

const router = express.Router();
const nameRegex = /^[A-Za-z' -]+$/;

router.get('/', auth, async (req, res) => {
	const list = await Barber.find({ manager: req.managerId }).sort({ createdAt: -1 });
	res.json(list);
});

router.post(
	'/',
	auth,
	[
		body('name')
			.trim()
			.isLength({ min: 2 })
			.withMessage('Name must be at least 2 letters')
			.matches(nameRegex)
			.withMessage('Name must contain letters only'),
	],
	async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
	const { name } = req.body;
	const barber = await Barber.create({ manager: req.managerId, name: name.trim() });
	res.status(201).json(barber);
});

router.put('/:id', auth, async (req, res) => {
	const update = {};
	if (typeof req.body.active === 'boolean') update.active = req.body.active;
	if (typeof req.body.name === 'string') {
		const name = req.body.name.trim();
		if (name.length < 2 || !nameRegex.test(name)) {
			return res.status(400).json({ message: 'Name must contain letters only and be at least 2 letters' });
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
