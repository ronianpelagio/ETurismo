const test = require('node:test');
const assert = require('node:assert/strict');

const createConfig = require('../app.config.js');
const staticConfig = require('../app.json').expo;
const fs = require('node:fs');

test('uses a permanent Android application id', () => {
  assert.equal(staticConfig.android.package, 'com.ronian.eturismo');
  assert.doesNotMatch(staticConfig.android.package, /anonymous/i);
});

test('injects the Google Maps key only when configured', () => {
  const previous = process.env.GOOGLE_MAPS_API_KEY;
  process.env.GOOGLE_MAPS_API_KEY = 'test-maps-key';

  try {
    const config = createConfig({ config: staticConfig });
    assert.equal(config.android.config.googleMaps.apiKey, 'test-maps-key');
  } finally {
    if (previous === undefined) delete process.env.GOOGLE_MAPS_API_KEY;
    else process.env.GOOGLE_MAPS_API_KEY = previous;
  }
});

test('keeps generated native projects out of source control', () => {
  const gitignore = fs.readFileSync('.gitignore', 'utf8');

  assert.match(gitignore, /^\/android\/$/m);
  assert.match(gitignore, /^\/ios\/$/m);
});
