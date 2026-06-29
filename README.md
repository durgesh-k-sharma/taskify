# Taskify

A simple, installable terminal-based notes CLI built with Node.js. Create, edit, delete, and view notes — all persisted automatically to a per-user data file. Zero external dependencies.

## Features

- **Create** notes with a title and content
- **Edit** existing notes in-place
- **Delete** notes with a confirmation prompt
- **View** all notes sorted by last-modified date
- **Auto-save** to a per-user `notes.json` after every change
- **Load** saved notes on startup
- **Empty-state** guidance when no notes exist
- **Strict input validation** — titles required, non-integer selections rejected, `--data-dir` errors surfaced on misuse
- **Graceful error handling** for missing or corrupted storage files and unwritable data directories
- **Installable** globally via `npm link` — runs as the `taskify` command
- **Portable data storage** — state lives in a platform-native per-user directory



## Requirements

- **Node.js** >= 18 (uses ES modules and built-in `node:fs`)

No external dependencies are required.

## Setup

```bash
# Clone this project
cd taskify

# No build step needed — zero dependencies
```



## Install

Install the `taskify` command globally so it's available from any directory:

```bash
# From inside the cloned repo — symlinks the command to your global prefix
npm link
```

Once installed, the `taskify` binary is on your `$PATH`. Your data lives in a
platform-native per-user directory, **not** in the project folder:


| Platform | Data directory                          | Example                                            |
| -------- | --------------------------------------- | -------------------------------------------------- |
| Linux    | `$XDG_DATA_HOME/taskify`                | `~/.local/share/taskify/notes.json`                |
| macOS    | `~/Library/Application Support/taskify` | `~/Library/Application Support/taskify/notes.json` |
| Windows  | `%APPDATA%\taskify`                     | `C:\Users\you\AppData\Roaming\taskify\notes.json`  |


On Linux, if `$XDG_DATA_HOME` is set, it is used instead of `~/.local/share`.

## Usage

```bash
# If installed globally
taskify

# From the project directory, without installing
npm start

# Or directly
node src/index.js
```



### Overriding the data location

Use `--data-dir` to store notes somewhere other than the default per-user
directory — handy for testing or portable setups:

```bash
taskify --data-dir /path/to/my/data
```

The directory is created on first save if it does not exist.



## Keyboard Navigation


| Key     | Action                            |
| ------- | --------------------------------- |
| `n`     | Create a new note                 |
| `e`     | Edit the selected note            |
| `d`     | Delete a note (with confirmation) |
| `Enter` | Open a note by number             |
| `b`     | Back to list view                 |
| `q`     | Quit the application              |




## Project Structure

```
taskify/
├── src/
│   ├── models/
│   │   └── note.js          # Data model and validation
│   ├── persistence/
│   │   └── storage.js       # JSON file I/O + per-user data dir resolution
│   ├── services/
│   │   └── notesService.js  # Business logic (CRUD)
│   ├── ui/
│   │   └── cli.js           # Terminal UI and input handling
│   ├── parseArgv.js         # CLI argument parser (--data-dir, error handling)
│   └── index.js             # Entry point
├── test/
│   ├── resolveDataDir.test.js  # Tests for data-dir resolution (all platforms)
│   └── cliHelpers.test.js      # Tests for CLI helpers (wrapText, selectNoteByIndex)
└── package.json
```



## Data Model

Each note contains:


| Field       | Type          | Description                          |
| ----------- | ------------- | ------------------------------------ |
| `id`        | string        | Unique identifier                    |
| `title`     | string        | Note title (required, max 100 chars) |
| `content`   | string        | Note body text                       |
| `createdAt` | ISO timestamp | When the note was created            |
| `updatedAt` | ISO timestamp | When the note was last modified      |




## Running Tests

The test suite uses Node's built-in test runner — no extra packages to install.

```bash
npm test
```



## Error Handling

- **Empty titles** — rejected with a friendly message
- **Missing storage file** — starts with an empty list (file auto-created on first save)
- **Corrupted storage file** — starts fresh with a warning to stderr
- **Invalid selections** — non-integer input is rejected; user is prompted to try again
- **Unwritable data dir** — clear error if the data directory cannot be created
- **Malformed CLI args** — `--data-dir` without a value, `--data-dir` followed by another flag, or unknown arguments all exit with a clear error



## License

MIT