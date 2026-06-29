/** Tests for the persistence layer: atomic writes and element-shape filtering. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadNotes, saveNotes } from '../src/persistence/storage.js';
import { existsSync, readFileSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Isolate each test in its own temp dir (keyed by pid + test name is overkill;
// a single pid-scoped dir cleaned up per test is enough for serial node:test).
const TMP_DIR = join('/tmp', 'taskify-test-' + process.pid);

test.afterEach(() => {
  try {
    rmSync(TMP_DIR, { recursive: true, force: true });
  } catch {
    // Dir may not exist yet — fine.
  }
});

test('saveNotes persists the notes and leaves no .tmp file behind', () => {
  const notes = [
    { id: '1', title: 'Test', content: 'body', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  ];
  saveNotes(notes, { dataDir: TMP_DIR });

  const dataFile = join(TMP_DIR, 'notes.json');
  assert.ok(existsSync(dataFile), 'notes.json should exist after save');
  assert.ok(!existsSync(dataFile + '.tmp'), 'no stray .tmp file should remain');

  const parsed = JSON.parse(readFileSync(dataFile, 'utf-8'));
  assert.deepEqual(parsed, notes);
});

test('saveNotes rounds through loadNotes', () => {
  const notes = [
    { id: 'a', title: 'A', content: '', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 'b', title: 'B', content: 'x', createdAt: '2024-01-02T00:00:00Z', updatedAt: '2024-01-02T00:00:00Z' },
  ];
  saveNotes(notes, { dataDir: TMP_DIR });

  const loaded = loadNotes({ dataDir: TMP_DIR });
  assert.equal(loaded.length, 2);
  assert.equal(loaded[0].id, 'a');
  assert.equal(loaded[1].id, 'b');
});

test('loadNotes drops non-object entries instead of passing them through', () => {
  const dataFile = join(TMP_DIR, 'notes.json');
  mkdirSync(TMP_DIR, { recursive: true });
  // A mixed file: one good note plus null, a primitive, and a nested array.
  const badData = [
    { id: '1', title: 'Good', content: '', createdAt: '', updatedAt: '' },
    null,
    'string-entry',
    42,
    [1, 2, 3],
  ];
  writeFileSync(dataFile, JSON.stringify(badData), 'utf-8');

  const loaded = loadNotes({ dataDir: TMP_DIR });
  assert.equal(loaded.length, 1, 'only the valid note object remains');
  assert.equal(loaded[0].title, 'Good');
});

test('loadNotes returns [] for a non-existent data dir', () => {
  const loaded = loadNotes({ dataDir: join(TMP_DIR, 'does-not-exist') });
  assert.deepEqual(loaded, []);
});
