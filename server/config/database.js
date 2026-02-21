
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false, // Disable all SQL logging
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    },
    statement_timeout: 10000, // 10 seconds max
    idle_in_transaction_session_timeout: 10000
  },
  pool: {
    max: 2, // REDUCE from 3 to 2
    min: 0,
    acquire: 10000,
    idle: 5000
  }
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // DON'T sync every time - only if tables don't exist
    const [results] = await sequelize.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"
    );
    
    if (!results[0].exists) {
      console.log('🔄 Creating tables...');
      await sequelize.sync({ alter: true });
      console.log('✅ Tables created');
    } else {
      console.log('✅ Tables already exist');
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  }
};

module.exports = { sequelize, connectDB };
