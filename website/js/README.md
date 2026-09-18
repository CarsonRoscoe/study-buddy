# website/js/

## What is this folder?

JavaScript that runs **in the browser**.
We keep “talking to the server” separate from “updating the page”.

## What files matter?

| File | Job |
|------|-----|
| `api.js` | Only `fetch` helpers (`getCards`, `createQuiz`, …). No DOM. |
| `shared.js` | Small helpers reused by every page (shuffle, escapeHtml, tag filter, paint flashcard). |
| `cards-page.js` | Only behavior for `cards.html` (list + filters + CRUD + import/export) |
| `study-page.js` | Only behavior for Study on `index.html` |
| `quiz-page.js` | Only behavior for `quiz.html` (start + review) |

## Load order (do not shuffle these `<script>` tags)

1. `api.js` → creates `window.StudyBuddyApi`
2. `shared.js` → creates `window.StudyBuddyShared`
3. `*-page.js` → uses both of the above

## What should I change (or not)?

- Put new **API calls** in `api.js`.
- Put helpers used by **more than one page** in `shared.js`.
- Put **button clicks / form / table** logic in the matching `*-page.js` file.
- Do **not** put `fetch` URLs all over the page scripts — use `StudyBuddyApi` from `api.js`.
- Do **not** try to read/write disk files from these scripts. Only the Node server can do that.
