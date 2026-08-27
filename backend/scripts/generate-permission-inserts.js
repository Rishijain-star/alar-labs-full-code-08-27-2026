/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const src = process.argv[2] || path.join(process.env.USERPROFILE || "", "Downloads", "permissions (1).json");
const out = path.join(__dirname, "..", "permissions_inserts_from_export.sql");

const raw = fs.readFileSync(src, "utf8");
const j = JSON.parse(raw);
const table = j.find((x) => x.type === "table" && x.name === "permissions");
if (!table || !Array.isArray(table.data)) {
  console.error("No permissions table in JSON");
  process.exit(1);
}

function q(v) {
  if (v == null) return "NULL";
  return `'${String(v).replace(/'/g, "''")}'`;
}

const lines = table.data.map(
  (r) =>
    `INSERT IGNORE INTO permissions (id, label, description, action, resource_type, resource_id, scope, conditions, created_by, created_at, updated_at) VALUES (${q(r.id)},${q(r.label)},${q(r.description)},${q(r.action)},${q(r.resource_type)},NULL,'global',NULL,NULL,NOW(),NOW());`
);

const header = `-- Generated from export. If permissions.id is UUID in your DB, convert ids before running.
-- resource_id / scope normalized (export had timestamps in resource_id/scope for some rows).

`;

fs.writeFileSync(out, header + lines.join("\n"));
console.log("Wrote", lines.length, "statements to", out);
