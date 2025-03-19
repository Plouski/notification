// src/services/email.service.ts
import {
  Notification,
  NotificationTemplate
} from '../models/notification.model';
import { emailConfig } from '../config/email.config';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Import conditionnel pour SendGrid
let sgMail: any = null;
try {
  sgMail = require('@sendgrid/mail');
} catch (error) {
  logger.warn('SendGrid module not available, will use Nodemailer or simulation mode');
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private sendgridInitialized: boolean = false;
  private testAccount: any = null;
  
  constructor() {
    // Initialiser les services d'envoi d'email
    this.initialize();
  }

  private async initialize() {
    // 1. Essayer d'initialiser SendGrid
    this.initializeSendGrid();
    
    // 2. Initialiser Nodemailer avec SMTP standard
    await this.initializeNodemailer();
    
    // 3. Si aucun n'est configuré, créer un compte de test Ethereal pour le développement
    if (!this.sendgridInitialized && !this.transporter && process.env.NODE_ENV !== 'production') {
      await this.initializeEtherealTestAccount();
    }
  }

  private initializeSendGrid() {
    try {
      if (sgMail) {
        const apiKey = process.env.SENDGRID_API_KEY;
        
        if (!apiKey) {
          logger.warn('SENDGRID_API_KEY is not defined');
          return;
        }
        
        sgMail.setApiKey(apiKey);
        this.sendgridInitialized = true;
        logger.info('SendGrid API initialized successfully');
      }
    } catch (error) {
      logger.error('Failed to initialize SendGrid', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async initializeNodemailer() {
    try {
      const host = process.env.EMAIL_HOST;
      const port = parseInt(process.env.EMAIL_PORT || '587', 10);
      const user = process.env.EMAIL_USER;
      const pass = process.env.EMAIL_PASSWORD;
      
      if (!host || !user || !pass) {
        logger.warn('Email SMTP configuration is incomplete');
        return;
      }
      
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });
      
      // Vérifier la connexion
      await this.transporter.verify();
      
      logger.info('Nodemailer SMTP initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Nodemailer SMTP', {
        error: error instanceof Error ? error.message : String(error),
      });
      this.transporter = null;
    }
  }

  private async initializeEtherealTestAccount() {
    try {
      // Créer un compte de test Ethereal
      this.testAccount = await nodemailer.createTestAccount();
      
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: this.testAccount.user,
          pass: this.testAccount.pass
        }
      });
      
      logger.info('Nodemailer initialized with Ethereal test account', {
        user: this.testAccount.user,
        pass: this.testAccount.pass,
        info: 'Login at ethereal.email to view test emails'
      });
    } catch (error) {
      logger.error('Failed to initialize Ethereal test account', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async sendEmail(notification: Notification): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { recipient, content, template } = notification;

      if (!recipient.email) {
        throw new Error('Recipient email is required');
      }

      // Charger le template approprié
      const emailContent = this.loadTemplate(template, content.data || {});
      
      // Stratégie d'envoi : essayer SendGrid, puis Nodemailer, puis simulation
      
      // 1. Essayer d'abord SendGrid si disponible et initialisé
      if (this.sendgridInitialized && sgMail) {
        try {
          const result = await this.sendWithSendGrid(notification, emailContent);
          return result;
        } catch (sendgridError) {
          logger.warn('SendGrid sending failed, falling back to Nodemailer', {
            error: sendgridError instanceof Error ? sendgridError.message : String(sendgridError),
          });
          // Continuer avec Nodemailer
        }
      }
      
      // 2. Essayer Nodemailer si disponible
      if (this.transporter) {
        try {
          const result = await this.sendWithNodemailer(notification, emailContent);
          return result;
        } catch (nodemailerError) {
          logger.warn('Nodemailer sending failed, falling back to simulation', {
            error: nodemailerError instanceof Error ? nodemailerError.message : String(nodemailerError),
          });
          // Continuer avec simulation
        }
      }
      
      // 3. En dernier recours, simuler l'envoi
      return this.simulateEmailSending(notification, emailContent);
    } catch (error) {
      logger.error('Failed to send email', {
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

  private async sendWithSendGrid(notification: Notification, emailContent: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { recipient, template } = notification;
      
      const msg = {
        to: recipient.email!,
        from: process.env.EMAIL_FROM || "noreply@example.com",
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
        categories: [template, 'notification-service'],
        customArgs: {
          notification_id: notification.id
        }
      };

      const response = await sgMail.send(msg);

      logger.info(`Email sent to ${recipient.email} via SendGrid`, {
        notificationId: notification.id,
        messageId: response[0]?.headers['x-message-id'],
        recipientId: recipient.id,
      });

      return {
        success: true,
        messageId: response[0]?.headers['x-message-id'],
      };
    } catch (error) {
      logger.error('SendGrid error', {
        error: error instanceof Error ? error.message : String(error),
        response: error && typeof error === 'object' && 'response' in error
          ? (error as any).response?.body
          : undefined,
      });
      
      throw error;
    }
  }

  private async sendWithNodemailer(notification: Notification, emailContent: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { recipient } = notification;
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || "noreply@example.com",
        to: recipient.email!,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      };

      const info = await this.transporter!.sendMail(mailOptions);

      logger.info(`Email sent to ${recipient.email} via Nodemailer`, {
        notificationId: notification.id,
        messageId: info.messageId,
        recipientId: recipient.id,
      });
      
      // Si en développement et qu'on utilise Ethereal, fournir un lien prévisualisable
      if (this.testAccount && info.messageId) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        logger.info(`View email preview: ${previewUrl}`);
      }

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      logger.error('Nodemailer error', {
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  }

  private simulateEmailSending(notification: Notification, emailContent: any): { success: boolean; messageId?: string; error?: string } {
    const { recipient } = notification;
    
    logger.info(`[SIMULATION] Email sent to ${recipient.email}`, {
      notificationId: notification.id,
      subject: emailContent.subject,
      recipientId: recipient.id,
      template: notification.template,
    });

    // Afficher le contenu de l'email dans la console
    console.log('\n========== SIMULATED EMAIL ==========');
    console.log(`To: ${recipient.email}`);
    console.log(`Subject: ${emailContent.subject}`);
    console.log(`\nText Content:\n${emailContent.text}`);
    console.log('\nHTML Content (truncated):');
    console.log(`${emailContent.html.substring(0, 200)}...`);
    console.log('====================================\n');

    return {
      success: true,
      messageId: `simulated-email-${Date.now()}`,
    };
  }

  private loadTemplate(template: NotificationTemplate, data: Record<string, any>): { subject: string; html: string; text: string } {
    try {
      // Essayer de charger le template depuis les fichiers
      const templatePath = path.resolve(emailConfig.templateDir || 'src/templates/email', `${template}.template.js`);

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