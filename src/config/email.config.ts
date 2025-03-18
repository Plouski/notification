export const emailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.example.com',
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || 'user@example.com',
    pass: process.env.EMAIL_PASSWORD || 'password',
  },
  defaultFrom: process.env.EMAIL_FROM || 'notifications@example.com',
  templateDir: process.env.EMAIL_TEMPLATE_DIR || 'src/templates/email',
};