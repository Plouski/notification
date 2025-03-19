// src/middlewares/rate-limiter.middleware.ts
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger';

// Configuration de base du rate limiter
const limiterOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limite chaque IP à 100 requêtes par fenêtre
  standardHeaders: true, // Inclure les headers standard
  legacyHeaders: false, // Désactiver les headers obsolètes
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    
    res.status(429).json({
      success: false,
      message: 'Trop de requêtes, veuillez réessayer plus tard',
    });
  }
};

// Création simple du middleware sans Redis pour commencer
const rateLimiterMiddleware = rateLimit(limiterOptions);

// Note: Pour ajouter Redis plus tard, vous pourrez l'activer comme ceci:
/*
import { createClient } from 'redis';
import { RedisStore } from 'rate-limit-redis';

// Lorsque vous serez prêt à utiliser Redis:
if (process.env.REDIS_URL) {
  try {
    const client = createClient({
      url: process.env.REDIS_URL
    });
    
    client.connect().catch(console.error);
    
    const limiterWithRedis = rateLimit({
      ...limiterOptions,
      store: new RedisStore({
        sendCommand: (...args: string[]) => client.sendCommand(args),
      }),
    });
    
    // Utiliser ce limiter à la place
  } catch (error) {
    logger.error('Failed to initialize Redis store for rate limiting', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
*/

export default rateLimiterMiddleware;