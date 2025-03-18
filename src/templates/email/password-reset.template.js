// src/templates/email/password-reset.template.js

module.exports = (data) => {
    const { name, code } = data;

    return {
        subject: 'Réinitialisation de votre mot de passe',
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Réinitialisation de votre mot de passe</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
            }
            .header {
              background-color: #F64A7C;
              padding: 20px;
              color: white;
              text-align: center;
            }
            .content {
              padding: 20px;
              background-color: #f9f9f9;
            }
            .code {
              font-size: 28px;
              font-weight: bold;
              text-align: center;
              padding: 15px;
              margin: 20px 0;
              background-color: #e8e8e8;
              border-radius: 5px;
              letter-spacing: 5px;
            }
            .footer {
              font-size: 12px;
              color: #777;
              text-align: center;
              padding: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Réinitialisation de mot de passe</h1>
          </div>
          <div class="content">
            <p>Bonjour ${name || 'utilisateur'},</p>
            <p>Vous avez demandé une réinitialisation de votre mot de passe. Voici votre code de vérification :</p>
            <div class="code">${code}</div>
            <p>Ce code expire dans 15 minutes.</p>
            <p>Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email et sécuriser votre compte.</p>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            <p>© ${new Date().getFullYear()} Votre Entreprise. Tous droits réservés.</p>
          </div>
        </body>
        </html>
      `,
        text: `Réinitialisation de mot de passe\n\nBonjour ${name || 'utilisateur'},\n\nVous avez demandé une réinitialisation de votre mot de passe. Voici votre code de vérification : ${code}\n\nCe code expire dans 15 minutes.\n\nSi vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email et sécuriser votre compte.\n\nCet email a été envoyé automatiquement, merci de ne pas y répondre.\n\n© ${new Date().getFullYear()} Votre Entreprise. Tous droits réservés.`
    };
};