// src/middlewares/rate-limiter.middleware.ts
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { appConfig } from '../config/app.config';
import logger from '../utils/logger';

// Création du middleware de limitation de débit
const rateLimiterMiddleware = rateLimit({
  windowMs: appConfig.rateLimiter.windowMs,
  max: appConfig.rateLimiter.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    
    res.status(429).json({
      success: false,
      message: 'Trop de requêtes, veuillez réessayer plus tard',
    });
  },
  // Si Redis est configuré, utiliser un store Redis pour le partage entre instances
  ...(process.env.REDIS_URL && {
    store: new RedisStore({
      // @ts-ignore - Problème de typage avec rate-limit-redis
      redisURL: process.env.REDIS_URL,
      prefix: 'ratelimit:',
    }),
  }),
});

export default rateLimiterMiddleware;