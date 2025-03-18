// src/routes/notification.routes.ts
import { Router } from 'express';
import notificationController from '../controllers/notification.controller';
import authMiddleware from '../middlewares/auth.middleware';
import rateLimiterMiddleware from '../middlewares/rate-limiter.middleware';
import validator from '../utils/validator';
import jwt from 'jsonwebtoken';

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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 */
router.get('/generate-test-token', (req, res) => {
  const userId = '123456';
  const role = 'user';
  
  // Utilisez la même clé secrète que celle utilisée dans votre middleware d'authentification
  const secret = process.env.JWT_SECRET || 'votre_secret_jwt_par_defaut';
  
  const token = jwt.sign({ userId, role }, secret, { expiresIn: '1h' });
  
  res.json({ token });
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
 *                 description: L'identifiant de l'utilisateur
 *               email:
 *                 type: string
 *                 format: email
 *                 description: L'adresse email du destinataire
 *               name:
 *                 type: string
 *                 description: Le nom de l'utilisateur (optionnel)
 *               verificationUrl:
 *                 type: string
 *                 format: uri
 *                 description: L'URL de vérification du compte
 *     responses:
 *       200:
 *         description: Email envoyé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 notificationId:
 *                   type: string
 *                   example: "6058f9d4e85a4b001c123456"
 *                 message:
 *                   type: string
 *                   example: "Email de vérification envoyé avec succès"
 *       400:
 *         description: Requête invalide
 *       401:
 *         description: Non autorisé
 *       500:
 *         description: Erreur serveur
 */
router.post(
  '/email/verify-account', 
  authMiddleware, 
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
 *                 description: L'identifiant de l'utilisateur
 *               email:
 *                 type: string
 *                 format: email
 *                 description: L'adresse email du destinataire
 *               name:
 *                 type: string
 *                 description: Le nom de l'utilisateur (optionnel)
 *               code:
 *                 type: string
 *                 description: Le code de vérification
 *     responses:
 *       200:
 *         description: Email envoyé avec succès
 *       400:
 *         description: Requête invalide
 *       500:
 *         description: Erreur serveur
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
 *                 description: L'identifiant de l'utilisateur
 *               phone:
 *                 type: string
 *                 description: Le numéro de téléphone du destinataire
 *               code:
 *                 type: string
 *                 description: Le code de vérification
 *     responses:
 *       200:
 *         description: SMS envoyé avec succès
 *       400:
 *         description: Requête invalide
 *       500:
 *         description: Erreur serveur
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
 *                 description: L'identifiant de l'utilisateur
 *               deviceToken:
 *                 type: string
 *                 description: Le token de l'appareil mobile
 *               title:
 *                 type: string
 *                 description: Le titre de la notification
 *               body:
 *                 type: string
 *                 description: Le contenu de la notification
 *               data:
 *                 type: object
 *                 description: Les données supplémentaires
 *     responses:
 *       200:
 *         description: Notification push envoyée avec succès
 *       400:
 *         description: Requête invalide
 *       401:
 *         description: Non autorisé
 *       500:
 *         description: Erreur serveur
 */
router.post(
  '/push', 
  authMiddleware, 
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
 *     parameters:
 *       - in: query
 *         name: notification_id
 *         schema:
 *           type: string
 *         description: L'identifiant de la notification (optionnel si présent dans le body)
 *     requestBody:
 *       description: Données du webhook Twilio
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - MessageSid
 *               - MessageStatus
 *             properties:
 *               MessageSid:
 *                 type: string
 *                 description: L'identifiant du message Twilio
 *               MessageStatus:
 *                 type: string
 *                 description: Le statut du message
 *               notification_id:
 *                 type: string
 *                 description: L'identifiant de la notification (optionnel si présent dans les paramètres de requête)
 *     responses:
 *       200:
 *         description: Webhook traité avec succès
 */
router.post('/webhook/sms', notificationController.smsWebhook);

export default router;