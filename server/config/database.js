
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: console.log,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  pool: {
    max: 3,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL Database connected successfully');
    
    console.log('🔄 Creating database tables...');
    
    // Import models FIRST
    const models = require('../models');
    
    // Sync database (force: true will drop and recreate)
    await sequelize.sync({ alter: true, logging: console.log });
    
    console.log('✅ All database tables created successfully');
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    // Don't exit - let the app run, we'll retry
  }
};

module.exports = { sequelize, connectDB };
