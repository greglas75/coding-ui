export const CANONICAL_STATUS = {
  UNCATEGORIZED: 'uncategorized',
  WHITELIST: 'whitelist',
  BLACKLIST: 'blacklist',
  CATEGORIZED: 'categorized',
  GLOBAL_BLACKLIST: 'global_blacklist',
  IGNORED: 'ignored',
  OTHER: 'other',
} as const;

export type CanonicalStatus = typeof CANONICAL_STATUS[keyof typeof CANONICAL_STATUS];

const STATUS_MAP: Record<CanonicalStatus, string> = {
  [CANONICAL_STATUS.UNCATEGORIZED]: 'Not Categorized',
  [CANONICAL_STATUS.WHITELIST]: 'Whitelist',
  [CANONICAL_STATUS.BLACKLIST]: 'Blacklist',
  [CANONICAL_STATUS.CATEGORIZED]: 'Categorized',
  [CANONICAL_STATUS.GLOBAL_BLACKLIST]: 'Global Blacklist',
  [CANONICAL_STATUS.IGNORED]: 'Ignored',
  [CANONICAL_STATUS.OTHER]: 'Other',
};

const NORMALIZATION_MAP: Record<string, CanonicalStatus> = {
  'not categorized': CANONICAL_STATUS.UNCATEGORIZED,
  'uncategorized': CANONICAL_STATUS.UNCATEGORIZED,
  'whitelist': CANONICAL_STATUS.WHITELIST,
  'blacklist': CANONICAL_STATUS.BLACKLIST,
  'global blacklist': CANONICAL_STATUS.GLOBAL_BLACKLIST,
  'global_blacklist': CANONICAL_STATUS.GLOBAL_BLACKLIST,
  'ignored': CANONICAL_STATUS.IGNORED,
  'ignore': CANONICAL_STATUS.IGNORED,  // quick_status uses 'Ignore'
  'other': CANONICAL_STATUS.OTHER,
  'confirmed': CANONICAL_STATUS.WHITELIST,
  'categorized': CANONICAL_STATUS.CATEGORIZED,
};

export function normalizeStatus(status: string | null | undefined): CanonicalStatus {
  if (!status) return CANONICAL_STATUS.UNCATEGORIZED;
  const normalized = status.toLowerCase().replace(/_/g, ' ');
  const canonical = NORMALIZATION_MAP[normalized];
  if (canonical) return canonical;
  if (Object.values(CANONICAL_STATUS).includes(status as CanonicalStatus)) {
    return status as CanonicalStatus;
  }
  console.warn(`Unknown status for normalization: ${status}`);
  return CANONICAL_STATUS.OTHER;
}

export function normalizeStatuses(statuses: string[]): CanonicalStatus[] {
  return statuses.map(s => normalizeStatus(s));
}

export function getStatusLabel(canonicalStatus: CanonicalStatus): string {
  return STATUS_MAP[canonicalStatus] || canonicalStatus;
}

