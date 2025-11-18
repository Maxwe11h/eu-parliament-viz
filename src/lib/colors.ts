// Deterministic color assignment for parties based on Econ/Social categories or acronym hash
const palette: Record<string,string> = {
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

export function colorFromCategories(econ?: string, social?: string, fallbackKey?: string): string {
  const tryKeys = [social, econ].filter(Boolean) as string[];
  for (const k of tryKeys) if (palette[k]) return palette[k];
  if (fallbackKey) {
    let hash = 0;
    for (let i=0;i<fallbackKey.length;i++) hash = (hash * 31 + fallbackKey.charCodeAt(i)) >>> 0;
    const h = hash % 360;
    return `hsl(${h} 60% 55%)`;
  }
  return '#888888';
}

export const categoryPalette = palette;
