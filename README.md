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
  <a href="#files">Files</a> •
  <a href="#development">Development</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

> stop-yap is a Claude Code plugin that stops Claude from over-explaining.
> Every step, summary point and status message is one sentence at most, in
> plain words, and Claude no longer retells work that matches what you asked
> for. Toggle it with `/stop-yap`; the setting is saved for every session.

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
  not describe it. You only hear what differed from your request, one
  sentence per difference.
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
`hooks/stop-yap.js`. While stop-yap is on, the script prints the rules into
Claude's context; while it is off, it prints nothing. `/stop-yap` runs the
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
publish and tag:

```bash
npm publish
git tag v0.1.0
git push origin v0.1.0
```

## Contributing

Issues and pull requests are welcome at
[joezhuo2/stop-yap](https://github.com/joezhuo2/stop-yap). Keep changes small
and run `npm test` before you open one.

## License

[MIT](LICENSE)
