# Study Buddy

A simple **locally runnable** flashcard app for intro web / digital design students.

You will use:

- **HTML + CSS + vanilla JavaScript** in `website/`
- A small **Node + Express** server in `server/`
- **JSON files** in `data/cards/` for saving cards (easy to share)

## How to run

1. Install [Node.js](https://nodejs.org/) (LTS is fine).
2. Open a terminal in this project folder.
3. Install dependencies:

```bash
npm install
```

4. Start the server:

```bash
npm start
```

5. Open a browser to: [http://localhost:3000](http://localhost:3000)

You should see the Study screen right away (home = studying). One command starts both the website and the API.

## Project map

```text
study-buddy/
├── website/          ← what you see (HTML, CSS, JS)
│   ├── index.html    ← Study (home / primary use)
│   ├── quiz.html     ← Quiz sessions + history
│   ├── cards.html    ← create / edit / delete
│   ├── study.html    ← redirects to index.html
│   ├── css/          ← base, layout, components
│   └── js/           ← api.js + shared.js + page scripts
├── server/           ← Express API + file saving
│   ├── server.js     ← starts the app
│   ├── routes/       ← HTTP for /api/cards and /api/quizzes
│   └── lib/          ← reads/writes JSON files
└── data/
    ├── cards/        ← saved flashcards (share this folder)
    └── quizzes/      ← quiz history
```

## Architecture (mental model)

```text
Browser  →  website (HTML/CSS/JS)
                │
                │  fetch('/api/cards')
                ▼
           server (Express)
                │
                │  card-store.js
                ▼
           data/cards/*.json
```

**Separation of concerns:**

| Piece                      | Responsibility               |
| -------------------------- | ---------------------------- |
| HTML pages                 | Structure only               |
| `website/css/`             | Look and layout              |
| `website/js/api.js`        | Talk to the server (`fetch`) |
| `website/js/shared.js`     | Shared helpers (shuffle, tags, …) |
| `website/js/*-page.js`     | Update the page (DOM)        |
| `server/routes/`           | Handle HTTP requests         |
| `server/lib/card-store.js` | Read/write card files        |
| `data/cards/`              | The saved data               |

## Pages

| URL                  | Page                          |
| -------------------- | ----------------------------- |
| `/` or `/index.html` | **Study** (primary)           |
| `/quiz.html`         | Quiz (start + review history) |
| `/cards.html`        | Manage cards                  |
| `/study.html`        | Redirects to Study            |

## Sharing cards with classmates

1. Create cards in the app (or copy existing JSON files).
2. Zip or copy the whole `data/cards/` folder.
3. Give it to a classmate.
4. They paste those files into **their** `data/cards/` folder.
5. They refresh the site (or restart `npm start`) and see the shared cards.

## Card shape

```json
{
  "id": "card-1726612345678",
  "frontTitle": "HTML basics",
  "front": "What does HTML stand for?",
  "back": "HyperText Markup Language",
  "backSubtitle": "Web pages are built from HTML",
  "createdAt": "2026-09-17T00:00:00.000Z",
  "updatedAt": "2026-09-17T00:00:00.000Z",
  "tags": ["html", "basics"]
}
```

Tag filters on Study and Quiz use **AND** logic: a card must include every selected tag.
Quiz also saves each finished session under `data/quizzes/`.

## API (for curious students)

| Method | URL                | What it does                                                                            |
| ------ | ------------------ | --------------------------------------------------------------------------------------- |
| GET    | `/api/cards`       | List all cards                                                                          |
| GET    | `/api/cards/:id`   | Get one card                                                                            |
| POST   | `/api/cards`       | Create a card (`front`, `back` required; optional `frontTitle`, `backSubtitle`, `tags`) |
| PUT    | `/api/cards/:id`   | Update a card                                                                           |
| DELETE | `/api/cards/:id`   | Delete a card                                                                           |
| GET    | `/api/quizzes`     | List quiz history                                                                       |
| GET    | `/api/quizzes/:id` | Get one quiz                                                                            |
| POST   | `/api/quizzes`     | Save a finished quiz                                                                    |
| DELETE | `/api/quizzes/:id` | Delete a quiz from history                                                              |

## More help

Every folder has its own `README.md` with three beginner questions:

1. What is this folder?
2. What files matter?
3. What should I change (or not)?
