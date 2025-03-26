const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const path = require('path');
const fs = require('fs');

// Vérifier si le fichier swagger.json existe
const swaggerJsonPath = path.join(__dirname, '../swagger.json');
let swaggerDefinition;

try {
  if (fs.existsSync(swaggerJsonPath)) {
    swaggerDefinition = require(swaggerJsonPath);
  } else {
    // Définition de base si le fichier n'existe pas
    swaggerDefinition = {
      openapi: '3.0.0',
      info: {
        title: 'API Service de Notification',
        description: 'Un microservice complet pour l\'envoi de notifications par email, SMS et notifications push.',
        version: '1.0.0',
        contact: {
          email: 'support@example.com'
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT'
        }
      },
      servers: [
        {
          url: '/api',
          description: 'Serveur de développement'
        }
      ]
    };
  }
} catch (error) {
  console.error('Erreur lors du chargement de swagger.json:', error);
  // Définition de base en cas d'erreur
  swaggerDefinition = {
    openapi: '3.0.0',
    info: {
      title: 'API Service de Notification',
      version: '1.0.0'
    }
  };
}

// Options de configuration Swagger
const swaggerOptions = {
  swaggerDefinition,
  apis: ['./routes/*.js'] // Chemin vers les fichiers de routes
};

// Initialisation de Swagger
const swaggerDocs = swaggerJsDoc(swaggerOptions);

// Fonction pour configurer Swagger dans l'application Express
const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'API Service de Notification - Documentation'
  }));
  
  // Exporter la spécification OpenAPI en JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocs);
  });
  
  console.log('Documentation Swagger disponible à: http://localhost:' + (process.env.PORT || 3000) + '/api-docs');
};

module.exports = setupSwagger;