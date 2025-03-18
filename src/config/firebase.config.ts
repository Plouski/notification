import dotenv from 'dotenv';
dotenv.config();

export const firebaseConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID || 'your_project_id',
    privateKey: process.env.FIREBASE_PRIVATE_KEY || 'your_private_key',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'your_client_email',
    databaseURL: process.env.FIREBASE_DATABASE_URL || '',
};