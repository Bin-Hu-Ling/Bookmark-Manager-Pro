const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'src');
const skipped = new Set([path.join(sourceRoot, 'popup', 'popup-new.js')]);

function collectJsFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js') && !skipped.has(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

let failed = false;
for (const file of collectJsFiles(sourceRoot)) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) {
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
