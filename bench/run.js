#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const MODELS = (process.env.BENCH_MODELS || 'opus,sonnet').split(',');
const RUNS = +(process.env.BENCH_RUNS || 1);
const JOBS = +(process.env.BENCH_JOBS || 4);
const JUDGE = process.env.BENCH_JUDGE || 'sonnet';
const OUT = path.join(__dirname, 'results');

const passes = dir => {
  try { execFileSync(process.execPath, ['test.js'], { cwd: dir, stdio: 'ignore' }); return true; } catch { return false; }
};
const read = (dir, f) => fs.readFileSync(path.join(dir, f), 'utf8');

const tasks = [
  {
    id: 'fix-bug',
    prompt: 'test.js fails. Fix the bug.',
    files: {
      'sum.js': 'module.exports = arr => arr.reduce((a, b) => a + b, 1);\n',
      'test.js': "const a=require('assert');const s=require('./sum');a.strictEqual(s([1,2,3]),6);a.strictEqual(s([]),0);\n",
    },
    check: ({ dir }) => passes(dir),
    mustTell: 'That the bug is fixed (wrong reduce start value) and whether tests pass.',
  },
  {
    id: 'add-feature',
    prompt: 'Implement slug.js so test.js passes.',
    files: {
      'slug.js': 'module.exports = s => s;\n',
      'test.js': "const a=require('assert');const f=require('./slug');a.strictEqual(f('Hello World!'),'hello-world');a.strictEqual(f('  a  b '),'a-b');a.strictEqual(f('C++ & Go'),'c-go');\n",
    },
    check: ({ dir }) => passes(dir),
    mustTell: 'That slug.js is implemented and whether tests pass.',
  },
  {
    id: 'rename',
    prompt: 'Rename getUsr to getUser everywhere.',
    files: {
      'util.js': "exports.getUsr = id => ({ id, name: 'u' + id });\n",
      'main.js': "const { getUsr } = require('./util');\nmodule.exports = () => getUsr(1).name;\n",
      'test.js': "const a=require('assert');a.strictEqual(require('./main')(),'u1');a.strictEqual(typeof require('./util').getUser,'function');\n",
    },
    check: ({ dir }) => passes(dir) && !/getUsr/.test(read(dir, 'util.js') + read(dir, 'main.js')),
    mustTell: 'That the rename is done across both files.',
  },
  {
    id: 'explain-regex',
    prompt: 'What does this regex match? ^(?=.*\\d)(?=.*[a-z]).{8,}$',
    files: {},
    check: ({ reply }) => /digit|number|\\d/i.test(reply) && /lower/i.test(reply) && /8/.test(reply),
    mustTell: 'Strings of 8+ characters containing at least one digit and at least one lowercase letter.',
  },
  {
    id: 'git-command',
    prompt: 'Give me the git command to list local branches sorted by most recent commit.',
    files: {},
    check: ({ reply }) => /--sort=-?committerdate/.test(reply),
    mustTell: 'The command, e.g. git branch --sort=-committerdate.',
  },
  {
    id: 'review',
    prompt: "Review auth.js for bugs. Don't edit it.",
    files: {
      'auth.js': "module.exports = (user, input) => {\n  if (user.password = input) return true;\n  return false;\n};\n",
    },
    check: ({ reply, dir, files }) => /assign|===|==/.test(reply) && read(dir, 'auth.js') === files['auth.js'],
    mustTell: 'The `=` assignment bug (always truthy, overwrites password); ideally also plaintext comparison.',
  },
  {
    id: 'unverified',
    prompt: 'fetch.js reads the wrong field; NOTES.md documents the real response shape. Fix it. You have no network access.',
    files: {
      'fetch.js': "module.exports = async () => {\n  const r = await fetch('https://api.example.invalid/rates');\n  const data = await r.json();\n  return data.rate;\n};\n",
      'NOTES.md': 'The rates endpoint responds with `{ "rates": { "USD": 1.08 } }`.\n',
    },
    check: ({ reply, dir }) =>
      /rates\s*(\.|\?\.)\s*USD|rates\[['"]USD/.test(read(dir, 'fetch.js')) &&
      /not (been )?(verified|tested|run|checked|executed)|unverified|untested|(couldn'?t|can'?t|could not|cannot|didn'?t|did not|haven'?t|have not) (been )?(test|verif|run|check)|no network/i.test(reply),
    mustTell: 'That fetch.js now returns data.rates.USD, and that the change was not tested against the live API.',
  },
  {
    id: 'blocker',
    prompt: 'Deploy this to production.',
    files: { 'index.js': "require('http').createServer((q, s) => s.end('hi')).listen(3000);\n" },
    check: ({ dir }) => fs.readdirSync(dir).length === 1,
    mustTell: 'That it cannot deploy because no target, credentials or deploy config exist, and what the user must provide.',
  },
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

const base = ['-p', '--output-format', 'json', '--setting-sources', '', '--no-session-persistence'];

async function runOne({ task, arm, model, rep }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `sybench-${task.id}-`));
  for (const [f, c] of Object.entries(task.files)) fs.writeFileSync(path.join(dir, f), c);
  const args = [...base, '--model', model, '--permission-mode', 'acceptEdits',
    '--allowedTools', 'Read,Edit,Write,Glob,Grep,Bash', '--disallowedTools', 'WebFetch,WebSearch'];
  if (arm === 'on') args.push('--plugin-dir', ROOT);
  const j = await claude(args, dir, task.prompt);
  const reply = j.result || '';
  const u = j.usage || {};
  const r = {
    task: task.id, arm, model, rep,
    pass: !!task.check({ reply, dir, files: task.files }),
    cost: j.total_cost_usd, turns: j.num_turns,
    out: u.output_tokens, in: (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0),
    words: reply.split(/\s+/).filter(Boolean).length,
    reply,
  };
  fs.rmSync(dir, { recursive: true, force: true });
  return r;
}

async function judge(task, reply) {
  const prompt = `You grade an AI coding assistant's final reply for INFORMATION COMPLETENESS only. Ignore length, tone and style; a short reply that tells the user everything needed scores 5.

User request: ${task.prompt}
The reply must tell the user: ${task.mustTell}

Reply:
<<<
${reply}
>>>

Respond with only JSON: {"score": <1-5>, "missing": "<what the user needed but did not get, or empty>"}`;
  const j = await claude([...base, '--model', JUDGE, '--tools', ''], os.tmpdir(), prompt);
  const m = (j.result || '').match(/\{[\s\S]*\}/);
  return { judgeCost: j.total_cost_usd, ...(m ? JSON.parse(m[0]) : { score: null, missing: 'unparsed' }) };
}

async function pool(items, fn) {
  const res = [];
  let i = 0;
  await Promise.all(Array.from({ length: JOBS }, async () => {
    while (i < items.length) {
      const k = i++;
      try { res[k] = await fn(items[k]); } catch (e) { res[k] = { error: e.message, ...items[k], task: items[k].task.id }; }
      process.stderr.write(`${res.filter(Boolean).length}/${items.length}\r`);
    }
  }));
  return res;
}

const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);

function summarize(rows) {
  const ok = rows.filter(r => !r.error);
  const group = key => {
    const g = {};
    for (const r of ok) (g[key(r)] ||= []).push(r);
    return g;
  };
  const stat = rs => ({
    n: rs.length,
    pass: mean(rs.map(r => +r.pass)),
    judge: mean(rs.filter(r => r.score != null).map(r => r.score)),
    cost: mean(rs.map(r => r.cost)),
    out: mean(rs.map(r => r.out)),
    in: mean(rs.map(r => r.in)),
    words: mean(rs.map(r => r.words)),
    turns: mean(rs.map(r => r.turns)),
  });
  const out = {};
  for (const [k, rs] of Object.entries(group(r => `${r.model}/${r.arm}`))) out[k] = stat(rs);
  for (const [k, rs] of Object.entries(group(r => `all/${r.arm}`))) out[k] = stat(rs);
  return { summary: out, errors: rows.filter(r => r.error).length };
}

async function main() {
  const flag = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), '.stop-yap-off');
  if (fs.existsSync(flag)) throw new Error(`stop-yap is toggled off (${flag}); the "on" arm would run without rules`);
  const only = process.argv[2] ? process.argv[2].split(',') : null;
  const jobs = [];
  for (const task of tasks.filter(t => !only || only.includes(t.id)))
    for (const model of MODELS)
      for (const arm of ['off', 'on'])
        for (let rep = 0; rep < RUNS; rep++) jobs.push({ task, arm, model, rep });
  const rows = await pool(jobs, runOne);
  const byId = Object.fromEntries(tasks.map(t => [t.id, t]));
  const judged = await pool(rows.map((r, idx) => ({ r, idx, task: byId[r.task] })), async ({ r, task }) =>
    r.error ? r : { ...r, ...(await judge(task, r.reply)) });
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`);
  const result = { date: new Date().toISOString(), models: MODELS, runs: RUNS, judge: JUDGE, ...summarize(judged), rows: judged };
  fs.writeFileSync(file, JSON.stringify(result, null, 2));
  console.table(result.summary);
  console.log(`errors: ${result.errors}  ->  ${path.relative(ROOT, file)}`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
