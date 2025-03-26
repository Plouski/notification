const express = require('express');
const notificationController = require('../controllers/notificationController');
const authController = require('../controllers/authController');
const router = express.Router();

// Toutes les routes suivantes nécessitent une authentification
router.use(authController.protect);

// Routes pour les notifications
router.get('/', notificationController.getAllNotifications);
router.get('/unread', notificationController.getUnreadNotifications);
router.get('/stats', notificationController.getNotificationStats);
router.delete('/all', notificationController.deleteAllNotifications);

// Routes pour les notifications individuelles
router.route('/:id')
  .get(notificationController.getNotification)
  .patch(notificationController.markAsRead)
  .delete(notificationController.deleteNotification);

// Envoi de notifications
router.post('/send/email', notificationController.sendEmail);
router.post('/send/sms', notificationController.sendSMS);
router.post('/send/push', notificationController.sendPush);

module.exports = router;