# Design System — Billing POS

Living file. Every decision Shaun makes gets logged here immediately; all work follows it.

## Palette — Amber, Dark mode (approved 2026-10-15)

Value-by-value from `experiments/palette-comparison.html` (his tuned reference wins — never substitute).

| Token | Value | Use |
|---|---|---|
| `--bg` | `#121316` | Page background (flat, solid — never gradient) |
| `--surface` | `#1A1C21` | Cards, panels, strips |
| `--border` | `#2A2D34` | Card/panel borders, dividers |
| `--text` | `#F2F0EB` | Primary text (warm white) |
| `--dim` | `#9B968B` | Secondary text, labels |
| `--accent` | `#FFB224` | Active bill tab, selected line, total, PAY button, flash-on-add |
| `--accent-text` | `#1A1305` | Text/icons on accent |
| `--ok` | `#34D399` | Success states |

Dark mode only for v1 (light variant exists in the comparison file if needed later).

## Typography

- UI: system stack (`-apple-system, "SF Pro Text", "Segoe UI", system-ui`)
- Numbers, prices, codes, clock: monospace (`"SF Mono", ui-monospace, Menlo`)
- Prices always monospace — alignment in dense grids matters more than personality here.

## Principles

- Glanceable before readable: hierarchy via spacing + weight first, color second.
- Accent is a status signal, not decoration — it marks money, selection, and action.
- No gradient backgrounds. Flat solids only.
- Keyboard-first: every action reachable without mouse; legend always visible.

## Decisions log

- 2026-10-15 — Palette chosen: Amber dark, from interactive comparison. (Shaun)
