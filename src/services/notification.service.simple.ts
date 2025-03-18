// src/services/notification.service.simple.ts
import { v4 as uuidv4 } from 'uuid';
import { 
  NotificationPayload, 
  NotificationType,
} from '../models/notification.model';
import { NotificationStatus } from '../models/delivery-status.model';
import emailService from './email.service';
import smsService from './sms.service';
import pushService from './push.service';
import logger from '../utils/logger';

export class NotificationService {
  async sendNotification(payload: NotificationPayload): Promise<{ success: boolean; notificationId: string; error?: string }> {
    try {
      const notificationId = uuidv4();
      
      // Déterminer le type de notification
      if (payload.recipientEmail) {
        // Envoi d'email
        const result = await emailService.sendEmail({
          id: notificationId,
          type: NotificationType.EMAIL,
          template: payload.template,
          recipient: {
            id: payload.recipientId,
            email: payload.recipientEmail
          },
          content: {
            subject: payload.data.subject,
            body: payload.data.body || payload.data.message || 'No content provided',
            data: payload.data
          },
          status: NotificationStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        return {
          success: result.success,
          notificationId: notificationId,
          error: result.error
        };
      }
      
      if (payload.recipientPhone) {
        // Envoi de SMS
        const result = await smsService.sendSms({
          id: notificationId,
          type: NotificationType.SMS,
          template: payload.template,
          recipient: {
            id: payload.recipientId,
            phone: payload.recipientPhone
          },
          content: {
            body: payload.data.message || payload.data.body || `Code: ${payload.data.code || ''}`,
            data: payload.data
          },
          status: NotificationStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        return {
          success: result.success,
          notificationId: notificationId,
          error: result.error
        };
      }
      
      if (payload.recipientDeviceToken) {
        // Envoi de notification push
        const result = await pushService.sendPushNotification({
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
          updatedAt: new Date()
        });
        
        return {
          success: result.success,
          notificationId: notificationId,
          error: result.error
        };
      }
      
      throw new Error('Un destinataire valide (email, téléphone ou token d\'appareil) doit être fourni');
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
  
  async updateNotificationStatus(
    notificationId: string, 
    status: NotificationStatus,
    providerMessageId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    // Version simplifiée qui ne fait rien mais log l'action
    logger.info(`[SIMULATION] Notification status updated: ${notificationId} -> ${status}`, {
      notificationId,
      status,
      providerMessageId,
      metadata
    });
    return Promise.resolve();
  }
}

const notificationService = new NotificationService();
export default notificationService;