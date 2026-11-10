#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');

const dir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const offFlag = path.join(dir, '.stop-yap-off');

const RULES = `STOP-YAP ON. These rules apply to every reply until the user runs /stop-yap again:
- Final reply: 1 to 4 lines total, unless the user asks for more. Each line is one sentence of 12 words max.
- Do not list or explain work that went as asked: no per-item bullets, no how a fix works, no causes, no measurements, no files touched.
- Write only lines that need the user: the result in a few words, what was not done or not verified, and what the user must do next.
- No reasons or backstory for any line. Say "not checked in app", not why.
- Plain, short words. No filler, preamble, hedging, praise, or closing recap.
- Status messages between tool calls: one sentence of 8 words max, or none.
- Word caps count prose only; code, paths, and quoted errors do not count.
- Code, commands, file paths, and quoted errors are exempt and stay exact.
- Safety warnings and confirmations before destructive actions stay, one sentence each.`;

const OFF = 'STOP-YAP OFF. The stop-yap rules no longer apply. Tell the user it is off in one sentence.';

const isOn = () => !fs.existsSync(offFlag);

if (process.argv[2] === 'toggle') {
  if (isOn()) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(offFlag, '');
    console.log(OFF);
  } else {
    fs.rmSync(offFlag);
    console.log(RULES + '\nTell the user it is on in one sentence.');
  }
} else if (isOn()) {
  console.log(RULES);
}
