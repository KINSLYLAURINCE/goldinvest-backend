const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const Admin = sequelize.define('Admin', {
  id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  email:     { type: DataTypes.STRING, allowNull: false, unique: true },
  password:  { type: DataTypes.STRING, allowNull: false },
  role:      { type: DataTypes.STRING, defaultValue: 'admin' },
  lastLogin: { type: DataTypes.DATE },
}, { tableName: 'admins', timestamps: true });

// PAS de hook beforeCreate — on hash manuellement dans le seeder

Admin.prototype.comparePassword = function(pwd) {
  return bcrypt.compare(pwd, this.password);
};

module.exports = Admin;