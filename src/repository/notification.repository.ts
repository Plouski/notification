// src/repository/notification.repository.ts (simplifié)
import { Notification } from '../models/notification.model';
import { DeliveryStatus, NotificationStatus } from '../models/delivery-status.model';
import logger from '../utils/logger';

export class NotificationRepository {
    private notifications: Map<string, Notification> = new Map();
    private deliveryStatuses: Map<string, DeliveryStatus> = new Map();

    // Sauvegarder une nouvelle notification
    async saveNotification(notification: Notification): Promise<Notification> {
        try {
            // Simuler un enregistrement MongoDB
            this.notifications.set(notification.id, notification);
            logger.info(`Notification saved with ID: ${notification.id}`);
            return notification;
        } catch (error) {
            logger.error('Failed to save notification', {
                error: error instanceof Error ? error.message : String(error),
                notificationId: notification.id,
            });
            throw error;
        }
    }

    // Sauvegarder un statut de livraison
    async saveDeliveryStatus(status: DeliveryStatus): Promise<DeliveryStatus> {
        try {
            // Simuler un enregistrement MongoDB
            this.deliveryStatuses.set(status.id, status);
            logger.info(`Delivery status saved with ID: ${status.id}`);
            return status;
        } catch (error) {
            logger.error('Failed to save delivery status', {
                error: error instanceof Error ? error.message : String(error),
                statusId: status.id,
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
            const notification = this.notifications.get(id);
            if (notification) {
                this.notifications.set(id, {
                    ...notification,
                    status,
                    ...(updates || {}),
                    updatedAt: new Date()
                });
            }
            logger.info(`Notification status updated: ${id} -> ${status}`);
        } catch (error) {
            logger.error('Failed to update notification status', {
                error: error instanceof Error ? error.message : String(error),
                notificationId: id,
            });
            throw error;
        }
    }

    // Récupérer une notification par son ID
    async getNotificationById(id: string): Promise<Notification | null> {
        return this.notifications.get(id) || null;
    }

    // Récupérer les notifications récentes
    async getNotifications(limit = 10): Promise<Notification[]> {
        return Array.from(this.notifications.values())
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, limit);
    }

    // Récupérer toutes les notifications d'un utilisateur
    async getNotificationsByUserId(userId: string, limit = 20, offset = 0): Promise<Notification[]> {
        const userNotifications = Array.from(this.notifications.values())
            .filter(notification => notification.recipient.id === userId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(offset, offset + limit);
            
        return userNotifications;
    }

    // Récupérer l'historique des statuts d'une notification
    async getDeliveryStatusesByNotificationId(notificationId: string): Promise<DeliveryStatus[]> {
        const notificationStatuses = Array.from(this.deliveryStatuses.values())
            .filter(status => status.notificationId === notificationId)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            
        return notificationStatuses;
    }

    // Récupérer les notifications en attente pour ré-essayer l'envoi
    async getPendingNotifications(limit = 100): Promise<Notification[]> {
        const pendingNotifications = Array.from(this.notifications.values())
            .filter(notification => [NotificationStatus.PENDING, NotificationStatus.FAILED].includes(notification.status))
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
            .slice(0, limit);
            
        return pendingNotifications;
    }
}

// Exporter une instance par défaut du repository
const notificationRepository = new NotificationRepository();
export default notificationRepository;