#!/usr/bin/env node
/* Writes src/assets/build-info.json with version + timestamp */
const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');

// Angular is configured to copy everything from `public` into the app root.
// Write build-info.json there so it ends up at `/build-info.json` in the built app.
const outPath = path.join(__dirname, '..', 'public', 'build-info.json');
const now = new Date().toISOString();

const payload = {
  version: pkg.version || '0.0.0',
  builtAt: now,
  commit: process.env.GITHUB_SHA || null
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
console.log(`Build info written to ${outPath}:`, payload);
