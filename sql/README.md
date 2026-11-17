# ETurismo — Supabase SQL Scripts

Run these scripts **in order** through the Supabase SQL editor
(Dashboard → SQL Editor → New query).

Every script is **idempotent** — safe to re-run on an existing database without data loss.

---

## Execution order

| # | File | What it does | Run when |
|---|------|-------------|----------|
| 1 | `01_base_schema.sql` | Creates all tables, enums, helper functions, RLS policies, and the `updated_at` trigger | Fresh database / first setup |
| 2 | `02_new_languages.sql` | Seeds empty `artifact_translations` stubs for `ceb`, `ilo`, `hil` on every existing artifact that already has a `fil` row | After adding Bisaya / Ilocano / Hiligaynon language support |
| 3 | `03_location_clustering.sql` | Adds performance indexes on `country` + `province`; documents the location columns | After enabling the visitor-region chart |
| 4 | `04_sentiment_cache.sql` | Adds nullable `sentiment` column to `artifact_comments` and `tour_feedback` | After enabling sentiment analysis |
| 5 | `05_storage_and_indexes.sql` | Creates `artifact-images` / `artifact-audio` storage buckets, their RLS policies, and query-performance indexes | After base schema |

---

## Table overview

| Table | Purpose |
|---|---|
| `users` | Visitor and admin accounts (synced from Supabase Auth). Includes `country`, `province`, `city`, `barangay` for region clustering. |
| `artifacts` | Museum artifact records. |
| `artifact_translations` | One row per `(artifact_id, language_code)` — name, description, audio URL per language. |
| `announcements` | Museum announcements shown in the mobile app. |
| `events` | Museum events with date/time and interested-count. |
| `event_interests` | Junction table — which users marked an event as interested. |
| `user_ratings` | Star ratings left by visitors on artifacts (legacy). |
| `artifact_ratings` | Star ratings + comment per artifact (newer table). |
| `tour_feedback` | Post-tour survey — overall rating, visit type, free text, recommendation flag. |
| `artifact_comments` | Visitor comments on artifacts, threaded via `parent_id`. Includes `updated_at`. |
| `artifact_comment_likes` | Junction table for comment likes (composite PK: `comment_id` + `user_id`). |

---

## Language codes (`artifact_translations.language_code`)

| Code | Language |
|---|---|
| `en` | English |
| `fil` | Filipino (Tagalog) |
| `ceb` | Bisaya (Cebuano) |
| `ilo` | Ilocano |
| `hil` | Hiligaynon (Ilonggo) |
| `ja` | Japanese |
| `es` | Spanish |
| `ko` | Korean |

---

## `artifact_category` enum values

```
Sacred Vessels | Liturgical Books | Vestments | Altar Furnishings |
Devotional Objects | Sacramentals | Musical Instruments |
Architectural and Decorative Elements
```

---

## RLS helper functions

Both are created by `01_base_schema.sql` and used in policies:

- **`is_admin()`** — used in artifact / announcement / event write policies
- **`is_current_user_admin()`** — used in user / feedback / rating read policies

---

## Important notes

- **`artifact_comments` has two FKs to `users`** (`user_id` and self-referencing `parent_id → artifact_comments`). When querying with the Supabase PostgREST client, always use the **two-step fetch pattern** — fetch comments first, then users by ID — to avoid the *"more than one relationship"* error.
- The `sentiment` columns (added by script 04) are **nullable caches**. The client-side scorer in `admin/src/admin/utils/sentiment.ts` runs without them; populate them later via an Edge Function if you want server-side filtering.
- `artifact_translations` uses a free-form `varchar` for `language_code`. The unique constraint `(artifact_id, language_code)` prevents duplicates. No schema change is needed to support new languages — just insert a row with the new code.
