/** Unit tests for storage.resolveDataDir(). */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveDataDir } from '../src/persistence/storage.js';

// Split on both separators so Windows paths work on any host.
function segments(p) {
  return p.split(/[\\/]/).filter(Boolean);
}

// Snapshot original env/platform for restore.
const originalPlatform = process.platform;
const originalEnv = { ...process.env };

function restoreProcess() {
  Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
}

// ── resolveDataDir ──────────────────────────────────────────────────────────

test('Linux: defaults to ~/.local/share/taskify when XDG_DATA_HOME unset', () => {
  restoreProcess();
  Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
  delete process.env.XDG_DATA_HOME;

  const dir = resolveDataDir();
  assert.match(dir, /\.local\/share\/taskify$/);
});

test('Linux: honors XDG_DATA_HOME when set', () => {
  restoreProcess();
  Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
  process.env.XDG_DATA_HOME = '/custom/xdg';

  const dir = resolveDataDir();
  assert.equal(dir, '/custom/xdg/taskify');
});

test('macOS: uses ~/Library/Application Support/taskify', () => {
  restoreProcess();
  Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });

  const dir = resolveDataDir();
  assert.match(dir, /Library\/Application Support\/taskify$/);
});

test('Windows: uses $APPDATA/taskify (joined under current host separators)', () => {
  restoreProcess();
  Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
  process.env.APPDATA = 'C:\\Users\\tester\\AppData\\Roaming';

  // Assert on segments rather than raw strings for host-independence.
  const dir = resolveDataDir();
  const parts = segments(dir);
  assert.equal(parts.at(-1), 'taskify');
  assert.equal(parts.at(-2), 'Roaming');
});

test('Windows: falls back to home/AppData/Roaming when APPDATA unset', () => {
  restoreProcess();
  Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
  delete process.env.APPDATA;

  const dir = resolveDataDir();
  const parts = segments(dir);
  assert.equal(parts.at(-1), 'taskify');
  assert.equal(parts.at(-2), 'Roaming');
  assert.equal(parts.at(-3), 'AppData');
});

test('override: explicit dataDir wins over platform detection', () => {
  restoreProcess();
  Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });
  process.env.XDG_DATA_HOME = '/should/not/apply';

  const dir = resolveDataDir({ dataDir: '/tmp/custom-taskify' });
  assert.equal(dir, '/tmp/custom-taskify');
});

test('override: dataDir is resolved to an absolute path', () => {
  restoreProcess();
  Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });

  const dir = resolveDataDir({ dataDir: 'relative/path' });
  assert.ok(dir.startsWith('/'), `expected absolute path, got: ${dir}`);
});

test('override: empty string dataDir is treated as an explicit value (resolves to cwd)', () => {
  restoreProcess();
  Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });

  const dir = resolveDataDir({ dataDir: '' });
  assert.equal(dir, process.cwd());
});

test('no dataDir falls through to platform default', () => {
  restoreProcess();
  Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
  delete process.env.XDG_DATA_HOME;

  const dir = resolveDataDir({ dataDir: undefined });
  assert.match(dir, /\.local\/share\/taskify$/);
});

test('throws TypeError when dataDir is a non-string truthy value', () => {
  restoreProcess();
  assert.throws(() => resolveDataDir({ dataDir: true }), TypeError);
  assert.throws(() => resolveDataDir({ dataDir: 42 }), TypeError);
});

// ── Cleanup ─────────────────────────────────────────────────────────────────

test('restore process state after all tests', () => {
  restoreProcess();
  assert.equal(process.platform, originalPlatform);
});
