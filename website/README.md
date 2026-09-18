# website/

## What is this folder?

This is the **front end** — the pages people see in the browser.
It is plain HTML, CSS, and JavaScript (no React, no build step).

## What files matter?

| File | Job |
|------|-----|
| `index.html` | **Study** (home) — flip through cards |
| `quiz.html` | **Quiz** — timed session + history |
| `cards.html` | Manage flashcards (create / edit / delete) |
| `study.html` | Redirects to `index.html` (old link) |
| `css/` | Looks and layout |
| `js/` | Page behavior and talking to the server |
| `assets/` | Images or icons (optional) |

## What should I change (or not)?

- **Do** edit the HTML/CSS/JS here to change what students see.
- **Do not** put saved flashcard data here — that lives in `data/cards/`.
- **Do not** write files from the browser. The browser asks the **server**; the server saves files.
