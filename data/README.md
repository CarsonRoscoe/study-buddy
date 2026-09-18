# data/

## What is this folder?

**Saved study artifacts** live here — not code.
The server reads and writes files under this folder.

## What files matter?

| Path | Job |
|------|-----|
| `cards/` | One JSON file per flashcard |
| `quizzes/` | One JSON file per finished quiz (history) |

## How classmates share cards

1. Person A runs Study Buddy and creates cards.
2. Person A copies the whole `data/cards/` folder (or zips it).
3. Person B pastes those files into their own `data/cards/` folder.
4. Person B restarts (or refreshes) and sees the shared cards.

Quiz history in `data/quizzes/` is usually personal — share it only if you want to.

## What should I change (or not)?

- You may add/remove `.json` files by hand if you are careful.
- Do **not** put JavaScript, HTML, or CSS in this folder.
