const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/user');
const logger = require('../utils/logger');

// Middleware pour protéger les routes
exports.protect = async (req, res, next) => {
  try {
    // 1) Récupérer le token
    let token;
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
        message: 'Vous n\'êtes pas connecté. Veuillez vous connecter pour accéder à cette ressource.'
      });
    }

    // 2) Vérifier le token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Vérifier si l'utilisateur existe toujours
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: 'fail',
        message: 'L\'utilisateur associé à ce token n\'existe plus.'
      });
    }

    // ACCORDER L'ACCÈS À LA ROUTE PROTÉGÉE
    req.user = currentUser;
    res.locals.user = currentUser;
    next();
  } catch (err) {
    logger.error('Erreur d\'authentification:', err);
    return res.status(401).json({
      status: 'fail',
      message: 'Non autorisé'
    });
  }
};

// Restriction d'accès aux rôles spécifiques
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'Vous n\'avez pas la permission d\'effectuer cette action'
      });
    }
    next();
  };
};

// Vérifier si l'utilisateur est connecté pour le rendu de vues
exports.isLoggedIn = async (req, res, next) => {
  try {
    if (req.cookies.jwt) {
      // 1) Vérifier le token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Vérifier si l'utilisateur existe toujours
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) L'utilisateur est connecté
      res.locals.user = currentUser;
      return next();
    }
    next();
  } catch (err) {
    next();
  }
};