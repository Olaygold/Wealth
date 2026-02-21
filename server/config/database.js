
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false, // Disable SQL logging for cleaner logs
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    },
    statement_timeout: 60000,  // 60 second timeout
    idle_in_transaction_session_timeout: 60000
  },
  pool: {
    max: 3,
    min: 0,
    acquire: 60000,  // Increased from 30000
    idle: 10000
  },
  retry: {
    max: 3
  }
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL Database connected successfully');
    
    console.log('🔄 Syncing database...');
    await sequelize.sync({ alter: true, logging: false }); // Changed from force: true
    console.log('✅ Database synchronized');
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  }
};

module.exports = { sequelize, connectDB };
