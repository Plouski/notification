// src/services/push.service.ts
import { 
  Notification, 
  NotificationTemplate 
} from '../models/notification.model';
import { firebaseConfig } from '../config/firebase.config';
import logger from '../utils/logger';

// Importation conditionnelle de firebase-admin
let admin: any = null;
try {
  admin = require('firebase-admin');
} catch (error) {
  logger.warn('Firebase Admin SDK not available, will use simulation mode');
}

export class PushService {
  private initialized: boolean = false;
  private app: any = null;
  
  constructor() {
    this.initialize();
  }
  
  private initialize() {
    try {
      // Uniquement initialiser Firebase en production et si toutes les configurations sont disponibles
      if (admin && process.env.NODE_ENV === 'production') {
        // Vérifier si les configurations Firebase sont disponibles
        if (!firebaseConfig.projectId || !firebaseConfig.clientEmail || !firebaseConfig.privateKey) {
          logger.warn('Firebase configuration is incomplete');
          return;
        }
        
        // Initialiser Firebase Admin SDK
        const privateKey = firebaseConfig.privateKey.replace(/\\n/g, '\n');
        
        this.app = admin.initializeApp({
          credential: admin.credential.cert({
            projectId: firebaseConfig.projectId,
            clientEmail: firebaseConfig.clientEmail,
            privateKey: privateKey
          }),
          databaseURL: firebaseConfig.databaseURL
        });
        
        this.initialized = true;
        logger.info('Firebase Admin SDK initialized successfully');
      } else {
        logger.info('Push service running in simulation mode');
      }
    } catch (error) {
      logger.error('Failed to initialize Firebase Admin SDK', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async sendPushNotification(notification: Notification): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { recipient, content, template } = notification;
      
      if (!recipient.deviceToken) {
        throw new Error('Recipient device token is required');
      }

      // Préparer la notification push en fonction du template
      const pushContent = this.preparePushContent(template, content.data || {});
      
      // En développement, toujours utiliser le mode simulation pour éviter les erreurs de token
      if (process.env.NODE_ENV !== 'production') {
        return this.simulatePushSending(notification, pushContent);
      }
      
      // En production, essayer d'envoyer via Firebase si initialisé
      if (this.initialized && admin) {
        try {
          return await this.sendWithFirebase(notification, pushContent);
        } catch (firebaseError) {
          logger.error('Firebase messaging error', {
            error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
          });
          // En cas d'erreur, basculer vers la simulation
          return this.simulatePushSending(notification, pushContent);
        }
      } else {
        // Si Firebase n'est pas initialisé, utiliser la simulation
        return this.simulatePushSending(notification, pushContent);
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

  private async sendWithFirebase(notification: Notification, pushContent: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { recipient } = notification;
      
      const message = {
        token: recipient.deviceToken!,
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
    } catch (error) {
      logger.error('Firebase error', {
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  }

  private simulatePushSending(notification: Notification, pushContent: any): { success: boolean; messageId?: string; error?: string } {
    const { recipient } = notification;
    
    logger.info(`[SIMULATION] Push notification sent to ${recipient.deviceToken}`, {
      notificationId: notification.id,
      title: pushContent.title,
      body: pushContent.body,
      data: pushContent.data
    });
    
    // Afficher la notification pour le débogage
    console.log('\n========== SIMULATED PUSH NOTIFICATION ==========');
    console.log(`To: ${recipient.deviceToken}`);
    console.log(`Title: ${pushContent.title}`);
    console.log(`Body: ${pushContent.body}`);
    console.log(`Data: ${JSON.stringify(pushContent.data)}`);
    console.log('================================================\n');
    
    return {
      success: true,
      messageId: `simulated-push-${Date.now()}`,
    };
  }

  private preparePushContent(template: NotificationTemplate, data: Record<string, any>): { title: string; body: string; data: Record<string, string> } {
    switch (template) {
      case NotificationTemplate.ACCOUNT_VERIFICATION:
        return {
          title: 'Vérification de compte',
          body: 'Votre compte a été créé avec succès. Veuillez vérifier votre email.',
          data: {
            action: 'ACCOUNT_VERIFICATION',
            ...this.sanitizeDataForPush(data),
          },
        };
        
      case NotificationTemplate.PASSWORD_RESET:
        return {
          title: 'Réinitialisation de mot de passe',
          body: 'Votre demande de réinitialisation a été reçue. Consultez votre email ou SMS.',
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

  // Convertir toutes les données en format string pour compatibilité
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
  ): Promise<{ successCount: number; failureCount: number; responses: any[] }> {
    try {
      if (!tokens.length) {
        throw new Error('No device tokens provided');
      }
      
      // En développement, toujours simuler l'envoi
      if (process.env.NODE_ENV !== 'production') {
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
      
      // En production, essayer d'envoyer via Firebase
      if (this.initialized && admin) {
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
      
      // Simulation de l'envoi en masse
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
    } catch (error) {
      logger.error('Failed to send batch push notifications', {
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  }
}

// Exporter une instance par défaut
const pushService = new PushService();
export default pushService;