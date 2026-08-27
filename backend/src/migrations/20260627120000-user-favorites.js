"use strict";

const { randomUUID } = require("crypto");

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes("user_favorites")) {
      await queryInterface.createTable("user_favorites", {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        user_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: "users", key: "user_id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        item_type: {
          type: Sequelize.ENUM("course", "lab"),
          allowNull: false,
        },
        target_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
        },
      });

      await queryInterface.addIndex("user_favorites", ["user_id"], {
        name: "idx_user_favorites_user_id",
      });
      await queryInterface.addIndex("user_favorites", ["item_type", "target_id"], {
        name: "idx_user_favorites_target",
      });
      await queryInterface.addIndex(
        "user_favorites",
        ["user_id", "item_type", "target_id"],
        { unique: true, name: "uk_user_favorites_unique" },
      );
    }

    const perms = [
      {
        id: "view_favorites",
        label: "View Favorites",
        description: "View saved courses and labs",
        action: "read",
        resource_type: "favorites",
        created_by: "system",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "manage_favorites",
        label: "Manage Favorites",
        description: "Add or remove courses and labs from favorites",
        action: "update",
        resource_type: "favorites",
        created_by: "system",
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    for (const perm of perms) {
      const [existing] = await queryInterface.sequelize.query(
        "SELECT id FROM permissions WHERE id = :id LIMIT 1",
        { replacements: { id: perm.id } },
      );
      if (!existing.length) {
        await queryInterface.bulkInsert("permissions", [perm]);
      }
    }

    const [roles] = await queryInterface.sequelize.query(
      "SELECT id FROM roles WHERE (deleted_at IS NULL OR deleted_at IS NULL)",
    );

    for (const role of roles) {
      for (const permId of ["view_favorites", "manage_favorites"]) {
        const [exists] = await queryInterface.sequelize.query(
          `SELECT id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
          { replacements: { roleId: role.id, permId } },
        );
        if (!exists.length) {
          await queryInterface.bulkInsert("role_permissions", [
            {
              id: randomUUID(),
              role_id: role.id,
              permission_id: permId,
              assigned_by: "system",
              assigned_at: new Date(),
            },
          ]);
        }
      }
    }
  },

  async down() {
    // Non-destructive rollback
  },
};
