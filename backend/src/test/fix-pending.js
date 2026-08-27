#!/usr/bin/env node

/**
 * Fix pending() calls in Jest tests
 * Replaces pending('message') with this.skip()
 */

const fs = require('fs');
const path = require('path');

const testDir = path.join(__dirname, '..');
const testFiles = [
  'labs.test.js',
  'courses.test.js',
  'owner.test.js',
  'rbac.test.js'
];

let filesFixed = 0;
let replacementsTotal = 0;

testFiles.forEach(file => {
  const filePath = path.join(testDir, file);

  if (!fs.existsSync(filePath)) {
    console.log(`⊘ File not found: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Replace pending('message') with this.skip()
  const replacements = (content.match(/pending\(['"`][^'"`]*['"`]\);/g) || []).length;

  content = content.replace(
    /pending\(['"`]([^'"`]*)['"` ]\);/g,
    'this.skip(); // $1'
  );

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesFixed++;
    replacementsTotal += replacements;
    console.log(`✓ Fixed ${file} (${replacements} replacements)`);
  } else {
    console.log(`- No changes needed: ${file}`);
  }
});

console.log(`\n✓ Done! Fixed ${filesFixed} files, ${replacementsTotal} total replacements`);
console.log('\nNext steps:');
console.log('1. Start Redis: redis-server');
console.log('2. Run tests: npm test');
console.log('\nFor more help, see: src/test/TROUBLESHOOTING.md');
