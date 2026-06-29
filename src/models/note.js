/**
 * Note data model
 * Represents a single note with metadata and validation.
 */

/**
 * Generate a short unique ID (not cryptographically secure — fine for local app).
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Validate a note title. Returns an error string if invalid, or null if valid.
 */
export function validateTitle(title) {
  if (typeof title !== 'string' || title.trim().length === 0) {
    return 'Title cannot be empty.';
  }
  if (title.trim().length > 100) {
    return 'Title must be 100 characters or fewer.';
  }
  return null;
}

/**
 * Create a new Note instance with timestamps.
 */
export function createNote(title, content = '') {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title: title.trim(),
    content,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Update fields on a note and refresh its updatedAt timestamp.
 */
export function updateNote(note, updates) {
  return {
    ...note,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
}
