/** Parse --data-dir from argv. Throws on missing value or unknown args. */
export function parseArgv(argv = process.argv.slice(2)) {
  let dataDir;
  const rest = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--data-dir') {
      const next = argv[i + 1];
      if (next === undefined) {
        throw new Error('--data-dir requires a value');
      }
      if (next.startsWith('-')) {
        throw new Error(`--data-dir received flag instead of a path: ${next}`);
      }
      dataDir = next;
      i++;
    } else if (arg.startsWith('--data-dir=')) {
      dataDir = arg.slice('--data-dir='.length);
    } else {
      rest.push(arg);
    }
  }

  if (rest.length > 0) {
    throw new Error(`Unknown argument${rest.length > 1 ? 's' : ''}: ${rest.join(', ')}`);
  }

  return { options: { dataDir } };
}
