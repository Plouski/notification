# Service de Notification

Un microservice pour l'envoi de notifications par email, SMS et push, développé avec Node.js, Express et TypeScript.

## Fonctionnalités

- ✉️ Envoi d'emails (via Nodemailer)
- 📱 Envoi de SMS (via Twilio)
- 🔔 Envoi de notifications push (via Firebase)
- 📊 Suivi des statuts de livraison
- 🔒 Sécurité (JWT, rate limiting)
- 📝 Journalisation structurée
- 🔄 API RESTful documentée avec Swagger

## Prérequis

- Node.js 18+
- MongoDB 6.0+
- Docker et Docker Compose (optionnel)

## Installation

### Avec npm

```bash
# Installation des dépendances
npm install

# Compilation TypeScript
npm run build

# Démarrage du serveur
npm start
```

### Avec Docker

```bash
# Construction et démarrage des services
docker-compose up -d
```

## Configuration

Créez un fichier `.env` à la racine du projet en vous basant sur le fichier `.env.example` fourni.

Variables d'environnement principales :

- `NODE_ENV` : Environnement (development, production)
- `PORT` : Port du serveur
- `MONGODB_URI` : URI de connexion MongoDB
- `JWT_SECRET` : Clé secrète pour les tokens JWT
- `EMAIL_*` : Configuration du serveur SMTP
- `TWILIO_*` : Configuration Twilio pour les SMS
- `FIREBASE_*` : Configuration Firebase pour les notifications push

## Structure du projet

```
service-notification/
├── src/
│   ├── config/          # Configuration
│   ├── controllers/     # Contrôleurs
│   ├── middlewares/     # Middlewares Express
│   ├── models/          # Modèles de données
│   ├── repository/      # Couche d'accès aux données
│   ├── routes/          # Routes API
│   ├── services/        # Services métier
│   ├── templates/       # Templates (email, SMS)
│   ├── utils/           # Utilitaires
│   └── app.ts           # Point d'entrée
├── tests/               # Tests
├── Dockerfile           # Configuration Docker
├── docker-compose.yml   # Configuration Docker Compose
└── package.json         # Configuration npm
```

## API

L'API est documentée avec Swagger et accessible à l'adresse : http://localhost:3000/api-docs

### Endpoints principaux

- `POST /api/notifications/email/verify-account` : Envoyer un email de vérification de compte
- `POST /api/notifications/email/reset-password` : Envoyer un email de réinitialisation de mot de passe
- `POST /api/notifications/sms/reset-password` : Envoyer un SMS de réinitialisation de mot de passe
- `POST /api/notifications/push` : Envoyer une notification push
- `POST /api/notifications/webhook/sms` : Webhook pour les statuts de livraison des SMS

## Tests

```bash
# Exécuter les tests
npm test

# Exécuter les tests avec couverture
npm run test:coverage
```

## Déploiement

### Préparation pour la production

1. Modifiez le fichier `.env` avec les paramètres de production
2. Compilez le code TypeScript avec `npm run build`
3. Démarrez le service avec `NODE_ENV=production npm start`

### Avec Docker

```bash
# Construction de l'image
docker build -t service-notification .

# Démarrage du conteneur
docker run -p 3000:3000 --env-file .env service-notification
```

## Bonnes pratiques

- Limiter le nombre de messages envoyés par utilisateur
- Surveiller les taux de livraison et d'ouverture
- Mettre en œuvre des mécanismes de réessai pour les messages non livrés
- Effectuer des sauvegardes régulières de la base de données

## Licence

ISC