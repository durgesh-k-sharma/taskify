/**
 * CLI / TUI layer
 * Terminal-based interface with keyboard navigation for the Notes app.
 * Uses Node's readline for input and simple ANSI rendering.
 */

import { createInterface } from 'node:readline';
import { createNotesService } from '../services/notesService.js';
import { loadNotes, saveNotes } from '../persistence/storage.js';
import { validateTitle } from '../models/note.js';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Format an ISO timestamp into a readable string. */
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString();
}

/** Clear the terminal screen. */
function clearScreen() {
  process.stdout.write('\x1Bc');
}

/** Print a line of text. */
function print(text = '') {
  process.stdout.write(text + '\n');
}

/** Print a horizontal divider. */
function divider() {
  print('─'.repeat(50));
}

/** Wrap text to a given width (simple word-wrap). */
export function wrapText(text, width = 48) {
  const words = text.split(' ');
  const lines = [];
  let current = '';

  for (const word of words) {
    // current has a trailing space, so no +1 needed
    if (current.length + word.length > width && current.trim()) {
      lines.push(current.trim());
      current = word + ' ';
    } else {
      current += word + ' ';
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}

// ── Screens ────────────────────────────────────────────────────────────────

/** Show the main list of notes. */
function showNoteList(notes) {
  clearScreen();
  print('  📝  NOTES');
  divider();

  if (notes.length === 0) {
    print();
    print('  No notes yet. Press "n" to create one.');
    print();
    divider();
    print('  n = new note   q = quit');
    return;
  }

  print();
  notes.forEach((note, i) => {
    const preview = note.content
      ? ` — ${note.content.slice(0, 40)}${note.content.length > 40 ? '…' : ''}`
      : '';
    print(`  ${i + 1}. ${note.title}${preview}`);
    print(`     Modified: ${formatDate(note.updatedAt)}`);
  });
  print();
  divider();
  print('  Enter = open   n = new   d = delete   q = quit');
}

/** Show a single note's full content. */
function showNoteDetail(note) {
  clearScreen();
  print('  📝  VIEW NOTE');
  divider();
  print();
  print(`  Title: ${note.title}`);
  print(`  Created:  ${formatDate(note.createdAt)}`);
  print(`  Modified: ${formatDate(note.updatedAt)}`);
  print();
  divider();
  print();

  if (note.content) {
    for (const line of wrapText(note.content)) {
      print(`  ${line}`);
    }
  } else {
    print('  (No content)');
  }

  print();
  divider();
  print('  e = edit   d = delete   b = back');
}

// ── Input Prompts ──────────────────────────────────────────────────────────

/** Prompt the user for a single line of input. */
function prompt(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/** Prompt for a multi-line note content (end with an empty line). */
async function promptMultiline(rl, initial = '') {
  if (initial) {
    print('  Current content (press Enter to keep, or type new lines, empty line to finish):');
    print(`  ${initial}`);
  } else {
    print('  Enter content (empty line to finish):');
  }

  const lines = [];
  while (true) {
    const line = await prompt(rl, '  ');
    if (line === '') break;
    lines.push(line);
  }
  return lines.join('\n');
}

// ── Actions ────────────────────────────────────────────────────────────────

/** Handle creating a new note. */
async function handleNew(rl, notes) {
  print();
  const title = await prompt(rl, '  Title: ');

  // Validate before prompting for content so the user isn't asked to type
  // content that will be discarded. Single source of truth: validateTitle.
  const titleError = validateTitle(title);
  if (titleError) {
    print(`  ⚠ ${titleError}`);
    await prompt(rl, '  Press Enter to continue...');
    return;
  }

  const content = await promptMultiline(rl);

  try {
    notes.addNote(title, content);
    print('  ✓ Note created.');
  } catch (err) {
    print(`  ⚠ ${err.message}`);
  }

  await prompt(rl, '  Press Enter to continue...');
}

/** Handle editing an existing note. */
async function handleEdit(rl, note, notes) {
  print();
  print(`  Editing "${note.title}"`);
  print('  (Press Enter to keep current value)');
  print();

  const newTitle = await prompt(rl, `  Title [${note.title}]: `);
  const newContent = await promptMultiline(rl, note.content);

  try {
    const updates = {};
    if (newTitle.trim()) updates.title = newTitle;
    if (newContent !== note.content) updates.content = newContent;

    if (Object.keys(updates).length > 0) {
      notes.editNote(note.id, updates);
      print('  ✓ Note updated.');
    } else {
      print('  (No changes made)');
    }
  } catch (err) {
    print(`  ⚠ ${err.message}`);
  }

  await prompt(rl, '  Press Enter to continue...');
}

/** Handle deleting a note with confirmation. */
async function handleDelete(rl, note, notes) {
  print();
  const confirm = await prompt(rl, `  Delete "${note.title}"? (y/n): `);

  if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
    notes.deleteNote(note.id);
    print('  ✓ Note deleted.');
  } else {
    print('  (Cancelled)');
  }

  await prompt(rl, '  Press Enter to continue...');
}

// ── Main Loop ──────────────────────────────────────────────────────────────

/** Parse a selection index from user input and return the note or null. */
export function selectNoteByIndex(input, notes) {
  const trimmed = input.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const index = Number(trimmed) - 1;
  if (index < 0 || index >= notes.length) return null;
  return notes[index];
}

/** Run the main application loop. */
export async function startApp(options = {}) {
  const notes = createNotesService({ loadNotes, saveNotes, dataDir: options.dataDir });

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Hide cursor for cleaner UI. Restore it on exit — including the fatal-error
  // path in index.js that calls process.exit(1) — so a crash can't leave the
  // terminal with a permanently hidden cursor.
  process.stdout.write('\x1B[?25l');
  process.on('exit', () => {
    process.stdout.write('\x1B[?25h');
  });

  let running = true;

  while (running) {
    const allNotes = notes.getAllNotes();
    showNoteList(allNotes);

    const input = await prompt(rl, '  > ');
    const trimmed = input.trim().toLowerCase();

    if (trimmed === 'q') {
      running = false;
    } else if (trimmed === 'n') {
      await handleNew(rl, notes);
    } else if (trimmed === 'd') {
      if (allNotes.length === 0) {
        print('  No notes to delete.');
        await prompt(rl, '  Press Enter to continue...');
      } else {
        const idxInput = await prompt(rl, '  Delete which note (number)? ');
        const note = selectNoteByIndex(idxInput, allNotes);
        if (note) {
          await handleDelete(rl, note, notes);
        } else {
          print('  ⚠ Invalid selection.');
          await prompt(rl, '  Press Enter to continue...');
        }
      }
    } else if (trimmed === 'e' || trimmed === '') {
      // Open/edit note by selection
      if (allNotes.length === 0) {
        print('  No notes to open.');
        await prompt(rl, '  Press Enter to continue...');
      } else {
        const idxInput = await prompt(rl, '  Open which note (number)? ');
        const note = selectNoteByIndex(idxInput, allNotes);
        if (note) {
          await openNote(rl, note, notes);
        } else {
          print('  ⚠ Invalid selection.');
          await prompt(rl, '  Press Enter to continue...');
        }
      }
    } else {
      print('  Unknown command. Use n/d/e/q.');
      await prompt(rl, '  Press Enter to continue...');
    }
  }

  // Show cursor again and exit
  process.stdout.write('\x1B[?25h');
  clearScreen();
  print('  Goodbye! 👋');
  rl.close();
}

/** Open a note and show the detail view with edit/delete options. */
async function openNote(rl, note, notes) {
  // The caller already holds the selected note, so render it directly on first
  // entry instead of re-reading the file. Re-fetch only after a mutation.
  let current = note;
  let viewing = true;

  while (viewing) {
    if (!current) {
      print('  ⚠ Note no longer exists.');
      await prompt(rl, '  Press Enter to continue...');
      return;
    }

    showNoteDetail(current);
    const input = await prompt(rl, '  > ');
    const trimmed = input.trim().toLowerCase();

    if (trimmed === 'b') {
      viewing = false;
    } else if (trimmed === 'e') {
      await handleEdit(rl, current, notes);
      current = notes.getNoteById(note.id);
    } else if (trimmed === 'd') {
      await handleDelete(rl, current, notes);
      // If deleted, go back to list
      viewing = false;
    } else {
      print('  Unknown command. Use e/d/b.');
      await prompt(rl, '  Press Enter to continue...');
    }
  }
}
