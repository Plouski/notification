// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

// Étendre l'interface Request pour inclure des propriétés utilisateur
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
    }
  }
}

/**
 * Middleware d'authentification par JWT
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Récupérer le token depuis le header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        success: false, 
        message: 'Authentification requise' 
      });
      return;
    }
    
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'default_jwt_secret_key';
    
    try {
      // Vérifier et décoder le token
      const decoded = jwt.verify(token, secret) as { userId: string; role: string };
      
      // Ajouter les informations utilisateur à la requête
      req.userId = decoded.userId;
      req.userRole = decoded.role;
      
      next();
    } catch (tokenError) {
      // Mode développement : permettre de continuer même avec un token invalide
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Token verification failed in development mode, continuing anyway');
        
        try {
          // Extraire le payload sans vérifier la signature
          const base64Payload = token.split('.')[1];
          const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf8'));
          
          req.userId = payload.userId || 'dev-user-id';
          req.userRole = payload.role || 'user';
          
          next();
        } catch (parseError) {
          logger.error('Failed to parse token payload', {
            error: parseError instanceof Error ? parseError.message : String(parseError),
          });
          
          res.status(401).json({ 
            success: false, 
            message: 'Token invalide ou mal formé' 
          });
        }
      } else {
        // En production, un token invalide = accès refusé
        logger.warn('Invalid authentication token', {
          error: tokenError instanceof Error ? tokenError.message : String(tokenError),
        });
        
        res.status(401).json({ 
          success: false, 
          message: 'Token invalide ou expiré' 
        });
      }
    }
  } catch (error) {
    logger.error('Authentication error', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    res.status(500).json({ 
      success: false, 
      message: 'Erreur d\'authentification' 
    });
  }
};

export default authMiddleware;