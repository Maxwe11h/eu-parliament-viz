import { CountryKey, YearData } from '@/types';

// Compute majority social category using already-merged data in memory (client-safe)
export function majoritySocialCategory(all: Record<CountryKey, YearData[]>, country: CountryKey, year: number): { category?: string; totalWeight: number; partyName?: string; percentage?: number } {
  const arr = all[country];
  if (!arr || arr.length === 0) return { category: undefined, totalWeight: 0 };
  // choose most recent election year <= target
  const yd = [...arr].reverse().find(d => d.year <= year) || arr[0];
  
  // Find the party with the most votes
  let winningParty: { name: string; votes: number; category?: string } | undefined;
  let totalVotes = 0;
  
  for (const p of yd.parties) {
    const votes = p.votes || 0;
    totalVotes += votes;
    if (votes === 0) continue;
    
    if (!winningParty || votes > winningParty.votes) {
      winningParty = {
        name: p.englishName || p.acronym,
        votes,
        category: p.socialCategory
      };
    }
  }
  
  if (!winningParty) return { category: undefined, totalWeight: 0 };
  
  const percentage = totalVotes > 0 ? (winningParty.votes / totalVotes) * 100 : 0;
  
  return { 
    category: winningParty.category, 
    totalWeight: winningParty.votes,
    partyName: winningParty.name,
    percentage
  };
}
