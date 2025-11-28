export type CountryKey =
  | 'france'
  | 'germany'
  | 'ireland'
  | 'italy'
  | 'portugal'
  | 'spain'
  // Newly added countries
  | 'austria'
  | 'belgium'
  | 'bulgaria'
  | 'croatia'
  | 'cyprus'
  | 'czech-republic'
  | 'denmark'
  | 'estonia'
  | 'finland'
  | 'greece'
  | 'hungary'
  | 'latvia'
  | 'lithuania'
  | 'luxembourg'
  | 'malta'
  | 'netherlands'
  | 'poland'
  | 'romania'
  | 'slovakia'
  | 'slovenia'
  | 'sweden';

export type ParliamentRow = {
  Year: number;
  Total: number;
  Notes?: string;
  // dynamic party columns: [acronym: string]: number | string | undefined
} & Record<string, number | string | undefined>;

export type CompassRow = {
  Acronym: string;
  NativeName: string;
  EnglishName: string;
  EconRating: number; // -10..+10 typical
  SocialRating: number; // -10..+10 typical
  EconCategory: string;
  SocialCategory: string;
  SocialCategoryExtended?: string;
  Notes?: string;
  color?: string;
};

export type YearData = {
  year: number;
  total: number;
  sumParties: number; // computed sum of party seats
  parties: Array<{
    acronym: string;
    englishName?: string;
    votes: number; // seats or vote count
    pct: number; // of total
    color: string;
    econ?: number;
    social?: number;
    socialCategory?: string;
  }>; 
};
