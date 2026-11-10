#!/usr/bin/env node
const { execSync } = require('child_process');

for (const cmd of [
  'claude plugin marketplace add joezhuo2/stop-yap',
  'claude plugin install stop-yap@stop-yap',
]) {
  console.log(`> ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch {
    console.error(`Failed: ${cmd}. Is the Claude Code CLI installed and on PATH?`);
    process.exit(1);
  }
}
console.log('stop-yap is installed and on. Restart Claude Code, then use /stop-yap to toggle.');
