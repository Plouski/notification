// src/models/mongodb/notification.model.ts
import mongoose, { Document, Schema } from 'mongoose';
import { 
  NotificationType, 
  NotificationTemplate 
} from '../notification.model';
import { NotificationStatus } from '../delivery-status.model';

// Interface pour le document MongoDB
export interface NotificationDocument extends Document {
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

// Schéma pour le document MongoDB
const NotificationSchema = new Schema<NotificationDocument>(
  {
    _id: {
      type: String,  // Utiliser String au lieu d'ObjectId
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
    },
    template: {
      type: String,
      enum: Object.values(NotificationTemplate),
      required: true,
    },
    recipient: {
      id: {
        type: String,
        required: true,
        index: true,
      },
      email: String,
      phone: String,
      deviceToken: String,
    },
    content: {
      subject: String,
      body: {
        type: String,
        required: true,
      },
      data: Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: Object.values(NotificationStatus),
      default: NotificationStatus.PENDING,
      index: true,
    },
    sentAt: Date,
    deliveredAt: Date,
    metadata: Schema.Types.Mixed,
  },
  {
    timestamps: true,
    collection: 'notifications',
  }
);

// Index pour optimiser les requêtes courantes
NotificationSchema.index({ 'recipient.id': 1, createdAt: -1 });
NotificationSchema.index({ status: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, status: 1, createdAt: -1 });

// Modèle MongoDB
export const NotificationModel = mongoose.model<NotificationDocument>('Notification', NotificationSchema);