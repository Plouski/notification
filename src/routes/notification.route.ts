// src/routes/notification.route.ts
import { Router } from 'express';
import notificationController from '../controllers/notification.controller';
import rateLimiterMiddleware from '../middlewares/rate-limiter.middleware';
import validator from '../utils/validator';

const router = Router();

// router.get('/generate-test-token', (req, res) => {
//   // N'activer cette route qu'en développement
//   if (process.env.NODE_ENV === 'production') {
//     return res.status(404).json({ success: false, message: 'Route non disponible en production' });
//   }
  
//   const userId = '123456';
//   const role = 'user';
  
//   const secret = process.env.JWT_SECRET || 'default_jwt_secret_key';
//   const token = jwt.sign({ userId, role }, secret, { expiresIn: '1h' });
  
//   res.json({ token });
// });

router.post(
  '/email/verify-account', 
  rateLimiterMiddleware, 
  validator.validate(validator.schemas.accountVerification),
  notificationController.sendAccountVerificationEmail
);

router.post(
  '/email/reset-password', 
  rateLimiterMiddleware, 
  validator.validate(validator.schemas.passwordResetEmail),
  notificationController.sendPasswordResetEmail
);

router.post(
  '/sms/reset-password', 
  rateLimiterMiddleware, 
  validator.validate(validator.schemas.passwordResetSms),
  notificationController.sendPasswordResetSms
);

router.post(
  '/push', 
  rateLimiterMiddleware, 
  validator.validate(validator.schemas.pushNotification),
  notificationController.sendPushNotification
);

router.post('/webhook/sms', notificationController.smsWebhook);

export default router;