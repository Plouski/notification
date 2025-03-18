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

# Copier les fichiers compilés depuis l'étape de build
COPY --from=builder /app/dist ./dist

# Copier les templates nécessaires
COPY --from=builder /app/src/templates ./dist/templates

# Créer le dossier de logs
RUN mkdir -p logs

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=3000

# Utilisateur non privilégié pour plus de sécurité
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

# Exposer le port
EXPOSE 3000

# Surveillance de santé
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Démarrer l'application
CMD ["node", "dist/app.js"]