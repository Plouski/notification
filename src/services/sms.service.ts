// src/services/sms.service.ts
import {
  Notification,
  NotificationTemplate
} from '../models/notification.model';
import { smsConfig } from '../config/sms.config';
import logger from '../utils/logger';
import { NotificationStatus } from '../models/delivery-status.model';
import path from 'path';
import fs from 'fs';

// Importation conditionnelle de Twilio
let twilio: any = null;
try {
  twilio = require('twilio');
} catch (error) {
  logger.warn('Twilio SDK not available, will use simulation mode');
}

export class SmsService {
  private client: any = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      if (twilio && process.env.NODE_ENV === 'production') {
        const accountSid = smsConfig.accountSid;
        const authToken = smsConfig.authToken;

        if (!accountSid || !authToken) {
          logger.warn('Twilio credentials are not properly configured');
          return;
        }

        this.client = twilio(accountSid, authToken);
        logger.info('Twilio client initialized successfully');
      } else {
        logger.info('SMS service running in simulation mode');
      }
    } catch (error) {
      logger.error('Failed to initialize Twilio client', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async sendSms(notification: Notification): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { recipient, content, template } = notification;

      if (!recipient.phone) {
        throw new Error('Recipient phone number is required');
      }

      // Préparer le contenu du SMS
      const messageContent = this.loadTemplate(template, content.data || {});

      // Envoyer un vrai SMS si Twilio est configuré
      if (this.client && process.env.NODE_ENV === 'production') {
        return this.sendWithTwilio(notification, messageContent);
      } else {
        return this.simulateSmsSending(notification, messageContent);
      }
    } catch (error) {
      logger.error('Failed to send SMS', {
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

  private async sendWithTwilio(notification: Notification, messageContent: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {

      const { recipient } = notification;

      const messageOptions: any = {
        body: messageContent,
        from: smsConfig.fromNumber,
        to: recipient.phone,
      };

      // Ajouter le callback statusCallback uniquement en production
      // et si une URL publique valide est configurée
      if (process.env.NODE_ENV === 'production' &&
        smsConfig.statusCallbackUrl &&
        smsConfig.statusCallbackUrl.startsWith('https://')) {
        messageOptions.statusCallback = `${smsConfig.statusCallbackUrl}?notification_id=${notification.id}`;
      }

      const message = await this.client.messages.create(messageOptions);

      logger.info(`SMS sent to ${recipient.phone} via Twilio`, {
        notificationId: notification.id,
        messageId: message.sid,
        recipientId: recipient.id,
        status: message.status,
      });

      return {
        success: true,
        messageId: message.sid,
      };
      
    } catch (error) {
      logger.error('Twilio error', {
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  private simulateSmsSending(notification: Notification, messageContent: string): { success: boolean; messageId?: string; error?: string } {
    const { recipient } = notification;

    logger.info(`[SIMULATION] SMS sent to ${recipient.phone}`, {
      notificationId: notification.id,
      recipientId: recipient.id,
      template: notification.template,
      content: messageContent,
    });

    // Afficher le contenu du SMS pour le débogage
    console.log('\n========== SIMULATED SMS ==========');
    console.log(`To: ${recipient.phone}`);
    console.log(`From: ${smsConfig.fromNumber}`);
    console.log(`Content: ${messageContent}`);
    console.log('====================================\n');

    return {
      success: true,
      messageId: `simulated-sms-${Date.now()}`,
    };
  }

  private loadTemplate(template: NotificationTemplate, data: Record<string, any>): string {
    try {
      // Essayer de charger le template depuis les fichiers
      const templateDir = path.resolve('src/templates/sms');
      const templateFileName = `${template}.template.js`;
      const templatePath = path.join(templateDir, templateFileName);

      if (fs.existsSync(templatePath)) {
        const templateFunction = require(templatePath);
        return templateFunction(data);
      }

      // Fallback vers les templates intégrés
      return this.getDefaultTemplate(template, data);
    } catch (error) {
      logger.warn(`Failed to load SMS template: ${template}`, {
        error: error instanceof Error ? error.message : String(error),
      });

      // Fallback vers les templates par défaut
      return this.getDefaultTemplate(template, data);
    }
  }

  private getDefaultTemplate(template: NotificationTemplate, data: Record<string, any>): string {
    switch (template) {
      case NotificationTemplate.ACCOUNT_VERIFICATION:
        return `Votre code de vérification est: ${data.code}. Il expire dans 10 minutes.`;

      case NotificationTemplate.PASSWORD_RESET:
        return `Votre code de réinitialisation de mot de passe est: ${data.code}. Il expire dans 15 minutes.`;

      default:
        return data.message || data.body || '';
    }
  }

  // Méthode pour vérifier le statut d'un SMS
  async checkSmsStatus(messageId: string): Promise<{ status: NotificationStatus; providerStatus: string }> {
    try {
      // Vérifier le statut via Twilio
      if (this.client && process.env.NODE_ENV === 'production') {
        const message = await this.client.messages(messageId).fetch();

        // Convertir le statut Twilio en NotificationStatus
        let status: NotificationStatus;
        switch (message.status) {
          case 'delivered':
            status = NotificationStatus.DELIVERED;
            break;
          case 'sent':
            status = NotificationStatus.SENT;
            break;
          case 'failed':
          case 'undelivered':
            status = NotificationStatus.FAILED;
            break;
          default:
            status = NotificationStatus.PENDING;
        }

        return {
          status,
          providerStatus: message.status,
        };
      }

      // Simulation
      return {
        status: NotificationStatus.DELIVERED,
        providerStatus: 'delivered',
      };
    } catch (error) {
      logger.error(`Failed to check SMS status for messageId: ${messageId}`, {
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }
}

// Exporter une instance par défaut
const smsService = new SmsService();
export default smsService;