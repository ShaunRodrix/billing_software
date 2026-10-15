# Billing POS — Design Spec

Date: 2026-10-15 · Status: approved direction, pending implementation
Client brief: one-page, frontend-only, keyboard-operated billing terminal for a shopping mart.

## Overview

A single-screen POS for a cashier serving several customers at once. All 100 products are visible as a card grid in the center; every action is on the keyboard; each completed bill prints as a 58 mm (2-inch) thermal receipt via the browser print dialog. Multiple open bills live in parallel, switched with arrow keys.

## Locked decisions

- **Parallel bills** — unlimited open bills in memory; **← →** switches between them, each keeps its own cart, payment state, and bill number.
- **↑ ↓** navigates lines within the active bill.
- **Search-first adding** — typing any letter/digit (or F1) opens the search overlay. It is empty until input; initials filter the product list; ↑↓ to move, Enter adds to the active bill and **flashes that card in the grid**; Esc closes.
- **Dashboard grid** — all 100 product cards (code, name, ₹price, GST slab) on screen at once at 1920×1080; no scrolling on normal desktop monitors.
- **Bill contents** — per line: name, qty, rate, amount (+GST % label). Totals: subtotal, GST, grand total. Payment method: cash / card / UPI, cycled with a key.
- **Printing** — F2 opens the browser print dialog with a 58 mm receipt; on confirm the bill completes, the slot clears, and the next bill is ready. No silent printing.
- **Tech** — static folder, classic scripts (no modules, no build), opens from `file://` or any static server.
- **Palette** — Amber, dark mode, value-by-value from `docs/design-system.md`.
- **Mac F-keys** — plain-key fallbacks (e.g. `P` pay, `Del` delete line) so the app works when F-keys are media keys.

## Layout

```
┌──────────────────────────────────────────────────────────┐
│ MART   [1·₹342][2·₹1180][3·₹96][+]              14:32    │ top strip: bill tabs + clock
├─────────────────────────────────────────────┬────────────┤
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐   │ Bill #0147 │
│ │card│ │card│ │card│ │card│ │card│ │card│   │ CASH       │
│ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘   ├────────────┤
│ … 100 cards, ~10 × 10, one screen …         │ line items │
│                                             │ subtotal   │
│                                             │ GST        │
│                                             │ TOTAL      │
│                                             │ [PAY  F2]  │
├─────────────────────────────────────────────┴────────────┤
│ F1 search · F2 pay · F3 qty · F4 del · F6 pay-type · …   │ legend, always visible
└──────────────────────────────────────────────────────────┘
```

Grid center-aligned attention, content left-aligned inside cards. Search overlay floats over the grid, bill panel stays visible.

## Keyboard map

| Key | Action |
|---|---|
| any letter/digit, or F1 | open search overlay |
| ↑ ↓ (overlay) | move through matches |
| Enter (overlay) | add highlighted product ×1 |
| Esc | close overlay |
| ← → | switch active bill |
| ↑ ↓ (bill) | select line |
| F2 / P | pay & print |
| F3 / Q | edit qty of selected line |
| F4 / Del | delete selected line |
| F6 / C | cycle payment cash→card→UPI |
| F8 / X | void bill (confirm) |
| F9 / N | new bill |
| F10 / ? | help overlay |
| `+`/`-` | qty ±1 on selected line |

F5 is left to the browser (refresh) on purpose.

## Data model

```js
// products.js — 100 realistic mart items, editable by hand
{ code: "01", name: "Amul Butter 500g", price: 275.00, gst: 12 }  // slab: 0|5|12|18|28

// bill (in-memory, unlimited)
{ id, no, lines: [{ code, name, price, gst, qty }], payment: "cash", openedAt }

// localStorage
"pos.open"      — all open bills (crash restore, saved on every change)
"pos.completed" — completed bills (no, timestamp, total, payment) for the day counter
```

Totals: line amount = price × qty; subtotal = Σ; GST = Σ (amount × slab / 100) computed per line; grand total = subtotal + GST. Pure functions in `bills.js`, no DOM access — testable. Bill numbers are sequential from 1 and persist across reloads (next = last completed + 1).

## Print (58 mm receipt)

Hidden `<div>` rendered from the active bill; `@media print` hides the app and shows only the receipt at 58 mm width. Monospace, per-line: qty × name … amount; then subtotal, GST, grand total, payment method, bill no, timestamp, "Thank you". After `afterprint`, bill moves to completed, slot clears, next bill activates.

## Error handling

- Pay with empty bill → blocked, legend/bill panel signals why.
- Search with no match → "No match for 'xyz'" inline, input stays focused.
- Void → confirm state (F8 twice, second press within 2 s confirms; Esc cancels).
- Qty input rejects ≤ 0 and non-numbers; clamps at 999.
- Page reload → open bills restored from localStorage; completed log untouched.

## Files

```
index.html            structure: strips, grid, bill panel, overlay, print area
styles.css            amber-dark tokens from design-system.md, print styles
products.js           PRODUCTS array (100 items)
bills.js              state, totals/GST pure functions, localStorage
ui.js                 render, keyboard engine, search overlay
print.js              receipt rendering + print flow
docs/design-system.md tokens (already created)
```

## Testing

- `bills.js` pure functions verified with a tiny node test script (totals, GST math, void, restore).
- Manual keyboard checklist: full flow add→switch→pay for 3 parallel bills, no-mouse end-to-end, print preview widths, reload-restore.

## Out of scope (v1)

Silent/direct thermal printing, sales history screens, stock/inventory, discounts, customer database, multi-device sync, backend of any kind.
