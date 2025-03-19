// src/routes/notification.route.ts
import { Router } from 'express';
import notificationController from '../controllers/notification.controller';
import authMiddleware from '../middlewares/auth.middleware';
import rateLimiterMiddleware from '../middlewares/rate-limiter.middleware';
import validator from '../utils/validator';
import jwt from 'jsonwebtoken';
import notificationService from '../services/notification.service';
import notificationRepository from '../repository/notification.repository';

const router = Router();

/**
 * @swagger
 * /api/notifications/generate-test-token:
 *   get:
 *     summary: Génère un token JWT de test (uniquement pour le développement)
 *     tags:
 *       - Auth
 *     responses:
 *       200:
 *         description: Token JWT généré avec succès
 */
router.get('/generate-test-token', (req, res) => {
  // N'activer cette route qu'en développement
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ success: false, message: 'Route non disponible en production' });
  }
  
  const userId = '123456';
  const role = 'user';
  
  const secret = process.env.JWT_SECRET || 'default_jwt_secret_key';
  const token = jwt.sign({ userId, role }, secret, { expiresIn: '1h' });
  
  res.json({ token });
});

/**
 * @swagger
 * /api/notifications/test-database:
 *   get:
 *     summary: Récupère les notifications stockées dans la base de données (pour le débogage)
 *     tags:
 *       - Test
 *     responses:
 *       200:
 *         description: Liste des notifications récentes
 */
router.get('/test-database', async (req, res) => {
  try {
    // Récupérer les notifications récentes
    const notifications = await notificationRepository.getNotifications(10);
    
    // Compter le nombre total de notifications
    const count = notifications.length;
    
    res.json({
      success: true,
      count,
      notifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @swagger
 * /api/notifications/email/verify-account:
 *   post:
 *     summary: Envoie un email de vérification de compte
 *     tags:
 *       - Email
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - email
 *               - verificationUrl
 *             properties:
 *               userId:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               name:
 *                 type: string
 *               verificationUrl:
 *                 type: string
 *                 format: uri
 */
router.post(
  '/email/verify-account', 
  rateLimiterMiddleware, 
  validator.validate(validator.schemas.accountVerification),
  notificationController.sendAccountVerificationEmail
);

/**
 * @swagger
 * /api/notifications/email/reset-password:
 *   post:
 *     summary: Envoie un email de réinitialisation de mot de passe
 *     tags:
 *       - Email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - email
 *               - code
 *             properties:
 *               userId:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 */
router.post(
  '/email/reset-password', 
  rateLimiterMiddleware, 
  validator.validate(validator.schemas.passwordResetEmail),
  notificationController.sendPasswordResetEmail
);

/**
 * @swagger
 * /api/notifications/sms/reset-password:
 *   post:
 *     summary: Envoie un SMS de réinitialisation de mot de passe
 *     tags:
 *       - SMS
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - phone
 *               - code
 *             properties:
 *               userId:
 *                 type: string
 *               phone:
 *                 type: string
 *               code:
 *                 type: string
 */
router.post(
  '/sms/reset-password', 
  rateLimiterMiddleware, 
  validator.validate(validator.schemas.passwordResetSms),
  notificationController.sendPasswordResetSms
);

/**
 * @swagger
 * /api/notifications/push:
 *   post:
 *     summary: Envoie une notification push
 *     tags:
 *       - Push
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - deviceToken
 *               - title
 *               - body
 *             properties:
 *               userId:
 *                 type: string
 *               deviceToken:
 *                 type: string
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               data:
 *                 type: object
 */
router.post(
  '/push', 
  rateLimiterMiddleware, 
  validator.validate(validator.schemas.pushNotification),
  notificationController.sendPushNotification
);

/**
 * @swagger
 * /api/notifications/webhook/sms:
 *   post:
 *     summary: Webhook pour recevoir les mises à jour de statut des SMS (Twilio)
 *     tags:
 *       - Webhook
 */
router.post('/webhook/sms', notificationController.smsWebhook);

export default router;