// src/utils/swagger.ts
import express from 'express';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import logger from './logger';

// Options Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Service de Notification API',
      version: '1.0.0',
      description: 'API pour l\'envoi de notifications (email, SMS, push)',
      contact: {
        name: 'Équipe de Développement',
        email: 'dev@example.com',
      },
    },
    servers: [
      {
        url: `http://localhost:3000/api`,
        description: 'Serveur de développement',
      },
      {
        url: `https://api.example.com/api`,
        description: 'Serveur de production',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  // Utilisation de chemins absolus pour trouver les fichiers
  apis: [
    path.resolve(__dirname, '../routes/*.js'), // Notez .js, pas .ts car nous utiliseons les fichiers compilés
    path.resolve(__dirname, '../models/*.js'),
    path.resolve(__dirname, '../routes/*.ts'), // Pour le développement avec ts-node
    path.resolve(__dirname, '../models/*.ts')
  ],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

export const setupSwagger = (app: express.Application): void => {
  // Activer Swagger indépendamment de l'environnement (pour dépannage)
  // En production, vous voudrez peut-être le désactiver
  // if (process.env.NODE_ENV !== 'production') {
    
  // Servir la documentation Swagger
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  
  // Endpoint pour récupérer le fichier swagger.json
  app.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  
  logger.info('Swagger documentation available at http://localhost:3000/api-docs');
  // }
};

export default setupSwagger;