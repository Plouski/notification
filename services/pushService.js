const admin = require('firebase-admin');
const logger = require('../utils/logger');
const Notification = require('../models/notification');
const User = require('../models/user');

class PushService {
  constructor() {
    try {
      // Initialiser Firebase Admin SDK
      const serviceAccount = require('../config/firebase-config.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
      logger.info('Service de notification push initialisé');
    } catch (error) {
      logger.error('Erreur d\'initialisation du service de notification push:', error);
    }
  }

  async sendToDevice(options) {
    try {
      if (!options.token && !options.userId) {
        throw new Error('Token FCM ou ID utilisateur requis pour envoyer une notification push');
      }

      let tokens = [];
      
      // Si un userId est fourni, récupérer tous ses tokens
      if (options.userId) {
        const user = await User.findById(options.userId);
        if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
          return { 
            success: false, 
            error: 'Aucun token FCM trouvé pour cet utilisateur' 
          };
        }
        tokens = user.fcmTokens;
      } else if (options.token) {
        // Utiliser le token spécifié
        tokens = [options.token];
      }

      // Préparer la notification
      const message = {
        notification: {
          title: options.title || 'Notification',
          body: options.body || 'Vous avez une nouvelle notification'
        },
        data: options.data || {},
        tokens: tokens
      };

      // Créer l'enregistrement de notification
      const notification = await Notification.create({
        user: options.userId,
        type: 'push',
        title: options.title || 'Notification',
        message: options.body || 'Vous avez une nouvelle notification',
        status: 'pending',
        metadata: {
          tokens: tokens.join(','),
          data: JSON.stringify(options.data || {})
        }
      });

      // Envoyer la notification push
      const response = await admin.messaging().sendMulticast(message);
      
      // Analyser la réponse
      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
            logger.warn(`Échec d'envoi au token: ${tokens[idx]}, raison: ${resp.error.message}`);
          }
        });

        // Supprimer les tokens invalides
        if (failedTokens.length > 0 && options.userId) {
          const user = await User.findById(options.userId);
          if (user) {
            user.fcmTokens = user.fcmTokens.filter(token => !failedTokens.includes(token));
            await user.save();
          }
        }

        if (response.successCount === 0) {
          // Mise à jour du statut en cas d'échec complet
          await Notification.findByIdAndUpdate(notification._id, {
            status: 'failed',
            failureReason: 'Tous les tokens ont échoué'
          });
          return { 
            success: false, 
            error: 'Tous les tokens ont échoué',
            failedTokens 
          };
        }
      }

      // Mise à jour du statut de la notification
      await Notification.findByIdAndUpdate(notification._id, {
        status: 'sent',
        deliveredAt: Date.now(),
        metadata: {
          ...notification.metadata,
          successCount: response.successCount,
          failureCount: response.failureCount
        }
      });

      logger.info(`Notification push envoyée: ${response.successCount} succès, ${response.failureCount} échecs`);
      return { 
        success: true, 
        successCount: response.successCount,
        failureCount: response.failureCount,
        notificationId: notification._id
      };
    } catch (error) {
      logger.error('Erreur lors de l\'envoi de notification push:', error);
      
      // Mise à jour du statut en cas d'exception
      if (options.userId) {
        await Notification.findOneAndUpdate(
          { user: options.userId, type: 'push', status: 'pending' },
          {
            status: 'failed',
            failureReason: error.message
          }
        );
      }
      
      return { success: false, error: error.message };
    }
  }

  async sendToTopic(options) {
    try {
      if (!options.topic) {
        throw new Error('Sujet requis pour envoyer une notification push');
      }

      // Préparer la notification
      const message = {
        notification: {
          title: options.title || 'Notification',
          body: options.body || 'Vous avez une nouvelle notification'
        },
        data: options.data || {},
        topic: options.topic
      };

      // Envoyer la notification push
      const response = await admin.messaging().send(message);
      
      logger.info(`Notification push envoyée au sujet ${options.topic}: ${response}`);
      return { success: true, messageId: response };
    } catch (error) {
      logger.error(`Erreur lors de l'envoi de notification push au sujet ${options.topic}:`, error);
      return { success: false, error: error.message };
    }
  }

  async subscribeTopic(token, topic) {
    try {
      await admin.messaging().subscribeToTopic(token, topic);
      logger.info(`Token ${token} souscrit au sujet ${topic}`);
      return { success: true };
    } catch (error) {
      logger.error(`Erreur lors de la souscription au sujet ${topic}:`, error);
      return { success: false, error: error.message };
    }
  }

  async unsubscribeTopic(token, topic) {
    try {
      await admin.messaging().unsubscribeFromTopic(token, topic);
      logger.info(`Token ${token} désinscrit du sujet ${topic}`);
      return { success: true };
    } catch (error) {
      logger.error(`Erreur lors de la désinscription du sujet ${topic}:`, error);
      return { success: false, error: error.message };
    }
  }
  
  // Enregistrer un nouveau token FCM pour un utilisateur
  async registerToken(userId, token) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { success: false, error: 'Utilisateur non trouvé' };
      }
      
      await user.addFCMToken(token);
      logger.info(`Token FCM enregistré pour l'utilisateur ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error(`Erreur lors de l'enregistrement du token FCM:`, error);
      return { success: false, error: error.message };
    }
  }
  
  // Supprimer un token FCM pour un utilisateur
  async removeToken(userId, token) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { success: false, error: 'Utilisateur non trouvé' };
      }
      
      await user.removeFCMToken(token);
      logger.info(`Token FCM supprimé pour l'utilisateur ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error(`Erreur lors de la suppression du token FCM:`, error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new PushService();