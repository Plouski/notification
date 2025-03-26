const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'La notification doit appartenir à un utilisateur']
  },
  type: {
    type: String,
    enum: ['email', 'sms', 'push'],
    required: [true, 'Le type de notification est requis']
  },
  title: {
    type: String,
    required: [true, 'Le titre de la notification est requis']
  },
  message: {
    type: String,
    required: [true, 'Le message de la notification est requis']
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  deliveredAt: Date,
  readAt: Date,
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed', 'read'],
    default: 'pending'
  },
  failureReason: String,
  metadata: {
    type: Object,
    default: {}
  }
});

// Index pour des requêtes efficaces
notificationSchema.index({ user: 1, sentAt: -1 });
notificationSchema.index({ status: 1 });

// Pre-hook pour le populate automatique
notificationSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name email phone'
  });
  next();
});

// Méthode statique pour obtenir les statistiques des notifications
notificationSchema.statics.getStats = async function () {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

// Méthode statique pour marquer les notifications comme lues
notificationSchema.statics.markAsRead = async function (userId, notificationIds) {
  return this.updateMany(
    {
      _id: { $in: notificationIds },
      user: userId,
      status: { $in: ['sent', 'delivered'] }
    },
    {
      $set: {
        status: 'read',
        readAt: Date.now()
      }
    }
  );
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;