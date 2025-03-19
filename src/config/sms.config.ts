import dotenv from 'dotenv';
dotenv.config();

export const smsConfig = {
  accountSid: process.env.TWILIO_ACCOUNT_SID || '',
  authToken: process.env.TWILIO_AUTH_TOKEN || '',
  fromNumber: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
  
  // Le callback URL ne sera utilisé que s'il commence par https:// (valide en production)
  statusCallbackUrl: process.env.SMS_STATUS_CALLBACK_URL || '',
  
  rateLimit: {
    // Limite pour éviter l'abus (nombre de SMS par utilisateur par jour)
    maxSmsPerUserPerDay: parseInt(process.env.MAX_SMS_PER_USER_PER_DAY || '5', 10),
  },
};