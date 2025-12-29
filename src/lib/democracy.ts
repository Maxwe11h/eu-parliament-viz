import { CountryKey } from '@/types';

// Rough democracy transition dates sourced from historical election milestones across Europe.
// Add or edit entries below whenever you want to override a country's "free" date.
export const freedomYearByCountry: Partial<Record<CountryKey, number>> = {
  'spain': 1977, // first democratic elections after Franco regime
  'portugal': 1976, // constitution following Carnation Revolution
  'slovenia': 1990, // first multi-party elections during Yugoslav breakup
  'croatia': 1992, // multi-party elections held under Socialist Republic
  'estonia': 1992, // independence restored and free elections
  'latvia': 1993, // independence restored
  'lithuania': 1990, // independence restored
  'czech-republic': 1992, // post-Velvet Revolution parliamentary elections
  'slovakia': 1992 // post-Velvet Revolution parliamentary elections
};

export const NOT_FREE_COLOR = '#555555';

export function getCountryFreedomYear(country: CountryKey): number | undefined {
  return freedomYearByCountry[country];
}

export function isCountryFree(country: CountryKey, year: number): boolean {
  const threshold = freedomYearByCountry[country];
  if (!threshold) return true;
  return year >= threshold;
}
