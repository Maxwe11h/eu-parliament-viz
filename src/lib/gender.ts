import { CountryKey, GenderYearData } from '@/types';

export const genderGradientStops = {
  start: '#fde4ee', // light pink at 0% women
  end: '#a61b4d'   // darker reddish pink at 50% women
};

export function getGenderColor(femalePct?: number): string {
  if (!Number.isFinite(femalePct)) return '#CCCCCC';
  const clamped = Math.max(0, Math.min(50, femalePct as number));
  const t = clamped / 50; // 0..1
  return lerpHex(genderGradientStops.start, genderGradientStops.end, t);
}

export function getGenderYearDataForCountry(
  all: Record<CountryKey, GenderYearData[]>,
  country: CountryKey,
  year: number
): GenderYearData | undefined {
  const arr = all[country];
  if (!arr || arr.length === 0) return undefined;
  const exact = arr.find(d => d.year === year);
  if (exact) return exact;
  const previous = [...arr].filter(d => d.year <= year).pop();
  return previous ?? arr[0];
}

export function formatFemaleShare(femalePct?: number): string {
  if (!Number.isFinite(femalePct)) return 'No data';
  const pct = femalePct as number;
  return `${pct.toFixed(1)}% women`;
}

function lerpHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  if (!ca || !cb) return a;
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const bl = Math.round(ca.b + (cb.b - ca.b) * t);
  return rgbToHex(r, g, bl);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace('#','');
  if (cleaned.length !== 6) return null;
  const num = parseInt(cleaned, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
