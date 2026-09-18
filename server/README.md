# server/

## What is this folder?

This is the **back end** — a small Node.js program using Express.
It does two jobs:

1. Serves the `website/` files to the browser.
2. Exposes a JSON API at `/api/cards` that reads and writes flashcard files.

## What files matter?

| File | Job |
|------|-----|
| `server.js` | Starts Express, connects static files + routes, listens on a port |
| `routes/cards.js` | Handles HTTP methods for `/api/cards` |
| `routes/quizzes.js` | Handles HTTP methods for `/api/quizzes` |
| `lib/card-store.js` | Reads and writes JSON files under `data/cards/` |
| `lib/quiz-store.js` | Reads and writes JSON files under `data/quizzes/` |

## How a request walks (mental model)

1. Browser calls `/api/cards`
2. `server.js` sends that request to `routes/cards.js`
3. `routes/cards.js` asks `lib/card-store.js` to touch the disk
4. Response JSON goes back to the browser

## What should I change (or not)?

- Keep `server.js` short — wiring only.
- Keep file logic in `lib/card-store.js`, not in the route file.
- Do **not** put HTML pages in this folder — those belong in `website/`.
