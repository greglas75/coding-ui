/**
 * Whitelist Configuration
 * 
 * Known entities/brands for quick categorization.
 * This should eventually be moved to database for dynamic management.
 * 
 * TODO: Migrate to database table with admin UI for management
 */

export const DEFAULT_WHITELIST = [
  // Payment Methods
  'GCash',
  'Maya',
  'PayMaya',
  'PayPal',
  'Visa',
  'Mastercard',
  'American Express',
  'Amex',

  // E-commerce
  'Shopee',
  'Lazada',
  'Amazon',
  'eBay',
  'Alibaba',
  'Zalora',

  // Delivery/Transport
  'Grab',
  'Uber',
  'Lalamove',
  'FoodPanda',
  'GrabFood',

  // Telecom
  'Globe',
  'Smart',
  'PLDT',
  'Dito',

  // Social Media
  'Facebook',
  'Instagram',
  'Twitter',
  'X',
  'TikTok',
  'YouTube',

  // Brands (Toothpaste example)
  'Colgate',
  'Sensodyne',
  'Closeup',
  'Pepsodent',
  'Oral-B',

  // Common answers
  'Yes',
  'No',
  'None',
  'Other',
  'N/A',
  'Not applicable',
] as const;

/**
 * Type-safe whitelist item
 */
export type WhitelistItem = typeof DEFAULT_WHITELIST[number];

