// src/services/notification.service.ts
import { v4 as uuidv4 } from 'uuid';
import { 
  Notification, 
  NotificationType,
  NotificationPayload,
} from '../models/notification.model';
import emailService from './email.service';
import smsService from './sms.service';
import pushService from './push.service';
import logger from '../utils/logger';
import { DeliveryStatus, NotificationStatus } from '../models/delivery-status.model';
import notificationRepository from '../repository/notification.repository';

// Stockage en mémoire pour le mode développement
class InMemoryStorage {
  private notifications: Map<string, Notification> = new Map();
  private deliveryStatuses: Map<string, DeliveryStatus> = new Map();

  async saveNotification(notification: Notification): Promise<Notification> {
    this.notifications.set(notification.id, notification);
    return notification;
  }

  async saveDeliveryStatus(status: DeliveryStatus): Promise<DeliveryStatus> {
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
}

export class NotificationService {
  private storage: any;

  constructor() {
    // Utiliser le stockage en mémoire en développement
    this.storage = process.env.NODE_ENV === 'production' 
      ? notificationRepository 
      : new InMemoryStorage();
  }

  // Point d'entrée principal pour envoyer une notification
  async sendNotification(payload: NotificationPayload): Promise<{ success: boolean; notificationId: string; error?: string }> {
    try {
      // Déterminer le type de notification en fonction des données fournies
      const types: NotificationType[] = [];
      
      if (payload.recipientEmail) {
        types.push(NotificationType.EMAIL);
      }
      
      if (payload.recipientPhone) {
        types.push(NotificationType.SMS);
      }
      
      if (payload.recipientDeviceToken) {
        types.push(NotificationType.PUSH);
      }
      
      if (types.length === 0) {
        throw new Error('Un destinataire valide (email, téléphone ou token d\'appareil) doit être fourni');
      }
      
      // Créer une notification pour chaque type
      const results = await Promise.all(
        types.map(type => this.createAndSendNotification(type, payload))
      );
      
      // Vérifier si au moins une notification a réussi
      const anySuccess = results.some(r => r.success);
      
      // Pour simplifier, retourner l'ID de la première notification
      return {
        success: anySuccess,
        notificationId: results[0].notificationId,
        error: anySuccess ? undefined : results.map(r => r.error).filter(Boolean).join('; '),
      };
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

  // Créer et envoyer un type spécifique de notification
  private async createAndSendNotification(
    type: NotificationType, 
    payload: NotificationPayload
  ): Promise<{ success: boolean; notificationId: string; error?: string }> {
    try {
      // Créer l'objet notification
      const notification: Notification = {
        id: uuidv4(),
        type,
        template: payload.template,
        recipient: {
          id: payload.recipientId,
          email: type === NotificationType.EMAIL ? payload.recipientEmail : undefined,
          phone: type === NotificationType.SMS ? payload.recipientPhone : undefined,
          deviceToken: type === NotificationType.PUSH ? payload.recipientDeviceToken : undefined,
        },
        content: {
          subject: payload.data.subject,
          body: payload.data.body || payload.data.message || 'No content provided',
          data: payload.data,
        },
        status: NotificationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: payload.metadata,
      };
      
      // Sauvegarder la notification en base de données ou en mémoire
      await this.storage.saveNotification(notification);
      
      // Envoyer la notification en fonction de son type
      let result: { success: boolean; messageId?: string; error?: string };
      
      switch (type) {
        case NotificationType.EMAIL:
          result = await emailService.sendEmail(notification);
          break;
        case NotificationType.SMS:
          result = await smsService.sendSms(notification);
          break;
        case NotificationType.PUSH:
          result = await pushService.sendPushNotification(notification);
          break;
        default:
          throw new Error(`Type de notification non supporté: ${type}`);
      }
      
      // Créer et sauvegarder le statut d'envoi
      const deliveryStatus: DeliveryStatus = {
        id: uuidv4(),
        notificationId: notification.id,
        status: result.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
        timestamp: new Date(),
        provider: this.getProviderName(type),
        providerMessageId: result.messageId,
        errorMessage: result.error,
        attempts: 1,
        metadata: {
          initialAttempt: true,
        },
      };
      
      await this.storage.saveDeliveryStatus(deliveryStatus);
      
      // Mettre à jour le statut de la notification
      await this.storage.updateNotificationStatus(
        notification.id,
        deliveryStatus.status,
        {
          sentAt: result.success ? new Date() : undefined,
        }
      );
      
      return {
        success: result.success,
        notificationId: notification.id,
        error: result.error,
      };
    } catch (error) {
      logger.error('Failed to create and send notification', {
        type,
        recipientId: payload.recipientId,
        error: error instanceof Error ? error.message : String(error),
      });
      
      return {
        success: false,
        notificationId: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Obtenir le nom du fournisseur en fonction du type de notification
  private getProviderName(type: NotificationType): string {
    switch (type) {
      case NotificationType.EMAIL:
        return 'nodemailer';
      case NotificationType.SMS:
        return 'twilio';
      case NotificationType.PUSH:
        return 'firebase';
      default:
        return 'unknown';
    }
  }

  // Méthode pour mettre à jour le statut d'une notification
  async updateNotificationStatus(
    notificationId: string, 
    status: NotificationStatus,
    providerMessageId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Créer un nouveau statut d'envoi
      const deliveryStatus: DeliveryStatus = {
        id: uuidv4(),
        notificationId,
        status,
        timestamp: new Date(),
        provider: metadata?.provider || 'manual-update',
        providerMessageId,
        attempts: metadata?.attempts || 1,
        metadata,
      };
      
      await this.storage.saveDeliveryStatus(deliveryStatus);
      
      // Mettre à jour le statut de la notification
      const updates: Partial<Notification> = {
        deliveredAt: status === NotificationStatus.DELIVERED ? new Date() : undefined,
      };
      
      await this.storage.updateNotificationStatus(notificationId, status, updates);
      
      logger.info(`Notification status updated: ${notificationId} -> ${status}`, {
        notificationId,
        status,
        providerMessageId,
      });
    } catch (error) {
      logger.error('Failed to update notification status', {
        notificationId,
        status,
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  }
}

// Exporter une instance par défaut du service
const notificationService = new NotificationService();
export default notificationService;