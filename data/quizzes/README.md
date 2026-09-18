# data/quizzes/

## What is this folder?

Each finished quiz is **one JSON file**.
The filename matches the quiz’s `id` (for example `quiz-1726612345678.json`).

## Example quiz shape

```json
{
  "id": "quiz-1726612345678",
  "createdAt": "2026-09-17T00:00:00.000Z",
  "selectedTags": ["html", "basics"],
  "total": 2,
  "correctCount": 1,
  "incorrectCount": 1,
  "items": [
    {
      "cardId": "sample-hello",
      "correct": true,
      "frontTitle": "HTML basics",
      "front": "What does HTML stand for?",
      "back": "HyperText Markup Language",
      "backSubtitle": "Web pages are built from HTML"
    }
  ]
}
```

We keep a small **snapshot** of each card’s text so Review still works if you edit or delete the card later.

## What should I change (or not)?

- Prefer creating quizzes in the Quiz tab so the shape stays consistent.
- Do **not** put code here — only JSON data files.
