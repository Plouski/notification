export enum NotificationStatus {
    PENDING = 'pending',
    SENT = 'sent',
    DELIVERED = 'delivered',
    FAILED = 'failed',
    OPENED = 'opened',
    CLICKED = 'clicked'
}

export interface DeliveryStatus {
    id: string;
    notificationId: string;
    status: NotificationStatus;
    timestamp: Date;
    provider: string;
    providerMessageId?: string;
    errorMessage?: string;
    attempts: number;
    metadata?: Record<string, any>;
}