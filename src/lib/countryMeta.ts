import { CountryKey } from '@/types';

export const countryLabels: Record<CountryKey, string> = {
  france: 'France',
  germany: 'Germany',
  ireland: 'Ireland',
  italy: 'Italy',
  portugal: 'Portugal',
  spain: 'Spain',
  austria: 'Austria',
  belgium: 'Belgium',
  bulgaria: 'Bulgaria',
  croatia: 'Croatia',
  cyprus: 'Cyprus',
  'czech-republic': 'Czech Republic',
  denmark: 'Denmark',
  estonia: 'Estonia',
  finland: 'Finland',
  greece: 'Greece',
  hungary: 'Hungary'
};

export const orderedCountryKeys: CountryKey[] = [
  'france',
  'germany',
  'italy',
  'spain',
  'portugal',
  'ireland',
  'belgium',
  'austria',
  'bulgaria',
  'croatia',
  'cyprus',
  'czech-republic',
  'denmark',
  'estonia',
  'finland',
  'greece',
  'hungary'
];

export function getCountryLabel(key: CountryKey) {
  return countryLabels[key] || key;
}
