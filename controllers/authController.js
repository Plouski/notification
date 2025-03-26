const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const mailService = require('../services/mailService');
const smsService = require('../services/smsService');
const logger = require('../utils/logger');

// Fonction pour générer un token JWT
const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

// Création et envoi du token
const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRES_IN || 24) * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
  };

  // Envoyer le token via cookie
  res.cookie('jwt', token, cookieOptions);

  // Supprimer le mot de passe de la sortie
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

// Inscription de l'utilisateur
exports.signup = async (req, res, next) => {
  try {
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm
    });

    // Créer un token de vérification d'email
    const verificationToken = newUser.createEmailVerificationToken();
    await newUser.save({ validateBeforeSave: false });

    // URL de vérification
    const verificationURL = `${req.protocol}://${req.get(
      'host'
    )}/api/users/verifyEmail/${verificationToken}`;

    // Afficher le token dans les logs pour le test
    console.log('TOKEN DE VERIFICATION EMAIL (À UTILISER DANS L\'URL):', verificationToken);

    // Envoyer l'email de vérification
    await mailService.sendVerificationEmail(newUser, verificationURL);

    // Ajouter le token à la réponse pour faciliter les tests
    return res.status(201).json({
      status: 'success',
      token: signToken(newUser._id),
      data: {
        user: newUser
      },
      // Pour le débogage uniquement, à supprimer en production
      verificationToken: verificationToken,
      verificationURL: verificationURL
    });
  } catch (err) {
    logger.error('Erreur lors de l\'inscription:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Connexion de l'utilisateur
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Vérifier si email et password existent
    if (!email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Veuillez fournir un email et un mot de passe'
      });
    }

    // Vérifier si l'utilisateur existe et si le mot de passe est correct
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({
        status: 'fail',
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Si tout est ok, envoyer le token
    createSendToken(user, 200, req, res);
  } catch (err) {
    logger.error('Erreur lors de la connexion:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Déconnexion
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};

// Protection des routes - Vérification du token JWT
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Récupérer le token
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'Vous n\'êtes pas connecté. Veuillez vous connecter pour accéder.'
      });
    }

    // Vérification du token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // Vérifier si l'utilisateur existe toujours
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: 'fail',
        message: 'L\'utilisateur associé à ce token n\'existe plus.'
      });
    }

    // Accorder l'accès à la route protégée
    req.user = currentUser;
    res.locals.user = currentUser;
    next();
  } catch (err) {
    logger.error('Erreur d\'authentification:', err);
    res.status(401).json({
      status: 'fail',
      message: 'Non autorisé'
    });
  }
};

// Vérification de l'email
exports.verifyEmail = async (req, res, next) => {
  try {
    // Récupérer l'utilisateur basé sur le token
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    // Si le token n'est pas valide ou a expiré
    if (!user) {
      return res.status(400).json({
        status: 'fail',
        message: 'Token invalide ou expiré'
      });
    }

    // Mettre à jour les champs de l'utilisateur
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    // Envoyer l'email de bienvenue
    await mailService.sendWelcomeEmail(user);

    // Connexion automatique de l'utilisateur
    createSendToken(user, 200, req, res);
  } catch (err) {
    logger.error('Erreur lors de la vérification d\'email:', err);
    res.status(500).json({
      status: 'error',
      message: 'Une erreur s\'est produite lors de la vérification de l\'email'
    });
  }
};

// Demande de réinitialisation du mot de passe
exports.forgotPassword = async (req, res, next) => {
  try {
    // Récupérer l'utilisateur basé sur l'email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'Aucun utilisateur avec cet email'
      });
    }

    // Générer le token de réinitialisation
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Afficher le token dans les logs pour le test
    console.log('TOKEN DE RÉINITIALISATION (À UTILISER DANS L\'URL):', resetToken);

    try {
      // Envoyer l'email et/ou SMS selon les préférences de l'utilisateur
      const resetURL = `${req.protocol}://${req.get(
        'host'
      )}/api/users/resetPassword/${resetToken}`;

      // Envoyer l'email de réinitialisation
      await mailService.sendPasswordResetEmail(user, resetURL);

      // Si l'utilisateur a un numéro de téléphone, envoyer également un SMS
      if (user.phone && user.notificationPreferences.sms) {
        // Générer un code à 6 chiffres pour le SMS
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        // Stocker le code (hashé) dans la base de données
        user.passwordResetCode = crypto
          .createHash('sha256')
          .update(code)
          .digest('hex');
        await user.save({ validateBeforeSave: false });

        // Envoyer le code par SMS
        await smsService.sendPasswordResetCode(user, code);
      }

      res.status(200).json({
        status: 'success',
        message: 'Token de réinitialisation envoyé à votre email'
      });
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      user.passwordResetCode = undefined;
      await user.save({ validateBeforeSave: false });

      logger.error('Erreur lors de l\'envoi de l\'email de réinitialisation:', err);
      return res.status(500).json({
        status: 'error',
        message: 'Erreur lors de l\'envoi de l\'email. Veuillez réessayer plus tard.'
      });
    }
  } catch (err) {
    logger.error('Erreur lors de la demande de réinitialisation de mot de passe:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Réinitialisation du mot de passe
exports.resetPassword = async (req, res, next) => {
  try {
    // Récupérer l'utilisateur basé sur le token
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    // Si le token n'est pas valide ou a expiré
    if (!user) {
      return res.status(400).json({
        status: 'fail',
        message: 'Token invalide ou expiré'
      });
    }

    // Vérifier le code si fourni (pour la méthode SMS)
    if (req.body.code) {
      const hashedCode = crypto
        .createHash('sha256')
        .update(req.body.code)
        .digest('hex');

      if (!user.passwordResetCode || user.passwordResetCode !== hashedCode) {
        return res.status(400).json({
          status: 'fail',
          message: 'Code invalide'
        });
      }
    }

    // Mettre à jour le mot de passe
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetCode = undefined;
    await user.save();

    // Connecter l'utilisateur, envoyer le JWT
    createSendToken(user, 200, req, res);
  } catch (err) {
    logger.error('Erreur lors de la réinitialisation du mot de passe:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Mise à jour du mot de passe pour un utilisateur connecté
exports.updatePassword = async (req, res, next) => {
  try {
    // Récupérer l'utilisateur
    const user = await User.findById(req.user.id).select('+password');

    // Vérifier si le mot de passe actuel est correct
    if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
      return res.status(401).json({
        status: 'fail',
        message: 'Votre mot de passe actuel est incorrect'
      });
    }

    // Mettre à jour le mot de passe
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    // Connecter l'utilisateur, envoyer le JWT
    createSendToken(user, 200, req, res);
  } catch (err) {
    logger.error('Erreur lors de la mise à jour du mot de passe:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};