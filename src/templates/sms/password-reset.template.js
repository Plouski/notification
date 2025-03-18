// src/templates/sms/password-reset.template.js

module.exports = (data) => {
    const { code } = data;

    return `Votre code de réinitialisation de mot de passe est: ${code}. Ce code est valide pendant 15 minutes. Si vous n'avez pas demandé cette réinitialisation, veuillez sécuriser votre compte.`;
};