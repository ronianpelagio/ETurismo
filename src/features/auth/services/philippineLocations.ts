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

export function getCitiesMunicipalities(provinceCode: string) {
  if (provinceCode === 'NCR') {
    return fetchOptions('/regions/1300000000/cities-municipalities');
  }

  return fetchOptions(`/provinces/${provinceCode}/cities-municipalities`);
}

export function getBarangays(localityCode: string) {
  return fetchOptions(`/cities-municipalities/${localityCode}/barangays`);
}
