// src/routes/notification.routes.ts
import { Router } from 'express';
import notificationController from '../controllers/notification.controller';
import authMiddleware from '../middlewares/auth.middleware';
import rateLimiterMiddleware from '../middlewares/rate-limiter.middleware';
import jwt from 'jsonwebtoken';

const router = Router();

router.get('/generate-test-token', (req, res) => {
  const userId = '123456';
  const role = 'user';
  
  // Utilisez la même clé secrète que celle utilisée dans votre middleware d'authentification
  const secret = process.env.JWT_SECRET || 'votre_secret_jwt_par_defaut';
  
  const token = jwt.sign({ userId, role }, secret, { expiresIn: '1h' });
  
  res.json({ token });
});

// Routes protégées par authentification
router.post(
  '/email/verify-account', 
  authMiddleware, 
  rateLimiterMiddleware, 
  notificationController.sendAccountVerificationEmail
);

router.post(
  '/email/reset-password', 
  rateLimiterMiddleware, 
  notificationController.sendPasswordResetEmail
);

router.post(
  '/sms/reset-password', 
  rateLimiterMiddleware, 
  notificationController.sendPasswordResetSms
);

router.post(
  '/push', 
  authMiddleware, 
  rateLimiterMiddleware, 
  notificationController.sendPushNotification
);

// Webhooks pour les statuts de livraison
router.post('/webhook/sms', notificationController.smsWebhook);

export default router;