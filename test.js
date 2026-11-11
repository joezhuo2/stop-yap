const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stop-yap-'));
const exec = (args, input) =>
  execFileSync(process.execPath, [path.join(__dirname, 'hooks', 'stop-yap.js'), ...args], {
    env: { ...process.env, CLAUDE_CONFIG_DIR: dir },
    encoding: 'utf8',
    input,
  });
const run = (...args) => exec(args);
const sid = `test-${process.pid}`;
const hook = (event, source) => exec([], JSON.stringify({ session_id: sid, hook_event_name: event, source }));

assert.match(run(), /STOP-YAP ON/, 'on by default');
assert.match(run('toggle'), /STOP-YAP OFF/, 'toggle turns off');
assert.strictEqual(run(), '', 'silent while off');
assert.strictEqual(run(), '', 'off state persists across runs');
assert.match(run('toggle'), /STOP-YAP ON/, 'toggle turns back on');
assert.match(run(), /STOP-YAP ON/, 'on state persists across runs');

assert.match(hook('SessionStart'), /STOP-YAP ON/, 'rules at session start');
assert.strictEqual(hook('UserPromptSubmit'), '', 'no repeat on later prompts');
run('toggle');
assert.match(hook('UserPromptSubmit'), /STOP-YAP OFF/, 'off reported once');
assert.strictEqual(hook('UserPromptSubmit'), '', 'silent while off');
run('toggle');
assert.match(hook('UserPromptSubmit'), /STOP-YAP ON/, 'rules again after turning on');
assert.strictEqual(hook('UserPromptSubmit'), '', 'then silent');
assert.match(hook('SessionStart', 'compact'), /STOP-YAP ON. Until/, 'rules again after compact or clear');
assert.strictEqual(hook('SessionStart', 'resume'), '', 'no repeat on resume');
for (let i = 1; i < 6; i++) assert.strictEqual(hook('UserPromptSubmit'), '', `silent on prompt ${i}`);
assert.match(hook('UserPromptSubmit'), /STOP-YAP still on/, 'reminder on prompt 6');
assert.strictEqual(hook('UserPromptSubmit'), '', 'silent after reminder');

fs.rmSync(path.join(os.tmpdir(), `stop-yap-${sid}`), { force: true });
fs.rmSync(dir, { recursive: true });
console.log('ok');
