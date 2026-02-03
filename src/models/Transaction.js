const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
	manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Manager', required: true },
	barber: { type: mongoose.Schema.Types.ObjectId, ref: 'Barber', required: true },
	barberName: { type: String }, // snapshot name to keep after barber deletion
	amount: { type: Number, required: true }, // in RWF
	date: { type: Date, required: true },
	paid: { type: Boolean, default: false },
	ownerShare: { type: Number, required: true },
	barberShare: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
