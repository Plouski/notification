const Notification = require('../models/notification');
const User = require('../models/user');
const mailService = require('../services/mailService');
const smsService = require('../services/smsService');
const pushService = require('../services/pushService');
const logger = require('../utils/logger');

// Helper function pour filtrer les notifications
const filterNotifications = async (req, res, filter = {}) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fusionner les filtres
    const finalFilter = { 
      ...filter,
      user: req.user._id 
    };

    // Ajouter des filtres par type ou statut si spécifiés
    if (req.query.type) {
      finalFilter.type = req.query.type;
    }
    if (req.query.status) {
      finalFilter.status = req.query.status;
    }

    // Récupérer les notifications avec pagination
    const notifications = await Notification.find(finalFilter)
      .sort({ sentAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(finalFilter);

    res.status(200).json({
      status: 'success',
      results: notifications.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: {
        notifications
      }
    });
  } catch (err) {
    logger.error('Erreur lors de la récupération des notifications:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Récupérer toutes les notifications de l'utilisateur
exports.getAllNotifications = async (req, res) => {
  await filterNotifications(req, res);
};

// Récupérer les notifications non lues
exports.getUnreadNotifications = async (req, res) => {
  await filterNotifications(req, res, { status: { $in: ['sent', 'delivered'] } });
};

// Récupérer une notification spécifique
exports.getNotification = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        status: 'fail',
        message: 'Notification non trouvée'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        notification
      }
    });
  } catch (err) {
    logger.error(`Erreur lors de la récupération de la notification ${req.params.id}:`, err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Marquer une notification comme lue
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id,
        status: { $in: ['sent', 'delivered'] }
      },
      {
        status: 'read',
        readAt: Date.now()
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!notification) {
      return res.status(404).json({
        status: 'fail',
        message: 'Notification non trouvée ou déjà lue'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        notification
      }
    });
  } catch (err) {
    logger.error(`Erreur lors du marquage de la notification ${req.params.id}:`, err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Supprimer une notification
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        status: 'fail',
        message: 'Notification non trouvée'
      });
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    logger.error(`Erreur lors de la suppression de la notification ${req.params.id}:`, err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Supprimer toutes les notifications
exports.deleteAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user._id });

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    logger.error('Erreur lors de la suppression de toutes les notifications:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Envoyer une notification par email
exports.sendEmail = async (req, res) => {
  try {
    const { to, subject, message, template, variables } = req.body;

    if (!to || !subject || (!message && !template)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Veuillez fournir les destinataires, le sujet et le message ou un template'
      });
    }

    // Trouver l'utilisateur cible (si c'est un utilisateur de notre système)
    const user = await User.findOne({ email: to });
    
    // Options pour l'envoi d'email
    const mailOptions = {
      to,
      subject,
      text: message,
      template,
      variables,
      userId: user ? user._id : null
    };

    // Envoyer l'email
    const result = await mailService.sendMail(mailOptions);

    if (!result.success) {
      return res.status(500).json({
        status: 'fail',
        message: `Échec de l'envoi de l'email: ${result.error}`
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Email envoyé avec succès',
      data: {
        messageId: result.messageId
      }
    });
  } catch (err) {
    logger.error('Erreur lors de l\'envoi de l\'email:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Envoyer une notification par SMS
exports.sendSMS = async (req, res) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        status: 'fail',
        message: 'Veuillez fournir le destinataire et le message'
      });
    }

    // Trouver l'utilisateur cible (si c'est un utilisateur de notre système)
    const user = await User.findOne({ phone: to });
    
    // Options pour l'envoi de SMS
    const smsOptions = {
      to,
      message,
      userId: user ? user._id : null
    };

    // Envoyer le SMS
    const result = await smsService.sendSMS(smsOptions);

    if (!result.success) {
      return res.status(500).json({
        status: 'fail',
        message: `Échec de l'envoi du SMS: ${result.error}`
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'SMS envoyé avec succès',
      data: {
        messageId: result.messageId,
        status: result.status
      }
    });
  } catch (err) {
    logger.error('Erreur lors de l\'envoi du SMS:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Envoyer une notification push
exports.sendPush = async (req, res) => {
  try {
    const { title, body, data, userId, token, topic } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        status: 'fail',
        message: 'Veuillez fournir le titre et le corps de la notification'
      });
    }

    let result;

    // Envoyer à un topic si spécifié
    if (topic) {
      result = await pushService.sendToTopic({
        topic,
        title,
        body,
        data
      });
    } 
    // Envoyer à un utilisateur spécifique ou un token
    else if (userId || token) {
      result = await pushService.sendToDevice({
        userId,
        token,
        title,
        body,
        data
      });
    } else {
      return res.status(400).json({
        status: 'fail',
        message: 'Veuillez fournir un destinataire (userId, token ou topic)'
      });
    }

    if (!result.success) {
      return res.status(500).json({
        status: 'fail',
        message: `Échec de l'envoi de la notification push: ${result.error}`
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Notification push envoyée avec succès',
      data: result
    });
  } catch (err) {
    logger.error('Erreur lors de l\'envoi de la notification push:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Obtenir des statistiques sur les notifications
exports.getNotificationStats = async (req, res) => {
  try {
    // Statistiques générales
    const stats = await Notification.getStats();
    
    // Statistiques par type
    const typeStats = await Notification.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Statistiques temporelles (derniers 7 jours)
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    
    const timeStats = await Notification.aggregate([
      { 
        $match: { 
          user: req.user._id,
          sentAt: { $gte: last7Days }
        } 
      },
      {
        $group: {
          _id: { 
            $dateToString: { format: "%Y-%m-%d", date: "$sentAt" } 
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        overall: stats,
        byType: typeStats,
        byDate: timeStats
      }
    });
  } catch (err) {
    logger.error('Erreur lors de la récupération des statistiques de notification:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};