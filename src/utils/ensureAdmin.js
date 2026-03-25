const bcrypt = require('bcryptjs');
const Manager = require('../models/Manager');

async function ensureAdmin() {
  if (process.env.AUTO_SEED_ADMIN !== 'true') {
    return;
  }

  const adminEmail = (process.env.ADMIN_EMAIL || 'hirwajules2000@gmail.com').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || '2k2026@G';
  const adminFullName = process.env.ADMIN_FULL_NAME || 'Super Admin';
  const adminPhone = process.env.ADMIN_PHONE || '+250780000000';
  const adminSalonName = process.env.ADMIN_SALON_NAME || 'Admin System';

  const existingAdmin = await Manager.findOne({ email: adminEmail });
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  if (existingAdmin) {
    existingAdmin.fullName = existingAdmin.fullName || adminFullName;
    existingAdmin.phone = existingAdmin.phone || adminPhone;
    existingAdmin.salonName = existingAdmin.salonName || adminSalonName;
    existingAdmin.passwordHash = passwordHash;
    existingAdmin.role = 'admin';
    existingAdmin.isVerified = true;
    existingAdmin.createdByAdmin = true;
    await existingAdmin.save();
    console.log(`Admin account ready: ${adminEmail}`);
    return;
  }

  await Manager.create({
    fullName: adminFullName,
    email: adminEmail,
    phone: adminPhone,
    salonName: adminSalonName,
    passwordHash,
    isVerified: true,
    role: 'admin',
    createdByAdmin: true,
  });

  console.log(`Admin account created: ${adminEmail}`);
}

module.exports = ensureAdmin;
