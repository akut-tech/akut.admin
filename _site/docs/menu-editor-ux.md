# Menu Editor — UX Analysis & Redesign Proposal

> Analysis of the restaurant menu registration/editing workflow, with a wireframe-level
> redesign that reduces cognitive load and aligns with the existing design system.
>
> **Scope:** analysis + proposal. No code changes are made by this document.

---

## 1. Executive summary

The menu editor is a single, deeply nested, always-expanded form. Everything — menu settings,
every category, every item, all four-language translations, allergens, diets, availability, videos,
and images — is rendered at once into one `#editorRoot` and organized only by nested accordions
(`assets/js/menu.js:435-565`).

It works, but it does not scale well as the field set grows. The core problems are **density**
(too much visible at once), **translation multiplication** (every text field becomes four inputs),
**mixed concerns** (configuration sits next to content), **late validation** (most errors appear
only after a save round-trip), and **no overview** (no way to see how complete a menu is without
expanding everything).

The redesign keeps the existing vanilla-JS + custom-CSS stack and reuses primitives that already
exist (`.segmented` tabs, `accordion()`, the `AkutConfirm` modal, the `field()` builders, the i18n
engine). It proposes: split **Settings** from **Content**, edit one item at a time in a **focused
panel**, collapse translations to an **active-language** control, add a **sticky action bar**, and
surface **inline validation + completeness badges**.

---

## 2. Current workflow

### 2.1 Architecture

- **Stack:** Jekyll static site + vanilla JavaScript (ES5 IIFEs). No SPA framework, no build step
  for JS. Styling is a single hand-written token-based stylesheet (`assets/css/style.css`).
- **Page:** `menu.html` holds both a list view (`#listView`) and the editor (`#editorView`),
  toggled via `hidden`. `menu-list.js` calls `window.MenuEditor.open(menuId, status)` to launch the
  editor.
- **Editor:** the whole form is built imperatively by `assets/js/menu.js` (1,338 lines) into
  `#editorRoot` using a small hyperscript helper `h(tag, props, children)`.
- **Model:** one module-level `state = { menuId, status, menu, view }` (`menu.js:93-98`). Every
  field's `onChange` mutates the `menu` object in place.
- **Data shape:** `Menu → Categories[] → Items[]`. An "item" (dish) is never edited on its own —
  it lives inside a category accordion inside the one big form.

### 2.2 Field inventory

| Level | Fields |
|-------|--------|
| **Menu** (`menu.js:435-486`) | TemplateId (combo, required), DefaultLanguage, Currency, Notes (≤1000), FoundedYear, AvailabilityTime (From/To hours), Name (translations, ≤100, required), Description (translations, ≤500), Logo (image), Categories[] |
| **Category** (`menu.js:488-510`) | Name (translations, ≤50), Description (translations, ≤200), Items[] |
| **Item / dish** (`menu.js:528-565`) | Price, Tag, Name (≤50), ShortDescription (≤100), FullDescription (≤800), Ingredients (≤200) — all translations — Allergens (14 chips), Diets (17 chips), Availability (unavailable + 7 day chips), YouTubeVideoUrls (list), Images (list) |

Translatable languages: **Portuguese, English, Spanish, French** (`assets/js/config.js:23`).

### 2.3 Issues identified

1. **Single-page density & deep nesting.** `renderForm()` builds Menu → Category (accordion) →
   Item (nested accordion) → fields, all in one scroll (`menu.js:435-565`). The only
   progressive-disclosure mechanism is collapsing accordions.

2. **Translation explosion.** `translationsField()` renders **one input per language**
   (`menu.js:678-707`). Because an item has four translatable fields, a single expanded dish shows
   **~16 translation inputs** before you even reach price, 14 allergen chips, 17 diet chips, 7 day
   chips, the video list, and the image list. This is the single biggest driver of visual load.

3. **Configuration mixed with content.** Template, default language, currency, notes, and founded
   year (menu *settings*) share the top card with Name, Description, and Logo (menu *content*) —
   different tasks, different frequencies, same dense block (`menu.js:440-470`).

4. **Full teardown re-render on every structural edit.** Adding, removing, or reordering a category
   or item calls `renderForm()`, which does `root.innerHTML = ""` and rebuilds the entire tree
   (`menu.js:435-438`; e.g. `move()` + `renderForm()` at `502-508` and `557-563`). This drops focus,
   resets scroll position, and scales poorly with large menus. (Image and video lists are the
   exception — they repaint locally.)

5. **Validation surfaces late and only at the top.** Client-side `validate()` checks just three
   things (TemplateId, Name, FoundedYear) before submit (`menu.js:1225-1235`). Everything else is a
   server round-trip returned as a structured error list shown in one top banner
   (`renderErrorList`, `menu.js:220-240`). The banner links are genuinely good — they deep-link,
   open the right accordions, scroll, focus, and flash the field (`goToError`, `menu.js:298-331`) —
   but there is **no inline, while-typing feedback** and **no required-field marking** beyond a `*`
   on TemplateId/Name.

6. **No overview / completeness signal.** Nothing indicates which categories or items are
   incomplete (missing a name, missing a price, missing the default-language translation) without
   expanding each accordion individually.

7. **Mobile.** Grids collapse to a single column (`style.css:211-213`, `286`), so an expanded item
   becomes an extremely tall stack; nested accordions plus four-language rows compound the height.

8. **Reordering is coarse.** Order is derived from position via ↑/↓ icon buttons only
   (`move()`, `menu.js:1051-1055`), and each press triggers a full re-render. No drag-and-drop.

9. **Legacy page.** `menu-edit.html` references element IDs `menu.js` no longer uses
   (`loadingState`/`newBtn` vs `editorLoading`/`newEditorBtn`), so it appears dead and should be
   removed or redirected.

---

## 3. Proposed workflow

The guiding idea: **show less at once, and separate distinct tasks.** Configure the menu, build its
structure, and write item detail are three different activities — the redesign gives each its own
surface instead of stacking them all in one scroll.

### 3.1 Information architecture

Split the editor into top-level **sections** using the existing `.segmented` control (the same
component already used for Form/JSON):

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← Menus     Editing: Active ▾     [ Settings · Content · JSON ]       │
│                                    ⌊ sticky action bar below ⌋          │
├──────────────────────────────────────────────────────────────────────┤
│  Save   Preview   Publish            (sticky, always visible)          │
└──────────────────────────────────────────────────────────────────────┘
```

- **Settings** — template, default language, currency, founded year, availability hours, notes.
  Low-frequency configuration, edited rarely.
- **Content** — menu name/description/logo + the category → item structure. The everyday work.
- **JSON** — the existing raw-JSON power-user tab, unchanged.

### 3.2 Content section: category list → item rows

Categories stay as accordions, but each category body becomes a **compact list of item rows**
instead of a stack of fully expanded item accordions. Each row shows a summary and a completeness
badge; clicking it opens the focused item editor (3.3).

```
Content
┌──────────────────────────────────────────────────────────────────────┐
│  Menu name (active-lang input)          Logo [ + ]                     │
├──────────────────────────────────────────────────────────────────────┤
│  ▾  Category 1 — Starters                        ↑ ↓ ✕   [+ Item]      │
│     ┌────────────────────────────────────────────────────────────┐    │
│     │  Bruschetta            €6.50    ● complete        ↑ ↓ ✕      │    │
│     │  Soup of the day       €—       ⚠ no price        ↑ ↓ ✕      │    │
│     │  (untitled item)       €4.00    ⚠ missing name    ↑ ↓ ✕      │    │
│     └────────────────────────────────────────────────────────────┘    │
│  ▸  Category 2 — Mains                           ↑ ↓ ✕   [+ Item]      │
└──────────────────────────────────────────────────────────────────────┘
```

The row summary reuses `nameHint()` (`menu.js:1045-1049`) for the name and the price already in the
model; the badge is derived from the same required-field checks used at save time.

### 3.3 Focused item editor (panel/drawer)

Clicking an item row opens **one dish at a time** in a panel built on the existing modal/overlay
pattern (`.modal-overlay`/`.modal-card`, `assets/js/confirm.js`). Only that item's fields are
visible — no sibling items, no other categories competing for attention.

```
┌───────────────────────────── Edit item ──────────────────────────────┐
│  Name (active-lang) ......................  Price [ 6.50 ]  Tag [New ▾]│
│  ┌─ Language:  PT ● │ EN ● │ ES ○ │ FR ○ ─────────────────────────┐   │
│  Short description ......................................  38/100  │   │
│  Full description  ......................................  120/800 │   │
│  Ingredients       ......................................  40/200  │   │
│  └───────────────────────────────────────────────────────────────┘   │
│  Allergens   [Gluten][Milk][Nuts] …                                   │
│  Diets       [Vegan][Spicy] …                                         │
│  Availability  ☐ Unavailable    Days [Mon][Tue] …                     │
│  Videos      + Add video                                              │
│  Images      + Add image                                             │
│                                              [ Cancel ]  [ Done ]      │
└───────────────────────────────────────────────────────────────────────┘
```

The item's field builders (`priceField`, `tagField`, `translationsField`, `allergensField`,
`dietsField`, `availabilityField`, `youTubeField`, `imagesField`) are reused as-is — only their
*container* changes from a nested accordion to the panel.

### 3.4 Active-language translation control

Replace four always-visible inputs with **one visible input plus a language selector** (a small
`.segmented` per translated field, or a single editor-wide active language). Dots indicate which
languages already have content, so nothing is hidden or lost.

```
Before (current)                     After (proposed)
Name                                 Name        [ PT ● EN ● ES ○ FR ○ ]
  Portuguese  [ ................ ]      [ Bruschetta ...................... ]
  English     [ ................ ]
  Spanish     [ ................ ]      ● = has content   ○ = empty
  French      [ ................ ]
```

This cuts the number of simultaneously visible translation inputs by ~75% while making per-language
completeness *more* visible than today. The underlying model is unchanged — still a translations
object keyed by language name (`menu.js:678-707`).

### 3.5 Sticky action bar & inline validation

- **Sticky action bar** keeps Save / Preview / Publish reachable without scrolling back to the
  toolbar.
- **Inline validation** marks required fields and shows per-field messages while editing, using the
  same required-field logic that already exists at save time. The excellent existing
  jump-to-field error banner (`goToError`) stays as the mechanism for server-side errors.

---

## 4. Recommendations (mapped to existing components)

Every recommendation builds on something already in the codebase — no new framework or
infrastructure is required.

| Recommendation | Reuses |
|----------------|--------|
| Settings / Content / JSON section tabs | `.segmented`/`.seg` (`style.css:358-360`), `switchView()` pattern (`menu.js:404-416`) |
| Focused item editor panel | `.modal-overlay`/`.modal-card` + `AkutConfirm` overlay (`assets/js/confirm.js`) |
| Active-language translation control | `translationsField()` model (`menu.js:678-707`), `.segmented` for the selector |
| Item rows with completeness badges | `nameHint()` (`menu.js:1045`), existing required checks, `.badge`/`.badge-*` (`style.css:339-345`) |
| Inline validation | `data-entity-id`/`data-field` stamping already used by `goToError` (`menu.js:185-191`, `298-324`) |
| Sticky action bar | `.toolbar`/`.btn` primitives (`style.css:298-357`) + `position: sticky` |
| All labels | existing i18n keys under `menu.*` (`assets/js/i18n.js`) |

---

## 5. Quick wins vs larger improvements

### Quick wins (low risk, small diffs)

| # | Change | Impact | Touches |
|---|--------|--------|---------|
| 1 | Active-language translation control (collapse 4 inputs → 1 + selector) | High — biggest density reduction | `translationsField()`, `menu.js:678-707` |
| 2 | Split top card into **Settings** vs **Content** tabs | High — separates config from content | `renderForm()` `menu.js:435-470`, `.segmented` |
| 3 | Sticky Save/Preview/Publish bar | Medium — actions always reachable | `menu.html` toolbar, `style.css` |
| 4 | Completeness badge on each category/item row | Medium — at-a-glance overview | `renderItem()`/`renderCategory()`, `menu.js:488-565` |
| 5 | Mark all required fields (not just Name/TemplateId) | Medium — fewer failed saves | field builders + `validate()` `menu.js:1225` |
| 6 | Remove or redirect legacy `menu-edit.html` | Low — removes dead/confusing page | `menu-edit.html` |

### Larger improvements

| # | Change | Impact | Touches |
|---|--------|--------|---------|
| A | Focused item editor panel (edit one dish at a time) | High — biggest cognitive-load win | new render path + `AkutConfirm` overlay pattern |
| B | Incremental rendering (stop full `renderForm()` teardown on add/remove/reorder) | High — no focus/scroll loss, better perf | `renderForm()` + `move()` call sites, `menu.js:435-438`, `502-563` |
| C | Inline per-field validation while typing | Medium — earlier feedback | field builders + `validate()` extraction |
| D | Drag-and-drop reordering for categories/items/media | Medium — faster structural edits | `accordion()`/row builders, replaces `move()` UX |
| E | Menu overview with completeness summary | Medium — orientation for large menus | new summary block in Content section |

---

## 6. Mobile & performance notes

- **Mobile:** panelized item editing (3.3) and the active-language control (3.4) directly attack the
  two things that make the current form so tall on small screens — simultaneously expanded items and
  four-language stacks. Fewer inputs are on screen at once, and each item is edited in isolation.
- **Performance:** the current full-teardown re-render (`root.innerHTML = ""`) rebuilds every
  category and item on any structural change (issue 4, improvement B). Scoping repaints to the
  affected subtree — the pattern the image/video lists already use via local `paint()` closures —
  removes the focus/scroll jumps and keeps large menus responsive.

---

## 7. Acceptance-criteria check

- **Documented current issues** — §2.3 (nine issues, each anchored to `menu.js` line references).
- **Redesigned workflow that reduces cognitive load** — §3 (wireframe-level, with ASCII mockups).
- **Actionable, design-system-aligned recommendations** — §4 (every item mapped to an existing
  component) and §5 (prioritized quick wins vs larger improvements with effort/impact and files).
