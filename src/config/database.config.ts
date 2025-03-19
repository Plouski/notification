// src/config/database.config.ts (version simplifiée)
import logger from '../utils/logger';

// Configuration de la base de données (simplifiée, sans MongoDB)
export const dbConfig = {
  inMemoryStorage: true
};

// Fonction de connexion simulée
export const connectDB = async (): Promise<void> => {
  logger.info('Using in-memory storage instead of MongoDB');
  return Promise.resolve();
};

export default { dbConfig, connectDB };