// src/services/notification.service.ts
import { v4 as uuidv4 } from 'uuid';
import { 
  Notification, 
  NotificationType,
  NotificationPayload,
  NotificationTemplate
} from '../models/notification.model';
import { NotificationStatus } from '../models/delivery-status.model';
import logger from '../utils/logger';
import emailService from './email.service';
import smsService from './sms.service';
import pushService from './push.service';
import notificationRepository from '../repository/notification.repository';

/**
 * Storage abstraction pour permettre le développement sans base de données
 */
class InMemoryStorage {
  private notifications: Map<string, Notification> = new Map();
  private deliveryStatuses: Map<string, any> = new Map();

  async saveNotification(notification: Notification): Promise<Notification> {
    this.notifications.set(notification.id, notification);
    return notification;
  }

  async saveDeliveryStatus(status: any): Promise<any> {
    this.deliveryStatuses.set(status.id, status);
    return status;
  }

  async updateNotificationStatus(id: string, status: NotificationStatus, updates?: Partial<Notification>): Promise<void> {
    const notification = this.notifications.get(id);
    if (notification) {
      this.notifications.set(id, {
        ...notification,
        status,
        ...(updates || {}),
        updatedAt: new Date(),
      });
    }
  }

  async getNotificationById(id: string): Promise<Notification | null> {
    return this.notifications.get(id) || null;
  }

  async getNotifications(limit = 10): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
}

/**
 * Service principal pour l'envoi et la gestion des notifications
 */
export class NotificationService {
  private storage: any;

  constructor() {
    // Utiliser directement le repository
    this.storage = notificationRepository;
    logger.info('Notification service initialized with in-memory storage');
  }

  /**
   * Envoie une notification en fonction des informations fournies
   */
  async sendNotification(payload: NotificationPayload): Promise<{ 
    success: boolean; 
    notificationId: string; 
    error?: string 
  }> {
    try {
      // Validation des données de base
      if (!payload.recipientId) {
        throw new Error('L\'ID du destinataire est obligatoire');
      }

      // Déterminer le type de notification en fonction des données fournies
      if (payload.recipientEmail) {
        return this.sendEmailNotification(payload);
      } else if (payload.recipientPhone) {
        return this.sendSmsNotification(payload);
      } else if (payload.recipientDeviceToken) {
        return this.sendPushNotification(payload);
      } else {
        throw new Error('Un destinataire valide (email, téléphone ou token d\'appareil) doit être fourni');
      }
    } catch (error) {
      logger.error('Failed to send notification', {
        error: error instanceof Error ? error.message : String(error),
      });
      
      return {
        success: false,
        notificationId: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Envoie une notification par email
   */
  private async sendEmailNotification(payload: NotificationPayload): Promise<{ 
    success: boolean; 
    notificationId: string; 
    error?: string 
  }> {
    const notificationId = uuidv4();
    
    try {
      // Créer l'objet notification
      const notification: Notification = {
        id: notificationId,
        type: NotificationType.EMAIL,
        template: payload.template,
        recipient: {
          id: payload.recipientId,
          email: payload.recipientEmail
        },
        content: {
          subject: payload.data.subject,
          body: payload.data.body || payload.data.message || '',
          data: payload.data
        },
        status: NotificationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: payload.metadata
      };
      
      // Sauvegarder la notification dans MongoDB
      await this.storage.saveNotification(notification);
      
      // Envoyer l'email
      const result = await emailService.sendEmail(notification);
      
      // Mettre à jour le statut
      await this.updateNotificationStatus(
        notificationId,
        result.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
        result.messageId,
        result.error,
        { provider: 'email' }
      );
      
      return {
        success: result.success,
        notificationId,
        error: result.error
      };
    } catch (error) {
      logger.error('Failed to send email notification', {
        error: error instanceof Error ? error.message : String(error),
        payload
      });
      
      return {
        success: false,
        notificationId,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Envoie une notification par SMS
   */
  private async sendSmsNotification(payload: NotificationPayload): Promise<{ 
    success: boolean; 
    notificationId: string; 
    error?: string 
  }> {
    const notificationId = uuidv4();
    
    try {
      // Créer l'objet notification
      const notification: Notification = {
        id: notificationId,
        type: NotificationType.SMS,
        template: payload.template,
        recipient: {
          id: payload.recipientId,
          phone: payload.recipientPhone
        },
        content: {
          body: payload.data.message || payload.data.code ? `Code: ${payload.data.code}` : '',
          data: payload.data
        },
        status: NotificationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: payload.metadata
      };
      
      // Sauvegarder la notification
      await this.storage.saveNotification(notification);
      
      // Envoyer le SMS
      const result = await smsService.sendSms(notification);
      
      // Mettre à jour le statut
      await this.updateNotificationStatus(
        notificationId,
        result.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
        result.messageId,
        result.error,
        { provider: 'sms' }
      );
      
      return {
        success: result.success,
        notificationId,
        error: result.error
      };
    } catch (error) {
      logger.error('Failed to send SMS notification', {
        error: error instanceof Error ? error.message : String(error),
        payload
      });
      
      return {
        success: false,
        notificationId,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Envoie une notification push
   */
  private async sendPushNotification(payload: NotificationPayload): Promise<{ 
    success: boolean; 
    notificationId: string; 
    error?: string 
  }> {
    const notificationId = uuidv4();
    
    try {
      // Créer l'objet notification
      const notification: Notification = {
        id: notificationId,
        type: NotificationType.PUSH,
        template: payload.template,
        recipient: {
          id: payload.recipientId,
          deviceToken: payload.recipientDeviceToken
        },
        content: {
          subject: payload.data.title,
          body: payload.data.body || '',
          data: payload.data
        },
        status: NotificationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: payload.metadata
      };
      
      // Sauvegarder la notification
      await this.storage.saveNotification(notification);
      
      // Envoyer la notification push
      const result = await pushService.sendPushNotification(notification);
      
      // Mettre à jour le statut
      await this.updateNotificationStatus(
        notificationId,
        result.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
        result.messageId,
        result.error,
        { provider: 'push' }
      );
      
      return {
        success: result.success,
        notificationId,
        error: result.error
      };
    } catch (error) {
      logger.error('Failed to send push notification', {
        error: error instanceof Error ? error.message : String(error),
        payload
      });
      
      return {
        success: false,
        notificationId,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Met à jour le statut d'une notification et enregistre l'historique
   */
  async updateNotificationStatus(
    notificationId: string,
    status: NotificationStatus,
    providerMessageId?: string,
    errorMessage?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Créer un statut de livraison
      const deliveryStatus = {
        id: uuidv4(),
        notificationId,
        status,
        timestamp: new Date(),
        provider: metadata?.provider || 'system',
        providerMessageId,
        errorMessage,
        attempts: metadata?.attempts || 1,
        metadata
      };
      
      // Sauvegarder le statut
      await this.storage.saveDeliveryStatus(deliveryStatus);
      
      // Mettre à jour la notification
      const updates: Partial<Notification> = {};
      
      if (status === NotificationStatus.SENT) {
        updates.sentAt = new Date();
      } else if (status === NotificationStatus.DELIVERED) {
        updates.deliveredAt = new Date();
      }
      
      await this.storage.updateNotificationStatus(notificationId, status, updates);
      
      logger.info(`Notification status updated: ${notificationId} -> ${status}`, {
        notificationId, status, providerMessageId
      });
    } catch (error) {
      logger.error('Failed to update notification status', {
        notificationId, status, error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Webhook pour les callbacks de statut
   */
  async processStatusWebhook(
    provider: string,
    providerMessageId: string,
    status: string,
    notificationId?: string,
    metadata?: any
  ): Promise<boolean> {
    try {
      logger.info(`Received status webhook: ${provider} - ${status}`, {
        provider, providerMessageId, status, notificationId
      });
      
      // Si l'ID de notification n'est pas fourni, il faudrait le retrouver
      // via le providerMessageId dans une implémentation complète
      
      if (!notificationId) {
        logger.warn('Notification ID not provided in webhook');
        return false;
      }
      
      // Convertir le statut du fournisseur en notre propre statut
      let notificationStatus: NotificationStatus;
      
      switch (status.toLowerCase()) {
        case 'delivered':
          notificationStatus = NotificationStatus.DELIVERED;
          break;
        case 'sent':
          notificationStatus = NotificationStatus.SENT;
          break;
        case 'opened':
        case 'read':
          notificationStatus = NotificationStatus.OPENED;
          break;
        case 'clicked':
          notificationStatus = NotificationStatus.CLICKED;
          break;
        case 'failed':
        case 'undelivered':
        case 'error':
          notificationStatus = NotificationStatus.FAILED;
          break;
        default:
          notificationStatus = NotificationStatus.PENDING;
      }
      
      // Mettre à jour le statut
      await this.updateNotificationStatus(
        notificationId,
        notificationStatus,
        providerMessageId,
        undefined,
        { provider, rawStatus: status, webhookData: metadata }
      );
      
      return true;
    } catch (error) {
      logger.error('Failed to process status webhook', {
        error: error instanceof Error ? error.message : String(error),
        provider, status, notificationId
      });
      
      return false;
    }
  }

  /**
   * Récupère les notifications les plus récentes (pour test/débogage)
   */
  async getRecentNotifications(limit: number = 10): Promise<Notification[]> {
    try {
      return await this.storage.getNotifications(limit);
    } catch (error) {
      logger.error('Failed to get recent notifications', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }
}

// Exporter une instance par défaut du service
const notificationService = new NotificationService();
export default notificationService;