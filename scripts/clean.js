const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const targets = ['dist'];

for (const target of targets) {
  fs.rmSync(path.join(root, target), { force: true, recursive: true });
}

for (const entry of fs.readdirSync(root)) {
  if (entry.endsWith('.zip')) {
    fs.rmSync(path.join(root, entry), { force: true });
  }
}
