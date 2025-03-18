// src/models/mongodb/delivery-status.model.ts
import mongoose, { Document, Schema } from 'mongoose';
import { NotificationStatus } from '../delivery-status.model';

// Interface pour le document MongoDB
export interface DeliveryStatusDocument extends Document {
  notificationId: string;
  status: NotificationStatus;
  timestamp: Date;
  provider: string;
  providerMessageId?: string;
  errorMessage?: string;
  attempts: number;
  metadata?: Record<string, any>;
}

// Schéma pour le document MongoDB
const DeliveryStatusSchema = new Schema<DeliveryStatusDocument>(
  {
    _id: {
      type: String,  // Utiliser String au lieu d'ObjectId
      required: true,
    },
    notificationId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(NotificationStatus),
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    provider: {
      type: String,
      required: true,
    },
    providerMessageId: String,
    errorMessage: String,
    attempts: {
      type: Number,
      default: 1,
    },
    metadata: Schema.Types.Mixed,
  },
  {
    timestamps: true,
    collection: 'delivery_statuses',
  }
);

// Index pour optimiser les requêtes courantes
DeliveryStatusSchema.index({ notificationId: 1, timestamp: -1 });
DeliveryStatusSchema.index({ status: 1, timestamp: -1 });
DeliveryStatusSchema.index({ provider: 1, providerMessageId: 1 }, { sparse: true });

// Modèle MongoDB
export const DeliveryStatusModel = mongoose.model<DeliveryStatusDocument>('DeliveryStatus', DeliveryStatusSchema);