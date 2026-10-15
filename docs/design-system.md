# Design System — Billing POS

Living file. Every decision Shaun makes gets logged here immediately; all work follows it.

## Palette — Black & White mono (approved 2026-10-15, supersedes Amber)

Monochrome: the accent IS the inversion. Active/selected/action elements flip to solid
blocks — white-on-dark in dark mode, black-on-light in light mode. No color accent.
`--ok` green survives only for genuine success states (paid, printed).

### Dark (default)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0B0B0C` | Page background (flat, solid — never gradient, never pure #000) |
| `--surface` | `#151517` | Cards, panels, strips |
| `--border` | `#26262A` | Card/panel borders, dividers |
| `--text` | `#F4F4F3` | Primary text |
| `--dim` | `#9C9CA3` | Secondary text, labels |
| `--accent` | `#F4F4F3` | Active bill tab, selected line, total, PAY button, flash-on-add (solid white block) |
| `--accent-text` | `#0B0B0C` | Text/icons on accent |
| `--ok` | `#34D399` | Success states only |

### Light (soft grey — not plain white)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#ECECEA` | Page background |
| `--surface` | `#F7F7F5` | Cards, panels, strips |
| `--border` | `#D8D8D4` | Card/panel borders, dividers |
| `--text` | `#141415` | Primary text |
| `--dim` | `#6E6E73` | Secondary text, labels |
| `--accent` | `#141415` | Same roles as dark (solid black block) |
| `--accent-text` | `#F4F4F3` | Text/icons on accent |
| `--ok` | `#059669` | Success states only |

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
- 2026-10-15 — Superseded: Black & White mono, dark + light pair. Accent = inversion blocks. (Shaun)
