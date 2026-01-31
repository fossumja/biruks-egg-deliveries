---
description: Understanding the adaptation of Codex prompts to Antigravity.
---
# Codex Compatibility

## Overview
This repository was originally set up for VS Code + Codex. To support Google Antigravity, we use **wrapper workflows**.

## How it works
- The Logic lives in `.github/prompts/`.
- The Antigravity Workflows live in `.agent/workflows/`.
- Each workflow in `.agent/workflows/` simply instructs the agent to read and follow the corresponding source of truth in `.github/prompts/`.

## Maintenance
- **Do not edit `.agent/workflows/*.md` to change logic.**
- Update the logic in the corresponding `.github/prompts/*.prompt.md` file. This ensures that both VS Code and Antigravity users see the same behavior.
