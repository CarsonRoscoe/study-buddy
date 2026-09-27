# Study Buddy

A **locally runnable** flashcard app for intro web / digital design students, inspired by Quizlet's Classes and sets.

Stack: **vanilla HTML/CSS/JS** in `website/`, a small **Node + Express** API in `server/`, and **JSON files** under `data/`.

## Documentation

| Doc | Audience |
| --- | -------- |
| [QUICKSTART.md](QUICKSTART.md) | Using the app: classes, cardsets, cards, images, Learn/Test, import/export |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Fork, PR workflow, stack rules, `data/` and Git |

## Get the code

```bash
git clone https://github.com/CarsonRoscoe/study-buddy.git
cd study-buddy
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000). For a guided tour of features, see [QUICKSTART.md](QUICKSTART.md).

Runtime files under `data/` stay on your machine and are not committed (see [data/README.md](data/README.md) and `.gitignore`).

## Project map

```text
study-buddy/
├── website/           HTML, CSS, JS (browser)
├── server/            Express + file storage
└── data/              classes/, cardsets/, images/ (local only)
```

Legacy URL stubs (`learn.html`, `test.html`, `cardset-edit.html`) redirect to tabs on `cardset.html`.

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
| `website/css/` | base, layout, components |
| `website/js/api.js` | `fetch` wrappers for the API |
| `website/js/shared.js` | Shared UI (settings, dialogs, shuffle) |
| `website/js/*-page.js` | One script per page |
| `server/routes/` | HTTP handlers |
| `server/lib/*-store.js` | Read/write JSON on disk |

Details: [website/README.md](website/README.md), [server/README.md](server/README.md).

## API (optional)

| Method | URL | Purpose |
| ------ | --- | ------- |
| GET/POST | `/api/classes` | List / create Classes |
| PUT/DELETE | `/api/classes/:id` | Update / delete Class (+ its Cardsets) |
| GET/POST | `/api/cardsets` | List / create Cardsets |
| PUT/PATCH/DELETE | `/api/cardsets/:id` | Update, move, or delete |
| POST | `/api/images` | Upload image `{ dataUrl }` → `{ url }` |

On disk, each cardset JSON has `id`, `title`, `classId`, `cards[]` (term, definition, optional `termImageUrl`), and timestamps. Export from the app for a portable example file.

## Contributing

Bug fixes and student-friendly improvements welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR.
