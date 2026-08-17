const { spawnSync } = require('node:child_process');
const { readdirSync, statSync } = require('node:fs');
const { join } = require('node:path');

function collect(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collect(full, acc);
    else if (entry.endsWith('.test.js')) acc.push(full);
  }
  return acc;
}

const files = collect(join(__dirname, '..', 'dist'));
if (files.length === 0) {
  console.error('No compiled test files found in dist/');
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(result.status ?? 1);
