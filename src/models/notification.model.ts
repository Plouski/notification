// src/models/notification.model.ts
import { NotificationStatus } from "./delivery-status.model";

export enum NotificationType {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push'
}

export enum NotificationTemplate {
  ACCOUNT_VERIFICATION = 'account-verification',
  PASSWORD_RESET = 'password-reset',
  GENERAL_NOTIFICATION = 'general-notification'
}

export interface NotificationPayload {
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientDeviceToken?: string;
  template: NotificationTemplate;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface Notification {
  id: string;
  type: NotificationType;
  template: NotificationTemplate;
  recipient: {
    id: string;
    email?: string;
    phone?: string;
    deviceToken?: string;
  };
  content: {
    subject?: string;
    body: string;
    data?: Record<string, any>;
  };
  status: NotificationStatus;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  metadata?: Record<string, any>;
}