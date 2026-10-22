# DataCenter.forum Public Readability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the intelligence, database, pricing, navigation, and live-news surfaces readable at normal tablet/desktop zoom while preserving the existing large editorial headline style.

**Architecture:** Add a small public typography token set in `app/globals.css`, replace undersized 10-13px public-interface text with the approved floors, and use responsive stacking/wrapping rather than shrinking metadata. Keep page/component structure unchanged unless a selector cannot meet the floor without layout breakage.

**Tech Stack:** Next.js 16.4.2, React 19.2.8, global CSS, Node.js `node:test` static contract tests.

**Spec:** `docs/superpowers/specs/2026-10-22-max-ingestion-readability-design.md`

## Global Constraints

- Preserve large editorial H1/H2 treatment; do not solve readability by shrinking the hero.
- Primary navigation: 16px minimum.
- Body copy: 18px default; 17px absolute minimum for secondary card/body text.
- Labels/kickers: 13-14px minimum.
- Metadata and dates: 14px minimum.
- Metric captions: 14-15px.
- Metric values: 28-34px.
- Action links/buttons: 15-16px minimum.
- News chyron/ticker: 14px minimum.
- Form controls: 16px minimum.
- Mobile: never shrink critical metadata below 14px; stack or wrap instead.
- Keep existing color palette and visual identity unless contrast testing demonstrates a readability defect.
- No data-model, pricing, route, or ingestion behavior changes in this plan.

## Review Focus

- **Tablet width around 1024-1366px:** text must remain readable without forcing horizontal overflow; Task 3 requires visual acceptance at those widths.
- **Long signal/project titles:** larger text must wrap inside cards/ticker without covering adjacent content; Task 2 tests/accepts wrapping selectors.
- **Navigation crowding:** 16px navigation must not force header overflow before the existing responsive breakpoint; Task 3 checks tablet and mobile states.
- **Ticker density:** increasing ticker text must not make the live-intelligence strip unusably tall or clip date/verification labels; Task 2 covers chyron-specific rules.
- **Mobile metadata:** labels/dates must remain >=14px and stack instead of being reduced; Task 3 checks the <=600px rules.

---

## File Structure

- `app/globals.css` — public typography tokens and selector updates.
- `scripts/public-readability.test.mjs` — static CSS contract enforcing approved floors on public selectors/tokens.
- `scripts/news-chyron.test.mjs` — preserve accessibility/reduced-motion behavior and add ticker-size contract where appropriate.
- `docs/public-readability-acceptance.md` — visual acceptance checklist/results for desktop, tablet, and mobile screenshots.

---

### Task 1: Add Public Typography Tokens and Core Floors

**Files:**
- Modify: `app/globals.css`
- Create: `scripts/public-readability.test.mjs`

**Interfaces:**
- Produces CSS custom properties:
  - `--font-public-nav: 16px`
  - `--font-public-body: 18px`
  - `--font-public-secondary: 17px`
  - `--font-public-meta: 14px`
  - `--font-public-kicker: 14px`
  - `--font-public-action: 16px`
  - `--font-public-metric-caption: 15px`
  - `--font-public-metric-value: 30px`
  - `--font-public-ticker: 14px`
  - `--font-public-control: 16px`

- [ ] **Step 1: Write failing token tests**

Read `app/globals.css` and assert all ten custom properties exist with the exact values above.

- [ ] **Step 2: Write failing selector-floor tests**

Assert public navigation uses `var(--font-public-nav)`, `.eyebrow,.kicker` uses `var(--font-public-kicker)`, public action/button selectors use at least the action token, `.databaseMetrics span`/equivalent metric captions use the metric-caption token, and metric values use the metric-value token.

- [ ] **Step 3: Run the test**

Run: `node --test scripts/public-readability.test.mjs`

Expected: FAIL on the existing 10-14px hardcoded rules.

- [ ] **Step 4: Add tokens to `:root` and apply the core floors**

Use tokens rather than repeating raw pixel values on key public selectors. Do not globally force admin-only microcopy to 18px unless it shares a public selector.

- [ ] **Step 5: Run the test**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/globals.css scripts/public-readability.test.mjs
git commit -m "style: raise public typography floors"
```

### Task 2: Fix Intelligence Cards, Pricing, Metrics, and News Chyron

**Files:**
- Modify: `app/globals.css`
- Modify: `scripts/public-readability.test.mjs`
- Modify: `scripts/news-chyron.test.mjs`

**Interfaces:**
- Consumes: Task 1 typography tokens.
- Produces: readable intelligence/pricing/database cards and a 14px-minimum live chyron without component-data changes.

- [ ] **Step 1: Add failing surface-specific tests**

Require the following public surface classes/selectors to use approved tokens or values at/above their floors:

- `.commerceHero > p` -> public body;
- `.valueGrid p`, `.intelligenceValueGrid p`, `.priceCard p`, `.priceCard li`, project/database card copy -> public secondary or body;
- project/record metadata and dates -> public meta;
- `.databaseMetrics strong` -> metric value;
- `.databaseMetrics span` -> metric caption;
- `.newsChyron`, `.newsChyronItem`, `.newsChyronType`, `.newsChyronVerified`, ticker `time` -> ticker/meta floor;
- public form inputs/selects/textarea -> control floor.

- [ ] **Step 2: Add wrapping/line-height contracts**

Static test must find non-clipping rules for card/ticker text (`white-space` must not force normal card copy into one line; ticker item may remain nowrap only inside a horizontally moving track with adequate gap). Require body/card line-height >=1.45.

- [ ] **Step 3: Run focused tests and verify failure**

Run: `node --test scripts/public-readability.test.mjs scripts/news-chyron.test.mjs`

- [ ] **Step 4: Update public surface CSS**

Raise text sizes while preserving existing grid structure. Increase card padding/gap only where the new type would otherwise feel cramped. Do not reduce visible information to compensate.

- [ ] **Step 5: Adjust chyron height/gaps only as needed**

Keep `LIVE INTELLIGENCE`, `VERIFIED`, headline, region/market, and date readable. Preserve the existing internal links, duplicated scrolling group, hover/focus behavior, accessibility labels, and reduced-motion behavior.

- [ ] **Step 6: Run tests**

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/globals.css scripts/public-readability.test.mjs scripts/news-chyron.test.mjs
git commit -m "style: improve intelligence and pricing readability"
```

### Task 3: Protect Tablet/Mobile Layout and Perform Visual Acceptance

**Files:**
- Modify: `app/globals.css`
- Modify: `scripts/public-readability.test.mjs`
- Create: `docs/public-readability-acceptance.md`

**Interfaces:**
- Produces: responsive rules that keep critical public metadata >=14px and visual acceptance evidence.

- [ ] **Step 1: Add failing responsive contract tests**

Assert <=900px and <=600px rules do not override public metadata/ticker/nav text below approved floors. Assert database/value/pricing grids reduce columns or stack rather than using smaller text as the layout escape hatch.

- [ ] **Step 2: Update responsive CSS**

At tablet/mobile widths, prioritize stacking, wrapping, shorter gaps, and column reduction. Preserve 44px-class practical touch targets for primary actions where possible; never solve overflow by dropping text below 14px.

- [ ] **Step 3: Run CSS contract tests and full intelligence tests**

Run:

```bash
node --test scripts/public-readability.test.mjs scripts/news-chyron.test.mjs
npm run intel:test
npm run build
```

Expected: PASS.

- [ ] **Step 4: Visual acceptance at representative widths**

Capture/inspect the deployed or local `/intelligence`, `/database`, and `/pricing` pages at approximately:

- 1440px desktop;
- 1366px landscape tablet/desktop;
- 1024px tablet;
- 390px mobile.

Acceptance: no required zooming for card text, no clipped navigation/ticker/card content, no horizontal page overflow, and no critical metadata below the approved floor.

- [ ] **Step 5: Record results**

Create `docs/public-readability-acceptance.md` with tested routes/widths, pass/fail notes, and any remaining selector-specific defects. Do not mark visual acceptance complete from static tests alone.

- [ ] **Step 6: Commit**

```bash
git add app/globals.css scripts/public-readability.test.mjs docs/public-readability-acceptance.md
git commit -m "test: verify public readability across breakpoints"
```

---

## Self-Review Result

- All typography floors from the approved spec are mapped to a token and at least one testable selector family.
- Large editorial headings are preserved.
- The plan changes CSS and tests only; no ingestion/data/product behavior is coupled to this work.
- Tablet/mobile behavior explicitly uses layout changes instead of smaller critical text.
- Visual acceptance is required before completion; static CSS tests alone are not treated as proof.
