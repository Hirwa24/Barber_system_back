const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
	manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Manager', required: true },
	barber: { type: mongoose.Schema.Types.ObjectId, ref: 'Barber', required: true },
	amount: { type: Number, required: true },
	note: { type: String },
	remaining: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Loan', loanSchema);
