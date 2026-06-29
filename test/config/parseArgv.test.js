/** Unit tests for the CLI argument parser. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgv } from '../../src/config/parseArgv.js';

test('parseArgv: --data-dir with value', () => {
  const { options } = parseArgv(['--data-dir', '/tmp/data']);
  assert.equal(options.dataDir, '/tmp/data');
});

test('parseArgv: --data-dir=value form', () => {
  const { options } = parseArgv(['--data-dir=/tmp/data']);
  assert.equal(options.dataDir, '/tmp/data');
});

test('parseArgv: --data-dir as last arg throws', () => {
  assert.throws(
    () => parseArgv(['--data-dir']),
    /--data-dir requires a value/,
  );
});

test('parseArgv: --data-dir followed by a flag throws', () => {
  assert.throws(
    () => parseArgv(['--data-dir', '--verbose']),
    /--data-dir received flag instead of a path/,
  );
});

test('parseArgv: unknown flag throws', () => {
  assert.throws(
    () => parseArgv(['--verbose']),
    /Unknown argument/,
  );
});

test('parseArgv: unknown positional arg throws', () => {
  assert.throws(
    () => parseArgv(['somearg']),
    /Unknown argument/,
  );
});

test('parseArgv: empty argv is fine', () => {
  const { options } = parseArgv([]);
  assert.equal(options.dataDir, undefined);
});
