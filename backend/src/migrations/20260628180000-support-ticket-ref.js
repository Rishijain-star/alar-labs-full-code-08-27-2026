"use strict";

/** Sequential human-friendly support ticket reference, e.g. TICKET-00001. */
module.exports = {
  async up(queryInterface, Sequelize) {
    let cols;
    try {
      cols = await queryInterface.describeTable("support_tickets");
    } catch {
      return;
    }
    if (!cols.ticket_ref) {
      await queryInterface.addColumn("support_tickets", "ticket_ref", {
        type: Sequelize.STRING(32),
        allowNull: true,
        unique: true,
      });
    }

    try {
      const [rows] = await queryInterface.sequelize.query(
        "SELECT id FROM support_tickets WHERE ticket_ref IS NULL OR ticket_ref = '' ORDER BY created_at ASC, id ASC"
      );
      const [maxRows] = await queryInterface.sequelize.query(
        "SELECT ticket_ref FROM support_tickets WHERE ticket_ref REGEXP '^TICKET-[0-9]+$'"
      );
      let next = maxRows.reduce((m, r) => {
        const n = parseInt(String(r.ticket_ref).replace(/^TICKET-/i, ""), 10);
        return Number.isFinite(n) && n > m ? n : m;
      }, 0);
      for (const r of rows) {
        next += 1;
        const code = `TICKET-${String(next).padStart(5, "0")}`;
        await queryInterface.sequelize.query(
          "UPDATE support_tickets SET ticket_ref = :code WHERE id = :id",
          { replacements: { code, id: r.id } }
        );
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[migration] support ticket_ref backfill failed:", e.message);
    }
  },

  async down() {
    /* non-destructive */
  },
};
