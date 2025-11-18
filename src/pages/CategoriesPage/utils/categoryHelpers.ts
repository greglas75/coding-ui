/**
 * Category Helper Functions
 */

/**
 * Navigate to coding view with filter
 */
export function navigateToCodingWithFilter(categoryId: number, filterType: string) {
  const statusMap: Record<string, string> = {
    whitelisted: 'whitelist',
    blacklisted: 'blacklist',
    gibberish: 'gibberish',
    categorized: 'categorized',
    notCategorized: 'uncategorized',
    global_blacklist: 'global_blacklist',
  };

  const status = statusMap[filterType] || filterType;
  window.open(`/coding?categoryId=${categoryId}&filter=${status}`, '_blank');
}

/**
 * Navigate to coding view showing all answers (no filters)
 */
export function navigateToCoding(categoryId: number) {
  window.open(`/coding?categoryId=${categoryId}`, '_blank');
}

