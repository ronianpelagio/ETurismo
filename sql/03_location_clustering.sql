-- =============================================================================
-- ETurismo — 03 Location Clustering
-- The users table already has country, province, city, and barangay columns
-- (confirmed from the live schema).  This script adds performance indexes
-- for the DashboardPage region-clustering query and documents the columns.
--
-- Safe to run on the live database — idempotent.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Index — DashboardPage fetchUserDemographics() reads country + province
-- for all users to build the region chart.
-- ---------------------------------------------------------------------------
create index if not exists idx_users_country_province
  on public.users (country, province);

-- Index on city for potential future city-level breakdown
create index if not exists idx_users_city
  on public.users (city)
  where city is not null;

-- ---------------------------------------------------------------------------
-- Column comments (displayed in Supabase Studio)
-- ---------------------------------------------------------------------------
comment on column public.users.country  is
  'Country of residence, e.g. "Philippines". Used for region clustering in the admin dashboard.';

comment on column public.users.province is
  'Philippine province, e.g. "Cebu". Clustered into PSGC regions by locationClusters.ts.';

comment on column public.users.city is
  'City or municipality within the province.';

comment on column public.users.barangay is
  'Barangay within the city — finest geographic granularity available.';
