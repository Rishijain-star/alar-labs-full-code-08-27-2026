"use strict";

/** Adds category columns expected by admin APIs (safe if columns already exist). */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = "categories";
    let cols;
    try {
      cols = await queryInterface.describeTable(table);
    } catch {
      return;
    }
    const add = async (name, def) => {
      if (!cols[name]) {
        await queryInterface.addColumn(table, name, def);
        cols[name] = true;
      }
    };
    await add("slug", { type: Sequelize.STRING(255), allowNull: true });
    await add("description", { type: Sequelize.TEXT, allowNull: true });
    await add("icon", { type: Sequelize.STRING(255), allowNull: true });
    await add("display_order", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await add("is_active", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
  },

  async down() {
    /* non-destructive: keep columns */
  },
};
