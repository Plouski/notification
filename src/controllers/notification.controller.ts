// src/controllers/notification.controller.ts
import { Request, Response } from 'express';
import {
  NotificationPayload,
  NotificationTemplate,
} from '../models/notification.model';
// import notificationService from '../services/notification.service';
import notificationService from '../services/notification.service.simple';

import logger from '../utils/logger';
import { NotificationStatus } from '../models/delivery-status.model';

export class NotificationController {
  // Envoyer un email de vérification de compte
  async sendAccountVerificationEmail(req: Request, res: Response): Promise<void> {
    try {
      const { userId, email, name, verificationUrl } = req.body;

      if (!userId || !email || !verificationUrl) {
        res.status(400).json({ success: false, message: 'Les champs userId, email et verificationUrl sont obligatoires' });
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

  // Envoyer un code de réinitialisation de mot de passe par email
  async sendPasswordResetEmail(req: Request, res: Response): Promise<void> {
    try {
      const { userId, email, name, code } = req.body;

      if (!userId || !email || !code) {
        res.status(400).json({ success: false, message: 'Les champs userId, email et code sont obligatoires' });
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

  // Envoyer un code de réinitialisation de mot de passe par SMS
  async sendPasswordResetSms(req: Request, res: Response): Promise<void> {
    try {
      const { userId, phone, code } = req.body;

      if (!userId || !phone || !code) {
        res.status(400).json({ success: false, message: 'Les champs userId, phone et code sont obligatoires' });
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

  // Envoyer une notification push
  async sendPushNotification(req: Request, res: Response): Promise<void> {
    try {
      const { userId, deviceToken, title, body, data } = req.body;

      if (!userId || !deviceToken) {
        res.status(400).json({ success: false, message: 'Les champs userId et deviceToken sont obligatoires' });
        return;
      }

      const payload: NotificationPayload = {
        recipientId: userId,
        recipientDeviceToken: deviceToken,
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
          message: 'Notification push envoyée avec succès'
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

  // Webhook pour recevoir les mises à jour de statut des SMS (callback Twilio)
  async smsWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { MessageSid, MessageStatus, notification_id } = req.body;

      if (!MessageSid || !MessageStatus) {
        res.status(400).json({ success: false, message: 'Les informations de statut du message sont incomplètes' });
        return;
      }

      const notificationId = notification_id || req.query.notification_id as string;

      if (!notificationId) {
        res.status(400).json({ success: false, message: 'ID de notification manquant' });
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

      // await notificationService.updateNotificationStatus(
      //   notificationId,
      //   status,
      //   MessageSid,
      //   {
      //     provider: 'twilio',
      //     rawStatus: MessageStatus,
      //   }
      // );

      res.status(200).json({ success: true });
    } catch (error) {
      logger.error('Error processing SMS webhook', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Toujours renvoyer une réponse 200 aux webhooks pour éviter les ré-essais
      res.status(200).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

export default new NotificationController();