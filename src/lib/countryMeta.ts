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
  hungary: 'Hungary',
  latvia: 'Latvia',
  lithuania: 'Lithuania',
  luxembourg: 'Luxembourg',
  malta: 'Malta',
  netherlands: 'Netherlands',
  poland: 'Poland',
  romania: 'Romania',
  slovakia: 'Slovakia',
  slovenia: 'Slovenia',
  sweden: 'Sweden'
};

export const countryIsoCodes: Record<CountryKey, string> = {
  france: 'FR',
  germany: 'DE',
  ireland: 'IE',
  italy: 'IT',
  portugal: 'PT',
  spain: 'ES',
  austria: 'AT',
  belgium: 'BE',
  bulgaria: 'BG',
  croatia: 'HR',
  cyprus: 'CY',
  'czech-republic': 'CZ',
  denmark: 'DK',
  estonia: 'EE',
  finland: 'FI',
  greece: 'GR',
  hungary: 'HU',
  latvia: 'LV',
  lithuania: 'LT',
  luxembourg: 'LU',
  malta: 'MT',
  netherlands: 'NL',
  poland: 'PL',
  romania: 'RO',
  slovakia: 'SK',
  slovenia: 'SI',
  sweden: 'SE'
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
  'hungary',
  'latvia',
  'lithuania',
  'luxembourg',
  'malta',
  'netherlands',
  'poland',
  'romania',
  'slovakia',
  'slovenia',
  'sweden'
];

export function getCountryLabel(key: CountryKey) {
  return countryLabels[key] || key;
}

export function getCountryAbbreviation(key: CountryKey) {
  const iso = countryIsoCodes[key];
  if (iso) return iso;
  const label = getCountryLabel(key);
  return (label.slice(0, 2) || key.slice(0, 2)).toUpperCase();
}

export function getCountryFlagEmoji(key: CountryKey) {
  const iso = countryIsoCodes[key];
  if (!iso) return '🏳️';
  return iso
    .toUpperCase()
    .split('')
    .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('');
}

export function getCountryFlagUrl(key: CountryKey, width: 40 | 80 | 160 = 80) {
  const iso = countryIsoCodes[key]?.toLowerCase();
  if (!iso) return undefined;
  const safeWidth = width || 80;
  return `https://flagcdn.com/w${safeWidth}/${iso}.png`;
}
