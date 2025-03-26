const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  providerId: {
    type: String,
    default: function () {
      // Générer un ID unique aléatoire si non spécifié
      return `local_${this._id || new mongoose.Types.ObjectId()}`;
    }
  },
  name: {
    type: String,
    required: [true, 'Veuillez fournir votre nom']
  },
  email: {
    type: String,
    required: [true, 'Veuillez fournir votre email'],
    unique: true,
    lowercase: true,
    validate: {
      validator: function (v) {
        return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: props => `${props.value} n'est pas un email valide!`
    }
  },
  phone: {
    type: String,
    validate: {
      validator: function (v) {
        return /^\+?[0-9]{10,15}$/.test(v);
      },
      message: props => `${props.value} n'est pas un numéro de téléphone valide!`
    }
  },
  password: {
    type: String,
    required: [true, 'Veuillez fournir un mot de passe'],
    minlength: 8,
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Veuillez confirmer votre mot de passe'],
    validate: {
      // Cette validation ne fonctionne que sur CREATE et SAVE
      validator: function (el) {
        return el === this.password;
      },
      message: 'Les mots de passe ne correspondent pas!'
    }
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  fcmTokens: [String], // Pour les notifications push Firebase
  notificationPreferences: {
    email: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    }
  },
  active: {
    type: Boolean,
    default: true,
    select: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash le mot de passe avant de sauvegarder
userSchema.pre('save', async function (next) {
  // Seulement exécuté si le mot de passe a été modifié
  if (!this.isModified('password')) return next();

  // Hash le mot de passe avec un coût de 12
  this.password = await bcrypt.hash(this.password, 12);

  // Supprimer passwordConfirm
  this.passwordConfirm = undefined;
  next();
});

// Méthode pour comparer les mots de passe
userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Créer un token de vérification d'email
userSchema.methods.createEmailVerificationToken = function() {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  
  // Augmenter la durée à 24 heures pour faciliter les tests
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 heures
  
  return verificationToken;
};

// Créer un token de réinitialisation de mot de passe
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 heure

  return resetToken;
};

// Ajouter un token FCM pour les notifications push
userSchema.methods.addFCMToken = function (token) {
  if (!this.fcmTokens.includes(token)) {
    this.fcmTokens.push(token);
  }
  return this.save({ validateBeforeSave: false });
};

// Supprimer un token FCM
userSchema.methods.removeFCMToken = function (token) {
  this.fcmTokens = this.fcmTokens.filter(t => t !== token);
  return this.save({ validateBeforeSave: false });
};

const User = mongoose.model('User', userSchema);

module.exports = User;