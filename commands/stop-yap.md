---
description: Toggle stop-yap on or off, or set limits with config <lines> <words> (saved for all sessions)
argument-hint: "[config <lines> <words>]"
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/hooks/stop-yap.js" toggle $ARGUMENTS`
