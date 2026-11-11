#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');

const dir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const offFlag = path.join(dir, '.stop-yap-off');
const configFile = path.join(dir, '.stop-yap.json');
const DEFAULTS = { lines: 4, words: 15 };

let config = DEFAULTS;
try { config = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(configFile, 'utf8')) }; } catch {}

const rules = ({ lines, words }) => `STOP-YAP ON. Until /stop-yap turns it off:
- Final reply: at most ${lines} lines unless the user asks for more; one sentence each, ${words} words max.
- Give the result, the cause in a few words if you fixed something, what was not done or verified, and what the user must do.
- Skip work that went as asked: no per-step lists, no measurements.
- Never paste back code you just wrote or edited; name the file instead.
- No filler, preamble, hedging, praise or recap.
- Status updates between tool calls: 8 words max, or none.
- Code, commands, paths and quoted errors stay exact and do not count toward limits.
- Keep safety warnings and confirmations, one sentence each.`;
const RULES = rules(config);

const REMINDER = 'STOP-YAP still on: keep following the stop-yap rules from the start of this session.';
const OFF = 'STOP-YAP OFF. The stop-yap rules no longer apply.';
const EVERY = 6;

const isOn = () => !fs.existsSync(offFlag);

const [cmd, sub, ...rest] = process.argv.slice(2);

if (cmd === 'toggle' && sub === 'config') {
  const [lines, words] = rest.map(Number);
  if (!rest.length) {
    console.log(`stop-yap config: ${config.lines} lines, ${config.words} words per line. Tell the user in one sentence.`);
  } else if ([lines, words].every((n) => Number.isInteger(n) && n > 0)) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(configFile, JSON.stringify({ lines, words }));
    console.log(rules({ lines, words }) + `
stop-yap config saved: ${lines} lines, ${words} words per line. Tell the user in one sentence.`);
  } else {
    console.log('Usage: /stop-yap config <lines> <words>, both positive whole numbers. Tell the user in one sentence.');
  }
  return;
}

if (cmd === 'toggle') {
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

// Rules go in once per session (and again after compact/clear); later prompts get a one-line reminder every EVERY prompts.
const marker = input.session_id && path.join(os.tmpdir(), `stop-yap-${String(input.session_id).replace(/[^\w-]/g, '')}`);
const fresh = input.hook_event_name === 'SessionStart' && input.source !== 'resume';
const seen = !!marker && !fresh && fs.existsSync(marker);
const prompts = (seen ? +fs.readFileSync(marker, 'utf8') || 0 : 0) + (input.hook_event_name === 'UserPromptSubmit' ? 1 : 0);
if (on && !seen) console.log(RULES);
else if (on && input.hook_event_name === 'UserPromptSubmit' && prompts % EVERY === 0) console.log(REMINDER);
if (!on && seen) console.log(OFF);
if (marker) on ? fs.writeFileSync(marker, String(prompts)) : fs.rmSync(marker, { force: true });
