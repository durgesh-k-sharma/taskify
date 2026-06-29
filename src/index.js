#!/usr/bin/env node
/**
 * Entry point for the Taskify application.
 * Wires together the service layer and CLI, then starts the TUI loop.
 */

import { startApp } from './ui/cli.js';
import { parseArgv } from './config/parseArgv.js';

const { options } = parseArgv();

startApp(options).catch((err) => {
  process.stderr.write(`Fatal error: ${err.message}\n`);
  process.exit(1);
});
