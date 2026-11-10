# Design system v2 — "Washi & Ink"

Direction: warm paper neutrals (light) / warm ink black (dark), one deep-jade primary, serif display headings
(Shippori Mincho on `h1`/`h2`), Geist for UI text. Flat surfaces: 1 px borders, no glass blur, no glow gradients.
Source of truth: `:root` / `.dark` in `src/app/globals.css`. Fonts wired in `src/app/layout.tsx`.

## Tokens (use the Tailwind class, never a hex)
| Need | Class | Light | Dark |
|---|---|---|---|
| page | `bg-background` | #f5f2ea | #0f0e0c |
| text | `text-foreground` | #1a1814 | #f2eee6 |
| card / popover | `bg-card` | #fffdf8 | #181613 |
| quiet surface | `bg-muted` / `bg-secondary` | #ece7db | #221f1b |
| secondary text | `text-muted-foreground` | #5f594e | #a69e8f |
| lines | `border-border` | #ddd6c7 | #2e2a24 |
| brand / CTA | `bg-primary text-primary-foreground` | #0f6b55 | #3ecf9f |
| hover | `hover:bg-primary/90` | | |
| danger | `text-destructive` / `bg-destructive` | #c23a2b | #e5604f |
| status | via `lib/status.ts` → `--status-{draft,pending,approved,rejected}-{bg,fg}` | | |

## Rules
1. No `bg-[#…]` / `text-[#…]` for palette colours. (A codemod replaced ~1,800 of them on 2026-11-09; keep it that way.)
   Allowed exceptions: brand-external colours (WhatsApp green), ID-card/print layouts (fixed colours so prints don't change with theme).
2. Don't write `light-colour dark:other-colour` pairs — a token already switches with the theme.
3. Success = green status tokens (or `emerald-*`), never the primary alone; destructive = `destructive`.
4. Transitions are colour-only (`transition-colors`); don't add `transition-all` or `backdrop-blur` glass.
5. Radius: `--radius` 0.5 rem base; cards `rounded-xl`, inputs `rounded-md`.
6. Mobile first: parents use phones. Test at 375 px.

## UX rules (owner decisions, 09/11/2026 — users are often not used to apps)
Design reference: Claude Design canvas "EntryDesk UX Fixes".
1. **One word per entry stage, same for every role**: With coach · With organiser · Accepted · Needs a fix · Not accepted
   (· Withdrawn / Not sent). Show it with `<StatusBadge status=…>` (`components/ui/status-badge.tsx`): colour **and** icon.
   Tokens: `--status-pending-*` (with coach), `--status-org-*` (with organiser), `--status-approved-*`, `--status-rejected-*`
   (needs a fix), `--status-closed-*` (not accepted).
2. **Count boxes are the filter**: `<StageFilterTiles>` (`components/ui/stage-filter-tiles.tsx`) — 2 columns on a phone, one
   row on a laptop, the selected box is dark. No big stat cards with pastel icon chips.
3. **What to do now comes first** on home pages (amber "waiting for you" card with one dark button).
4. **Labelled buttons only** for actions (Accept / Don't accept / Send to organiser / Send back / ID card / Fix details).
   Icon-only buttons are allowed only for "More" (`…`) and must have `aria-label`. Touch targets ≥ 44 px; main phone buttons 52 px.
5. **Phones get cards, not tables** (coach and organiser entry lists switch at `lg`).
6. **Dates DD/MM/YYYY**; deadlines also say "N days left".
7. **Text**: body 16 px, nothing under 13 px, no all-caps micro labels, plain words (no "accreditation", "registration flow", "pending approvals").
8. Light/dark is one 44 px button (moon in light mode, sun in dark) — `components/app/theme-toggle.tsx`.
9. Belt is picked from colours (`components/ui/belt-picker.tsx`, stores e.g. `Yellow`); date of birth is Day/Month/Year dropdowns
   (`components/ui/dob-selects.tsx`). Belt swatch hexes are physical belt colours, an allowed exception to rule 1 above.
