const twilio = require('twilio');
const logger = require('../utils/logger');
const Notification = require('../models/notification');

class SMSService {
  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;
    
    // Vérifier les identifiants
    this.verifyCredentials();
  }

  async verifyCredentials() {
    try {
      await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      logger.info('Service SMS prêt');
    } catch (error) {
      logger.error('Erreur de connexion au service SMS:', error);
    }
  }

  async sendSMS(options) {
    try {
      if (!options.to || !options.message) {
        throw new Error('Numéro de téléphone et message requis pour envoyer un SMS');
      }

      // Vérifier et formater le numéro de téléphone
      let toNumber = options.to;
      if (!toNumber.startsWith('+')) {
        toNumber = `+${toNumber}`; // Ajouter le préfixe + si nécessaire
      }

      // Créer l'enregistrement de notification
      const notification = await Notification.create({
        user: options.userId,
        type: 'sms',
        title: 'SMS Notification',
        message: options.message,
        status: 'pending',
        metadata: {
          to: toNumber
        }
      });

      // Envoyer le SMS via Twilio
      const message = await this.client.messages.create({
        body: options.message,
        from: this.phoneNumber,
        to: toNumber
      });

      // Mettre à jour le statut de la notification
      await Notification.findByIdAndUpdate(notification._id, {
        status: message.status === 'sent' ? 'sent' : 'pending',
        deliveredAt: message.status === 'sent' ? Date.now() : undefined,
        metadata: {
          ...notification.metadata,
          messageId: message.sid,
          status: message.status
        }
      });

      logger.info(`SMS envoyé à ${toNumber}: ${message.sid}`);
      return { 
        success: true, 
        messageId: message.sid, 
        status: message.status,
        notificationId: notification._id 
      };
    } catch (error) {
      logger.error(`Erreur lors de l'envoi du SMS à ${options.to}:`, error);
      
      // Mettre à jour le statut en cas d'échec
      if (options.userId) {
        await Notification.findOneAndUpdate(
          { user: options.userId, type: 'sms', status: 'pending' },
          {
            status: 'failed',
            failureReason: error.message
          }
        );
      }
      
      return { success: false, error: error.message };
    }
  }

  async sendVerificationCode(user, code) {
    if (!user.phone) {
      return { success: false, error: 'Numéro de téléphone non disponible' };
    }

    return this.sendSMS({
      userId: user._id,
      to: user.phone,
      message: `Votre code de vérification pour RoadTrip! est: ${code}. Ce code expire dans 10 minutes.`
    });
  }

  async sendPasswordResetCode(user, code) {
    if (!user.phone) {
      return { success: false, error: 'Numéro de téléphone non disponible' };
    }

    return this.sendSMS({
      userId: user._id,
      to: user.phone,
      message: `Votre code de réinitialisation de mot de passe pour RoadTrip! est: ${code}. Ce code expire dans 10 minutes.`
    });
  }

  // Webhook pour recevoir les mises à jour de statut des SMS de Twilio
  async handleStatusUpdate(messageId, newStatus) {
    try {
      // Mettre à jour le statut de la notification
      const notification = await Notification.findOne({
        'metadata.messageId': messageId
      });

      if (!notification) {
        logger.warn(`Notification non trouvée pour le messageId: ${messageId}`);
        return { success: false, error: 'Notification non trouvée' };
      }

      let status = 'pending';
      if (newStatus === 'delivered') {
        status = 'delivered';
      } else if (newStatus === 'sent') {
        status = 'sent';
      } else if (['failed', 'undelivered'].includes(newStatus)) {
        status = 'failed';
      }

      await Notification.findByIdAndUpdate(notification._id, {
        status,
        deliveredAt: newStatus === 'delivered' ? Date.now() : notification.deliveredAt,
        failureReason: ['failed', 'undelivered'].includes(newStatus) ? `Statut Twilio: ${newStatus}` : undefined,
        metadata: {
          ...notification.metadata,
          twilioStatus: newStatus
        }
      });

      logger.info(`Statut SMS mis à jour: ${messageId} -> ${newStatus}`);
      return { success: true };
    } catch (error) {
      logger.error(`Erreur lors de la mise à jour du statut SMS ${messageId}:`, error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new SMSService();