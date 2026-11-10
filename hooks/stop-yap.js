#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');

const dir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const offFlag = path.join(dir, '.stop-yap-off');

const RULES = `STOP-YAP ON. These rules apply to every reply until the user runs /stop-yap again:
- One sentence max for each step description, each summary point, and each status message, unless the user asks to expand that section.
- Use plain, short words. No filler, preamble, hedging, praise, or closing recap.
- If what you did is exactly what the user asked for, do not describe it. Report only what differs from the request, one sentence per difference.
- Code, commands, file paths, and quoted errors are exempt and stay exact.
- Safety warnings and confirmations before destructive actions are still required, one sentence each.`;

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
