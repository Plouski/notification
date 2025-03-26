const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const setupSwagger = require('./config/swagger');

// Charger les variables d'environnement
dotenv.config({ path: './.env' });

// Importer les routes
const authRoutes = require('./routes/authRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Importer la connexion à la base de données
const connectDB = require('./config/db');

// Importer le logger
const logger = require('./utils/logger');

// Importer les limiteurs de débit
const rateLimiter = require('./middleware/rateLimiter');

// Créer le dossier logs s'il n'existe pas
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

// Créer le dossier templates s'il n'existe pas
if (!fs.existsSync('templates')) {
  fs.mkdirSync('templates');
}

// Connexion à la base de données
connectDB();

// Créer l'application Express
const app = express();

// Configurer Swagger en mode développement
if (process.env.NODE_ENV === 'development') {
  setupSwagger(app);
}

// Middleware CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Sécurité HTTP avec helmet
app.use(helmet());

// Limiter les requêtes pour prévenir les attaques par force brute
app.use('/api', rateLimiter.apiLimiter);
app.use('/api/users/login', rateLimiter.authLimiter);
app.use('/api/users/forgotPassword', rateLimiter.passwordResetLimiter);
app.use('/api/notifications/send', rateLimiter.notificationLimiter);
app.use('/api/notifications/webhooks', rateLimiter.webhookLimiter);

// Logging en développement
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Analyse du corps des requêtes
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Désinfection des données contre les injections NoSQL
app.use(mongoSanitize());

// Désinfection des données contre les attaques XSS
app.use(xss());

// Compression des réponses
app.use(compression());

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/users', authRoutes);
app.use('/api/notifications', notificationRoutes);

// Route pour vérifier l'état du serveur
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Service de notification opérationnel',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Gestion des routes non trouvées
app.all('*', (req, res, next) => {
  res.status(404).json({
    status: 'fail',
    message: `Route ${req.originalUrl} non trouvée sur ce serveur`
  });
});

// Middleware de gestion des erreurs globales
app.use((err, req, res, next) => {
  logger.error(`${err.name}: ${err.message}`);
  
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } else {
    // Erreurs opérationnelles connues: envoyer le message au client
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    } else {
      // Erreurs de programmation ou inconnues: ne pas divulguer les détails
      logger.error('ERROR 💥', err);
      res.status(500).json({
        status: 'error',
        message: 'Une erreur s\'est produite'
      });
    }
  }
});

// Démarrer le serveur
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  logger.info(`Serveur démarré sur le port ${port} en mode ${process.env.NODE_ENV}`);
});

// Gestion des rejets de promesses non captées
process.on('unhandledRejection', err => {
  logger.error('UNHANDLED REJECTION! 💥 Arrêt du serveur...');
  logger.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Gestion des exceptions non captées
process.on('uncaughtException', err => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Arrêt du serveur...');
  logger.error(err.name, err.message);
  process.exit(1);
});

module.exports = app;