const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const outputName = process.argv[2] || 'bookmark-manager.zip';
const output = path.join(root, outputName);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

run(process.execPath, [path.join(root, 'node_modules', 'webpack', 'bin', 'webpack.js'), '--mode', 'production']);

fs.rmSync(output, { force: true });

if (process.platform === 'win32') {
  run('powershell.exe', [
    '-NoProfile',
    '-Command',
    `Compress-Archive -Path ${JSON.stringify(path.join(dist, '*'))} -DestinationPath ${JSON.stringify(output)} -Force`,
  ]);
} else {
  run('zip', ['-r', output, '.'], { cwd: dist });
}
