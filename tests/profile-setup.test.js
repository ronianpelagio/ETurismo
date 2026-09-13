const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const test = require('node:test');

const pendingProfile = readFileSync(
  'src/features/auth/services/pendingProfile.ts',
  'utf8',
);
const signUp = readFileSync('src/screens/auth/SignUp.tsx', 'utf8');
const migration = readFileSync('sql/user_profile_setup.sql', 'utf8');

test('uploads avatars only under the authenticated user folder', () => {
  assert.match(pendingProfile, /const objectPath = `\$\{userId\}\/avatar\.jpg`/);
  assert.match(pendingProfile, /\.from\('profile-pictures'\)/);
  assert.match(pendingProfile, /profile_picture: profilePictureUrl/);
});

test('signup stores the complete location hierarchy', () => {
  for (const field of ['country', 'province', 'city', 'barangay']) {
    assert.match(signUp, new RegExp(`${field}: location\\.`));
    assert.match(migration, new RegExp(`add column if not exists ${field} text`));
  }
});

test('avatar storage policies restrict writes to the authenticated user folder', () => {
  assert.match(migration, /to authenticated/);
  assert.match(migration, /\(storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)\)::text/);
  assert.match(migration, /file_size_limit[\s\S]*5242880/);
});
