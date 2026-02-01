const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EmployeeWorkingHours = sequelize.define('EmployeeWorkingHours', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'employees', key: 'id' },
    onDelete: 'CASCADE',
  },
  day_of_week: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '0=Pazar, 1=Pazartesi, ... 6=Cumartesi',
  },
  start_time: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  end_time: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  breaks_json: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: '[{ start, end }]',
  },
}, {
  tableName: 'employee_working_hours',
});

module.exports = EmployeeWorkingHours;
