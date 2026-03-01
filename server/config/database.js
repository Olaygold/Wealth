
// config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    },
    statement_timeout: 30000,
    idle_in_transaction_session_timeout: 30000,
  },
  
  pool: {
    max: 9,
    min: 0,
    acquire: 30000,
    idle: 20000,
  },
  
  // ✅ NO define.underscored here - let models control it
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

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
    console.log('🔄 Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

process.on('SIGINT', async () => {
  await sequelize.close();
  console.log('👋 Database connection closed');
  process.exit(0);
});

module.exports = { sequelize, connectDB };
