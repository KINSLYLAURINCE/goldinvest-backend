module.exports = (sequelize, DataTypes) => {
    const MiningSession = sequelize.define('MiningSession', {
      userId: {
        type: DataTypes.UUID,       // ⚠️ corrigé : était INTEGER
        allowNull: false,
      },
      machineId:    { type: DataTypes.STRING,  allowNull: false },
      machineName:  { type: DataTypes.STRING,  allowNull: false },
      machineImage: { type: DataTypes.STRING,  allowNull: true },
      tierId:       { type: DataTypes.STRING,  allowNull: false },
      tierLabel:    { type: DataTypes.STRING,  allowNull: false },
      months:       { type: DataTypes.INTEGER, allowNull: false },
      rate:         { type: DataTypes.FLOAT,   allowNull: false },
      amount:       { type: DataTypes.DECIMAL(14, 2), allowNull: false },
      payout:       { type: DataTypes.DECIMAL(14, 2), allowNull: false },
      startDate:    { type: DataTypes.DATE,    allowNull: false },
      endDate:      { type: DataTypes.DATE,    allowNull: false },
      status: {
        type: DataTypes.ENUM('running', 'completed', 'cancelled'),
        defaultValue: 'running',
        allowNull: false,
      },
      paidAt: { type: DataTypes.DATE, allowNull: true },
    }, {
      tableName: 'mining_sessions',
      timestamps: true,
    });
  
    MiningSession.associate = (models) => {
      MiningSession.belongsTo(models.User, { foreignKey: 'userId' });
    };
  
    return MiningSession;
  };