const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stop-yap-'));
const run = (...args) =>
  execFileSync(process.execPath, [path.join(__dirname, 'hooks', 'stop-yap.js'), ...args], {
    env: { ...process.env, CLAUDE_CONFIG_DIR: dir },
    encoding: 'utf8',
  });

assert.match(run(), /STOP-YAP ON/, 'on by default');
assert.match(run('toggle'), /STOP-YAP OFF/, 'toggle turns off');
assert.strictEqual(run(), '', 'silent while off');
assert.strictEqual(run(), '', 'off state persists across runs');
assert.match(run('toggle'), /STOP-YAP ON/, 'toggle turns back on');
assert.match(run(), /STOP-YAP ON/, 'on state persists across runs');

fs.rmSync(dir, { recursive: true });
console.log('ok');
