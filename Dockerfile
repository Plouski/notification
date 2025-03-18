# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci

# Copier le reste du code source
COPY . .

# Compiler TypeScript en JavaScript
RUN npm run build

# Étape de production
FROM node:18-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer uniquement les dépendances de production
RUN npm ci --only=production

# Copier les fichiers compilés
COPY --from=builder /app/dist ./dist

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=3000

# Exposer le port
EXPOSE 3000

# Démarrer l'application
CMD ["node", "dist/app.js"]

# docker-compose.yml
version: '3.8'

services:
  notification-service:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: notification-service
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3000
      - MONGODB_URI=mongodb://mongodb:27017/notification-service
      # Configuration des services d'email
      - EMAIL_HOST=smtp.example.com
      - EMAIL_PORT=587
      - EMAIL_USER=your_email@example.com
      - EMAIL_PASSWORD=your_password
      - EMAIL_FROM=notifications@example.com
      # Configuration de Twilio pour les SMS
      - TWILIO_ACCOUNT_SID=your_twilio_account_sid
      - TWILIO_AUTH_TOKEN=your_twilio_auth_token
      - TWILIO_PHONE_NUMBER=+1234567890
      # Configuration de Firebase pour les notifications push
      - FIREBASE_PROJECT_ID=your_project_id
      - FIREBASE_PRIVATE_KEY=your_firebase_private_key
      - FIREBASE_CLIENT_EMAIL=your_firebase_client_email
    ports:
      - "3000:3000"
    depends_on:
      - mongodb
    networks:
      - notification-network

  mongodb:
    image: mongo:6.0
    container_name: mongodb
    restart: unless-stopped
    environment:
      - MONGO_INITDB_DATABASE=notification-service
    volumes:
      - mongodb-data:/data/db
    ports:
      - "27017:27017"
    networks:
      - notification-network

volumes:
  mongodb-data:

networks:
  notification-network:
    driver: bridge