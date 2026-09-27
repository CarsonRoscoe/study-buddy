# server/lib/

Filesystem helpers used by `server/routes/`. Not imported by the browser.

| File | Job |
| ---- | --- |
| `id.js` | `makeId('cardset')`, `assertSafeId` |
| `class-store.js` | CRUD for `data/classes/` |
| `cardset-store.js` | CRUD + move Cardset into a Class |
| `image-store.js` | Write `data/images/` from data URLs |
| `card-normalize.js` | Normalize card fields on read/write |

Validate ids before building file paths. Set `updatedAt` on writes.
