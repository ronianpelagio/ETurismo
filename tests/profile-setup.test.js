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
  assert.match(signUp, /country: location\.country/);
  assert.match(signUp, /province:[\s\S]*location\.province\?\.name/);
  assert.match(signUp, /city:[\s\S]*location\.city\?\.name/);
  assert.match(signUp, /barangay:[\s\S]*location\.barangay\?\.name/);

  for (const field of ['country', 'province', 'city', 'barangay']) {
    assert.match(migration, new RegExp(`add column if not exists ${field} text`));
  }
});

test('signup age is capped at 100 in the form and database', () => {
  assert.match(signUp, /n < 1 \|\| n > 100/);
  assert.match(signUp, /maxLength=\{3\}/);
  assert.match(migration, /check \(age is null or age between 1 and 100\) not valid/i);
});

test('location picker resolves map selection to selectable Philippine locations', () => {
  const locationFields = readFileSync(
    'src/features/auth/components/LocationFields.tsx',
    'utf8',
  );
  const locationsService = readFileSync(
    'src/features/auth/services/philippineLocations.ts',
    'utf8',
  );

  assert.match(locationFields, /Use my location/);
  assert.match(locationFields, /reverseGeocodeAsync/);
  assert.match(locationFields, /resolvePhilippineLocation/);
  assert.doesNotMatch(locationFields, /code: 'map:province'/);
  assert.match(locationsService, /export async function resolvePhilippineLocation/);
  assert.doesNotMatch(signUp, /selectedFromMap/);
});

test('open map locks tab swiping until the map is closed', () => {
  const tabNavigator = readFileSync('src/navigation/TabNavigator.tsx', 'utf8');
  const home = readFileSync('src/screens/main/Home.tsx', 'utf8');
  const personalInfo = readFileSync(
    'src/screens/main/settings/PersonalInfo.tsx',
    'utf8',
  );

  assert.match(tabNavigator, /scrollEnabled=\{!mapOpen\}/);
  assert.match(tabNavigator, /if \(mapOpen\) return;/);
  assert.match(home, /onMapVisibilityChange\?\.\(true\)/);
  assert.match(home, /onMapVisibilityChange\?\.\(false\)/);
  assert.match(personalInfo, /onMapVisibilityChange=\{onMapVisibilityChange\}/);
});

test('tour feedback waits until the third artifact details are dismissed', () => {
  const qrScanner = readFileSync('src/screens/main/QRScanner.tsx', 'utf8');

  assert.match(qrScanner, /if \(isActive && scannedArtifactsLoaded && !artifact && !pendingRatingArtifact && !showFeedback\)/);
  assert.match(
    qrScanner,
    /if \(\s*scannedArtifacts\.length >= TOUR_FEEDBACK_ARTIFACT_THRESHOLD &&\s*!alreadySubmittedFeedbackRef\.current\s*\)\s*\{\s*setShowFeedback\(true\);\s*return;\s*\}/,
  );
  assert.doesNotMatch(qrScanner, /tourCompletedCount/);
});

test('avatar storage policies restrict writes to the authenticated user folder', () => {
  assert.match(migration, /to authenticated/);
  assert.match(migration, /\(storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)\)::text/);
  assert.match(migration, /file_size_limit[\s\S]*5242880/);
});
