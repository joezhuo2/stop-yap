#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');

const dir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const offFlag = path.join(dir, '.stop-yap-off');

const RULES = `STOP-YAP ON. Until /stop-yap turns it off:
- Final reply: at most 4 lines unless the user asks for more; one sentence each, 15 words max.
- Give the result, the cause in a few words if you fixed something, what was not done or verified, and what the user must do.
- Skip work that went as asked: no per-step lists, no measurements.
- No filler, preamble, hedging, praise or recap.
- Status updates between tool calls: 8 words max, or none.
- Code, commands, paths and quoted errors stay exact and do not count toward limits.
- Keep safety warnings and confirmations, one sentence each.`;

const OFF = 'STOP-YAP OFF. The stop-yap rules no longer apply.';

const isOn = () => !fs.existsSync(offFlag);

if (process.argv[2] === 'toggle') {
  if (isOn()) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(offFlag, '');
    console.log(OFF + ' Tell the user it is off in one sentence.');
  } else {
    fs.rmSync(offFlag);
    console.log(RULES + '\nTell the user it is on in one sentence.');
  }
  return;
}

let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8')); } catch {}
const on = isOn();

// Rules go in once per session (and again after compact/clear); later prompts only report state changes.
const marker = input.session_id && path.join(os.tmpdir(), `stop-yap-${String(input.session_id).replace(/[^\w-]/g, '')}`);
const seen = !!marker && input.hook_event_name !== 'SessionStart' && fs.existsSync(marker);
if (on && !seen) console.log(RULES);
if (!on && seen) console.log(OFF);
if (marker) on ? fs.writeFileSync(marker, '') : fs.rmSync(marker, { force: true });
