/**
 * Location clustering utility.
 *
 * Two-layer strategy:
 *
 *  Layer 1 – Philippine visitors
 *    Maps raw province/city strings into the 18 PSGC administrative regions.
 *    Keys from dashboardData arrive as "Philippines – <Province/City>" or bare
 *    province names with no country prefix.
 *
 *  Layer 2 – International visitors
 *    Maps country names → world sub-region (e.g. "Southeast Asia", "East Asia",
 *    "Western Europe") so overseas visitors are grouped meaningfully rather than
 *    shown as a flat list of countries.
 *    Keeps the raw country name as a secondary label inside the group.
 *
 * Usage:
 *   clusterLocations(demographics.locations)
 *   → ClusteredLocations
 *
 *   topRegions(clustered, 10, true)
 *   → Array<{ region, count }>   (PH regions + international groups, sorted)
 */

// ─── Philippine regions ────────────────────────────────────────────────────────

/**
 * Key: official PSGC region name.
 * Value: lowercased province/city name fragments matched with .includes().
 */
export const PH_REGIONS: Record<string, string[]> = {
  "NCR – Metro Manila": [
    "metro manila", "ncr", "manila", "quezon city", "makati", "pasig",
    "taguig", "marikina", "muntinlupa", "las piñas", "las pinas",
    "parañaque", "paranaque", "caloocan", "malabon", "navotas",
    "valenzuela", "mandaluyong", "san juan", "pasay", "pateros",
  ],
  "CAR – Cordillera Administrative Region": [
    "abra", "apayao", "benguet", "baguio", "ifugao", "kalinga",
    "mountain province", "car",
  ],
  "Region I – Ilocos Region": [
    "ilocos norte", "ilocos sur", "la union", "pangasinan",
    "region i", "region 1",
  ],
  "Region II – Cagayan Valley": [
    "batanes", "cagayan", "isabela", "nueva vizcaya", "quirino",
    "region ii", "region 2",
  ],
  "Region III – Central Luzon": [
    "aurora", "bataan", "bulacan", "nueva ecija", "pampanga", "tarlac",
    "zambales", "angeles", "olongapo", "region iii", "region 3",
    "central luzon", "san fernando", "cabanatuan", "malolos",
    "meycauayan", "balanga",
  ],
  "Region IV-A – CALABARZON": [
    "batangas", "cavite", "laguna", "quezon", "rizal", "calabarzon",
    "region iv-a", "region iva", "region 4a", "region 4-a",
    "antipolo", "bacoor", "calamba", "dasmariñas", "dasmarinas",
    "general trias", "imus", "lipa", "lucena", "santa rosa",
    "tagaytay", "tanauan", "trece martires",
  ],
  "MIMAROPA – Region IV-B": [
    "marinduque", "occidental mindoro", "oriental mindoro", "palawan",
    "romblon", "mimaropa", "region iv-b", "region ivb", "region 4b",
  ],
  "Region V – Bicol Region": [
    "albay", "camarines norte", "camarines sur", "catanduanes", "masbate",
    "sorsogon", "region v", "region 5", "bicol",
  ],
  "Region VI – Western Visayas": [
    "aklan", "antique", "capiz", "guimaras", "iloilo", "negros occidental",
    "region vi", "region 6", "western visayas", "iloilo city", "bacolod",
  ],
  "Region VII – Central Visayas": [
    "bohol", "cebu", "negros oriental", "siquijor",
    "region vii", "region 7", "central visayas",
    "cebu city", "lapu-lapu", "mandaue",
  ],
  "Region VIII – Eastern Visayas": [
    "biliran", "eastern samar", "leyte", "northern samar", "samar",
    "southern leyte", "region viii", "region 8", "eastern visayas",
  ],
  "Region IX – Zamboanga Peninsula": [
    "zamboanga del norte", "zamboanga del sur", "zamboanga sibugay",
    "zamboanga", "region ix", "region 9",
  ],
  "Region X – Northern Mindanao": [
    "bukidnon", "camiguin", "lanao del norte", "misamis occidental",
    "misamis oriental", "cagayan de oro", "iligan",
    "region x", "region 10", "northern mindanao",
  ],
  "Region XI – Davao Region": [
    "compostela valley", "davao de oro", "davao del norte", "davao del sur",
    "davao occidental", "davao oriental", "davao city", "davao",
    "region xi", "region 11",
  ],
  "Region XII – SOCCSKSARGEN": [
    "cotabato", "sarangani", "south cotabato", "sultan kudarat",
    "general santos", "koronadal",
    "region xii", "region 12", "soccsksargen",
  ],
  "Region XIII – Caraga": [
    "agusan del norte", "agusan del sur", "dinagat islands",
    "surigao del norte", "surigao del sur",
    "region xiii", "region 13", "caraga",
  ],
  "BARMM – Bangsamoro": [
    "basilan", "lanao del sur", "maguindanao", "sulu", "tawi-tawi",
    "marawi", "cotabato city", "barmm", "bangsamoro", "armm",
  ],
};

// ─── International sub-regions ─────────────────────────────────────────────────

/**
 * Maps world sub-region labels to arrays of lowercased country name fragments.
 * Order matters: more specific entries should appear before broader ones.
 */
const INTERNATIONAL_REGIONS: Record<string, string[]> = {
  // ── Asia ──────────────────────────────────────────────────────────────────
  "Southeast Asia": [
    "indonesia", "malaysia", "singapore", "thailand", "vietnam", "viet nam",
    "myanmar", "burma", "cambodia", "laos", "brunei", "timor-leste",
    "east timor", "myanmar",
  ],
  "East Asia": [
    "china", "japan", "south korea", "korea", "taiwan", "hong kong",
    "macao", "macau", "mongolia",
  ],
  "South Asia": [
    "india", "pakistan", "bangladesh", "sri lanka", "nepal", "bhutan",
    "maldives", "afghanistan",
  ],
  "Central Asia": [
    "kazakhstan", "uzbekistan", "kyrgyzstan", "tajikistan", "turkmenistan",
  ],
  "West Asia / Middle East": [
    "saudi arabia", "united arab emirates", "uae", "qatar", "kuwait",
    "bahrain", "oman", "jordan", "israel", "lebanon", "syria",
    "iraq", "iran", "yemen", "turkey", "türkiye", "cyprus",
  ],
  // ── Americas ──────────────────────────────────────────────────────────────
  "North America": [
    "united states", "usa", "u.s.a", "us,", "canada", "mexico",
    "greenland",
  ],
  "Central America & Caribbean": [
    "guatemala", "belize", "honduras", "el salvador", "nicaragua",
    "costa rica", "panama", "cuba", "jamaica", "haiti", "dominican republic",
    "puerto rico", "bahamas", "barbados", "trinidad", "tobago",
  ],
  "South America": [
    "brazil", "argentina", "chile", "colombia", "venezuela", "peru",
    "ecuador", "bolivia", "paraguay", "uruguay", "guyana", "suriname",
  ],
  // ── Europe ────────────────────────────────────────────────────────────────
  "Western Europe": [
    "united kingdom", "uk,", "great britain", "england", "scotland", "wales",
    "ireland", "france", "germany", "netherlands", "belgium", "luxembourg",
    "switzerland", "austria", "spain", "portugal", "italy", "monaco",
    "andorra", "liechtenstein", "san marino", "malta",
  ],
  "Northern Europe": [
    "sweden", "norway", "denmark", "finland", "iceland", "estonia",
    "latvia", "lithuania",
  ],
  "Eastern Europe": [
    "russia", "ukraine", "poland", "czech republic", "czechia", "slovakia",
    "hungary", "romania", "bulgaria", "serbia", "croatia", "slovenia",
    "bosnia", "albania", "north macedonia", "kosovo", "montenegro",
    "moldova", "belarus",
  ],
  "Southern Europe": [
    "greece", "turkey", "türkiye", "cyprus", "albania", "north macedonia",
  ],
  // ── Oceania ───────────────────────────────────────────────────────────────
  "Oceania": [
    "australia", "new zealand", "papua new guinea", "fiji", "solomon islands",
    "vanuatu", "samoa", "tonga", "kiribati", "micronesia", "palau",
    "marshall islands", "nauru", "tuvalu",
  ],
  // ── Africa ────────────────────────────────────────────────────────────────
  "North Africa": [
    "egypt", "libya", "tunisia", "algeria", "morocco", "sudan",
  ],
  "Sub-Saharan Africa": [
    "nigeria", "south africa", "kenya", "ghana", "ethiopia", "tanzania",
    "uganda", "rwanda", "mozambique", "angola", "zambia", "zimbabwe",
    "cameroon", "ivory coast", "senegal", "mali", "niger",
  ],
};

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ClusteredLocations = {
  /** Philippine PSGC region → visitor count */
  regions: Record<string, number>;
  /** PH visitors whose province/city could not be mapped to a region */
  unknownPhilippines: number;
  /**
   * International visitors.
   * Two-level structure: sub-region → { total, countries: { name → count } }
   */
  international: Record<string, { total: number; countries: Record<string, number> }>;
  /** Total visitor count across all entries */
  total: number;

  /** @deprecated Use `international` instead — kept for backwards compatibility */
  overseas: Record<string, number>;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function matchPhRegion(lower: string): string | null {
  for (const [regionName, fragments] of Object.entries(PH_REGIONS)) {
    if (fragments.some((f) => lower.includes(f))) return regionName;
  }
  return null;
}

function matchInternationalRegion(lower: string): string | null {
  for (const [subRegion, fragments] of Object.entries(INTERNATIONAL_REGIONS)) {
    if (fragments.some((f) => lower.includes(f))) return subRegion;
  }
  return null;
}

/** Capitalise each word. */
function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Main clustering function ──────────────────────────────────────────────────

/**
 * Takes the raw `locations` map from `DashboardDemographics` and returns a
 * fully clustered breakdown — Philippine PSGC regions and international
 * sub-regions in one pass.
 */
export function clusterLocations(
  locations: Record<string, number>,
): ClusteredLocations {
  const regions: Record<string, number> = {};
  const international: Record<string, { total: number; countries: Record<string, number> }> = {};
  const overseas: Record<string, number> = {}; // compat shim
  let unknownPhilippines = 0;
  let total = 0;

  for (const [rawKey, count] of Object.entries(locations)) {
    total += count;
    const lower = rawKey.toLowerCase();

    // ── Determine Philippine origin ─────────────────────────────────────────
    const isPhilippines =
      lower.includes("philippines") ||
      lower.includes("pilipinas") ||
      lower.includes("pilipino") ||
      // "ph," from ISO codes or bare province names matched in PH_REGIONS
      lower.startsWith("ph,") ||
      matchPhRegion(lower) !== null;

    if (isPhilippines) {
      const region = matchPhRegion(lower);
      if (region) {
        regions[region] = (regions[region] ?? 0) + count;
      } else {
        unknownPhilippines += count;
      }
      continue;
    }

    // ── International visitor ───────────────────────────────────────────────
    // Try to find a world sub-region for this country string.
    const subRegion = matchInternationalRegion(lower);

    // The raw country name, normalised for display.
    // dashboardData produces keys like "United States", "Japan", etc.
    // Strip any trailing comma / ISO code artefact.
    const countryDisplay = titleCase(rawKey.trim().replace(/,\s*$/, ""));

    const bucket = subRegion ?? "Other";
    if (!international[bucket]) {
      international[bucket] = { total: 0, countries: {} };
    }
    international[bucket].total += count;
    international[bucket].countries[countryDisplay] =
      (international[bucket].countries[countryDisplay] ?? 0) + count;

    // compat: keep the flat overseas map as well
    overseas[countryDisplay] = (overseas[countryDisplay] ?? 0) + count;
  }

  return { regions, unknownPhilippines, international, overseas, total };
}

// ─── topRegions ────────────────────────────────────────────────────────────────

/**
 * Returns the top N entries sorted by visitor count, mixing Philippine PSGC
 * regions and international sub-regions in a single ranked list.
 *
 * Each entry carries a `type` tag so the dashboard can style them differently.
 */
export type RegionRow = {
  region: string;
  count: number;
  type: "ph-region" | "international" | "ph-unknown" | "intl-country";
  /** For international rows: breakdown of countries within the sub-region */
  countries?: Record<string, number>;
};

export function topRegions(
  clustered: ClusteredLocations,
  limit = 10,
  includeUnknown = true,
): RegionRow[] {
  const entries: RegionRow[] = [];

  // Philippine PSGC regions
  for (const [region, count] of Object.entries(clustered.regions)) {
    entries.push({ region, count, type: "ph-region" });
  }

  // International sub-regions
  for (const [subRegion, data] of Object.entries(clustered.international)) {
    entries.push({
      region: subRegion,
      count: data.total,
      type: "international",
      countries: data.countries,
    });
  }

  // Unknown PH entries (optional)
  if (includeUnknown && clustered.unknownPhilippines > 0) {
    entries.push({
      region: "Philippines (unspecified)",
      count: clustered.unknownPhilippines,
      type: "ph-unknown",
    });
  }

  return entries.sort((a, b) => b.count - a.count).slice(0, limit);
}

// ─── Helpers for display ───────────────────────────────────────────────────────

/**
 * Short display label for a region name — strips the "Region X – " prefix
 * so charts have concise labels.
 */
export function shortRegionLabel(region: string): string {
  // "Region III – Central Luzon" → "Central Luzon"
  // "NCR – Metro Manila" → "Metro Manila"
  const dashIdx = region.indexOf("–");
  if (dashIdx !== -1) return region.slice(dashIdx + 2).trim();
  return region;
}

/**
 * Returns a sorted list of countries within an international sub-region.
 */
export function topCountriesInRegion(
  countries: Record<string, number>,
  limit = 3,
): Array<{ country: string; count: number }> {
  return Object.entries(countries)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
