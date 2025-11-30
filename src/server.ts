import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { config } from './config';
import routes from './routes';
import { setupSocketIO } from './socket';
import { errorHandler, notFoundHandler, setupUnhandledRejectionHandler } from './middleware/errorHandler';
import { requestLogger, logger } from './utils/logger';

const app = express();
const httpServer = createServer(app);

// Setup global error handlers
setupUnhandledRejectionHandler();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting - relaxed for development
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 500, // Limit each IP to 500 requests per minute
  message: {
    success: false,
    error: {
      message: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for certain routes in development
    return process.env.NODE_ENV === 'development';
  },
});

// Apply rate limiting to all API routes
app.use('/api', limiter);

// CORS configuration
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (development)
if (config.nodeEnv === 'development') {
  app.use(requestLogger());
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
  });
});

// API Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Rental Platform API',
      version: '1.0.0',
      message: 'No Broker - Direct Owner Contact Platform',
    },
  });
});

// 404 handler for undefined routes
app.use(notFoundHandler);

// Central error handling middleware (must be last)
app.use(errorHandler);

// Setup Socket.IO
const io = setupSocketIO(httpServer);

// Start server
httpServer.listen(config.port, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🏠 Rental Platform API Server                            ║
║                                                            ║
║   Server running on: http://localhost:${config.port}                ║
║   Environment: ${config.nodeEnv}                              ║
║   WebSocket: Enabled                                       ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export { app, httpServer, io };
