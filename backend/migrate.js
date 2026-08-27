#!/usr/bin/env node
/**
 * Run from the backend folder: `node migrate.js` or `node migrate.js db:migrate:status`
 * Defaults to `db:migrate` when no sequelize-cli subcommand is passed.
 */
const { spawnSync } = require("child_process");
const path = require("path");

const cwd = path.resolve(__dirname);
const extra = process.argv.slice(2);
const subcommand = extra.length ? extra : ["db:migrate"];

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["sequelize-cli", ...subcommand],
  {
    cwd,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV || "development" },
  }
);

process.exit(result.status === null ? 1 : result.status);
