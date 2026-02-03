const mongoose = require('mongoose');

const barberSchema = new mongoose.Schema({
	manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Manager', required: true },
	name: { type: String, required: true },
	phone: { type: String },
	active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Barber', barberSchema);
