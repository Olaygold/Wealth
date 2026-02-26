
// server/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const socketIO = require('socket.io');
require('dotenv').config();

const { connectDB } = require('./config/database');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// =====================================================
// TRUST PROXY (for Render, Vercel, Railway, etc.)
// =====================================================
app.set('trust proxy', 1);

// =====================================================
// CONNECT TO DATABASE
// =====================================================
connectDB();

// =====================================================
// SECURITY & MIDDLEWARE
// =====================================================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// =====================================================
// CORS CONFIGURATION
// =====================================================
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174', // Vite alternate port
  process.env.CLIENT_URL,
  'https://wealth-crypto.vercel.app',
  /\.vercel\.app$/, // Allow all Vercel preview deployments
  /\.railway\.app$/, // If using Railway
  /\.render\.com$/ // If using Render
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// Handle preflight requests globally
app.options('*', cors());

// =====================================================
// BODY PARSING MIDDLEWARE
// =====================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =====================================================
// LOGGING MIDDLEWARE
// =====================================================
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// =====================================================
// MAKE SOCKET.IO ACCESSIBLE IN ROUTES
// =====================================================
app.set('io', io);

// Request logging for debugging
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

// =====================================================
// API ROUTES
// =====================================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/trading', require('./routes/trading'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/referrals', require('./routes/referral')); // ✅ FIXED: Use correct file name

// =====================================================
// HEALTH CHECK & INFO ENDPOINTS
// =====================================================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    },
    environment: process.env.NODE_ENV || 'development',
    node: process.version
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Wealth Crypto Trading API',
    version: '1.0.0',
    status: 'Running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      wallet: '/api/wallet',
      trading: '/api/trading',
      admin: '/api/admin',
      referrals: '/api/referrals'
    },
    documentation: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me'
      },
      wallet: {
        balance: 'GET /api/wallet/balance',
        deposit: 'POST /api/wallet/deposit',
        withdraw: 'POST /api/wallet/withdraw'
      },
      trading: {
        rounds: 'GET /api/trading/rounds/all',
        placeBet: 'POST /api/trading/bets/place'
      },
      referrals: {
        dashboard: 'GET /api/referrals/dashboard',
        withdraw: 'POST /api/referrals/withdraw'
      }
    }
  });
});

// =====================================================
// API 404 HANDLER (Only for /api/* routes)
// =====================================================
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    suggestion: 'Check the API documentation at GET /',
    availableRoutes: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/me',
      'GET /api/wallet/balance',
      'POST /api/wallet/deposit',
      'GET /api/trading/rounds/all',
      'POST /api/trading/bets/place',
      'GET /api/referrals/dashboard',
      'POST /api/referrals/withdraw'
    ]
  });
});

// =====================================================
// CATCH-ALL FOR NON-API ROUTES
// Prevent 404 errors for frontend routes
// =====================================================
app.use((req, res, next) => {
  // If it's an API request that wasn't caught, return 404
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ 
      success: false, 
      message: 'API route not found' 
    });
  }
  
  // For non-API routes, return basic info
  res.status(200).json({ 
    message: 'Wealth Crypto Trading API',
    version: '1.0.0',
    note: 'This is a backend API. Please access the frontend application for the user interface.',
    api_docs: 'Visit GET / for API documentation'
  });
});

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================
app.use((err, req, res, next) => {
  console.error('❌ Global Error Handler:');
  console.error('   Message:', err.message);
  
  if (process.env.NODE_ENV === 'development') {
    console.error('   Stack:', err.stack);
  }
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors || err.message
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  if (err.name === 'UnauthorizedError' || err.message === 'jwt expired') {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token'
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token'
    });
  }

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation: Origin not allowed'
    });
  }

  if (err.code === 11000) { // MongoDB duplicate key error
    return res.status(400).json({
      success: false,
      message: 'Duplicate entry detected'
    });
  }
  
  // Default error response
  res.status(err.status || err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err 
    })
  });
});

// =====================================================
// SOCKET.IO CONNECTION HANDLING
// =====================================================
io.on('connection', (socket) => {
  console.log('✅ Socket.IO: New client connected:', socket.id);

  // Join user-specific room for personalized notifications
  socket.on('join_user', (userId) => {
    if (userId) {
      const roomName = `user_${userId}`;
      socket.join(roomName);
      console.log(`👤 User ${userId} joined room: ${roomName}`);
      
      // Confirm join
      socket.emit('joined_user_room', { 
        userId, 
        roomName,
        message: 'Successfully joined your notification room' 
      });
    }
  });

  // Leave user room
  socket.on('leave_user', (userId) => {
    if (userId) {
      const roomName = `user_${userId}`;
      socket.leave(roomName);
      console.log(`👤 User ${userId} left room: ${roomName}`);
    }
  });

  // Join trading room (for price updates)
  socket.on('join_trading', () => {
    socket.join('trading_room');
    console.log(`📊 Client ${socket.id} joined trading room`);
  });

  // Heartbeat/ping to keep connection alive
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });

  socket.on('disconnect', (reason) => {
    console.log(`❌ Socket.IO: Client disconnected: ${socket.id} (${reason})`);
  });

  socket.on('error', (error) => {
    console.error('❌ Socket.IO error:', error);
  });
});

// =====================================================
// START BACKGROUND SERVICES
// =====================================================
const startServices = async () => {
  try {
    console.log('\n🔧 Starting background services...');
    
    // Start price tracking service
    const priceService = require('./services/priceService');
    await priceService.startPriceTracking(io);
    console.log('✅ Price tracking service started');
    
    // Start round management service
    const roundService = require('./services/roundService');
    await roundService.startRoundManager(io);
    console.log('✅ Round management service started');
    
    console.log('✅ All background services initialized successfully\n');
  } catch (error) {
    console.error('❌ Failed to start background services:', error);
    console.error('   The server will continue, but some features may not work');
  }
};

// =====================================================
// START SERVER
// =====================================================
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, async () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 WEALTH CRYPTO TRADING SERVER');
  console.log('='.repeat(60));
  console.log(`📡 Server running on: http://${HOST}:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🌐 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
  console.log(`⏰ Server time: ${new Date().toISOString()}`);
  console.log('='.repeat(60) + '\n');
  
  // Start background services after server is listening
  await startServices();
});

// =====================================================
// GRACEFUL SHUTDOWN HANDLERS
// =====================================================
const gracefulShutdown = (signal) => {
  console.log(`\n👋 ${signal} received. Starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(() => {
    console.log('✅ HTTP server closed');
    
    // Close database connections
    const { sequelize } = require('./config/database');
    sequelize.close().then(() => {
      console.log('✅ Database connections closed');
      console.log('💀 Process terminated gracefully');
      process.exit(0);
    }).catch((err) => {
      console.error('❌ Error closing database:', err);
      process.exit(1);
    });
  });

  // Force close after 30 seconds
  setTimeout(() => {
    console.error('⚠️ Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection:');
  console.error('   Reason:', reason);
  console.error('   Promise:', promise);
  
  if (process.env.NODE_ENV === 'production') {
    // In production, log and continue
    console.error('⚠️ Server continuing despite unhandled rejection');
  } else {
    // In development, crash to make bugs obvious
    server.close(() => process.exit(1));
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:');
  console.error('   Error:', error.message);
  console.error('   Stack:', error.stack);
  
  // Always exit on uncaught exception
  console.error('💀 Exiting due to uncaught exception');
  process.exit(1);
});

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Prevent crashes from unhandled errors
process.on('warning', (warning) => {
  console.warn('⚠️ Node.js Warning:');
  console.warn('   Name:', warning.name);
  console.warn('   Message:', warning.message);
  console.warn('   Stack:', warning.stack);
});

module.exports = { app, server, io };
