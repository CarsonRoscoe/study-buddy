# data/

JSON and images the server reads and writes. The browser uses `/api/*`, not these paths directly.

**Git:** Only README files here are tracked. Your `*.json` and image files are local (see root `.gitignore`).

| Folder | Contents |
| ------ | -------- |
| `classes/` | One JSON file per Class (title, cover URL, sort order) |
| `cardsets/` | One JSON file per Cardset (title, `classId`, `cards[]`) |
| `images/` | Files uploaded from the UI |

After `npm start`, create Classes and Cardsets in the app — folders fill in automatically.

Do not use `/` or `..` in ids; the server rejects unsafe filenames.
