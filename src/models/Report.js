const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Manager', required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  totalEarnings: { type: Number, default: 0 },
  ownerShare: { type: Number, default: 0 },
  barbersShare: { type: Number, default: 0 },
  barberPerformance: [{
    barber: { type: mongoose.Schema.Types.ObjectId, ref: 'Barber' },
    barberName: { type: String },
    total: { type: Number, default: 0 },
    owner: { type: Number, default: 0 },
    barber: { type: Number, default: 0 }
  }]
}, { timestamps: true });

// Ensure one report per manager per date
reportSchema.index({ manager: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Report', reportSchema);
