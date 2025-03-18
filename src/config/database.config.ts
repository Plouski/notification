// src/config/database.config.ts
import mongoose from 'mongoose';
import logger from '../utils/logger';

// Configuration de la base de données MongoDB
export const dbConfig = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/notification-service',
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    // Auto-index désactivé en production pour performance
    autoIndex: process.env.NODE_ENV !== 'production',
  }
};

// Connecter à MongoDB
export const connectDB = async (): Promise<void> => {
  try {
    // @ts-ignore - Problème de typage avec les options mongoose
    await mongoose.connect(dbConfig.uri, dbConfig.options);
    
    logger.info('Connected to MongoDB', {
      uri: dbConfig.uri.replace(/mongodb:\/\/([^:]+):([^@]+)@/, 'mongodb://****:****@') // Masquer les identifiants
    });
    
    // Gérer les événements de connexion
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected, trying to reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
    
  } catch (error) {
    logger.error('Failed to connect to MongoDB', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    // En cas d'échec de connexion, quitter l'application
    process.exit(1);
  }
};

export default { dbConfig, connectDB };