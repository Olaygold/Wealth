
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Use DATABASE_URL from environment
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false // Important for Supabase
    }
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL Database connected successfully');
    
    // FORCE sync in production on first deploy (creates tables)
    // After first successful deploy, change 'force: true' to 'alter: true'
    await sequelize.sync({ force: true }); // ⚠️ This DELETES and recreates all tables!
    console.log('✅ Database synchronized');
  } catch (error) {
    console.error('❌ Unable to connect to database:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
