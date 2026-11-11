#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const MODELS = (process.env.BENCH_MODELS || 'opus,sonnet').split(',');
const USER_MODEL = process.env.BENCH_USER || 'sonnet';
const OUT = path.join(__dirname, 'results');

const files = {
  'todo.js': `const todos = [];

function add(title) {
  const todo = { id: todos.length + 1, title, done: false };
  todos.push(todo);
  return todo;
}

function remove(id) {
  const i = todos.findIndex(t => t.id === id);
  if (i >= 0) todos.splice(i + 1, 1);
}

function list() {
  return todos.slice();
}

module.exports = { add, remove, list, _todos: todos };
`,
  'test.js': `const a = require('assert');
const t = require('./todo');
t.add('a'); const b = t.add('b'); t.add('c');
t.remove(b.id);
a.deepStrictEqual(t.list().map(x => x.title), ['a', 'c']);
console.log('ok');
`,
};

const turns = [
  ['Read this project and tell me what it does.', 'What the module does and its API.'],
  ['test.js fails. Fix it.', 'That remove() is fixed, the cause, and that tests pass.'],
  ['Add a toggle(id) function that flips done, with a test.', 'That toggle exists and is tested, tests pass.'],
  ['What happens if add() gets an empty title?', 'That it is accepted silently and creates a todo with an empty title.'],
  ['Make add() reject empty titles with an error, and test it.', 'That empty titles now throw and this is tested.'],
  ['Rename list to all everywhere.', 'That the rename is done and tests still pass.'],
  ["Review todo.js for other bugs. Don't edit it.", 'The duplicate-id bug (id = length + 1 after remove), plus anything else real.'],
  ['Fix the most important bug you found.', 'Which bug was fixed, the cause, and that tests pass.'],
  ['Add a clearDone() function with a test.', 'That clearDone exists and is tested, tests pass.'],
  ['How would I persist todos to a JSON file? Just explain, no code changes.', 'A short approach: write JSON with fs, read it back on load.'],
  ['Implement save(file) and load(file) using fs, with a test.', 'That save/load exist and are tested, tests pass.'],
  ['Run the tests and tell me where things stand.', 'Whether tests pass and anything left undone.'],
];

function claude(args, cwd, input) {
  return new Promise((resolve, reject) => {
    const p = spawn('claude', args, { cwd });
    let out = '', err = '';
    p.stdout.on('data', d => (out += d));
    p.stderr.on('data', d => (err += d));
    p.on('close', code => {
      try { resolve(JSON.parse(out)); } catch { reject(new Error(`claude exit ${code}: ${(err || out).slice(0, 400)}`)); }
    });
    p.stdin.end(input);
  });
}

async function simUser(request, mustTell, reply) {
  const prompt = `You are a developer who just asked an AI coding assistant: "${request}"
To move on you needed to learn: ${mustTell}
The assistant's final reply:
<<<
${reply}
>>>
Would you need to send a follow-up question to get information you needed? Only say yes if something you needed is missing or unclear, not for style or length.
Respond with only JSON: {"followUp": true|false, "question": "<your follow-up, or empty>"}`;
  const j = await claude(['-p', '--output-format', 'json', '--setting-sources', '', '--no-session-persistence',
    '--model', USER_MODEL, '--tools', ''], os.tmpdir(), prompt);
  const m = (j.result || '').match(/\{[\s\S]*\}/);
  return { userCost: j.total_cost_usd || 0, ...(m ? JSON.parse(m[0]) : { followUp: false, question: '' }) };
}

async function session(model, arm) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `sybench-session-${model}-${arm}-`));
  for (const [f, c] of Object.entries(files)) fs.writeFileSync(path.join(dir, f), c);
  const base = ['-p', '--output-format', 'json', '--setting-sources', '', '--model', model,
    '--permission-mode', 'acceptEdits', '--allowedTools', 'Read,Edit,Write,Glob,Grep,Bash',
    '--disallowedTools', 'WebFetch,WebSearch'];
  if (arm === 'on') base.push('--plugin-dir', ROOT);
  let sid = null;
  const log = [];
  const send = async (prompt, kind, turn) => {
    const j = await claude(sid ? [...base, '--resume', sid] : base, dir, prompt);
    sid = j.session_id;
    const reply = j.result || '';
    const row = { turn, kind, cost: j.total_cost_usd || 0, out: j.usage?.output_tokens || 0,
      words: reply.split(/\s+/).filter(Boolean).length, codeBlocks: (reply.match(/```/g) || []).length / 2, reply };
    log.push(row);
    return row;
  };
  for (let i = 0; i < turns.length; i++) {
    const [request, mustTell] = turns[i];
    const r = await send(request, 'scripted', i + 1);
    const u = await simUser(request, mustTell, r.reply);
    Object.assign(r, { followUp: !!u.followUp, question: u.question, userCost: u.userCost });
    if (u.followUp && u.question) await send(u.question, 'follow-up', i + 1);
    process.stderr.write(`${model}/${arm} turn ${i + 1}/${turns.length}\n`);
  }
  let pass = false;
  try { execFileSync(process.execPath, ['test.js'], { cwd: dir, stdio: 'ignore' }); pass = true; } catch {}
  fs.rmSync(dir, { recursive: true, force: true });
  const scripted = log.filter(r => r.kind === 'scripted');
  const sum = (rs, k) => rs.reduce((a, r) => a + r[k], 0);
  const avg = rs => Math.round(sum(rs, 'words') / rs.length);
  return {
    model, arm, pass,
    cost: +sum(log, 'cost').toFixed(4),
    out: sum(log, 'out'),
    followUps: log.filter(r => r.kind === 'follow-up').length,
    wordsEarly: avg(scripted.slice(0, 6)),
    wordsLate: avg(scripted.slice(6)),
    codeBlocks: sum(scripted, 'codeBlocks'),
    log,
  };
}

async function main() {
  const flag = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), '.stop-yap-off');
  if (fs.existsSync(flag)) throw new Error(`stop-yap is toggled off (${flag}); the "on" arm would run without rules`);
  const jobs = MODELS.flatMap(m => ['off', 'on'].map(a => [m, a]));
  const rows = await Promise.all(jobs.map(([m, a]) => session(m, a).catch(e => ({ model: m, arm: a, error: e.message }))));
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `session-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`);
  fs.writeFileSync(file, JSON.stringify({ date: new Date().toISOString(), userModel: USER_MODEL, turns: turns.length, rows }, null, 2));
  console.table(rows.map(({ log, ...r }) => r));
  console.log(path.relative(ROOT, file));
}

main().catch(e => { console.error(e.message); process.exit(1); });
