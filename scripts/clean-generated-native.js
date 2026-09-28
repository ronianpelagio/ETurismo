const fs = require('node:fs');
const path = require('node:path');

const autolinkingDirectory = path.join(
  __dirname,
  '..',
  'android',
  'build',
  'generated',
  'autolinking'
);

fs.rmSync(autolinkingDirectory, { recursive: true, force: true });