/**
 * Suggested category values per Jira object type (Keyboard, Mouse, etc.).
 * Actual values must exist in Jira if "Asset Category" is a Select field.
 * Free-text attributes accept any of these or custom values.
 */
export const ASSET_CATEGORY_SUGGESTIONS: Record<string, string[]> = {
  Keyboard: ['Wired Keyboard', 'Wireless Keyboard', 'Keyboard/Mouse Combo'],
  Mouse: ['Wired Mouse', 'Wireless Mouse'],
  Headset: ['Wired Headset', 'Wireless Headset', 'USB Headset'],
  Monitor: ['Standard Monitor', 'Portable Monitor', 'USB-C Monitor'],
  'Docking Station': ['Thunderbolt Dock', 'USB-C Dock', 'USB Dock'],
  Laptop: ['Standard Laptop', 'Ultrabook', 'Mobile Workstation'],
  Computer: ['Desktop', 'Mini PC', 'All-in-One', 'Laptop', 'Ultrabook'],
  Phones: ['Smartphone', 'Feature Phone'],
  Accessories: ['Hub', 'Adapter', 'Cable', 'Other'],
}

export function categorySuggestionsForType(objectTypeName: string): string[] {
  const direct = ASSET_CATEGORY_SUGGESTIONS[objectTypeName]
  if (direct?.length) return direct
  return ['Wired', 'Wireless', 'Other']
}

/** All suggested values (for bulk ops / datalists) */
export const ALL_CATEGORY_SUGGESTIONS: string[] = Array.from(
  new Set(Object.values(ASSET_CATEGORY_SUGGESTIONS).flat())
).sort((a, b) => a.localeCompare(b))
