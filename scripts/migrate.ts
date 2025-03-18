// scripts/migrate.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Charger les variables d'environnement
dotenv.config();

// Modèles MongoDB
import '../src/models/mongodb/notification.model';
import '../src/models/mongodb/delivery-status.model';

// Chemin vers le dossier des migrations
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// Options de connexion MongoDB
const dbOptions: mongoose.ConnectOptions = {
  //@ts-ignore
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

// Modèle pour stocker les migrations exécutées
interface IMigration extends mongoose.Document {
  name: string;
  executedAt: Date;
}

const MigrationSchema = new mongoose.Schema<IMigration>({
  name: { type: String, required: true, unique: true },
  executedAt: { type: Date, default: Date.now }
});

const Migration = mongoose.model<IMigration>('Migration', MigrationSchema);

// Fonction principale
async function runMigrations() {
  try {
    // Connexion à MongoDB
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/notification-service';
    console.log(`Connecting to MongoDB at ${dbUri}...`);
    
    await mongoose.connect(dbUri, dbOptions);
    console.log('Connected to MongoDB successfully.');

    // Vérifier que le dossier des migrations existe
    if (!fs.existsSync(MIGRATIONS_DIR)) {
      console.error(`Migration directory not found: ${MIGRATIONS_DIR}`);
      process.exit(1);
    }

    // Récupérer tous les fichiers de migration triés par nom
    const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.js'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('No migration files found.');
      await mongoose.disconnect();
      return;
    }

    // Récupérer les migrations déjà exécutées
    const executedMigrations = await Migration.find().select('name').lean();
    const executedMigrationNames = new Set(executedMigrations.map(m => m.name));

    // Exécuter les migrations non exécutées
    for (const filename of migrationFiles) {
      if (executedMigrationNames.has(filename)) {
        console.log(`Migration ${filename} already executed. Skipping.`);
        continue;
      }

      try {
        console.log(`Executing migration: ${filename}`);
        
        const migration = require(path.join(MIGRATIONS_DIR, filename));
        
        if (typeof migration.up !== 'function') {
          throw new Error(`Migration ${filename} does not export an 'up' function.`);
        }
        
        await migration.up();
        
        // Enregistrer la migration comme exécutée
        await Migration.create({ name: filename });
        
        console.log(`Migration ${filename} executed successfully.`);
      } catch (error) {
        console.error(`Failed to execute migration ${filename}:`, error);
        process.exit(1);
      }
    }

    console.log('All migrations executed successfully.');
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Exécuter le script
runMigrations();