// src/services/email.service.ts
import { 
    Notification, 
    NotificationTemplate 
  } from '../models/notification.model';
  import { emailConfig } from '../config/email.config';
  import logger from '../utils/logger';
  
  export class EmailService {
    
    async sendEmail(notification: Notification): Promise<{ success: boolean; messageId?: string; error?: string }> {
      try {
        const { recipient, content } = notification;
        
        if (!recipient.email) {
          throw new Error('Recipient email is required');
        }
  
        // Traitement des templates et préparation du contenu de l'email
        const emailContent = this.prepareEmailContent(notification.template, content.data || {});
        
        // Simuler l'envoi d'email plutôt que d'utiliser un vrai serveur SMTP
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
        console.log(`\nHTML Content:\n${emailContent.html}`);
        console.log('====================================\n');
        
        return {
          success: true,
          messageId: `simulated-email-${Date.now()}`,
        };
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
  
    private prepareEmailContent(template: NotificationTemplate, data: Record<string, any>): { subject: string; html: string; text: string } {
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
  
  export default new EmailService();