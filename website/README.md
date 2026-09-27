# website/

Browser-facing HTML, CSS, and JavaScript.

## Main pages

| File | Role |
| ---- | ---- |
| `index.html` | Home — Class tiles, + menu, import/export class |
| `class.html` | Cardsets in one Class |
| `cardset.html` | Learn, Test, and Edit tabs for one Cardset |
| `learn.html`, `test.html`, `cardset-edit.html` | Redirect stubs → `cardset.html?tab=…` |

## Scripts (typical load order)

1. `js/api.js` — `window.StudyBuddyApi`
2. `js/shared.js` — chrome, settings, create dialogs, shared helpers
3. Page script — e.g. `home-page.js`, `cardset-page.js`
4. On `cardset.html` only: `study-learn.js`, `study-test.js`, `cardset-edit.js`

## CSS

| File | Role |
| ---- | ---- |
| `css/base.css` | Colors, tokens, typography |
| `css/layout.css` | Header, main, scroll areas, grids |
| `css/components.css` | Buttons, tiles, flashcards, tables, dialogs |

Keep `fetch` in `api.js`. Page scripts should call the API through that module.
