const validator = require('validator');

// Valider les emails
exports.isValidEmail = (email) => {
  return typeof email === 'string' && validator.isEmail(email);
};

// Valider les numéros de téléphone
exports.isValidPhone = (phone) => {
  if (typeof phone !== 'string') return false;
  
  // Supprimer espaces, tirets, parenthèses
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Vérifier que c'est un numéro valide
  return validator.isMobilePhone(cleanPhone);
};

// Sanitizer pour le texte (prévention XSS)
exports.sanitizeText = (text) => {
  if (typeof text !== 'string') return '';
  return validator.escape(text);
};

// Valider un mot de passe (au moins 8 caractères, majuscule, minuscule, chiffre)
exports.isStrongPassword = (password) => {
  return typeof password === 'string' && validator.isStrongPassword(password, {
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 0
  });
};

// Valider un token FCM
exports.isValidFCMToken = (token) => {
  return typeof token === 'string' && token.length > 20;
};

// Valider les URLs
exports.isValidURL = (url) => {
  return typeof url === 'string' && validator.isURL(url);
};

// Valider si l'objet est vide
exports.isEmptyObject = (obj) => {
  return obj && Object.keys(obj).length === 0 && obj.constructor === Object;
};

// Valider les dates
exports.isValidDate = (date) => {
  return date && validator.isDate(date);
};

// Nettoyer et formater un numéro de téléphone
exports.formatPhone = (phone) => {
  if (typeof phone !== 'string') return '';
  
  // Supprimer tout sauf les chiffres et le +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // S'assurer que le numéro commence par + s'il s'agit d'un numéro international
  if (cleaned.startsWith('00')) {
    return '+' + cleaned.substring(2);
  } else if (!cleaned.startsWith('+')) {
    // Ajouter le préfixe du pays (+ par défaut ou configurable)
    return '+' + cleaned;
  }
  
  return cleaned;
};