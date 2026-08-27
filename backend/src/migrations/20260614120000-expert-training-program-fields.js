"use strict";

/** Expert-led training program extended fields + enrollments */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = "expert_training_programs";
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

    await add("slug", { type: Sequelize.STRING(255), allowNull: true, unique: true });
    await add("duration", { type: Sequelize.STRING(128), allowNull: true });
    await add("training_format", {
      type: Sequelize.ENUM("live_online", "hybrid", "in_person"),
      allowNull: false,
      defaultValue: "live_online",
    });
    await add("level", {
      type: Sequelize.ENUM("beginner", "intermediate", "advanced"),
      allowNull: false,
      defaultValue: "beginner",
    });
    await add("certificate_available", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await add("language", { type: Sequelize.STRING(64), allowNull: true, defaultValue: "English" });
    await add("prerequisites", { type: Sequelize.TEXT, allowNull: true });
    await add("learning_outcomes", { type: Sequelize.JSON, allowNull: true });
    await add("session_count", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    });
    await add("meeting_link", { type: Sequelize.STRING(2000), allowNull: true });
    await add("venue", { type: Sequelize.STRING(500), allowNull: true });
    await add("currency", { type: Sequelize.STRING(8), allowNull: false, defaultValue: "INR" });
    await add("is_free", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    const [rows] = await queryInterface.sequelize.query(
      `SELECT id, title FROM ${table} WHERE slug IS NULL OR slug = ''`
    );
    for (const row of rows) {
      const base = String(row.title || "program")
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "") || "program";
      const slug = `${base.slice(0, 200)}-${String(row.id).slice(0, 8)}`;
      await queryInterface.sequelize.query(
        `UPDATE ${table} SET slug = :slug WHERE id = :id`,
        { replacements: { slug, id: row.id } }
      );
    }

    const enrollTable = "expert_training_program_enrollments";
    try {
      await queryInterface.describeTable(enrollTable);
      return;
    } catch {
      /* create */
    }

    await queryInterface.createTable(enrollTable, {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      program_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: table, key: "id" },
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
      enrolled_at: {
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

    await queryInterface.addIndex(enrollTable, ["program_id", "user_id"], {
      unique: true,
      name: "expert_training_enrollments_program_user_unique",
    });
    await queryInterface.addIndex(enrollTable, ["program_id"], {
      name: "expert_training_enrollments_program_id",
    });
    await queryInterface.addIndex(enrollTable, ["user_id"], {
      name: "expert_training_enrollments_user_id",
    });
  },

  async down() {
    /* non-destructive */
  },
};
