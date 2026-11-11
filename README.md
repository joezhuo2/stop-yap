<h1 align="center">stop-yap</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/stop-yap"><img src="https://img.shields.io/npm/v/stop-yap?logo=npm&color=orange" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/stop-yap"><img src="https://img.shields.io/npm/dt/stop-yap?logo=npm&color=blue" alt="npm downloads"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="platform: Windows | macOS | Linux">
  <a href="https://code.claude.com/docs/en/plugins"><img src="https://img.shields.io/badge/Claude%20Code-plugin-D97757?logo=claude&logoColor=white" alt="Claude Code plugin"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node-18%2B-5FA04E?logo=nodedotjs&logoColor=white" alt="Node 18+"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/joezhuo2/stop-yap?color=green" alt="license"></a>
</p>

<p align="center">
  <a href="#install">Install</a> •
  <a href="#features">Features</a> •
  <a href="#usage">Usage</a> •
  <a href="#benchmarks">Benchmarks</a> •
  <a href="#files">Files</a> •
  <a href="#development">Development</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

> stop-yap is a Claude Code plugin that stops Claude from over-explaining.
> Every step, summary point and status message is one sentence at most, in
> plain words, and Claude no longer retells work that matches what you asked
> for. Toggle it with `/stop-yap`; the setting is saved for every session.
>
> In [benchmarks](#benchmarks) it made final replies 69% shorter and cut
> output tokens 39%, at the same cost per run and with no failed tasks.

## Install

Pick one. All of them install the same plugin, and stop-yap is on as soon as
you restart Claude Code.

- **npx:** nothing stays installed besides the plugin.

  ```bash
  npx stop-yap
  ```

- **npm, global:** installs the `stop-yap` command, which you then run once.

  ```bash
  npm i -g stop-yap
  ```

  ```bash
  stop-yap
  ```

- **Claude Code plugin marketplace:** run these inside Claude Code.

  ```
  /plugin marketplace add joezhuo2/stop-yap
  /plugin install stop-yap@stop-yap
  ```

- **Straight from GitHub:** no npm registry needed.

  ```bash
  npx github:joezhuo2/stop-yap
  ```

The npx and npm installers run the two marketplace commands for you through
the `claude` CLI, so it has to be on your `PATH`.

### Updates

```bash
claude plugin marketplace update stop-yap
```

```bash
claude plugin update stop-yap@stop-yap
```

### Uninstall

```bash
claude plugin uninstall stop-yap@stop-yap
```

Delete `~/.claude/.stop-yap-off` too if you had turned stop-yap off.

## Features

- **One sentence, max:** each step description, each point in a summary and
  each status message is one sentence at most. Ask Claude to expand a section
  and it expands only that section.
- **Plain words:** no filler, preamble, hedging, praise or closing recap.
- **No retelling:** when the work is exactly what you asked for, Claude does
  not describe it. You hear the result, the cause in a few words when
  something was fixed, and anything not done or not verified.
- **Exact where it matters:** code, commands, file paths and quoted errors are
  left alone.
- **Safety stays:** warnings and confirmations before destructive actions are
  still given, one sentence each.

### Toggle and state

- **`/stop-yap`:** turns stop-yap off, and on again the next time you run it.
  Claude confirms the new state in one sentence.
- **Saved:** the state is one flag file, so it survives restarts and new
  sessions. You never have to turn it back on.
- **Global:** every Claude Code session on the machine reads the same flag.
  A toggle in one session reaches the others on their next prompt.
- **On by default:** stop-yap is on right after install.

## Usage

```
/stop-yap
```

The plugin registers the command as `/stop-yap:stop-yap`. Typing `/stop-yap`
finds it, and Claude Code shows the full name in the menu.

To get more detail on one thing while stop-yap is on, ask for it: "expand on
step 2" or "explain the last point in full".

## Benchmarks

Eight tasks (bug fix, feature, rename, regex question, git command, code
review, a fix that cannot be tested, an impossible deploy), each run once per
model with stop-yap off and on: 32 headless `claude -p` runs. Each run has
user settings and other plugins disabled, so the only difference is the
stop-yap hooks. Every run is scored two ways: an automatic check (tests pass,
or the reply contains the key fact) and a blind Sonnet judge that rates
information completeness from 1 to 5, ignoring length.

| Model | stop-yap | Task pass | Judge (1–5) | Reply words | Output tokens | Cost / run |
| --- | --- | --- | --- | --- | --- | --- |
| Opus 5.5 | off | 8/8 | 5.0 | 126 | 580 | $0.100 |
| Opus 5.5 | on | 8/8 | 4.9 | 38 | 361 | $0.101 |
| Sonnet 5.5 | off | 8/8 | 5.0 | 96 | 498 | $0.049 |
| Sonnet 5.5 | on | 8/8 | 5.0 | 31 | 300 | $0.048 |
| **Both** | off | 16/16 | 5.0 | 111 | 539 | $0.075 |
| **Both** | on | 16/16 | 4.9 | 34 | 330 | $0.075 |

- **Shorter replies:** final replies are 69% shorter and output tokens drop
  39%, with no lost task successes.
- **Same cost per run:** the rules cost a few hundred input tokens once per
  session, which roughly cancels the saved output on one-prompt tasks. Longer
  sessions should come out ahead, since the rules are not repeated per prompt;
  that was not measured.
- **Quality held:** 15 of 16 replies got a full judge score. The one miss was
  a deploy refusal that asked for details without listing every option.

An earlier version (0.1.1) re-sent longer rules on every prompt and banned
explaining causes; it cost 6% more per run and scored 4.5. Those numbers are
in `bench/results/2026-11-11T03-40-40.json`.

Run on 2026-11-10 with Claude Code 2.1.316; one run per cell, so treat the
numbers as directional. Raw results are in `bench/results/`. To rerun:

```bash
node bench/run.js                                    # all tasks, Opus + Sonnet
BENCH_MODELS=sonnet BENCH_RUNS=3 node bench/run.js   # more runs, one model
node bench/run.js fix-bug,review                     # a subset of tasks
```

Each full run costs about $4 and needs stop-yap toggled on.

### Long sessions

One 12-prompt session per model and setting on a small todo project: fix a
bug, add features, rename, review, explain, add persistence, run tests. After
each reply, a simulated developer (Sonnet) sends a follow-up question if
something they needed was missing; follow-ups are counted and paid for.

| Model | stop-yap | Tests pass | Session cost | Output tokens | Follow-ups | Words, prompts 1–6 / 7–12 | Code blocks pasted |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Opus 5.5 | off | yes | $5.19 | 15,497 | 0 | 147 / 340 | 5 |
| Opus 5.5 | on | yes | $3.29 | 7,042 | 0 | 40 / 76 | 0 |
| Sonnet 5.5 | off | yes | $1.97 | 10,728 | 0 | 81 / 240 | 0 |
| Sonnet 5.5 | on | yes | $1.79 | 7,004 | 1 | 32 / 82 | 0 |

- **Cheaper over a session:** 37% less on Opus and 9% less on Sonnet, with
  output tokens down 55% and 35%. Shorter replies also keep the context that
  every later prompt re-reads smaller.
- **Follow-ups stayed rare:** one in 24 stop-yap replies, after a project
  summary that left out the function signatures.
- **No clear drift:** replies get longer in prompts 7–12 with stop-yap off
  too (those prompts include a review and an explanation), and stay about a
  third of the off length with it on.

One session per cell, so treat these as directional. To rerun (about $12):

```bash
node bench/session.js
```

## Files

| What | Path |
| --- | --- |
| Off flag | `~/.claude/.stop-yap-off` (present means off, absent means on) |
| Rules and toggle script | `hooks/stop-yap.js` |
| Hook registration | `hooks/hooks.json` |
| Slash command | `commands/stop-yap.md` |
| Plugin and marketplace manifests | `.claude-plugin/` |
| npx / npm installer | `bin/install.js` |

If `CLAUDE_CONFIG_DIR` is set, the flag lives there instead of `~/.claude`.

## Development

### How it works

A `SessionStart` hook and a `UserPromptSubmit` hook both run
`hooks/stop-yap.js`. At session start (and after a compact or clear) it
prints the rules into Claude's context if stop-yap is on. On later prompts it
prints nothing unless the state changed since this session last saw it, plus
a one-line reminder every 6th prompt. It tracks this with a small per-session
file in the system temp folder, so resuming a session does not resend the rules. `/stop-yap` runs the
same script with `toggle`, which creates or removes the flag file and prints
the new state.

### Test

Requirements: Node 18+ and the Claude Code CLI.

```bash
npm test                                        # state and toggle self-test
claude plugin validate .                        # manifest check
claude --plugin-dir . -p "/stop-yap:stop-yap"   # toggle with the local copy, no install
```

The last command flips your real flag file, so run it twice to put the state
back.

### Releasing

Bump the version in `package.json` and `.claude-plugin/plugin.json`, then
publish and tag. Pushing a `v*` tag runs `npm test` in GitHub Actions and
creates the GitHub release when it passes.

```bash
npm publish
git tag v0.1.3
git push origin v0.1.3
```

## Contributing

Issues and pull requests are welcome at
[joezhuo2/stop-yap](https://github.com/joezhuo2/stop-yap). Keep changes small
and run `npm test` before you open one.

## License

[MIT](LICENSE)
