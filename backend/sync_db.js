const db = require("./src/models");

async function syncAllTablesSchema() {
  try {
    console.log("Syncing database schemas for offerings & content tables...");

    const tables = [
      "career_offerings",
      "expert_training_programs",
      "cloud_services",
      "webinars",
      "certifications",
      "site_banners",
      "site_brandings",
      "instructor_resources"
    ];

    const columns = [
      { name: "metadata", type: "JSON NULL" },
      { name: "draft_data", type: "JSON NULL" },
    ];

    for (const table of tables) {
      for (const col of columns) {
        try {
          await db.sequelize.query(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.type};`);
          console.log(`✅ Table ${table}: added column ${col.name}`);
        } catch (err) {
          if (err.message.includes("Duplicate column name") || err.message.includes("Table") && err.message.includes("doesn't exist")) {
            // Already exists or table doesn't exist
          } else {
            console.log(`Notice for ${table}.${col.name}: ${err.message}`);
          }
        }
      }
    }

    console.log("✅ Database schema sync completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error syncing schemas:", err);
    process.exit(1);
  }
}

syncAllTablesSchema();
