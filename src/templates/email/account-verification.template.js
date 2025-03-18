// src/templates/email/account-verification.template.js

module.exports = (data) => {
    const { name, verificationUrl } = data;

    return {
        subject: 'Vérification de votre compte',
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Vérification de votre compte</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
            }
            .header {
              background-color: #4A7CF6;
              padding: 20px;
              color: white;
              text-align: center;
            }
            .content {
              padding: 20px;
              background-color: #f9f9f9;
            }
            .button {
              display: inline-block;
              background-color: #4A7CF6;
              color: white;
              text-decoration: none;
              padding: 10px 20px;
              border-radius: 5px;
              margin: 20px 0;
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
            <h1>Bienvenue sur notre plateforme</h1>
          </div>
          <div class="content">
            <p>Bonjour ${name || 'utilisateur'},</p>
            <p>Merci de vous être inscrit. Pour vérifier votre compte, veuillez cliquer sur le bouton ci-dessous :</p>
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Vérifier mon compte</a>
            </div>
            <p>Si le bouton ne fonctionne pas, vous pouvez également copier et coller le lien suivant dans votre navigateur :</p>
            <p>${verificationUrl}</p>
            <p>Ce lien expire dans 24 heures.</p>
            <p>Si vous n'avez pas créé de compte, veuillez ignorer cet email.</p>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            <p>© ${new Date().getFullYear()} Votre Entreprise. Tous droits réservés.</p>
          </div>
        </body>
        </html>
      `,
        text: `Bienvenue sur notre plateforme\n\nBonjour ${name || 'utilisateur'},\n\nMerci de vous être inscrit. Pour vérifier votre compte, veuillez visiter ce lien : ${verificationUrl}\n\nCe lien expire dans 24 heures.\n\nSi vous n'avez pas créé de compte, veuillez ignorer cet email.\n\nCet email a été envoyé automatiquement, merci de ne pas y répondre.\n\n© ${new Date().getFullYear()} Votre Entreprise. Tous droits réservés.`
    };
};