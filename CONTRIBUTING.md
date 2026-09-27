# Contributing

Thanks for helping improve Study Buddy. This project is meant to stay readable for intro web students, so keep changes small and easy to follow.

## How to send changes

1. **Fork** [github.com/CarsonRoscoe/study-buddy](https://github.com/CarsonRoscoe/study-buddy) to your own GitHub account.
2. **Clone your fork** locally (need Git and Node first? See [SETUP.md](SETUP.md)):
   ```bash
   git clone https://github.com/YOUR_USERNAME/study-buddy.git
   cd study-buddy
   npm install
   npm start
   ```
3. **Create a branch** for your work (not directly on `main` if you can avoid it):
   ```bash
   git checkout -b short-description-of-change
   ```
4. Make edits, test in the browser at [http://localhost:3000](http://localhost:3000).
5. **Commit** with a clear message about what changed and why.
6. **Push** the branch to **your fork**:
   ```bash
   git push -u origin short-description-of-change
   ```
7. On GitHub, open a **Pull Request** from your fork into **`CarsonRoscoe/study-buddy`** (`main`). Describe what you changed and how you tested it.

Maintainers review PRs before merge. You may get follow-up comments; update the same branch and push again to refresh the PR.

## Stack rules (please follow)

| Do | Do not |
| -- | ------ |
| Vanilla **HTML**, **CSS**, and **JavaScript** in `website/` | React, Vue, TypeScript, bundlers, or a build step |
| Small **Node + Express** API in `server/` (already in `package.json`) | New heavy frameworks or many new dependencies |
| Put shared HTTP calls in `website/js/api.js` | Raw `fetch('/api/...')` scattered in page scripts |
| Match existing file headers (`Job:` one-liner at top of JS/CSS) | Large refactors that rename everything at once |

The teaching model is three CSS files (`base`, `layout`, `components`) and one page script per screen. Prefer extending what exists over adding new layers.

## Where code lives

```text
website/     Pages, CSS, client JS
server/      Express routes + lib/*-store.js (disk I/O)
data/        Runtime JSON and images (see below)
```

Folder `README.md` files describe each area in more detail.

## Data folder and Git

Study Buddy stores user content under `data/` while the app runs. **Do not commit** classes, cardsets, or uploaded images.

Root `.gitignore` already ignores:

- `data/classes/*` (keeps `data/classes/README.md`)
- `data/cardsets/*` (keeps `data/cardsets/README.md`)
- `data/images/*` (keeps `data/images/README.md`)
- Legacy `data/cards/*` and `data/quizzes/*`

**Before you commit**, run `git status` and confirm you are not adding `*.json` or image files from `data/` except the tracked README files.

If your feature adds a **new folder under `data/`** for runtime files:

1. Add ignore rules in `.gitignore` (ignore contents, keep a `README.md` if students need a placeholder).
2. Document the folder in `data/README.md`.
3. Wire the server to read/write there safely (see `server/lib/id.js` for path rules).

Never commit `node_modules/`, `.env` files, API keys, or personal flashcard content.

## Testing your change

There is no automated test suite. Minimum check:

1. `npm install` (if you changed dependencies; rare)
2. `npm start`
3. Click through the path your change touches (Home, Class, Cardset Learn/Test/Edit, settings gear, import/export if relevant)

Note in your PR what you clicked and any edge cases you tried.

## Pull request checklist

- [ ] Runs with `npm start` on a clean clone after `npm install`
- [ ] No runtime files under `data/` in the diff
- [ ] No new build tools or unrelated dependency bumps
- [ ] Styling fits existing patterns in `website/css/`
- [ ] API changes (if any) documented in root `README.md` API table

## Questions

Open a GitHub **Issue** on [CarsonRoscoe/study-buddy](https://github.com/CarsonRoscoe/study-buddy/issues) for bugs or design questions before large work.

For using the app (not hacking on it), see [QUICKSTART.md](QUICKSTART.md). For clone and architecture, see [README.md](README.md).
