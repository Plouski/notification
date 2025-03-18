// src/services/push.service.ts
import { 
  Notification, 
  NotificationTemplate 
} from '../models/notification.model';
import { firebaseConfig } from '../config/firebase.config';
import logger from '../utils/logger';

// Importation conditionnelle de firebase-admin pour permettre l'exécution en mode simulation
let admin: any = null;
try {
  admin = require('firebase-admin');
} catch (error) {
  logger.warn('Firebase Admin SDK not available, will use simulation mode only');
}

export class PushService {
  private initialized: boolean = false;
  private app: any = null;
  
  constructor() {
    this.initialize();
  }
  
  private initialize() {
    if (!this.initialized && admin && process.env.NODE_ENV === 'production') {
      try {
        // Initialiser Firebase Admin SDK en utilisant les identifiants du fichier de configuration
        const privateKey = firebaseConfig.privateKey.replace(/\\n/g, '\n');
        
        this.app = admin.initializeApp({
          credential: admin.credential.cert({
            projectId: firebaseConfig.projectId,
            clientEmail: firebaseConfig.clientEmail,
            privateKey: privateKey
          }),
          databaseURL: firebaseConfig.databaseURL
        });
        
        logger.info('Firebase Admin SDK initialized successfully');
        this.initialized = true;
      } catch (error) {
        logger.error('Failed to initialize Firebase Admin SDK', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else if (!admin || process.env.NODE_ENV !== 'production') {
      // En mode développement, utiliser la simulation
      logger.info('Firebase Admin SDK initialized in simulation mode');
      this.initialized = true;
    }
  }

  async sendPushNotification(notification: Notification): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { recipient, content } = notification;
      
      if (!recipient.deviceToken) {
        throw new Error('Recipient device token is required');
      }

      // Préparer la notification push en fonction du template
      const pushContent = this.preparePushContent(notification.template, content.data || {});
      
      // Envoyer une vraie notification en production
      if (this.initialized && admin && process.env.NODE_ENV === 'production') {
        const message = {
          token: recipient.deviceToken,
          notification: {
            title: pushContent.title,
            body: pushContent.body
          },
          data: pushContent.data,
          android: {
            priority: 'high',
            notification: {
              clickAction: 'FLUTTER_NOTIFICATION_CLICK'
            }
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                contentAvailable: true
              }
            }
          }
        };
        
        const result = await admin.messaging().send(message);
        
        logger.info(`Push notification sent to ${recipient.deviceToken}`, {
          notificationId: notification.id,
          messageId: result,
          recipientId: recipient.id,
          templateId: notification.template,
        });
        
        return {
          success: true,
          messageId: result
        };
      } 
      // Simuler l'envoi de notification
      else {
        logger.info(`[SIMULATION] Push notification sent to ${recipient.deviceToken}`, {
          notificationId: notification.id,
          title: pushContent.title,
          body: pushContent.body,
          data: pushContent.data
        });
        
        // Afficher le contenu de la notification dans la console pour le débogage
        console.log('\n========== SIMULATED PUSH NOTIFICATION ==========');
        console.log(`To: ${recipient.deviceToken}`);
        console.log(`Title: ${pushContent.title}`);
        console.log(`Body: ${pushContent.body}`);
        console.log(`Data: ${JSON.stringify(pushContent.data)}`);
        console.log('================================================\n');
        
        const messageId = `simulated-push-${Date.now()}`;
        
        return {
          success: true,
          messageId: messageId,
        };
      }
    } catch (error) {
      logger.error('Failed to send push notification', {
        notificationId: notification.id,
        recipientId: notification.recipient.id,
        error: error instanceof Error ? error.message : String(error),
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private preparePushContent(template: NotificationTemplate, data: Record<string, any>): { title: string; body: string; data: Record<string, string> } {
    switch (template) {
      case NotificationTemplate.ACCOUNT_VERIFICATION:
        return {
          title: 'Vérification de compte',
          body: 'Votre compte a été créé avec succès. Veuillez vérifier votre email pour confirmer votre inscription.',
          data: {
            action: 'ACCOUNT_VERIFICATION',
            ...this.sanitizeDataForPush(data),
          },
        };
        
      case NotificationTemplate.PASSWORD_RESET:
        return {
          title: 'Réinitialisation de mot de passe',
          body: 'Votre demande de réinitialisation de mot de passe a été reçue. Consultez votre email ou vos SMS pour le code de vérification.',
          data: {
            action: 'PASSWORD_RESET',
            ...this.sanitizeDataForPush(data),
          },
        };
        
      default:
        return {
          title: data.title || 'Notification',
          body: data.body || data.message || '',
          data: this.sanitizeDataForPush(data),
        };
    }
  }

  // Transformer les données en format compatible avec les notifications push (string uniquement)
  private sanitizeDataForPush(data: Record<string, any>): Record<string, string> {
    const result: Record<string, string> = {};
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        result[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
      }
    });
    
    return result;
  }

  // Méthode pour envoyer une notification à plusieurs appareils
  async sendBatchPushNotifications(
    tokens: string[], 
    title: string, 
    body: string, 
    data: Record<string, any>
  ): Promise<{ successCount: number; failureCount: number; responses: any }> {
    try {
      if (!tokens.length) {
        throw new Error('No device tokens provided');
      }
      
      // Envoyer de vraies notifications en production
      if (this.initialized && admin && process.env.NODE_ENV === 'production') {
        const sanitizedData = this.sanitizeDataForPush(data);
        
        const messages = tokens.map(token => ({
          token,
          notification: {
            title,
            body
          },
          data: sanitizedData,
          android: {
            priority: 'high',
            notification: {
              clickAction: 'FLUTTER_NOTIFICATION_CLICK'
            }
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                contentAvailable: true
              }
            }
          }
        }));
        
        const batchResponse = await admin.messaging().sendAll(messages);
        
        logger.info(`Batch push notification sent to ${tokens.length} devices`, {
          successCount: batchResponse.successCount,
          failureCount: batchResponse.failureCount
        });
        
        return {
          successCount: batchResponse.successCount,
          failureCount: batchResponse.failureCount,
          responses: batchResponse.responses
        };
      } 
      // Simuler l'envoi en masse
      else {
        logger.info(`[SIMULATION] Batch push notification sent to ${tokens.length} devices`, {
          title,
          body,
          dataKeys: Object.keys(data)
        });
        
        // Simuler un succès pour tous les tokens
        return {
          successCount: tokens.length,
          failureCount: 0,
          responses: tokens.map(token => ({ 
            success: true, 
            messageId: `simulated-batch-${Date.now()}-${token.substr(-4)}`
          }))
        };
      }
    } catch (error) {
      logger.error('Failed to send batch push notifications', {
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  }
}

export default new PushService();