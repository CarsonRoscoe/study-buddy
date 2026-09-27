# server/

Node + Express: serves `website/` and JSON APIs under `/api/*` that read/write `data/`.

| File | Job |
| ---- | --- |
| `server.js` | Start app, static files, mount routes |
| `routes/classes.js` | `/api/classes` |
| `routes/cardsets.js` | `/api/cardsets` (+ `PATCH …/move`) |
| `routes/images.js` | `/api/images` |
| `lib/class-store.js` | Class JSON files |
| `lib/cardset-store.js` | Cardset JSON files |
| `lib/image-store.js` | Save uploads to `data/images/` |
| `lib/id.js` | Ids and path-safe checks |

Run from project root: `npm start`.
