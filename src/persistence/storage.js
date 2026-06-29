/**
 * Persistence layer
 * Handles reading and writing notes to a JSON file.
 * Gracefully handles missing or corrupted files.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';

const APP_NAME = 'taskify';
const DATA_FILENAME = 'notes.json';

/** Resolve the per-user data directory. An explicit dataDir option wins. */
export function resolveDataDir(options = {}) {
  if (options.dataDir !== undefined) {
    if (typeof options.dataDir !== 'string') {
      throw new TypeError('dataDir must be a string');
    }
    return resolve(options.dataDir);
  }

  const home = homedir();

  switch (process.platform) {
    case 'darwin':
      return join(home, 'Library', 'Application Support', APP_NAME);

    case 'win32': {
      const appData = process.env.APPDATA || join(home, 'AppData', 'Roaming');
      return join(appData, APP_NAME);
    }

    default: {
      const xdgDataHome = process.env.XDG_DATA_HOME || join(home, '.local', 'share');
      return join(xdgDataHome, APP_NAME);
    }
  }
}

export function getDataFilePath(options = {}) {
  return join(resolveDataDir(options), DATA_FILENAME);
}

/**
 * Load all notes from the JSON file.
 * Returns an empty array if the file doesn't exist or is corrupted.
 */
export function loadNotes(options = {}) {
  const dataFile = getDataFilePath(options);

  if (!existsSync(dataFile)) {
    return [];
  }

  try {
    const raw = readFileSync(dataFile, 'utf-8');
    const parsed = JSON.parse(raw);

    // Basic shape check: must be an array
    if (!Array.isArray(parsed)) {
      process.stderr.write(`Warning: ${dataFile} has unexpected format. Starting fresh.\n`);
      return [];
    }

    // Drop entries that aren't plain objects (null, primitives, nested arrays)
    // so a corrupt file can't crash the UI downstream.
    const valid = parsed.filter((n) => n && typeof n === 'object' && !Array.isArray(n));
    if (valid.length < parsed.length) {
      const dropped = parsed.length - valid.length;
      process.stderr.write(`Warning: ${dataFile} contained ${dropped} invalid entr${dropped === 1 ? 'y' : 'ies'}, dropped.\n`);
    }
    return valid;
  } catch (err) {
    process.stderr.write(`Warning: Could not read ${dataFile} (${err.message}). Starting fresh.\n`);
    return [];
  }
}

/**
 * Save all notes to the JSON file.
 * Creates the data directory if it does not exist.
 * Throws if the write fails (surfaced to user by caller).
 */
export function saveNotes(notes, options = {}) {
  const dataDir = resolveDataDir(options);
  const dataFile = join(dataDir, DATA_FILENAME);

  try {
    mkdirSync(dataDir, { recursive: true });
  } catch (err) {
    throw new Error(`Could not create data directory ${dataDir}: ${err.message}`);
  }

  // Write to a temp file first, then atomically rename over the target so a
  // crash or SIGKILL mid-write can't leave a truncated/corrupt notes.json.
  const json = JSON.stringify(notes, null, 2);
  const tmpFile = dataFile + '.tmp';
  try {
    writeFileSync(tmpFile, json, 'utf-8');
    renameSync(tmpFile, dataFile);
  } catch (err) {
    // Best-effort cleanup of the temp file; the original error matters more.
    try {
      unlinkSync(tmpFile);
    } catch {}
    throw err;
  }
}
