import { CountryKey, YearData } from '@/types';

// Reapplied grouped collection logic: pick winning collection (Left/Centre/Right), then largest subcategory inside it
const LEFT_GROUP = new Set(['Far Left', 'Left', 'Centre-Left', 'Centre-left']);
const CENTRE_GROUP = new Set(['Centre']);
const RIGHT_GROUP = new Set(['Centre-Right', 'Centre-right', 'Right', 'Far Right']);
const DETAILED_LEANINGS = ['Far Left', 'Left', 'Centre-Left', 'Centre', 'Centre-Right', 'Right', 'Far Right'] as const;
type DetailedLeaning = (typeof DETAILED_LEANINGS)[number];

export function normalizeSocialCategory(cat?: string): string | undefined {
  if (!cat) return undefined;
  if (/^centre-?left$/i.test(cat)) return 'Centre-Left';
  if (/^centre-?right$/i.test(cat)) return 'Centre-Right';
  if (/^far\s*left$/i.test(cat)) return 'Far Left';
  if (/^far\s*right$/i.test(cat)) return 'Far Right';
  if (/^left$/i.test(cat)) return 'Left';
  if (/^right$/i.test(cat)) return 'Right';
  if (/^centre$/i.test(cat)) return 'Centre';
  return cat;
}

export function majoritySocialCategory(
  all: Record<CountryKey, YearData[]>,
  country: CountryKey,
  year: number
): { category?: string; totalWeight: number; partyName?: string; percentage?: number; collection?: 'Left'|'Centre'|'Right' } {
  const arr = all[country];
  if (!arr || arr.length === 0) return { category: undefined, totalWeight: 0 };
  const yd = [...arr].reverse().find(d => d.year <= year) || arr[0];

  let totalVotes = 0;
  const subTotals = new Map<string, number>();
  let leftTotal = 0, centreTotal = 0, rightTotal = 0;

  for (const p of yd.parties) {
    const votes = p.votes || 0;
    totalVotes += votes;
    if (!votes) continue;
  const norm = normalizeSocialCategory(p.socialCategory);
    if (!norm) continue;
    subTotals.set(norm, (subTotals.get(norm) || 0) + votes);
    if (LEFT_GROUP.has(norm)) leftTotal += votes;
    else if (CENTRE_GROUP.has(norm)) centreTotal += votes;
    else if (RIGHT_GROUP.has(norm)) rightTotal += votes;
  }

  const groups: Array<{name:'Left'|'Centre'|'Right'; total:number; members:Set<string>}> = [
    { name:'Left', total:leftTotal, members:LEFT_GROUP },
    { name:'Centre', total:centreTotal, members:CENTRE_GROUP },
    { name:'Right', total:rightTotal, members:RIGHT_GROUP },
  ];
  groups.sort((a,b)=> b.total - a.total);
  const winner = groups[0];
  if (!winner || winner.total === 0) return { category: undefined, totalWeight: 0 };

  let bestSub: string | undefined; let bestVotes = 0;
  for (const [sub, v] of subTotals) {
    if (winner.members.has(sub) && v > bestVotes) { bestSub = sub; bestVotes = v; }
  }

  const percentage = totalVotes > 0 ? (bestVotes / totalVotes) * 100 : 0;
  return { category: bestSub, totalWeight: bestVotes, partyName: bestSub, percentage, collection: winner.name };
}

export function getYearDataForCountry(
  all: Record<CountryKey, YearData[]>,
  country: CountryKey,
  year: number
): YearData | undefined {
  const arr = all[country];
  if (!arr || arr.length === 0) return undefined;
  const exact = arr.find(d => d.year === year);
  if (exact) return exact;
  const previous = [...arr].filter(d => d.year <= year).pop();
  return previous ?? arr[0];
}

export function getLeaningTotals(data?: YearData): Array<{ collection: 'Left'|'Centre'|'Right'; votes: number; percentage: number }> {
  if (!data) return [];
  const totals = {
    Left: 0,
    Centre: 0,
    Right: 0
  } as Record<'Left'|'Centre'|'Right', number>;

  for (const party of data.parties) {
    const votes = party.votes || 0;
    if (!votes) continue;
    const norm = normalizeSocialCategory(party.socialCategory);
    if (!norm) continue;
    if (LEFT_GROUP.has(norm)) totals.Left += votes;
    else if (CENTRE_GROUP.has(norm)) totals.Centre += votes;
    else if (RIGHT_GROUP.has(norm)) totals.Right += votes;
  }

  const totalVotes = totals.Left + totals.Centre + totals.Right;
  if (totalVotes === 0) return [];

  return (['Left','Centre','Right'] as const).map(collection => ({
    collection,
    votes: totals[collection],
    percentage: totalVotes ? (totals[collection] / totalVotes) * 100 : 0
  })).filter(item => item.votes > 0);
}

export function getDetailedLeaningTotals(data?: YearData): Array<{ label: DetailedLeaning; votes: number; percentage: number }> {
  const base = DETAILED_LEANINGS.map(label => ({ label, votes: 0, percentage: 0 }));
  if (!data) return base;

  const totals = DETAILED_LEANINGS.reduce((acc, label) => {
    acc[label] = 0;
    return acc;
  }, {} as Record<DetailedLeaning, number>);

  let totalVotes = 0;
  for (const party of data.parties) {
    const votes = party.votes || 0;
    if (!votes) continue;
    totalVotes += votes;
    const norm = normalizeSocialCategory(party.socialCategory);
    if (norm && (totals as Record<string, number>)[norm] !== undefined) {
      totals[norm as DetailedLeaning] += votes;
    }
  }

  if (totalVotes === 0) return base;

  return DETAILED_LEANINGS.map(label => ({
    label,
    votes: totals[label],
    percentage: totalVotes ? (totals[label] / totalVotes) * 100 : 0
  }));
}
