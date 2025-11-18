import Papa from 'papaparse';
import { CompassRow, CountryKey, YearData } from '@/types';
import { colorFromCategories } from './colors';

// We'll import CSV via dynamic fetch (Next.js edge or node). For simplicity using require context is not available.
// Provide function that reads from /data folder at runtime (server). In dev this is fine.
import fs from 'fs';
import path from 'path';

const countries: CountryKey[] = ['france','germany','ireland','italy','portugal','spain'];
export { countries };

function readCsv(country: CountryKey, suffix: 'parliament' | 'political-compass'): string {
  const filename = `${country}/${country}-${suffix === 'parliament' ? 'parliament-data' : 'political-compass'}.csv`;
  const p = path.join(process.cwd(), 'data', filename);
  return fs.readFileSync(p, 'utf8');
}

export function loadCompass(country: CountryKey): CompassRow[] {
  const raw = readCsv(country, 'political-compass');
  const parsed = Papa.parse(raw, { header: true, dynamicTyping: true });
  return (parsed.data as any[]).filter(r=>r && r.Acronym).map(r=>({
    Acronym: r.Acronym,
    NativeName: r.NativeName,
    EnglishName: r.EnglishName,
    EconRating: Number(r.EconRating),
    SocialRating: Number(r.SocialRating),
    EconCategory: r.EconCategory,
    SocialCategory: r.SocialCategory,
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

export function mergeYearData(country: CountryKey): YearData[] {
  const compass = loadCompass(country);
  const parliament = loadParliament(country);
  const compassMap = new Map(compass.map(c=>[c.Acronym.toUpperCase(), c]));
  for (const y of parliament) {
    for (const p of y.parties) {
      const info = compassMap.get(p.acronym.toUpperCase());
      if (info) {
        p.englishName = info.EnglishName;
        p.econ = info.EconRating;
        p.social = info.SocialRating;
        p.color = info.color || p.color;
        p.socialCategory = info.SocialCategory;
      }
    }
    // order parties ideologically left(-econ) to right(+econ) fallback by color
    y.parties.sort((a,b)=> (a.econ??0)-(b.econ??0));
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
