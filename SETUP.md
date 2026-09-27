# Setup

Study Buddy runs on your computer with **Git** (to download the code) and **Node.js** (includes **npm**, to install dependencies and start the server). You only need a web browser after that.

Pick **macOS** or **Windows** below. When every check passes, jump to [Run Study Buddy](#run-study-buddy).

## macOS

### 1. Install Git

**Option A (recommended):** Install [Xcode Command Line Tools](https://developer.apple.com/xcode/resources/) (includes Git).

1. Open **Terminal** (Spotlight: type `Terminal`).
2. Run:
   ```bash
   xcode-select --install
   ```
3. Follow the dialog to install.

**Option B:** Download Git from [git-scm.com/download/mac](https://git-scm.com/download/mac) and run the installer.

Check:

```bash
git --version
```

You should see a version number, not "command not found".

### 2. Install Node.js

1. Go to [nodejs.org](https://nodejs.org/) and download the **LTS** installer for macOS.
2. Run the `.pkg` and accept the defaults (npm is included).

Check:

```bash
node --version
npm --version
```

Use Node **18 or newer** if you can. Older versions may fail on current dependencies.

### 3. Terminal basics

You will use Terminal for clone, install, and start. `cd` means "go into this folder". Example:

```bash
cd ~/Documents
```

---

## Windows

### 1. Install Git

1. Download from [git-scm.com/download/win](https://git-scm.com/download/win).
2. Run the installer. Defaults are fine. Keep **"Git from the command line and also from 3rd-party software"** enabled so `git` works in PowerShell.

Check: open **PowerShell** or **Git Bash** and run:

```powershell
git --version
```

### 2. Install Node.js

1. Go to [nodejs.org](https://nodejs.org/) and download the **LTS** installer for Windows.
2. Run it. Ensure **"Add to PATH"** stays checked.

Check:

```powershell
node --version
npm --version
```

Use Node **18 or newer** if you can.

### 3. Which terminal to use

Either **PowerShell** or **Git Bash** works. Use the same window for all steps below.

---

## Run Study Buddy

These steps are the same on Mac and Windows. Replace the folder path with wherever you keep projects.

### 1. Clone the repository

```bash
git clone https://github.com/CarsonRoscoe/study-buddy.git
cd study-buddy
```

### 2. Install dependencies

```bash
npm install
```

This creates a `node_modules/` folder (already gitignored; do not commit it).

### 3. Start the server

```bash
npm start
```

You should see:

```text
Study Buddy is running!
Open http://localhost:3000 in your browser.
```

Leave this window open while you use the app. Press **Ctrl+C** (Mac or Windows) in that window to stop the server.

### 4. Open the app

In Chrome, Firefox, Edge, or Safari, go to:

[http://localhost:3000](http://localhost:3000)

First launch: `data/classes/` and `data/cardsets/` are empty until you create content in the UI. See [QUICKSTART.md](QUICKSTART.md).

---

## Troubleshooting

| Problem | What to try |
| ------- | ------------- |
| `git`, `node`, or `npm` not found | Close the terminal, reopen it, and run the version checks again. Reinstall Node or Git if needed. |
| `npm install` errors | Confirm Node 18+. Delete `node_modules/` and run `npm install` again. |
| Port 3000 in use | Quit other apps using port 3000, or stop another `npm start` you left running. |
| Browser cannot connect | Confirm the server window still shows "Study Buddy is running!" and the URL is exactly `http://localhost:3000`. |
| Permission errors on Mac | Avoid using `sudo` with `npm install`. Install Node via the official installer instead. |

---

## Next steps

| Doc | Purpose |
| --- | ------- |
| [QUICKSTART.md](QUICKSTART.md) | How to use classes, cardsets, study modes, import/export |
| [README.md](README.md) | Project overview and architecture |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Send code changes via pull request |
