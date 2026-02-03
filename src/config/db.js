const mongoose = require('mongoose');
require('dotenv').config();

async function connectDB() {
	const uri = process.env.MONGO_URI;
	if (!uri) {
		throw new Error('MONGO_URI is not set');
	}
	mongoose.set('strictQuery', true);
	await mongoose.connect(uri, {
		serverSelectionTimeoutMS: 15000,
	});
	console.log('MongoDB connected');
}

module.exports = connectDB;
