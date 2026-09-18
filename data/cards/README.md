# data/cards/

## What is this folder?

Each flashcard is **one JSON file**.
The filename matches the card’s `id` (for example `sample-hello.json`).
New cards created in the app get an id like `card-1726612345678` (timestamp in milliseconds).

## Example card shape

```json
{
  "id": "sample-hello",
  "frontTitle": "HTML basics",
  "front": "What does HTML stand for?",
  "back": "HyperText Markup Language",
  "backSubtitle": "Web pages are built from HTML",
  "createdAt": "2026-09-17T00:00:00.000Z",
  "updatedAt": "2026-09-17T00:00:00.000Z",
  "tags": ["html", "basics"]
}
```

| Field | Meaning |
|-------|---------|
| `id` | Random id (also the file name) |
| `frontTitle` | Short title on the front (can be `""`) |
| `front` | Main front text (required) |
| `back` | Main back text (required) |
| `backSubtitle` | Extra line on the back (can be `""`) |
| `createdAt` | When the card was first saved |
| `updatedAt` | When the card was last saved |
| `tags` | Array of labels (default `[]`) |

## What should I change (or not)?

- Share this folder with classmates to share decks of cards.
- Prefer creating cards in the website UI so IDs stay consistent.
- Do **not** put code here — only JSON data files.
