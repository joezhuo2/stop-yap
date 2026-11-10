# stop-yap

A Claude Code plugin that stops Claude from over-explaining.

- One sentence max per step description, summary point, and status message, unless you ask it to expand a section.
- Plain, short words with no filler, preamble, or recap.
- No retelling of work that matches your request exactly; you only hear what differed, one sentence each.

## Install

Either of these:

```bash
npx stop-yap
```

```bash
npx github:joezhuo2/stop-yap
```

Or from inside Claude Code:

```
/plugin marketplace add joezhuo2/stop-yap
/plugin install stop-yap@stop-yap
```

## Use

stop-yap is on right after install, in every session.

Run `/stop-yap` to turn it off, and again to turn it back on. The state is saved in `~/.claude/.stop-yap-off`, so it holds across all sessions and restarts.

## How it works

A `SessionStart` hook and a `UserPromptSubmit` hook print the rules into Claude's context while stop-yap is on, and print nothing while it is off. `/stop-yap` runs `hooks/stop-yap.js toggle`, which creates or removes the flag file.

## Develop

```bash
npm test
```

## License

MIT
