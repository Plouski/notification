// src/services/email.service.ts
import {
  Notification,
  NotificationTemplate
} from '../models/notification.model';
import { emailConfig } from '../config/email.config';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs';

import dotenv from 'dotenv';
dotenv.config();

// Import conditionnel pour éviter l'erreur si le module n'est pas installé
let sgMail: any = null;
try {
  sgMail = require('@sendgrid/mail');
} catch (error) {
  logger.warn('SendGrid module not available, will use simulation mode only');
}

export class EmailService {
  constructor() {
    // Initialiser le SDK SendGrid
    this.initializeSendGrid();
  }

  private initializeSendGrid() {
    try {
      console.log("Initializing SendGrid...");

      // Force l'initialisation indépendamment de NODE_ENV
      if (sgMail) {
        const apiKey = process.env.SENDGRID_API_KEY || '';

        if (!apiKey) {
          console.log("ATTENTION: La clé API SendGrid n'est pas définie.");
          logger.warn('SENDGRID_API_KEY is not defined');
          logger.info('Email service will use simulation mode - No API key');
          return;
        }

        // Afficher les premiers caractères de la clé pour vérifier son format
        logger.info(`Initializing SendGrid with API key: ${apiKey.substring(0, 5)}...`);

        sgMail.setApiKey(apiKey);
        logger.info('SendGrid API initialized successfully');
        return;
      }

      // Si SendGrid n'est pas disponible
      logger.info('Email service will use simulation mode - SendGrid module not available');
    } catch (error) {
      logger.error('Failed to initialize SendGrid', {
        error: error instanceof Error ? error.message : String(error),
      });
      logger.info('Email service will use simulation mode due to initialization error');
    }
  }

  async sendEmail(notification: Notification): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { recipient, content, template } = notification;

      if (!recipient.email) {
        throw new Error('Recipient email is required');
      }

      // Charger le template approprié en fonction du type de notification
      const emailContent = this.loadTemplate(notification.template, content.data || {});

      // Envoyer un vrai email via SendGrid si initialisé
      if (sgMail && sgMail.send) {
        const msg = {
          to: recipient.email,
          from: process.env.EMAIL_FROM || "gervaisines@icloud.com",
          subject: emailContent.subject,
          text: emailContent.text,
          html: emailContent.html,
          // Vous pouvez ajouter des catégories pour le suivi dans SendGrid
          categories: [template, 'notification-service'],
          customArgs: {
            notification_id: notification.id
          }
        };

        const response = await sgMail.send(msg);

        logger.info(`Email sent to ${recipient.email} via SendGrid API`, {
          notificationId: notification.id,
          messageId: response[0]?.headers['x-message-id'],
          recipientId: recipient.id,
          templateId: notification.template,
          statusCode: response[0]?.statusCode,
        });

        return {
          success: true,
          messageId: response[0]?.headers['x-message-id'],
        };
      }
      // Simuler l'envoi d'email
      else {
        logger.info(`[SIMULATION] Email sent to ${recipient.email}`, {
          notificationId: notification.id,
          subject: emailContent.subject,
          recipientId: recipient.id,
          templateId: notification.template,
        });

        // Afficher le contenu de l'email dans la console pour le débogage
        console.log('\n========== SIMULATED EMAIL ==========');
        console.log(`To: ${recipient.email}`);
        console.log(`Subject: ${emailContent.subject}`);
        console.log(`\nHTML Content:\n${emailContent.html.substring(0, 200)}...`);
        console.log('====================================\n');

        return {
          success: true,
          messageId: `simulated-email-${Date.now()}`,
        };
      }
    } catch (error) {
      logger.error('Failed to send email', {
        notificationId: notification.id,
        recipientId: notification.recipient.id,
        error: error instanceof Error ? error.message : String(error),
        // Pour SendGrid, on peut obtenir plus de détails sur l'erreur
        response: error && typeof error === 'object' && 'response' in error
          ? (error as any).response?.body
          : undefined,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private loadTemplate(template: NotificationTemplate, data: Record<string, any>): { subject: string; html: string; text: string } {
    try {
      // Essayer de charger le template depuis les fichiers
      const templatePath = path.resolve(emailConfig.templateDir, `${template}.template.js`);

      if (fs.existsSync(templatePath)) {
        // Utiliser le template
        const templateFunction = require(templatePath);
        return templateFunction(data);
      }

      // Fallback vers les templates intégrés
      return this.getDefaultTemplate(template, data);
    } catch (error) {
      logger.warn(`Failed to load email template: ${template}`, {
        error: error instanceof Error ? error.message : String(error),
      });

      // Fallback vers les templates intégrés
      return this.getDefaultTemplate(template, data);
    }
  }

  private getDefaultTemplate(template: NotificationTemplate, data: Record<string, any>): { subject: string; html: string; text: string } {
    switch (template) {
      case NotificationTemplate.ACCOUNT_VERIFICATION:
        return {
          subject: 'Vérification de votre compte',
          html: `
            <h1>Bienvenue sur notre plateforme</h1>
            <p>Bonjour ${data.name || 'utilisateur'},</p>
            <p>Merci de vous être inscrit. Pour vérifier votre compte, veuillez cliquer sur le lien ci-dessous :</p>
            <p><a href="${data.verificationUrl}">Vérifier mon compte</a></p>
            <p>Ce lien expire dans 24 heures.</p>
            <p>Si vous n'avez pas créé de compte, veuillez ignorer cet email.</p>
          `,
          text: `Bienvenue sur notre plateforme\n\nBonjour ${data.name || 'utilisateur'},\n\nMerci de vous être inscrit. Pour vérifier votre compte, veuillez visiter ce lien : ${data.verificationUrl}\n\nCe lien expire dans 24 heures.\n\nSi vous n'avez pas créé de compte, veuillez ignorer cet email.`,
        };

      case NotificationTemplate.PASSWORD_RESET:
        return {
          subject: 'Réinitialisation de votre mot de passe',
          html: `
            <h1>Réinitialisation de mot de passe</h1>
            <p>Bonjour ${data.name || 'utilisateur'},</p>
            <p>Vous avez demandé une réinitialisation de votre mot de passe. Voici votre code de vérification :</p>
            <h2 style="background-color: #f0f0f0; padding: 10px; text-align: center; font-size: 24px;">${data.code}</h2>
            <p>Ce code expire dans 15 minutes.</p>
            <p>Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email et sécuriser votre compte.</p>
          `,
          text: `Réinitialisation de mot de passe\n\nBonjour ${data.name || 'utilisateur'},\n\nVous avez demandé une réinitialisation de votre mot de passe. Voici votre code de vérification : ${data.code}\n\nCe code expire dans 15 minutes.\n\nSi vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email et sécuriser votre compte.`,
        };

      default:
        return {
          subject: data.subject || 'Notification',
          html: data.html || `<p>${data.message || ''}</p>`,
          text: data.text || data.message || '',
        };
    }
  }
}

// Exporter une instance par défaut du service
const emailService = new EmailService();
export default emailService;