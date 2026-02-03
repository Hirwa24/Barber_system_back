const mongoose = require('mongoose');

const managerSchema = new mongoose.Schema({
	fullName: { type: String, required: true },
	email: { type: String, required: true, unique: true, lowercase: true },
	phone: { type: String, required: true }, // +2507...
	salonName: { type: String, required: true },
	passwordHash: { type: String, required: true },
	isVerified: { type: Boolean, default: false },
	verificationCode: { type: String },
	verificationCodeExpires: { type: Date },
	photoUrl: { type: String },
	role: { type: String, enum: ['manager', 'admin'], default: 'manager' }, // New Admin Role
}, { timestamps: true });

module.exports = mongoose.model('Manager', managerSchema);
