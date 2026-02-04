# CLAUDE.md

This file provides guidance for AI assistants working with the `plate_anno` repository.

## Project Overview

**plate_anno** — Plate annotation project. This repository is in its initial setup phase.

## Repository Status

- **Stack:** Vanilla HTML + CSS + JavaScript (no build step, no dependencies)
- **Architecture:** Single-page app, all client-side
- **Entry point:** `index.html`
- **Styles:** `style.css`
- **Logic:** `app.js`
- **Plan:** See `PLAN.md` for full implementation plan

## Development

### Branch Conventions

- Feature branches use the pattern: `claude/<description>-<id>`
- All work should be committed with clear, descriptive messages

### Getting Started

1. Clone the repository
2. Open `index.html` in a browser — no build step needed
3. All state is saved to localStorage automatically

### Key Architecture Notes

- State is a plain object: `{ plateFormat, annotations }` where annotations maps well IDs to arrays of `{ key, value }` pairs
- Undo/redo uses JSON snapshots on a stack (max 50)
- All rendering is imperative DOM manipulation (no virtual DOM)
- `renderPlate()` is the main re-render entry; `updateWellVisual()` does targeted updates during input to avoid losing focus

## Conventions

- Keep commits atomic and well-described
- Update this CLAUDE.md as new tools, patterns, or workflows are introduced
