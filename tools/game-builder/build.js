// Build script to assemble game-builder/index.html from parts
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const parts = [];
for (let i = 1; i <= 20; i++) {
  const f = path.join(dir, `part${i}.txt`);
  if (fs.existsSync(f)) {
    parts.push(fs.readFileSync(f, 'utf8'));
  }
}
const output = parts.join('\n');
fs.writeFileSync(path.join(dir, 'index.html'), output, 'utf8');
console.log(`Written index.html: ${output.length} chars from ${parts.length} parts`);
