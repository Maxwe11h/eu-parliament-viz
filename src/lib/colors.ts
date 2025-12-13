export type PaletteOrientation = 'american' | 'european';

// Deterministic color assignment for parties based on Econ/Social categories or acronym hash
const americanPalette: Record<string,string> = {
  // Left is BLUE family
  'Far Left': '#0d47a1',     // dark blue
  'Left': '#1e88e5',         // blue
  'Centre-Left': '#64b5f6',  // light blue
  // Centre remains yellow/gold
  'Centre': '#fbc02d',
  // Right is RED family
  'Centre-Right': '#ff6f60', // light red
  'Right': '#e53935',        // red
  'Far Right': '#b80000'     // dark red
};

// European convention: right-leaning parties are blue, left-leaning are red
const europeanPalette: Record<string,string> = {
  'Far Left': americanPalette['Far Right'],
  'Left': americanPalette['Right'],
  'Centre-Left': americanPalette['Centre-Right'],
  'Centre': americanPalette['Centre'],
  'Centre-Right': americanPalette['Centre-Left'],
  'Right': americanPalette['Left'],
  'Far Right': americanPalette['Far Left']
};

export function getCategoryPalette(orientation: PaletteOrientation = 'american') {
  return orientation === 'european' ? europeanPalette : americanPalette;
}

export function colorFromCategories(econ?: string, social?: string, fallbackKey?: string): string {
  const tryKeys = [social, econ].filter(Boolean) as string[];
  for (const k of tryKeys) if (americanPalette[k]) return americanPalette[k];
  if (fallbackKey) {
    let hash = 0;
    for (let i=0;i<fallbackKey.length;i++) hash = (hash * 31 + fallbackKey.charCodeAt(i)) >>> 0;
    const h = hash % 360;
    return `hsl(${h} 60% 55%)`;
  }
  return '#888888';
}

// Default export preserves existing imports; value may be overridden via getCategoryPalette + context
export const categoryPalette = americanPalette;
