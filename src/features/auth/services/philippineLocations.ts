export interface LocationOption {
  code: string;
  name: string;
}

interface PsgcRecord {
  code: string;
  name: string;
}

const PSGC_API = 'https://psgc.cloud/api';
const requestCache = new Map<string, LocationOption[]>();

async function fetchOptions(path: string): Promise<LocationOption[]> {
  const cached = requestCache.get(path);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`${PSGC_API}${path}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Location service returned ${response.status}`);
    }

    const records = (await response.json()) as PsgcRecord[];
    const options = records
      .map(({ code, name }) => ({ code, name }))
      .filter(option => option.code && option.name)
      .sort((a, b) => a.name.localeCompare(b.name));

    requestCache.set(path, options);
    return options;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getProvinces(): Promise<LocationOption[]> {
  const provinces = await fetchOptions('/provinces');
  const metroManila = { code: 'NCR', name: 'Metro Manila' };
  return [metroManila, ...provinces].sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeLocationName(name: string): string {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^(city|municipality|province) of /, '')
    .replace(/ (city|municipality|province)$/, '')
    .replace(/[^a-z0-9]/g, '');

  return normalized === 'nationalcapitalregion' || normalized === 'ncr'
    ? 'metromanila'
    : normalized;
}

function findLocationOption(
  options: LocationOption[],
  names: string[],
): LocationOption | undefined {
  for (const name of names) {
    if (!name) continue;
    const normalizedName = normalizeLocationName(name);
    const match = options.find(
      option => normalizeLocationName(option.name) === normalizedName,
    );
    if (match) return match;
  }

  return undefined;
}

export async function resolvePhilippineLocation(
  provinceNames: string[],
  cityNames: string[],
): Promise<{ province: LocationOption; city: LocationOption } | null> {
  const province = findLocationOption(await getProvinces(), provinceNames);
  if (!province) return null;

  const city = findLocationOption(
    await getCitiesMunicipalities(province.code),
    cityNames,
  );
  return city ? { province, city } : null;
}

export function getCitiesMunicipalities(provinceCode: string) {
  if (provinceCode === 'NCR') {
    return fetchOptions('/regions/1300000000/cities-municipalities');
  }

  return fetchOptions(`/provinces/${provinceCode}/cities-municipalities`);
}

export function getBarangays(localityCode: string) {
  return fetchOptions(`/cities-municipalities/${localityCode}/barangays`);
}
