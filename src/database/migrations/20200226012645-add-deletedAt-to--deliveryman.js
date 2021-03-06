module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('deliveryman', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  down: queryInterface => {
    return queryInterface.removeColumn('deliveryman', 'deleted_at');
  },
};
