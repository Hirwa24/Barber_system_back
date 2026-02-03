const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Manager = require('../models/Manager');

const router = express.Router();

// Rate limiter: 5 attempts per 15 mins
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 5,
	message: { message: 'Inshuro zageragejwe zarenze urugero, ongera nyuma yiminota 15' },
	standardHeaders: true,
	legacyHeaders: false,
});

function sendVerificationEmail(to, code) {
	const transporter = nodemailer.createTransport({
		host: process.env.MAIL_HOST,
		port: Number(process.env.MAIL_PORT || 587),
		secure: false,
		auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
	});
	return transporter.sendMail({
		from: process.env.MAIL_FROM,
		to,
		subject: 'Komeza wemeze konti yawe',
		text: `Kode yo kwemeza: ${code}`,
		html: `<p>Muraho,</p><p>Kode yo kwemeza: <b>${code}</b></p>`,
	});
}

router.post('/register', authLimiter, [
	body('fullName').trim().isLength({ min: 2 }).escape(),
	body('email').isEmail().normalizeEmail(),
	body('phone').matches(/^(\+250|250|0)7\d{8}$/).withMessage('Nomero ya terefone ntabwo yemewe'),
	body('salonName').trim().isLength({ min: 2 }).escape(),
	body('password').isStrongPassword({ minLength: 8, minSymbols: 1, minUppercase: 1, minNumbers: 1, minLowercase: 1 })
		.withMessage('Ijambo ryibanga rigomba kuba rikomeye (ibyibuze 8 chars, 1 uppercase, 1 symbol, 1 number)'),
], async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
	
	const { fullName, email, phone, salonName, password } = req.body;
	
	try {
		const exists = await Manager.findOne({ email });
		if (exists) return res.status(409).json({ message: 'Imeli iriho' });
		
		const passwordHash = await bcrypt.hash(password, 10);
		// Note: removed isVerified: true to allow verification flow if intended, or keep true if auto-verified
		const manager = await Manager.create({ fullName, email, phone, salonName, passwordHash, isVerified: true });
		
		return res.status(201).json({ message: 'Iyandikisha ryakunze.' });
	} catch (error) {
		console.error('Register error:', error);
		return res.status(500).json({ message: 'Habaye ikibazo kuri server' });
	}
});

router.post('/verify', authLimiter, [ 
	body('email').isEmail().normalizeEmail(), 
	body('code').isLength({ min: 6, max: 6 }).isNumeric() 
], async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

	const { email, code } = req.body;
	try {
		const manager = await Manager.findOne({ email });
		if (!manager) return res.status(404).json({ message: 'Ntibyabonetse' });
		if (manager.isVerified) return res.json({ message: 'Konte yemejwe' });
		if (manager.verificationCode !== code || !manager.verificationCodeExpires || manager.verificationCodeExpires < new Date()) {
			return res.status(400).json({ message: 'Kode siyo cyangwa yararangiye' });
		}
		manager.isVerified = true;
		manager.verificationCode = undefined;
		manager.verificationCodeExpires = undefined;
		await manager.save();
		return res.json({ message: 'Konte yemejwe neza' });
	} catch (error) {
		console.error('Verify error:', error);
		return res.status(500).json({ message: 'Habaye ikibazo kuri server' });
	}
});

router.post('/login', authLimiter, [ 
	body('email').isEmail().normalizeEmail().withMessage('Imeli ntabwo yemewe'), 
	body('password').notEmpty().withMessage('Ijambo ryibanga rigomba kuzuzwa') 
], async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

	const { email, password } = req.body;
	try {
		const manager = await Manager.findOne({ email });
		if (!manager) return res.status(401).json({ message: 'Ibyinjijwe si byo' });
		
		const ok = await bcrypt.compare(password, manager.passwordHash);
		if (!ok) return res.status(401).json({ message: 'Ibyinjijwe si byo' });
		
		const token = jwt.sign({ id: manager._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '1d' });
		return res.json({ token, user: { id: manager._id, fullName: manager.fullName, email: manager.email, salonName: manager.salonName, phone: manager.phone, role: manager.role } });
	} catch (error) {
		console.error('Login error:', error);
		return res.status(500).json({ message: 'Habaye ikibazo kuri server' });
	}
});

router.get('/google', (req, res) => {
	// Placeholder: implement OAuth redirect in future
	return res.status(501).json({ message: 'Google OAuth ntirashyirwamo' });
});

module.exports = router;
