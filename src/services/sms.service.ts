// src/services/sms.service.ts
import { 
  Notification, 
  NotificationTemplate 
} from '../models/notification.model';
import { smsConfig } from '../config/sms.config';
import logger from '../utils/logger';
import { NotificationStatus } from '../models/delivery-status.model';

export class SmsService {
  
  async sendSms(notification: Notification): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { recipient, content } = notification;
      
      if (!recipient.phone) {
        throw new Error('Recipient phone number is required');
      }

      // Préparer le contenu du SMS en fonction du template
      const messageContent = this.prepareSmsContent(notification.template, content.data || {});
      
      // Simuler l'envoi de SMS
      logger.info(`[SIMULATION] SMS sent to ${recipient.phone}: ${messageContent}`, {
        notificationId: notification.id,
        recipientId: recipient.id,
        templateId: notification.template,
      });
      
      const messageId = `simulated-sms-${Date.now()}`;
      
      return {
        success: true,
        messageId: messageId,
      };
    } catch (error) {
      logger.error('Failed to send SMS simulation', {
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

  private prepareSmsContent(template: NotificationTemplate, data: Record<string, any>): string {
    switch (template) {
      case NotificationTemplate.ACCOUNT_VERIFICATION:
        return `Votre code de vérification est: ${data.code}. Il expire dans 10 minutes.`;
        
      case NotificationTemplate.PASSWORD_RESET:
        return `Votre code de réinitialisation de mot de passe est: ${data.code}. Il expire dans 15 minutes.`;
        
      default:
        return data.message || '';
    }
  }

  // Méthode pour vérifier le statut d'un message SMS
  async checkSmsStatus(messageId: string): Promise<{ status: NotificationStatus; providerStatus: string }> {
    try {
      // Simuler la vérification de statut
      logger.info(`[SIMULATION] Checking SMS status for ${messageId}`);
      
      // Simuler un statut livré
      return {
        status: NotificationStatus.DELIVERED,
        providerStatus: 'delivered',
      };
    } catch (error) {
      logger.error(`Failed to check SMS status simulation for messageId: ${messageId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  }
}

export default new SmsService();