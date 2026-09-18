# server/routes/

## What is this folder?

**Route** files decide what happens for each URL + HTTP method
(GET, POST, PUT, DELETE).

They talk to Express (`req` / `res`) and call the store for disk work.

## What files matter?

| File | Job |
|------|-----|
| `cards.js` | All `/api/cards` endpoints |
| `quizzes.js` | All `/api/quizzes` endpoints |

## What should I change (or not)?

- Add new endpoints here when the API grows.
- Validate input here.
- Do **not** write `fs.readFile` / `fs.writeFile` here — use `lib/*-store.js`.
- Do **not** send HTML from these routes — only JSON.
