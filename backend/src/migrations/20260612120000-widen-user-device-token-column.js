"use strict";

/** FCM web tokens can exceed VARCHAR(512); widen for reliable device registration. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("user_device_tokens").catch(() => null);
    if (!table) return;
    if (table.device_token?.type === "TEXT" || table.device_token?.type?.includes("text")) return;

    const indexes = await queryInterface.showIndex("user_device_tokens").catch(() => []);
    for (const idx of indexes) {
      const isDeviceTokenUnique =
        idx.unique &&
        Array.isArray(idx.fields) &&
        idx.fields.some((f) => f.attribute === "device_token" || f.name === "device_token");
      if (isDeviceTokenUnique && idx.name) {
        await queryInterface.removeIndex("user_device_tokens", idx.name);
      }
    }

    // VARCHAR(768) fits MySQL utf8mb4 unique index limits; long enough for FCM tokens.
    await queryInterface.changeColumn("user_device_tokens", "device_token", {
      type: Sequelize.STRING(768),
      allowNull: false,
    });

    await queryInterface.addIndex("user_device_tokens", ["device_token"], {
      unique: true,
      name: "user_device_tokens_device_token_unique",
    });
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("user_device_tokens").catch(() => null);
    if (!table) return;

    try {
      await queryInterface.removeIndex("user_device_tokens", "user_device_tokens_device_token_unique");
    } catch {
      /* ignore */
    }

    await queryInterface.changeColumn("user_device_tokens", "device_token", {
      type: Sequelize.STRING(512),
      allowNull: false,
    });
  },
};
