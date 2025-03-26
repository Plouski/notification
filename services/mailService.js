const nodemailer = require('nodemailer');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const readFile = promisify(fs.readFile);
const logger = require('../utils/logger');
const Notification = require('../models/notification');

class MailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Vérifier la connexion au service de mail
    this.verifyConnection();
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info('Service email prêt');
    } catch (error) {
      logger.error('Erreur de connexion au service email:', error);
    }
  }

  async loadTemplate(templateName) {
    try {
      const template = await readFile(
        path.join(__dirname, `../templates/${templateName}.html`),
        'utf8'
      );
      return template;
    } catch (error) {
      logger.error(`Erreur lors du chargement du template ${templateName}:`, error);
      // Template par défaut si le fichier n'est pas trouvé
      return '<div>{{message}}</div>';
    }
  }

  processTemplate(template, variables) {
    let processedTemplate = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processedTemplate = processedTemplate.replace(regex, value);
    }
    return processedTemplate;
  }

  async sendMail(options) {
    try {
      let html = options.html;
      
      // Si un template est spécifié, charger et traiter le template
      if (options.template) {
        const template = await this.loadTemplate(options.template);
        html = this.processTemplate(template, options.variables || {});
      }

      const mailOptions = {
        from: options.from || process.env.EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        text: options.text || options.subject,
        html: html || ''
      };

      // Créer l'enregistrement de notification
      const notification = await Notification.create({
        user: options.userId,
        type: 'email',
        title: options.subject,
        message: options.text || options.subject,
        status: 'pending',
        metadata: {
          to: options.to,
          template: options.template || 'custom'
        }
      });

      // Envoyer l'email
      const info = await this.transporter.sendMail(mailOptions);
      
      // Mettre à jour le statut de la notification
      await Notification.findByIdAndUpdate(notification._id, {
        status: 'sent',
        deliveredAt: Date.now(),
        metadata: {
          ...notification.metadata,
          messageId: info.messageId
        }
      });

      logger.info(`Email envoyé à ${options.to}: ${info.messageId}`);
      return { success: true, messageId: info.messageId, notificationId: notification._id };
    } catch (error) {
      logger.error(`Erreur lors de l'envoi de l'email à ${options.to}:`, error);
      
      // Mettre à jour le statut en cas d'échec
      if (options.userId) {
        await Notification.findOneAndUpdate(
          { user: options.userId, type: 'email', status: 'pending' },
          {
            status: 'failed',
            failureReason: error.message
          }
        );
      }
      
      return { success: false, error: error.message };
    }
  }

  async sendVerificationEmail(user, verificationUrl) {
    return this.sendMail({
      userId: user._id,
      to: user.email,
      subject: 'Vérification de votre adresse email',
      template: 'emailVerification',
      variables: {
        name: user.name,
        verificationUrl,
        appName: 'Service de Notification',
        supportEmail: process.env.EMAIL_FROM
      }
    });
  }

  async sendPasswordResetEmail(user, resetUrl) {
    return this.sendMail({
      userId: user._id,
      to: user.email,
      subject: 'Réinitialisation de votre mot de passe',
      template: 'passwordReset',
      variables: {
        name: user.name,
        resetUrl,
        appName: 'Service de Notification',
        supportEmail: process.env.EMAIL_FROM,
        expiryTime: '10 minutes'
      }
    });
  }

  async sendWelcomeEmail(user) {
    return this.sendMail({
      userId: user._id,
      to: user.email,
      subject: 'Bienvenue sur notre service de notification',
      template: 'welcome',
      variables: {
        name: user.name,
        appName: 'Service de Notification',
        supportEmail: process.env.EMAIL_FROM
      }
    });
  }
}

module.exports = new MailService();