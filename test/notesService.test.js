/** Unit tests for notesService against an in-memory fake store. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNotesService } from '../src/services/notesService.js';

function makeFakeStorage(initial = []) {
  let notes = [...initial];
  return {
    loadNotes: () => [...notes],
    saveNotes: (next) => { notes = [...next]; },
    get notes() { return [...notes]; },
  };
}

test('getAllNotes returns notes sorted by updatedAt descending', () => {
  const store = makeFakeStorage([
    { id: 'a', title: 'A', content: '', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    { id: 'b', title: 'B', content: '', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-03T00:00:00Z' },
    { id: 'c', title: 'C', content: '', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-02T00:00:00Z' },
  ]);
  const notes = createNotesService(store);
  const all = notes.getAllNotes();
  assert.deepEqual(all.map((n) => n.id), ['b', 'c', 'a']);
});

test('getNoteById returns the note or null', () => {
  const store = makeFakeStorage([{ id: 'x', title: 'X', content: '', createdAt: '', updatedAt: '' }]);
  const notes = createNotesService(store);
  assert.equal(notes.getNoteById('x').title, 'X');
  assert.equal(notes.getNoteById('missing'), null);
});

test('addNote creates and persists a note', () => {
  const store = makeFakeStorage();
  const notes = createNotesService(store);
  const note = notes.addNote('Hello', 'World');
  assert.equal(note.title, 'Hello');
  assert.equal(note.content, 'World');
  assert.equal(store.notes.length, 1);
});

test('addNote throws on empty title', () => {
  const store = makeFakeStorage();
  const notes = createNotesService(store);
  assert.throws(() => notes.addNote('', 'content'), /Title cannot be empty/);
  assert.throws(() => notes.addNote('   ', 'content'), /Title cannot be empty/);
});

test('editNote updates fields and refreshes updatedAt', () => {
  const store = makeFakeStorage([{ id: 'n', title: 'Old', content: '', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }]);
  const notes = createNotesService(store);
  const updated = notes.editNote('n', { title: 'New' });
  assert.equal(updated.title, 'New');
  assert.notEqual(updated.updatedAt, '2024-01-01T00:00:00Z');
  assert.equal(store.notes[0].title, 'New');
});

test('editNote returns null for missing id', () => {
  const store = makeFakeStorage();
  const notes = createNotesService(store);
  assert.equal(notes.editNote('missing', { title: 'X' }), null);
});

test('editNote throws on invalid title', () => {
  const store = makeFakeStorage([{ id: 'n', title: 'T', content: '', createdAt: '', updatedAt: '' }]);
  const notes = createNotesService(store);
  assert.throws(() => notes.editNote('n', { title: '' }), /Title cannot be empty/);
});

test('deleteNote returns true and removes the note', () => {
  const store = makeFakeStorage([{ id: 'a', title: 'A', content: '', createdAt: '', updatedAt: '' }]);
  const notes = createNotesService(store);
  assert.equal(notes.deleteNote('a'), true);
  assert.equal(store.notes.length, 0);
});

test('deleteNote returns false for missing id', () => {
  const store = makeFakeStorage([{ id: 'a', title: 'A', content: '', createdAt: '', updatedAt: '' }]);
  const notes = createNotesService(store);
  assert.equal(notes.deleteNote('missing'), false);
  assert.equal(store.notes.length, 1);
});

test('createNotesService forwards options to the underlying store', () => {
  const received = { loadArgs: [], saveArgs: [] };
  const store = {
    loadNotes: (...args) => { received.loadArgs.push(args); return []; },
    saveNotes: (...args) => { received.saveArgs.push(args); },
  };

  const notes = createNotesService({ ...store, dataDir: '/tmp/test-dir' });

  notes.getAllNotes();
  assert.equal(received.loadArgs.length, 1);
  assert.deepEqual(received.loadArgs[0], [{ dataDir: '/tmp/test-dir' }]);

  notes.addNote('Title', 'content');
  assert.equal(received.saveArgs.length, 1);
  assert.equal(received.saveArgs[0][0].length, 1); // one note saved
  assert.deepEqual(received.saveArgs[0][1], { dataDir: '/tmp/test-dir' });
});

test('editNote returns null for a missing id even when the title is invalid', () => {
  const store = makeFakeStorage();
  const notes = createNotesService(store);
  // Existence check now runs first, so an invalid title on a note that
  // doesn't exist yields null rather than a validation error.
  assert.equal(notes.editNote('nonexistent', { title: '' }), null);
});
