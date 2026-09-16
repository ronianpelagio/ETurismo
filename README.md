# ETurismo

ETurismo is a museum guide platform composed of an Expo/React Native visitor app, a React/Vite administration dashboard, and Supabase-backed authentication, data, and storage.

## Main features

- Artifact browsing and QR-code scanning
- Multilingual descriptions and audio guides
- Favourites, visit history, rated tour feedback, and community comments
- Museum announcements, events, visitor feedback, and analytics
- Responsive administration dashboard

## Project structure

```text
.
├── App.js                 # Expo application entry point
├── src/
│   ├── components/        # Shared mobile UI
│   ├── context/           # Theme, language, and app state
│   ├── features/          # Feature models, constants, and utilities
│   ├── navigation/        # Mobile navigation
│   ├── screens/           # Mobile screens
│   ├── services/          # Supabase and authentication services
│   └── utils/             # Local persistence helpers
├── admin/                 # React/Vite admin dashboard and audio API
├── sql/                   # Repeatable Supabase schema scripts
└── tests/                 # Project configuration tests
```

## Requirements

- Node.js 22
- npm
- Expo development environment for Android or iOS
- A Supabase project

## Mobile setup

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env.local` and set the public Supabase values.
3. Configure `GOOGLE_MAPS_API_KEY` locally and in the EAS build environment.
4. Start the app with `npm start`.

Use `npm run android`, `npm run ios`, or `npm run web` for a specific platform.

## Admin setup

1. Run `npm ci` inside `admin/`.
2. Create `admin/.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Run `npm run dev` inside `admin/`.

Privileged Supabase secret or service-role keys must only be configured on the backend. Never use them in `VITE_` or `EXPO_PUBLIC_` variables.

## Database

Run the scripts in `sql/` through the Supabase SQL editor. Every table exposed through the Data API should have Row Level Security enabled and policies reviewed before production deployment.

## Quality checks

Run the complete local check with:

```bash
npm run check
```

GitHub Actions runs mobile type checking, tests, Expo configuration validation, and the admin type check, lint, and production build for every pull request to `master`.

## Commit messages

Use short, meaningful messages such as:

- `feat(scanner): add artifact photo fallback`
- `fix(admin): preserve session after user creation`
- `refactor(home): extract artifact data helpers`
- `docs: explain EAS environment setup`

Do not commit `.env` files, API secrets, generated build directories, or `node_modules`.
