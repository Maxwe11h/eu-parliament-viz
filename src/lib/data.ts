import Papa from 'papaparse';
import { CompassRow, CountryKey, YearData } from '@/types';
import { colorFromCategories } from './colors';
import { countryLabels } from './countryMeta';

// We'll import CSV via dynamic fetch (Next.js edge or node). For simplicity using require context is not available.
// Provide function that reads from /data folder at runtime (server). In dev this is fine.
import fs from 'fs';
import path from 'path';

const countries: CountryKey[] = [
  'france', 'germany', 'ireland', 'italy', 'portugal', 'spain',
  'austria','belgium','bulgaria','croatia','cyprus','czech-republic','denmark','estonia','finland','greece','hungary',
  'latvia','lithuania','luxembourg','malta','netherlands','poland','romania','slovakia','slovenia','sweden'
];
export { countries };

type PopulationMap = Partial<Record<CountryKey, number>>;
let cachedPopulationMap: PopulationMap | null = null;
const populationAliasMap: Record<string, CountryKey> = {
  'czechia': 'czech-republic',
  'czech republic': 'czech-republic',
  'luxemburg': 'luxembourg'
};

function readCsv(country: CountryKey, suffix: 'parliament' | 'political-compass'): string {
  const filename = `${country}/${country}-${suffix === 'parliament' ? 'parliament-data' : 'political-compass'}.csv`;
  const p = path.join(process.cwd(), 'data', filename);
  return fs.readFileSync(p, 'utf8');
}

export function loadCompass(country: CountryKey): CompassRow[] {
  const raw = readCsv(country, 'political-compass');
  // Some country compass CSVs have each entire line wrapped in quotes, e.g. "Acronym,NativeName,..." including header.
  // Detect if first non-empty line starts and ends with a quote and contains commas inside; if so strip outer quotes per line.
  let cleaned = raw;
  const lines = raw.split(/\r?\n/).filter(l=>l.trim().length>0);
  if (lines.length > 0) {
    const header = lines[0].trim();
    const fullyQuoted = header.startsWith('"') && header.endsWith('"') && header.includes(',');
    if (fullyQuoted) {
      cleaned = lines
        .map(l => {
          const t = l.trim();
          return (t.startsWith('"') && t.endsWith('"')) ? t.slice(1, -1) : l; // remove surrounding quotes only
        })
        .join('\n');
    }
  }
  const parsed = Papa.parse(cleaned, { header: true, dynamicTyping: true });
  return (parsed.data as any[])
    .filter(r => r && r.Acronym)
    .map(r => ({
      Acronym: String(r.Acronym).trim(),
      NativeName: String(r.NativeName || '').trim(),
      EnglishName: String(r.EnglishName || '').trim(),
      EconRating: Number(r.EconRating),
      SocialRating: Number(r.SocialRating),
      EconCategory: String(r.EconCategory || '').trim(),
      SocialCategory: String(r.SocialCategory || '').trim(),
      SocialCategoryExtended: r.SocialCategoryExtended,
      Notes: r.Notes,
      color: colorFromCategories(r.EconCategory, r.SocialCategory, r.Acronym)
    }));
}

export function loadParliament(country: CountryKey): YearData[] {
  const raw = readCsv(country, 'parliament');
  const parsed = Papa.parse(raw, { header: true, dynamicTyping: true });
  const rows = parsed.data as any[];
  const yearData: YearData[] = [];
  for (const row of rows) {
    if (!row || !row.Year) continue;
    const year = Number(row.Year);
    const total = Number(row.Total) || 0;
    const parties: YearData['parties'] = [];
    let sumSeats = 0;
    for (const key of Object.keys(row)) {
      if (['Year','Total','Notes',''].includes(key)) continue;
      const val = row[key];
      if (val === '' || val == null) continue;
      if (typeof val === 'number') {
        sumSeats += val;
        parties.push({ acronym: key, votes: val, pct: total? (val/total)*100:0, color: '#999' });
      }
    }
    yearData.push({ year, total, sumParties: sumSeats, parties });
  }
  return yearData.sort((a,b)=>a.year-b.year);
}

// Canonicalize acronyms so that differences in separators, case, diacritics and parentheses don't break joins.
function canonical(acronym: string): string {
  let s = acronym.toUpperCase();
  // Drop parenthetical content entirely (e.g. "German minority (MNOÖ)" -> "GERMAN MINORITY")
  s = s.replace(/\(.*?\)/g, '');
  // Remove diacritics
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Remove all non alphanumeric characters
  s = s.replace(/[^A-Z0-9]/g, '');
  return s;
}

// Optional explicit alias map for edge cases (keys & values are canonical forms)
const aliasMap: Record<string, string> = {
  // Hungary specific: German minority seat naming variations
  GERMANMINORITY: 'GERMANMINORITY',
};

export function mergeYearData(country: CountryKey): YearData[] {
  const compass = loadCompass(country);
  const parliament = loadParliament(country);

  // Build lookup by canonical acronym (include EnglishName as secondary key if unique)
  const compassMap = new Map<string, CompassRow>();
  for (const c of compass) {
    const acr = canonical(c.Acronym);
    if (!compassMap.has(acr)) compassMap.set(acr, c);
    // Also index EnglishName stripped if distinct (handles cases where parliament uses full name as acronym)
    const eng = c.EnglishName ? canonical(c.EnglishName) : undefined;
    if (eng && !compassMap.has(eng)) compassMap.set(eng, c);
  }

  for (const y of parliament) {
    for (const p of y.parties) {
      const cand = canonical(p.acronym);
      const alias = aliasMap[cand];
      const info = compassMap.get(alias || cand);
      if (info) {
        p.englishName = info.EnglishName || info.NativeName || p.acronym;
        p.econ = Number.isFinite(info.EconRating) ? info.EconRating : undefined;
        p.social = Number.isFinite(info.SocialRating) ? info.SocialRating : undefined;
        p.color = info.color || p.color;
        p.socialCategory = info.SocialCategory;
      } else {
        // No ideological data found: leave econ/social undefined and keep neutral grey color for clarity
        p.englishName = p.englishName || p.acronym; // ensure name displayed
      }
    }
    // Order parties ideologically left(-econ) to right(+econ); fall back to seat count if no econ data
    y.parties.sort((a, b) => {
      const ae = a.econ ?? 0;
      const be = b.econ ?? 0;
      if (ae === be) return (b.votes ?? 0) - (a.votes ?? 0);
      return ae - be;
    });
  }
  return parliament;
}

// Majority social category for a given country/year: pick social category with highest weighted seats.
// Note: client-safe analytics live in lib/analytics.ts to avoid importing fs on client

export function getAllCountriesData() {
  const result: Record<CountryKey, YearData[]> = {} as any;
  for (const c of countries) result[c] = mergeYearData(c);
  return result;
}

export function getPopulationMap(): PopulationMap {
  if (cachedPopulationMap) return cachedPopulationMap;
  const csvPath = path.join(process.cwd(), 'data', 'EU_populations.csv');
  if (!fs.existsSync(csvPath)) {
    cachedPopulationMap = {};
    return cachedPopulationMap;
  }

  const raw = fs.readFileSync(csvPath, 'utf8');
  const parsed = Papa.parse(raw, {
    header: true,
    dynamicTyping: true,
    delimiter: ';',
    skipEmptyLines: true
  });

  const labelLookup = Object.entries(countryLabels).reduce<Record<string, CountryKey>>((acc, [key, label]) => {
    acc[label.toLowerCase()] = key as CountryKey;
    return acc;
  }, {});

  const map: PopulationMap = {};
  for (const entry of parsed.data as any[]) {
    if (!entry) continue;
    const name = String(entry.Country || '').trim();
    const population = Number(entry.Population);
    if (!name || !Number.isFinite(population) || population <= 0) continue;
    const normalized = name.toLowerCase();
    const key = populationAliasMap[normalized] || labelLookup[normalized];
    if (key) {
      map[key] = population;
    }
  }

  cachedPopulationMap = map;
  return map;
}
