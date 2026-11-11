# Arownd — Phase 2: Premium Marketplace Design System

**Date:** 2026-11-06  
**Branch:** `work/next-task`  
**Direction:** Premium Marketplace, mobile-first, Arabic/RTL-first.

## Design decisions

- Keep the approved brand palette: Lime Signal `#C6F135`, Dark `#0A0A0A`, Light `#F5F5F5`, and White `#FFFFFF`.
- Use Lime as a focused action color, not as a large decorative background.
- Light mode uses a light canvas with white product and content surfaces.
- Dark mode uses near-black canvas and layered charcoal surfaces.
- Typography: Tajawal for Arabic (bundled locally through the already-installed Fontsource package) and Inter for Latin.
- Cards use a restrained 20px radius; controls 14px; sheets 24px.
- Primary controls and form fields are at least 48px high; compact controls and icon buttons remain at least 44px.
- Use short transitions and honor reduced-motion preferences.
- Keep semantic success, warning, error and rating tokens for meaningful feedback; do not use them as decorative brand colors.
- Use Lucide icons with a consistent 16–20px visual scale and avoid mixing emoji into functional navigation.

## Source of truth

- `src/styles.css` is the single active stylesheet and the source of truth for design tokens and shared utility classes.
- `src/routes/__root.tsx` loads Inter; Tajawal is bundled locally through CSS imports.
- `src/lib/theme.tsx` remains responsible for system/light/dark preference and persistence.
- The unused duplicate `src/styles/theme.css` was removed to prevent competing theme declarations.
- Existing Tailwind semantic aliases remain available so existing screens continue to render while they are migrated.

## Shared primitives updated

| Component | Change |
|---|---|
| `src/components/ui/button.tsx` | Token-based radius, consistent variants, 48px default and 44px compact/icon controls |
| `src/components/ui/card.tsx` | Shared 20px card radius, white/light semantic surface, compact spacing and no decorative shadow |
| `src/components/ui/input.tsx` | 48px minimum height, shared radius and clear focus ring |
| `src/components/ui/badge.tsx` | Consistent pill shape and semantic variants without elevation |

The existing marketplace-specific cards, logo artwork, navigation and page compositions are intentionally retained for now. They will be migrated in the relevant shopper/merchant page phases after the design foundation is established. The final logo concept still requires a separate visual exploration and approval.

## Token contract

| Concern | Decision |
|---|---|
| Brand lime | `#C6F135` |
| Dark base | `#0A0A0A` |
| Light canvas | `#F5F5F5` |
| Light cards | `#FFFFFF` |
| Arabic font | Tajawal 400/500/700 |
| Latin font | Inter 400/500/600/700 |
| Card radius | 20px |
| Control radius | 14px |
| Sheet radius | 24px |
| Touch target | 44px minimum |
| Primary control height | 48px |
| Motion | 120–300ms, reduced-motion supported |

## Implementation boundaries

- No business logic, Supabase query, RPC, RLS policy, database migration or route behavior is changed in this phase.
- Existing component APIs and legacy utility names are retained for incremental migration.
- Brand mark, icon artwork, card composition and page layouts will be redesigned in later phases; this phase establishes their visual foundations only.

## Phase 2 verification

- Added Vitest contract coverage for palette, themes, typography, shape and reduced-motion tokens.
- Added component tests for button, card and input primitives.
- Runtime checks still need to be run in an executable checkout:
  `npx tsc --noEmit`, `npm run lint`, `npm run ui:check`, `npm test`, `npm run build`.
