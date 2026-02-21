require('dotenv').config();
const { User, Wallet } = require('../models');
const { connectDB } = require('../config/database');

const createAdmin = async () => {
  try {
    await connectDB();

    const admin = await User.create({
      username: 'admin',
      email: 'olayinka10172007@gmail.com',
      password: 'Admin@123', // Change this!
      fullName: 'System Administrator',
      role: 'admin',
      isVerified: true,
      isActive: true,
      kycStatus: 'approved'
    });

    await Wallet.create({
      userId: admin.id
    });

    console.log('✅ Admin user created successfully!');
    console.log('Username: admin');
    console.log('Email: admin@wealth.com');
    console.log('Password: Admin@123');
    console.log('\n⚠️  CHANGE THE PASSWORD IMMEDIATELY!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

createAdmin();
