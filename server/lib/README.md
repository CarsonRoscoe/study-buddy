# server/lib/

## What is this folder?

**Library** helpers — reusable code that is not tied to HTTP.
Right now that means “how we save flashcards and quizzes as JSON files”.

## What files matter?

| File | Job |
|------|-----|
| `card-store.js` | `listCards`, `getCard`, `createCard`, `updateCard`, `deleteCard` |
| `quiz-store.js` | `listQuizzes`, `getQuiz`, `createQuiz`, `deleteQuiz` |

## What should I change (or not)?

- Change how files are named or stored here.
- Keep functions plain: take data in, return data out (or throw errors).
- Do **not** use Express `req` / `res` in this folder — that belongs in `routes/`.
