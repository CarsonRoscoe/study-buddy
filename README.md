# Study Buddy

A **locally runnable** flashcard app for intro web / digital design students — inspired by Quizlet’s Classes + sets.

Stack: **vanilla HTML/CSS/JS** in `website/`, a small **Node + Express** API in `server/`, and **JSON files** under `data/`.

## Get the code

```bash
git clone https://github.com/CarsonRoscoe/study-buddy.git
cd study-buddy
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

On first run, `data/classes/` and `data/cardsets/` are empty until you create content in the app. Runtime JSON and images are **not** committed to Git (see `.gitignore`).

## Project map

```text
study-buddy/
├── website/           ← HTML, CSS, JS (what the browser loads)
│   ├── index.html     ← Home (Classes)
│   ├── class.html     ← one Class and its Cardsets
│   ├── cardset.html   ← Learn | Test | Edit tabs
│   ├── css/           ← base, layout, components
│   └── js/            ← api.js, shared.js, *-page.js
├── server/            ← Express + file storage
└── data/
    ├── classes/       ← one JSON file per Class
    ├── cardsets/      ← one JSON file per Cardset (includes cards[])
    └── images/        ← uploaded covers and term images
```

**Redirect stubs** (old bookmarks only): `learn.html`, `test.html`, and `cardset-edit.html` send you to the matching tab on `cardset.html`.

## Architecture

```text
Browser  →  website (HTML/CSS/JS)
                │  fetch('/api/…')
                ▼
           server (Express)
                │  *-store.js
                ▼
           data/classes/*.json
           data/cardsets/*.json
```

| Piece | Responsibility |
| ----- | -------------- |
| HTML | Structure |
| `website/css/` | Look and layout |
| `website/js/api.js` | `fetch` wrappers for the API |
| `website/js/shared.js` | Shared UI helpers (settings, dialogs, shuffle) |
| `website/js/*-page.js` | One script per page’s DOM logic |
| `server/routes/` | HTTP handlers |
| `server/lib/*-store.js` | Read/write JSON on disk |

## Pages

| URL | What you get |
| --- | ------------ |
| `/` or `/index.html` | **Home** — Class tiles |
| `/class.html?id=…` | Cardsets in a Class |
| `/cardset.html?id=…` | **Learn**, **Test**, **Edit** tabs |
| `/learn.html?id=…` | Redirect → Learn tab |
| `/test.html?id=…` | Redirect → Test tab |
| `/cardset-edit.html?id=…` | Redirect → Edit tab |

**Settings** (term vs definition as the prompt side): gear icon in the header → modal on any page.

## How studying works

1. **+** menu → **New Class**, then **New Cardset** (pick a Class).
2. Open a Cardset → **Edit** tab to add rows (term, definition, optional image).
3. **Learn** — browse and flip cards; **Test** — mark Correct/Incorrect and see a score.

Import/export: **⋯** menu on Home (class), Class (cardset), or Cardset (merge import / export set).

## Cardset JSON shape

```json
{
  "id": "cardset-1726612345678",
  "title": "HTML basics",
  "classId": "class-1726612345678",
  "cards": [
    {
      "id": "card-1",
      "term": "HTML",
      "definition": "HyperText Markup Language",
      "termImageUrl": ""
    }
  ],
  "createdAt": "2026-09-17T00:00:00.000Z",
  "updatedAt": "2026-09-17T00:00:00.000Z"
}
```

## API (optional reading)

| Method | URL | Purpose |
| ------ | --- | ------- |
| GET/POST | `/api/classes` | List / create Classes |
| PUT/DELETE | `/api/classes/:id` | Update / delete Class (+ its Cardsets) |
| GET/POST | `/api/cardsets` | List / create Cardsets |
| PUT/PATCH/DELETE | `/api/cardsets/:id` | Update, move, or delete |
| POST | `/api/images` | Upload image `{ dataUrl }` → `{ url }` |

## Folder READMEs

Each major folder has a short `README.md` (what it is, what to edit, what to avoid).
