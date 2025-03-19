# Service de Notification

Un microservice complet pour l'envoi de notifications par email, SMS et notifications push. Ce service permet de gérer les communications avec vos utilisateurs de manière fiable et traçable.

## Fonctionnalités

- 📧 **Notifications par email** : Intégration avec SendGrid et Nodemailer
- 📱 **Notifications par SMS** : Intégration avec Twilio
- 🔔 **Notifications push** : Intégration avec Firebase Cloud Messaging
- 📊 **Suivi des statuts** : Traçage complet des statuts de livraison
- 📝 **Templates** : Support de templates pour tous les types de notifications
- 🔒 **Sécurité** : JWT pour l'authentification des requêtes
- 📈 **Rate limiting** : Protection contre les abus

## Prérequis

- Node.js v18+
- MongoDB v6+
- Redis (optionnel, pour le rate limiting distribué)

## Installation

1. Cloner le dépôt
```bash
git clone https://github.com/votre-nom/service-notification.git
cd service-notification
```

2. Installer les dépendances
```bash
npm install
```

3. Configurer l'environnement
```bash
cp .env.example .env
# Modifier les variables d'environnement selon votre configuration
```

4. Lancer le service en développement
```bash
npm run dev
```

## Docker

Le service est entièrement conteneurisé pour faciliter le déploiement:

```bash
# Construire l'image
docker-compose build

# Lancer les services
docker-compose up -d
```

## API

L'API est documentée via Swagger et accessible à l'adresse:
- http://localhost:3000/api-docs (uniquement en développement)

### Endpoints principaux

- `POST /api/notifications/email/verify-account` - Envoyer un email de vérification
- `POST /api/notifications/email/reset-password` - Envoyer un email de réinitialisation
- `POST /api/notifications/sms/reset-password` - Envoyer un SMS de réinitialisation
- `POST /api/notifications/push` - Envoyer une notification push
- `POST /api/notifications/webhook/sms` - Webhook pour les statuts SMS (Twilio)

## Architecture

Le service est construit selon une architecture en couches:

- **Controllers**: Gestion des requêtes HTTP
- **Services**: Logique métier et intégration avec les fournisseurs
- **Repository**: Accès aux données
- **Models**: Définition des objets de domaine
- **Middleware**: Authentification, validation, etc.
- **Utils**: Utilitaires partagés

## Mode Simulation

En développement, le service fonctionne en mode simulation et n'envoie pas réellement de notifications. Les notifications sont enregistrées dans les logs pour faciliter le développement.

## Tests

```bash
# Exécuter les tests unitaires
npm test

# Exécuter les tests avec couverture
npm run test:coverage
```

## Respect des réglementations

Ce service est conçu pour respecter:
- Le RGPD (limiter les données personnelles, consentement explicite)
- Les réglementations anti-spam (opt-in, désinscription facile)
- Le stockage sécurisé des données (chiffrement des informations sensibles)

## Licence

MIT