
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
    statement_timeout: 30000,              // ✅ 30 seconds
    idle_in_transaction_session_timeout: 30000, // ✅ 30 seconds
    connect_timeout: 10,                    // ✅ Add this
  },
  
  pool: {
    max: 6,           // ✅ Max 3 connections
    min: 0,           // ✅ No minimum
    acquire: 30000,   // ✅ 30s to acquire connection
    idle: 20000,      // ✅ Keep connection alive 20s
    evict: 30000,     // ✅ Check for idle connections every 30s
  },
  
  retry: {            // ✅ ADD RETRY LOGIC
    max: 3,
    timeout: 3000,
  },
  
  // ✅ ADD THIS - Prevents connection buildup
  define: {
    timestamps: true,
    underscored: true,
  }
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Check if tables exist
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
    
    // ✅ ADD RETRY LOGIC
    console.log('🔄 Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

// ✅ ADD GRACEFUL SHUTDOWN
process.on('SIGINT', async () => {
  await sequelize.close();
  console.log('👋 Database connection closed');
  process.exit(0);
});

module.exports = { sequelize, connectDB };
