const express = require('express');
const authController = require('../controllers/authController');
const router = express.Router();

// Routes d'inscription et connexion
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

// Vérification d'email
router.get('/verifyEmail/:token', authController.verifyEmail);

// Gestion du mot de passe
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// Routes protégées (nécessitant une authentification)
router.use(authController.protect);
router.patch('/updateMyPassword', authController.updatePassword);

module.exports = router;