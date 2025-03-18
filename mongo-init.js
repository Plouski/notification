// mongo-init.js
print('Initializing MongoDB for notification-service...');

// Création de la base de données
db = db.getSiblingDB('notification-service');

// Création d'un utilisateur dédié pour l'application
db.createUser({
  user: 'notification_user',
  pwd: 'notification_password',
  roles: [
    { role: 'readWrite', db: 'notification-service' }
  ]
});

// Création des collections
db.createCollection('notifications');
db.createCollection('delivery_statuses');

// Création des index
db.notifications.createIndex({ 'recipient.id': 1, createdAt: -1 });
db.notifications.createIndex({ status: 1, createdAt: -1 });
db.notifications.createIndex({ type: 1, status: 1, createdAt: -1 });

db.delivery_statuses.createIndex({ notificationId: 1, timestamp: -1 });
db.delivery_statuses.createIndex({ status: 1, timestamp: -1 });
db.delivery_statuses.createIndex({ provider: 1, providerMessageId: 1 }, { sparse: true });

print('MongoDB initialization completed successfully.');