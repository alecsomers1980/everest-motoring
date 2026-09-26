# Everest Motoring — premium redesign

Date: 2026-07-20
Status: approved, phases 1–3 in progress

## Goal

Make both the public site and the admin read as premium and modern, in a
**restrained luxury** register: generous whitespace, large photography, hairline
rules, yellow used as a jewel rather than a highlighter.

## Direction

Restrained luxury — the reference points are Porsche Approved and Aston Martin
Timeless, not performance-tuning brands. Premium here comes from typography,
whitespace and photography. Motion should be felt, not noticed.

## Approach

Token layer on the existing Tailwind config, plus Radix-backed primitives **only**
where the admin needs real interaction (mobile nav sheet, dropdown menus, dialogs,
data tables). These are copy-in components we own, restyled to Everest tokens —
not a framework takeover. Accessibility (focus traps, keyboard nav, ARIA) comes
free where it matters most.

Deliberately rejected: a full component-library migration (too invasive for a
codebase with live business logic), and animated marketing components such as
Magic UI beams (they pull against restrained luxury).

## Foundation (shared)

- **Type scale**: Inter with a defined ratio and real letter-spacing at display
  sizes. **Retire `font-black uppercase tracking-[0.3em]` as a default** — it is
  currently on nearly every admin label and is the loudest anti-premium signal in
  the codebase.
- **Space rhythm**: 4pt base; 96/128px section rhythm on public pages.
- **Elevation**: two shadows only, plus hairline 1px borders at 6–8% opacity.
  Restrained luxury uses rules, not shadows.
- **Yellow demoted**: `#ffff01` is an accent. Never a large surface fill, never a
  data colour, never body text on light. One accent moment per view.
- **Dark mode**: selected, not flipped. `darkMode: "class"` is already declared in
  the config and nothing implements it.

## Chart palette (admin)

Everest yellow cannot carry data — it fails contrast on white. Charts use their own
categorical palette, validated with the dataviz validator in both modes:

    #1f6feb  #c9821a  #2a9d8f  #9333ea  #dc2626

All six checks PASS in light (surface #fcfcfb) and dark (surface #1a1a19). Worst
adjacent pair is #2a9d8f↔#c9821a at ΔE 12.9 protan / 20.4 normal — comfortably
above the ΔE 8 target. Re-run `validate_palette.js` if these values ever change.

Status colours (good/warning/serious/critical) stay reserved and never double as
series colours.

## Admin

Fix function before appearance:

- **Mobile nav sheet.** The nav is `hidden lg:flex` with no fallback — below
  1024px there is no navigation at all. This is the highest-priority defect.
- **`<a href>` → `<Link>`.** Every admin nav click currently triggers a full page
  reload.
- **Strip production `console.log`s** from the admin layout.
- **Regroup 10 flat nav items** into four groups: Stock · Customers · Marketing ·
  Reports.
- **KPI tiles gain context.** Per dataviz, a headline number is a stat tile, not a
  chart — but each tile gets a delta vs the previous month plus a sparkline.
  "12 units" becomes "12 units, ▲3 vs June". Charts get a hover layer and a table
  view.

## Public

- Vehicle detail rebuilt around the photography, asymmetric spec layout.
- Inventory cards: more air, hairline rules, price as the anchor.
- Restrained scroll reveals (framer-motion is already a dependency).
- Trust layer — testimonials / Google reviews. Premium without proof is styling.

## Phases

1. Token foundation + primitives (shared)
2. Admin: mobile nav, navigation IA, `<Link>`, console.log removal
3. Admin: dashboard stat tiles, sparklines, tables
4. Public: detail page, inventory, scroll reveals
5. Dark mode across both

Phases 1–3 first; 4–5 after review.

## Constraint

Presentation changes only. The admin carries live business logic — the AI
walkaround/video pipeline (`ai_actions.js`), syndication, and sale flows. Do not
refactor those. If a restyle appears to require a structural change to one of
them, stop and ask.

## Out of scope

- Rewriting the Supabase data layer
- Changing the finance calculator maths (rate confirmed at 12.5%)
- The pre-existing `newsGenerator.js` SEO work (uncommitted, belongs to another
  session)
