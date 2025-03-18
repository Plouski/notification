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

// Importation conditionnelle de Twilio pour permettre l'exécution en mode simulation
let twilio: any = null;
try {
  twilio = require('twilio');
} catch (error) {
  logger.warn('Twilio SDK not available, will use simulation mode only');
}

export class SmsService {
  private client: any = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (twilio && process.env.NODE_ENV === 'production') {
      try {
        this.client = twilio(smsConfig.accountSid, smsConfig.authToken);
        logger.info('Twilio client initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize Twilio client', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      logger.info('Twilio client will use simulation mode for development');
    }
  }

  async sendSms(notification: Notification): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { recipient, content } = notification;

      if (!recipient.phone) {
        throw new Error('Recipient phone number is required');
      }

      // Préparer le contenu du SMS en fonction du template
      const messageContent = this.loadTemplate(notification.template, content.data || {});

      // Envoyer un vrai SMS en production
      if (this.client && process.env.NODE_ENV === 'production') {
        const messageOptions: any = {
          body: messageContent,
          from: smsConfig.fromNumber,
          to: recipient.phone,
        };

        // Ajouter le callback seulement en production avec une URL publique
        if (process.env.NODE_ENV === 'production' && smsConfig.statusCallbackUrl.startsWith('https://')) {
          messageOptions.statusCallback = `${smsConfig.statusCallbackUrl}?notification_id=${notification.id}`;
        }

        // Ajouter un callback URL pour les mises à jour de statut si configuré
        if (smsConfig.statusCallbackUrl) {
          messageOptions.statusCallback = `${smsConfig.statusCallbackUrl}?notification_id=${notification.id}`;
        }

        const message = await this.client.messages.create(messageOptions);

        logger.info(`SMS sent to ${recipient.phone}`, {
          notificationId: notification.id,
          messageId: message.sid,
          recipientId: recipient.id,
          templateId: notification.template,
          status: message.status,
        });

        return {
          success: true,
          messageId: message.sid,
        };
      }
      // Simuler l'envoi de SMS
      else {
        logger.info(`[SIMULATION] SMS sent to ${recipient.phone}: ${messageContent}`, {
          notificationId: notification.id,
          recipientId: recipient.id,
          templateId: notification.template,
        });

        // Afficher le contenu du SMS dans la console pour le débogage
        console.log('\n========== SIMULATED SMS ==========');
        console.log(`To: ${recipient.phone}`);
        console.log(`From: ${smsConfig.fromNumber}`);
        console.log(`Content: ${messageContent}`);
        console.log('================================\n');

        const messageId = `simulated-sms-${Date.now()}`;

        return {
          success: true,
          messageId: messageId,
        };
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

  private loadTemplate(template: NotificationTemplate, data: Record<string, any>): string {
    try {
      // Essayer de charger le template depuis les fichiers
      const templateDir = path.resolve('src/templates/sms');
      const templateFileName = this.getTemplateFileName(template);
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

      // Fallback vers les templates intégrés
      return this.getDefaultTemplate(template, data);
    }
  }

  private getTemplateFileName(template: NotificationTemplate): string {
    switch (template) {
      case NotificationTemplate.ACCOUNT_VERIFICATION:
        return 'verification-code.template.js';
      case NotificationTemplate.PASSWORD_RESET:
        return 'password-reset.template.js';
      default:
        return `${template}.template.js`;
    }
  }

  private getDefaultTemplate(template: NotificationTemplate, data: Record<string, any>): string {
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
      // Vérifier le statut réel via Twilio en production
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
      // Simuler la vérification de statut
      else {
        logger.info(`[SIMULATION] Checking SMS status for ${messageId}`);

        // En simulation, supposer que le message a été livré
        return {
          status: NotificationStatus.DELIVERED,
          providerStatus: 'delivered',
        };
      }
    } catch (error) {
      logger.error(`Failed to check SMS status for messageId: ${messageId}`, {
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }
}

export default new SmsService();