/**
 * Notes service
 * Business logic layer: orchestrates CRUD operations, validation, and persistence.
 */

import { createNote, updateNote, validateTitle } from '../models/note.js';
import { loadNotes, saveNotes } from '../persistence/storage.js';

export function createNotesService({ loadNotes: load = loadNotes, saveNotes: save = saveNotes, ...options } = {}) {
  function getAllNotes() {
    const notes = load(options);
    // Copy before sort to avoid mutating loadNotes' return value.
    return [...notes].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  function getNoteById(id) {
    const notes = load(options);
    return notes.find((n) => n.id === id) || null;
  }

  function addNote(title, content) {
    const titleError = validateTitle(title);
    if (titleError) {
      throw new Error(titleError);
    }

    const note = createNote(title, content);
    const notes = load(options);
    notes.push(note);
    save(notes, options);
    return note;
  }

  function editNote(id, updates) {
    const notes = load(options);
    const index = notes.findIndex((n) => n.id === id);

    if (index === -1) {
      return null;
    }

    if (updates.title !== undefined) {
      const titleError = validateTitle(updates.title);
      if (titleError) {
        throw new Error(titleError);
      }
    }

    const updated = updateNote(notes[index], updates);
    notes[index] = updated;
    save(notes, options);
    return updated;
  }

  function deleteNote(id) {
    const notes = load(options);
    const filtered = notes.filter((n) => n.id !== id);

    if (filtered.length === notes.length) {
      return false;
    }

    save(filtered, options);
    return true;
  }

  return { getAllNotes, getNoteById, addNote, editNote, deleteNote };
}
