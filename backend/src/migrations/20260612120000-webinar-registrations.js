"use strict";

/** Webinar delivery fields + registrations table */
module.exports = {
  async up(queryInterface, Sequelize) {
    const webinarTable = "webinars";
    let cols;
    try {
      cols = await queryInterface.describeTable(webinarTable);
    } catch {
      return;
    }
    const add = async (name, def) => {
      if (!cols[name]) {
        await queryInterface.addColumn(webinarTable, name, def);
        cols[name] = true;
      }
    };
    await add("delivery_mode", {
      type: Sequelize.ENUM("online", "offline", "hybrid"),
      allowNull: false,
      defaultValue: "online",
    });
    await add("meeting_link", { type: Sequelize.STRING(2000), allowNull: true });
    await add("venue", { type: Sequelize.STRING(500), allowNull: true });
    await add("timezone", { type: Sequelize.STRING(64), allowNull: true, defaultValue: "IST" });
    await add("is_recorded", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await add("currency", { type: Sequelize.STRING(8), allowNull: false, defaultValue: "INR" });

    const regTable = "webinar_registrations";
    try {
      await queryInterface.describeTable(regTable);
      return;
    } catch {
      /* create */
    }

    await queryInterface.createTable(regTable, {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      webinar_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: webinarTable, key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.STRING(100),
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      full_name: { type: Sequelize.STRING(255), allowNull: true },
      email: { type: Sequelize.STRING(255), allowNull: true },
      company: { type: Sequelize.STRING(255), allowNull: true },
      job_title: { type: Sequelize.STRING(255), allowNull: true },
      status: {
        type: Sequelize.ENUM("pending", "confirmed", "cancelled"),
        allowNull: false,
        defaultValue: "confirmed",
      },
      payment_status: {
        type: Sequelize.ENUM("free", "paid", "pending", "failed"),
        allowNull: false,
        defaultValue: "free",
      },
      amount_paid: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      order_id: { type: Sequelize.STRING(255), allowNull: true },
      registered_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex(regTable, ["webinar_id", "user_id"], {
      unique: true,
      name: "webinar_registrations_webinar_user_unique",
    });
    await queryInterface.addIndex(regTable, ["webinar_id"], {
      name: "webinar_registrations_webinar_id",
    });
    await queryInterface.addIndex(regTable, ["user_id"], {
      name: "webinar_registrations_user_id",
    });
  },

  async down() {
    /* non-destructive */
  },
};
