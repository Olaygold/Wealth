
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
    statement_timeout: 30000,  // Increase timeout
    idle_in_transaction_session_timeout: 30000,
  },
  
  pool: {
    max: 6,        // Back to 3
    min: 0,
    acquire: 30000, // Increase from 10000
    idle: 20000,    // Increase from 5000
  },
  
  // ✅ DON'T ADD underscored: true here!
  // Your models already use camelCase columns
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
    console.log('🔄 Retrying in 5s...');
    setTimeout(connectDB, 5000);
  }
};

module.exports = { sequelize, connectDB };
