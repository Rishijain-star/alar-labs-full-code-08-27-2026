import fs from "fs";
import path from "path";

const root = path.resolve("src");
const componentRoot = path.join(root, "components");

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(jsx?|tsx?)$/.test(name)) acc.push(p);
  }
  return acc;
}

function allSourceFiles() {
  return walk(root);
}

function importPatterns(file) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  const base = path.basename(file, path.extname(file));
  const noExt = rel.replace(/\.(jsx|tsx|js|ts)$/, "");
  return [
    `@/${noExt}`,
    `@/components/${noExt.replace(/^components\//, "")}`,
    `./${base}`,
    `../${base}`,
    `/${noExt}`,
    `components/${noExt}`,
    base,
  ];
}

const componentFiles = walk(componentRoot);
const sources = allSourceFiles();
const sourceText = Object.fromEntries(sources.map((f) => [f, fs.readFileSync(f, "utf8")]));

const unused = [];
for (const file of componentFiles) {
  const rel = path.relative(process.cwd(), file).replace(/\\/g, "/");
  const patterns = importPatterns(file);
  let usedBy = [];
  for (const [src, text] of Object.entries(sourceText)) {
    if (src === file) continue;
    const hit = patterns.some((p) => text.includes(p));
    if (hit) usedBy.push(path.relative(process.cwd(), src).replace(/\\/g, "/"));
  }
  if (usedBy.length === 0) unused.push(rel);
  else if (usedBy.every((u) => u.includes("components/admin/lab-builder") || u.includes("components/ui/labsection") || u.includes("components/ui/blockeditor") || u.includes("pages/admin/SkillBuilderLab.jsx"))) {
    unused.push(`${rel}  [orphan-chain only: ${usedBy.join(", ")}]`);
  }
}

console.log(unused.sort().join("\n"));
