import { CountryKey, YearData } from '@/types';

// Reapplied grouped collection logic: pick winning collection (Left/Centre/Right), then largest subcategory inside it
const LEFT_GROUP = new Set(['Far Left', 'Left', 'Centre-Left', 'Centre-left']);
const CENTRE_GROUP = new Set(['Centre']);
const RIGHT_GROUP = new Set(['Centre-Right', 'Centre-right', 'Right', 'Far Right']);

function normalizeCategory(cat?: string): string | undefined {
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
    const norm = normalizeCategory(p.socialCategory);
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
