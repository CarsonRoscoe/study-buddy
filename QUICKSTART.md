# Quickstart

Study Buddy runs on your computer. After `npm install` and `npm start`, open [http://localhost:3000](http://localhost:3000).

## How the app is organized

1. **Home** lists your **Classes** (folders).
2. Click a Class to see its **Cardsets** (flashcard decks).
3. Click a Cardset to open **Learn**, **Test**, and **Edit** on one page.

Use the breadcrumb links at the top to go back up (Home, then Class).

## Create a Class

1. On Home, click **+** in the header.
2. Choose **New Class**.
3. Enter a title. You can add an optional **cover photo** with the image button in the dialog.
4. Click **Create**.

Click a Class tile to open it.

## Create a Cardset

1. Click **+** in the header (works on Home or inside a Class).
2. Choose **New Cardset**.
3. Enter a title and pick which **Class** it belongs to.
4. Click **Create**.

Open the Cardset from the Class page.

## Add and edit cards

1. Open a Cardset and select the **Edit** tab.
2. Type **Term** and **Definition** in the table. Changes save automatically after you pause typing.
3. Click **Add card** at the bottom of the table for another row.
4. Click a row to see a **Preview** of that card on the right.
5. Use the trash control on a row to delete that card.

### Term images (optional)

Each card can show an image on the term side. In the **Image URL** column you can:

| Method | What to do |
| ------ | ---------- |
| **Web address** | Paste or type a full image URL (must start with `http://` or `https://`, or be a path like `/data/images/...` after upload). |
| **Upload** | Click the upload button on that row and pick an image file from your computer. |
| **Copy and paste** | Copy an image (screenshot, file, browser), click in the **Image URL** field for that row, and paste. The app uploads the image and fills in the URL. |

Class **cover photos** use upload only when you create or edit a Class (not paste in the table).

## Learn mode

1. Open a Cardset and select **Learn**.
2. Read the prompt on the card. Click the card (or press Enter) to flip it.
3. Use **Previous** and **Next** to move through the deck.
4. On the last card, **Next** becomes **Reshuffle** and starts a new random order.

## Test mode

1. Select the **Test** tab.
2. Flip the card when you are ready to check yourself.
3. Tap **Correct** or **Incorrect** for each card.
4. At the end you get a score. You can retry missed cards or run the whole set again.

## Settings

Click the **gear** in the header on any page.

Under **Answer with**, choose whether Learn and Test show the **Term**, the **Definition**, or both as the prompt. Pick at least one, then **Save**.

## Import and export

Use the **⋯** button on the right of the breadcrumb row. Everything uses **JSON** files (plain text you can open in an editor). **Export** saves a file to your Downloads folder. **Import** asks you to pick a `.json` file from your computer.

### Export a Class (Home)

1. On Home, open **⋯** → **Export class**.
2. Pick the Class in the list and confirm.
3. You get one file with the Class title, optional cover image URL, and every Cardset inside it (each with its cards).

Good for backing up a whole folder or sharing it with a classmate.

### Import a Class (Home)

1. Open **⋯** → **Import class**.
2. Choose a Class export file.
3. The app creates a **new** Class (it does not replace an existing one) and recreates each Cardset listed in the file.

The file must include a **title**. Cardsets without a title import as "Untitled cardset".

### Export a Cardset (Class page)

1. Inside a Class, open **⋯** → **Export cardset**.
2. Pick the Cardset and confirm.
3. You get a file with the set title and all cards (term, definition, image URLs).

### Import a Cardset (Class page)

1. Open **⋯** → **Import cardset**.
2. Choose a Cardset export file.
3. The app adds a **new** Cardset to **this** Class. It does not overwrite a set you already have.

The file needs a **title** and a **cards** array.

### Export a Cardset (Cardset page)

1. While viewing a Cardset, open **⋯** → **Export cardset**.
2. The current set downloads immediately (same JSON shape as on the Class page).

### Import cards (Cardset page)

1. Open **⋯** → **Import cards**.
2. Choose a Cardset JSON file (or any file that has a **cards** array).
3. New cards are **added** to the set you have open. Cards that look like duplicates (same id, or same term and definition as a card already there) are skipped.

Use this to merge two exports into one deck or pull in cards a friend sent you.

### Images and sharing

Exports store **image URLs**, not the image files themselves. Paths like `/data/images/...` work on your machine if you uploaded those images here. If you share JSON with someone else, they may need to re-upload images unless the URLs point to the public web (`https://...`).

## Tips

- **Rename** a Class or Cardset: double-click its name in the breadcrumb, edit, then press Enter or click away.
- **Reorder** tiles: drag a Class onto another Class on Home, or a Cardset onto another on the Class page.
- Your data lives in the `data/` folder on disk. It stays on your machine and is not pushed to Git when you clone the repo.

For setup and project layout, see [README.md](README.md).
