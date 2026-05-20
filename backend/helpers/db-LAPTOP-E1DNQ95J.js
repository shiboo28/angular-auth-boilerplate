const sequelize = require('../config/database');
const Account = require('../models/account');

module.exports = {
  Account,
  
  async initialize() {
    // Sync all models with database (creates tables if they don't exist)
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
    
    await sequelize.sync({ alter: true });
    console.log('✅ Database tables synced');
  }
};
