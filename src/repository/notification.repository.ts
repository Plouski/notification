// src/repository/notification.repository.ts
import {
    Notification
} from '../models/notification.model';
import {
    NotificationModel,
    NotificationDocument
} from '../models/mongodb/notification.model';
import {
    DeliveryStatusModel,
    DeliveryStatusDocument
} from '../models/mongodb/delivery-status.model';
import logger from '../utils/logger';
import { DeliveryStatus, NotificationStatus } from '../models/delivery-status.model';

export class NotificationRepository {
    // Sauvegarder une nouvelle notification
    async saveNotification(notification: Notification): Promise<Notification> {
        try {
            const newNotification = new NotificationModel({
                _id: notification.id, // Utiliser l'ID généré comme _id MongoDB
                type: notification.type,
                template: notification.template,
                recipient: notification.recipient,
                content: notification.content,
                status: notification.status,
                sentAt: notification.sentAt,
                deliveredAt: notification.deliveredAt,
                metadata: notification.metadata,
            });

            await newNotification.save();

            return this.mapToNotification(newNotification);
        } catch (error) {
            logger.error('Failed to save notification to MongoDB', {
                error: error instanceof Error ? error.message : String(error),
                notificationId: notification.id,
            });

            throw error;
        }
    }

    // Sauvegarder un statut de livraison
    async saveDeliveryStatus(status: DeliveryStatus): Promise<DeliveryStatus> {
        try {
            const newStatus = new DeliveryStatusModel({
                _id: status.id, // Utiliser l'ID généré comme _id MongoDB
                notificationId: status.notificationId,
                status: status.status,
                timestamp: status.timestamp,
                provider: status.provider,
                providerMessageId: status.providerMessageId,
                errorMessage: status.errorMessage,
                attempts: status.attempts,
                metadata: status.metadata,
            });

            await newStatus.save();

            return this.mapToDeliveryStatus(newStatus);
        } catch (error) {
            logger.error('Failed to save delivery status to MongoDB', {
                error: error instanceof Error ? error.message : String(error),
                statusId: status.id,
                notificationId: status.notificationId,
            });

            throw error;
        }
    }

    // Mettre à jour le statut d'une notification
    async updateNotificationStatus(
        id: string,
        status: NotificationStatus,
        updates?: Partial<Notification>
    ): Promise<void> {
        try {
            const updateData: Record<string, any> = {
                status,
                ...updates,
            };

            await NotificationModel.findByIdAndUpdate(id, updateData);
        } catch (error) {
            logger.error('Failed to update notification status in MongoDB', {
                error: error instanceof Error ? error.message : String(error),
                notificationId: id,
                status,
            });

            throw error;
        }
    }

    // Récupérer une notification par son ID
    async getNotificationById(id: string): Promise<Notification | null> {
        try {
            const notification = await NotificationModel.findById(id);

            if (!notification) {
                return null;
            }

            return this.mapToNotification(notification);
        } catch (error) {
            logger.error('Failed to get notification from MongoDB', {
                error: error instanceof Error ? error.message : String(error),
                notificationId: id,
            });

            throw error;
        }
    }

    // Récupérer toutes les notifications d'un utilisateur
    async getNotificationsByUserId(userId: string, limit = 20, offset = 0): Promise<Notification[]> {
        try {
            const notifications = await NotificationModel.find({ 'recipient.id': userId })
                .sort({ createdAt: -1 })
                .skip(offset)
                .limit(limit);

            return notifications.map(notification => this.mapToNotification(notification));
        } catch (error) {
            logger.error('Failed to get notifications by user ID from MongoDB', {
                error: error instanceof Error ? error.message : String(error),
                userId,
            });

            throw error;
        }
    }

    // Récupérer l'historique des statuts d'une notification
    async getDeliveryStatusesByNotificationId(notificationId: string): Promise<DeliveryStatus[]> {
        try {
            const statuses = await DeliveryStatusModel.find({ notificationId })
                .sort({ timestamp: -1 });

            return statuses.map(status => this.mapToDeliveryStatus(status));
        } catch (error) {
            logger.error('Failed to get delivery statuses from MongoDB', {
                error: error instanceof Error ? error.message : String(error),
                notificationId,
            });

            throw error;
        }
    }

    // Récupérer les notifications en attente pour ré-essayer l'envoi
    async getPendingNotifications(limit = 100): Promise<Notification[]> {
        try {
            const notifications = await NotificationModel.find({
                status: { $in: [NotificationStatus.PENDING, NotificationStatus.FAILED] },
                // Optionnellement, ajouter une condition pour limiter le nombre de tentatives
                // ou pour ne récupérer que les notifications d'une certaine ancienneté
            })
                .sort({ createdAt: 1 })
                .limit(limit);

            return notifications.map(notification => this.mapToNotification(notification));
        } catch (error) {
            logger.error('Failed to get pending notifications from MongoDB', {
                error: error instanceof Error ? error.message : String(error),
            });

            throw error;
        }
    }

    // Conversion de DocumentMongoDB vers notre modèle de domaine
    private mapToNotification(doc: NotificationDocument): Notification {
        return {
            id: doc._id.toString(),
            type: doc.type,
            template: doc.template,
            recipient: doc.recipient,
            content: doc.content,
            status: doc.status,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            sentAt: doc.sentAt,
            deliveredAt: doc.deliveredAt,
            metadata: doc.metadata,
        };
    }

    // Conversion de DocumentMongoDB vers notre modèle de domaine
    private mapToDeliveryStatus(doc: DeliveryStatusDocument): DeliveryStatus {
        return {
            id: doc._id.toString(),
            notificationId: doc.notificationId,
            status: doc.status,
            timestamp: doc.timestamp,
            provider: doc.provider,
            providerMessageId: doc.providerMessageId,
            errorMessage: doc.errorMessage,
            attempts: doc.attempts,
            metadata: doc.metadata,
        };
    }
}

export default new NotificationRepository();