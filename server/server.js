
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
    methods: ['GET', 'POST']
  }
});

// Trust proxy (for Render, Vercel, etc.)
app.set('trust proxy', 1);

// Connect to Database
connectDB();

// =====================================================
// MIDDLEWARE
// =====================================================
app.use(helmet()); // Security headers

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.CLIENT_URL,
  'https://wealth-crypto.vercel.app',
  /\.vercel\.app$/ // Allow all Vercel preview deployments
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    })) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Make io accessible in routes
app.set('io', io);

// =====================================================
// API ROUTES
// =====================================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/trading', require('./routes/trading'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/referrals', require('./routes/referralRoutes')); // ✅ NEW: Referral Routes

// =====================================================
// HEALTH CHECK & INFO ENDPOINTS
// =====================================================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Wealth Crypto API',
    version: '1.0.0',
    status: 'Running',
    endpoints: {
      auth: '/api/auth',
      wallet: '/api/wallet',
      trading: '/api/trading',
      admin: '/api/admin',
      referrals: '/api/referrals' // ✅ NEW
    }
  });
});

// =====================================================
// API 404 HANDLER (Only for /api/* routes)
// =====================================================
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `API route not found: ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'GET /api/auth/me',
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET /api/wallet/balance',
      'GET /api/trading/rounds/all',
      'GET /api/referrals/dashboard',
      'GET /api/admin/dashboard'
    ]
  });
});

// =====================================================
// CATCH-ALL FOR NON-API ROUTES (Return JSON, not HTML)
// This prevents 404 for frontend routes
// =====================================================
app.use((req, res, next) => {
  // If it's an API request that wasn't caught, return 404
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ 
      success: false, 
      message: 'Route not found' 
    });
  }
  
  // For non-API routes, just return basic info (frontend handles routing)
  res.json({ 
    message: 'Wealth Crypto API',
    note: 'For frontend routes, please access the frontend URL directly'
  });
});

// =====================================================
// ERROR HANDLER
// =====================================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors
    });
  }

  if (err.name === 'UnauthorizedError' || err.message === 'jwt expired') {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS error: Origin not allowed'
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// =====================================================
// SOCKET.IO CONNECTION
// =====================================================
io.on('connection', (socket) => {
  console.log('✅ New client connected:', socket.id);

  // Join user-specific room for notifications
  socket.on('join_user', (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`👤 User ${userId} joined their room`);
    }
  });

  // Leave user room
  socket.on('leave_user', (userId) => {
    if (userId) {
      socket.leave(`user_${userId}`);
      console.log(`👤 User ${userId} left their room`);
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// =====================================================
// START SERVICES
// =====================================================
const startServices = async () => {
  try {
    // Start price tracking service
    const priceService = require('./services/priceService');
    priceService.startPriceTracking(io);
    
    // Start round management service
    const roundService = require('./services/roundService');
    await roundService.startRoundManager(io);
    
    console.log('✅ All services started successfully');
  } catch (error) {
    console.error('❌ Failed to start services:', error);
  }
};

// =====================================================
// START SERVER
// =====================================================
const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  
  // Start background services
  await startServices();
});

// =====================================================
// GRACEFUL SHUTDOWN
// =====================================================
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('💀 Process terminated');
    process.exit(0);
  });
});

module.exports = { app, server, io };
