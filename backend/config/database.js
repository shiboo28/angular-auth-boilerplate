const { Sequelize } = require('sequelize');

// Railway provides MYSQL_URL automatically when you link a MySQL service
const sequelize = new Sequelize(process.env.MYSQL_URL || process.env.DATABASE_URL, {
  dialect: 'mysql',
  logging: false
});

module.exports = sequelize;
