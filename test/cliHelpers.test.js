/** Unit tests for wrapText and selectNoteByIndex. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wrapText, selectNoteByIndex } from '../src/ui/cli.js';

const notes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

// ── wrapText ────────────────────────────────────────────────────────────────

test('wrapText: exact-fit line is not wrapped', () => {
  assert.deepEqual(wrapText('hello world', 11), ['hello world']);
});

test('wrapText: one-word overflow stays on a single line', () => {
  assert.deepEqual(wrapText('superlongword', 5), ['superlongword']);
});

test('wrapText: wraps when next word would exceed width', () => {
  assert.deepEqual(wrapText('hello world', 10), ['hello', 'world']);
});

test('wrapText: empty string returns no lines', () => {
  assert.deepEqual(wrapText(''), []);
});

// ── selectNoteByIndex ───────────────────────────────────────────────────────

test('selectNoteByIndex: valid selection', () => {
  assert.equal(selectNoteByIndex('1', notes), notes[0]);
  assert.equal(selectNoteByIndex('3', notes), notes[2]);
});

test('selectNoteByIndex: out-of-range returns null', () => {
  assert.equal(selectNoteByIndex('0', notes), null);
  assert.equal(selectNoteByIndex('4', notes), null);
});

test('selectNoteByIndex: float input returns null', () => {
  assert.equal(selectNoteByIndex('1.5', notes), null);
  assert.equal(selectNoteByIndex('1.9', notes), null);
});

test('selectNoteByIndex: non-numeric input returns null', () => {
  assert.equal(selectNoteByIndex('abc', notes), null);
  assert.equal(selectNoteByIndex('', notes), null);
});

test('selectNoteByIndex: scientific notation returns null', () => {
  assert.equal(selectNoteByIndex('2e1', notes), null);
});
