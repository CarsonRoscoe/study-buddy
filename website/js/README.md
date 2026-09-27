# website/js/

Client-side JavaScript. Load `api.js` and `shared.js` before any page script.

| File | Role |
| ---- | ---- |
| `api.js` | HTTP wrappers for `/api/classes`, `/api/cardsets`, `/api/images` |
| `shared.js` | Shuffle, settings, header menus, create Class/Cardset dialogs, breadcrumbs |
| `home-page.js` | Home — Class tiles, drag reorder |
| `class-page.js` | Class detail — Cardset tiles |
| `cardset-page.js` | Cardset hub — tabs, import/export, wires study modules |
| `cardset-edit.js` | Edit tab — table, preview, live save |
| `study-learn.js` / `study-test.js` | Learn and Test session logic (used by `cardset.html`) |
| `learn-page.js`, `test-page.js`, `cardset-edit-page.js` | Redirect-only for legacy URLs |

Do not put raw `fetch` URLs in page scripts — extend `api.js` instead.
