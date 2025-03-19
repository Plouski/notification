// src/app.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import logger from './utils/logger';
import { setupSwagger } from './utils/swagger';
import notificationRoutes from './routes/notification.route';
import rateLimiterMiddleware from './middlewares/rate-limiter.middleware';
import { connectDB } from './config/database.config';

dotenv.config();

// Initialiser l'application Express
const app = express();

// Middleware pour la sécurité et l'optimisation
app.use(helmet()); // Protection des headers HTTP
app.use(cors());   // Gestion du CORS
app.use(compression()); // Compression des réponses
app.use(express.json()); // Parser les requêtes avec JSON
app.use(express.urlencoded({ extended: true })); // Parser les requêtes avec form-data

// Logger middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Rate limiter global pour prévenir les abus
app.use(rateLimiterMiddleware);

// Configurer Swagger
setupSwagger(app);

// Routes
app.use('/api/notifications', notificationRoutes);

// Route de santé pour les vérifications de disponibilité
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'notification-service',
  });
});

// Gestion des routes non trouvées
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `La route ${req.originalUrl} n'existe pas`,
  });
});

// Gestion des erreurs
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Uncaught exception', {
    error: err.message,
    stack: err.stack
  });
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Une erreur interne est survenue' 
      : err.message,
  });
});

// Port d'écoute
const PORT = process.env.PORT || 3000;

// Fonction de démarrage de l'application
const startServer = async (): Promise<void> => {
  try {
    // Connexion à MongoDB, même en développement
    try {
      logger.info('Connecting to MongoDB...');
      await connectDB();
      logger.info('MongoDB connection established successfully');
    } catch (dbError) {
      logger.warn('Failed to connect to MongoDB, continuing in simulation mode', {
        error: dbError instanceof Error ? dbError.message : String(dbError)
      });
    }
    
    // Démarrer le serveur
    app.listen(PORT, () => {
      logger.info(`Notification service started on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
};

// Démarrer le serveur
startServer();

export default app;