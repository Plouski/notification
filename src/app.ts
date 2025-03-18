// src/app.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import notificationRoutes from './routes/notification.route';
import dotenv from 'dotenv';
dotenv.config();

// Initialiser l'application Express
const app = express();

// Middleware pour la sécurité et l'optimisation
app.use(helmet()); // Protection des headers HTTP
app.use(cors());   // Gestion du CORS
app.use(compression()); // Compression des réponses
app.use(express.json()); // Parser les requêtes avec JSON
app.use(express.urlencoded({ extended: true })); // Parser les requêtes avec form-data

// Logger les requêtes
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Gestion des routes
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
  console.error('Uncaught exception', err);
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Une erreur interne est survenue' 
      : err.message,
  });
});

// Port d'écoute
const PORT = process.env.PORT || 6000;

// Fonction de démarrage de l'application
const startServer = async (): Promise<void> => {
  try {
    // Connexion à MongoDB (décommentez une fois que vous avez configuré MongoDB)
    // await connectDB();
    
    // Démarrer le serveur
    app.listen(PORT, () => {
      console.log(`Notification service started on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
};

// Démarrer le serveur
startServer();

export default app;