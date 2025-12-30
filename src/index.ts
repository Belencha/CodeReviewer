import express from 'express';
import dotenv from 'dotenv';
import { webhookHandler } from './webhook/handler';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GitLab webhook endpoint
app.post('/webhook/gitlab', webhookHandler);

app.listen(PORT, () => {
  logger.info(`CodeReviewer server running on port ${PORT}`);
});

