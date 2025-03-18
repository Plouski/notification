// src/templates/sms/verification-code.template.js

module.exports = (data) => {
    const { code } = data;

    return `Votre code de vérification est: ${code}. Ce code est valide pendant 10 minutes. Ne le partagez avec personne.`;
};