"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable("booking");

    // Add original_price
    if (!tableInfo.original_price) {
      await queryInterface.addColumn("booking", "original_price", {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      });

      // Populate original_price with total_price for existing records
      await queryInterface.sequelize.query(
        "UPDATE booking SET original_price = total_price WHERE original_price = 0"
      );
    }

    // Add survey_sent
    if (!tableInfo.survey_sent) {
      await queryInterface.addColumn("booking", "survey_sent", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }

    // Add discount_id
    if (!tableInfo.discount_id) {
      await queryInterface.addColumn("booking", "discount_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "discount",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("booking", "discount_id");
    await queryInterface.removeColumn("booking", "survey_sent");
    await queryInterface.removeColumn("booking", "original_price");
  },
};
