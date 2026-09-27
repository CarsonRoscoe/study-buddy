# server/routes/

## What is this folder?

Express routers — one file per API area. Each file maps HTTP methods to store functions.

## What files matter?

| File | Base path |
| ---- | --------- |
| `classes.js` | `/api/classes` |
| `cardsets.js` | `/api/cardsets` |
| `images.js` | `/api/images` |

## What should I change (or not)?

- Keep routes thin: parse request → call store → send JSON / status.
- Put filesystem logic in `server/lib/`, not here.
