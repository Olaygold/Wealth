
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,

  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
    statement_timeout: 5000,
    idle_in_transaction_session_timeout: 5000,
  },

  pool: {
    max: 6,        // sweet spot for supabase free tier
    min: 1,
    acquire: 10000,
    idle: 3000,
    evict: 2000
  },

  retry: {
    max: 2
  }
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database Connected');
  } catch (error) {
    console.error('❌ DB Connection Failed:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
