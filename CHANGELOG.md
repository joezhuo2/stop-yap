# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.4] - 2026-11-11

### Added

- `/stop-yap config <lines> <words>` sets the reply line limit and words per line (defaults 4 and 15); `/stop-yap config` shows them.

## [0.1.3] - 2026-11-10

### Changed

- Claude no longer pastes back code it just wrote or edited; it names the file instead.
- A one-line reminder is added every 6th prompt, so the rules hold in long sessions.

### Fixed

- Resuming a session no longer resends the full rules.

### Added

- Multi-turn session benchmark (`bench/session.js`) with results in the README.

## [0.1.2] - 2026-11-10

### Changed

- Stop-yap rules are shorter and allow the cause of a fix in a few words.
- Rules are injected once per session (and after compact/clear); later prompts only report on/off changes.

### Added

- Token and quality benchmark (`bench/run.js`) with results in the README.

## [0.1.1] - 2026-11-10

### Changed

- Stop-yap rules cap the final reply at 4 lines of 12 words and status messages at 8 words.
- Replies skip work that went as asked and list only results, gaps and next steps.

### Added

- GitHub Actions workflow that runs the self-test on version tags and publishes a GitHub release when it passes.

## [0.1.0] - 2026-11-09

### Added

- Stop-yap state script with toggle and self-test.
- Plugin manifest, marketplace entry, hooks and `/stop-yap` command.
- npx installer and `npm i -g` install.
- README and MIT license.
