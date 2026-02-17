"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("tenant", "primary_color", {
      type: Sequelize.STRING(7),
      allowNull: true,
    });
    await queryInterface.addColumn("tenant", "secondary_color", {
      type: Sequelize.STRING(7),
      allowNull: true,
    });
    await queryInterface.addColumn("tenant", "accent_color", {
      type: Sequelize.STRING(7),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("tenant", "primary_color");
    await queryInterface.removeColumn("tenant", "secondary_color");
    await queryInterface.removeColumn("tenant", "accent_color");
  },
};
