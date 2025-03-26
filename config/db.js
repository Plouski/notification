const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    logger.info(`MongoDB connectée: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`Erreur: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;