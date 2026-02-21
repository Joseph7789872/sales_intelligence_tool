import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { clerkAuth } from './middleware/auth.js';
import routes from './routes/index.js';

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));

// Rate limiting
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

// CRITICAL: Raw body parsing for webhook MUST come before JSON middleware.
// Svix needs the raw body (Buffer) to verify webhook signatures.
app.use('/api/v1/auth/webhook', express.raw({ type: 'application/json' }));

// Body parsing for all other routes
app.use(express.json({ limit: '10mb' }));

// Global Clerk auth middleware
app.use(clerkAuth);

// Health check (no auth required)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1', routes);

// Error handling (must be last)
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Backend running on http://localhost:${env.PORT}`);
});

export default app;
