const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Manager = require('../src/models/Manager');
require('dotenv').config();

const ADMIN_EMAIL = 'hirwajules2000@gmail.com';
const ADMIN_PASS = '2k2026@G';

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

const seedAdmin = async () => {
    await connectDB();

    try {
        let admin = await Manager.findOne({ email: ADMIN_EMAIL });
        
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(ADMIN_PASS, salt);

        if (admin) {
            console.log('Admin already exists, updating password and role...');
            admin.passwordHash = passwordHash;
            admin.role = 'admin';
            admin.isVerified = true;
            await admin.save();
            console.log('Admin updated.');
        } else {
            console.log('Creating new Admin...');
            admin = new Manager({
                fullName: 'Super Admin',
                email: ADMIN_EMAIL,
                phone: '+250780000000',
                salonName: 'Admin System',
                passwordHash,
                isVerified: true,
                role: 'admin'
            });
            await admin.save();
            console.log('Admin created.');
        }
    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
};

seedAdmin();
