const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
const logger = require('../utils/logger');

let redis;
if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL);
    logger.info('Redis connecté pour le rate limiter');
  } catch (error) {
    logger.error('Erreur de connexion à Redis:', error);
  }
}

// Limiter pour les requêtes d'API générales
exports.apiLimiter = rateLimit({
  store: redis 
    ? new RedisStore({
        client: redis,
        prefix: 'ratelimit:api:'
      }) 
    : undefined,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limiter chaque IP à 100 requêtes par fenêtre
  message: {
    status: 'fail',
    message: 'Trop de requêtes depuis cette IP, veuillez réessayer après 15 minutes'
  },
  standardHeaders: true, // Retourner les info de rate limit dans les headers `RateLimit-*`
  legacyHeaders: false // Désactiver les headers `X-RateLimit-*`
});

// Limiter pour les tentatives de connexion
exports.authLimiter = rateLimit({
  store: redis 
    ? new RedisStore({
        client: redis,
        prefix: 'ratelimit:auth:'
      }) 
    : undefined,
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 10, // Limiter chaque IP à 10 tentatives de connexion par heure
  message: {
    status: 'fail',
    message: 'Trop de tentatives depuis cette IP, veuillez réessayer après une heure'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Limiter pour les envois de notifications
exports.notificationLimiter = rateLimit({
  store: redis 
    ? new RedisStore({
        client: redis,
        prefix: 'ratelimit:notification:'
      }) 
    : undefined,
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 50, // Limiter chaque IP à 50 notifications par heure
  message: {
    status: 'fail',
    message: 'Vous avez envoyé trop de notifications, veuillez réessayer après une heure'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Limiter pour les réinitialisations de mot de passe
exports.passwordResetLimiter = rateLimit({
  store: redis 
    ? new RedisStore({
        client: redis,
        prefix: 'ratelimit:passwordReset:'
      }) 
    : undefined,
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 3, // Limiter chaque IP à 3 demandes de réinitialisation par heure
  message: {
    status: 'fail',
    message: 'Vous avez effectué trop de demandes de réinitialisation de mot de passe, veuillez réessayer après une heure'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Limiter pour les webhook (pour éviter les abus)
exports.webhookLimiter = rateLimit({
  store: redis 
    ? new RedisStore({
        client: redis,
        prefix: 'ratelimit:webhook:'
      }) 
    : undefined,
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // Limiter chaque IP à 100 requêtes webhook par 5 minutes
  message: {
    status: 'fail',
    message: 'Trop de requêtes webhook, veuillez réessayer plus tard'
  },
  standardHeaders: true,
  legacyHeaders: false
});