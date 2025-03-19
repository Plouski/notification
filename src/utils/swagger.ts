// src/utils/swagger.ts
import express from 'express';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

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
  apis: ['./src/routes/*.ts', './src/models/*.ts'],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

export const setupSwagger = (app: express.Application): void => {
  // Ne pas activer Swagger en production pour des raisons de sécurité
  if (process.env.NODE_ENV !== 'production') {
    // Servir la documentation Swagger
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    
    // Endpoint pour récupérer le fichier swagger.json
    app.get('/swagger.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });
    
    console.log('Swagger documentation available at http://localhost:3000/api-docs');
  }
};

export default setupSwagger;