// test-sendgrid.js
require('dotenv').config(); // Pour charger les variables d'environnement
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Afficher le début de la clé API pour déboguer
console.log(`Using API key starting with: ${process.env.SENDGRID_API_KEY?.substring(0, 5)}...`);

const msg = {
    to: 'votre_email_reel@example.com', // Votre email pour tester
    from: 'votre_expediteur_verifie@votredomaine.com', // Doit être vérifié dans SendGrid
    subject: 'Test SendGrid',
    text: 'Ceci est un test d\'envoi avec SendGrid',
    html: '<strong>Ceci est un test d\'envoi avec SendGrid</strong>',
};

sgMail
    .send(msg)
    .then((response) => {
        console.log('Email sent successfully');
        console.log('Response:', response[0].statusCode);
        console.log('Headers:', response[0].headers);
    })
    .catch((error) => {
        console.error('Error sending email:');
        console.error(error);

        if (error.response) {
            console.error('Error body:', error.response.body);
        }
    });