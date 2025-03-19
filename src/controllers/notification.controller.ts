// src/controllers/notification.controller.ts
import { Request, Response } from 'express';
import {
  NotificationPayload,
  NotificationTemplate,
} from '../models/notification.model';
import notificationService from '../services/notification.service';
import logger from '../utils/logger';
import { NotificationStatus } from '../models/delivery-status.model';

export class NotificationController {
  /**
   * Envoie un email de vérification de compte
   */
  async sendAccountVerificationEmail(req: Request, res: Response): Promise<void> {
    try {
      const { userId, email, name, verificationUrl } = req.body;

      if (!userId || !email || !verificationUrl) {
        res.status(400).json({ 
          success: false, 
          message: 'Les champs userId, email et verificationUrl sont obligatoires' 
        });
        return;
      }

      const payload: NotificationPayload = {
        recipientId: userId,
        recipientEmail: email,
        template: NotificationTemplate.ACCOUNT_VERIFICATION,
        data: {
          name,
          verificationUrl,
        },
      };

      const result = await notificationService.sendNotification(payload);

      if (result.success) {
        res.status(200).json({
          success: true,
          notificationId: result.notificationId,
          message: 'Email de vérification envoyé avec succès'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Échec de l\'envoi de l\'email de vérification',
          error: result.error
        });
      }
    } catch (error) {
      logger.error('Error sending verification email', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Envoie un email de réinitialisation de mot de passe
   */
  async sendPasswordResetEmail(req: Request, res: Response): Promise<void> {
    try {
      const { userId, email, name, code } = req.body;

      if (!userId || !email || !code) {
        res.status(400).json({ 
          success: false, 
          message: 'Les champs userId, email et code sont obligatoires' 
        });
        return;
      }

      const payload: NotificationPayload = {
        recipientId: userId,
        recipientEmail: email,
        template: NotificationTemplate.PASSWORD_RESET,
        data: {
          name,
          code,
        },
      };

      const result = await notificationService.sendNotification(payload);

      if (result.success) {
        res.status(200).json({
          success: true,
          notificationId: result.notificationId,
          message: 'Email de réinitialisation de mot de passe envoyé avec succès'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Échec de l\'envoi de l\'email de réinitialisation de mot de passe',
          error: result.error
        });
      }
    } catch (error) {
      logger.error('Error sending password reset email', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Envoie un code de réinitialisation de mot de passe par SMS
   */
  async sendPasswordResetSms(req: Request, res: Response): Promise<void> {
    try {
      const { userId, phone, code } = req.body;

      if (!userId || !phone || !code) {
        res.status(400).json({ 
          success: false, 
          message: 'Les champs userId, phone et code sont obligatoires' 
        });
        return;
      }

      const payload: NotificationPayload = {
        recipientId: userId,
        recipientPhone: phone,
        template: NotificationTemplate.PASSWORD_RESET,
        data: {
          code,
        },
      };

      const result = await notificationService.sendNotification(payload);

      if (result.success) {
        res.status(200).json({
          success: true,
          notificationId: result.notificationId,
          message: 'SMS de réinitialisation de mot de passe envoyé avec succès'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Échec de l\'envoi du SMS de réinitialisation de mot de passe',
          error: result.error
        });
      }
    } catch (error) {
      logger.error('Error sending password reset SMS', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Envoie une notification push
   */
  async sendPushNotification(req: Request, res: Response): Promise<void> {
    try {
      const { userId, deviceToken, title, body, data } = req.body;

      if (!userId || !deviceToken) {
        res.status(400).json({ 
          success: false, 
          message: 'Les champs userId et deviceToken sont obligatoires' 
        });
        return;
      }

      // En développement, on peut utiliser un token de test ou laisser la simulation se faire
      // En mode développement, nous ignorerons le token fourni car il pourrait ne pas être valide
      const useTestTokenInDev = process.env.NODE_ENV !== 'production';
      
      const payload: NotificationPayload = {
        recipientId: userId,
        // En dev, utiliser un token factice pour forcer le mode simulation
        recipientDeviceToken: useTestTokenInDev ? 'dev-token-for-simulation' : deviceToken,
        template: NotificationTemplate.GENERAL_NOTIFICATION,
        data: {
          title,
          body,
          ...data,
        },
      };

      const result = await notificationService.sendNotification(payload);

      if (result.success) {
        res.status(200).json({
          success: true,
          notificationId: result.notificationId,
          message: 'Notification push envoyée avec succès',
          simulationMode: useTestTokenInDev
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Échec de l\'envoi de la notification push',
          error: result.error
        });
      }
    } catch (error) {
      logger.error('Error sending push notification', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Webhook pour recevoir les mises à jour de statut des SMS (callback Twilio)
   */
  async smsWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { MessageSid, MessageStatus } = req.body;
      const notificationId = req.body.notification_id || req.query.notification_id as string;

      if (!MessageSid || !MessageStatus) {
        res.status(400).json({ 
          success: false, 
          message: 'Les informations de statut du message sont incomplètes' 
        });
        return;
      }

      if (!notificationId) {
        res.status(400).json({ 
          success: false, 
          message: 'ID de notification manquant' 
        });
        return;
      }

      // Mapper le statut Twilio vers notre enum NotificationStatus
      let status: NotificationStatus;
      switch (MessageStatus) {
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

      // Traitement via service
      await notificationService.processStatusWebhook(
        'twilio',
        MessageSid,
        MessageStatus,
        notificationId,
        req.body
      );

      // Toujours retourner un succès pour les webhooks (éviter les réessais)
      res.status(200).json({ success: true });
    } catch (error) {
      logger.error('Error processing SMS webhook', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Toujours renvoyer un succès pour les webhooks (éviter les réessais)
      res.status(200).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

// Exporter une instance par défaut du contrôleur
export default new NotificationController();