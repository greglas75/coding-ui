export class ValidationError extends Error {
  field: string;

  constructor(message: string, field: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export function validateAnswerId(id: unknown): number {
  const parsed = typeof id === 'string' ? parseInt(id, 10) : (id as number);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError('Answer ID must be a positive integer', 'answerId');
  }

  return parsed;
}

export function validateCategoryId(id: unknown): number {
  const parsed = typeof id === 'string' ? parseInt(id, 10) : (id as number);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError('Category ID must be a positive integer', 'categoryId');
  }

  return parsed;
}

export function validateFilterValue(
  value: unknown,
  type: 'search' | 'status' | 'codes'
): string | string[] {
  switch (type) {
    case 'search':
      if (typeof value !== 'string') {
        throw new ValidationError('Search value must be a string', 'search');
      }
      if (value.includes("'") || value.includes('"') || value.includes(';')) {
        throw new ValidationError('Invalid characters in search', 'search');
      }
      if (value.length > 500) {
        throw new ValidationError('Search query too long (max 500 chars)', 'search');
      }
      return value.trim();

    case 'status': {
      if (!Array.isArray(value)) {
        throw new ValidationError('Status filter must be an array', 'status');
      }
      const validStatuses = [
        'uncategorized',
        'whitelist',
        'blacklist',
        'categorized',
        'global_blacklist',
        'ignored',
        'other',
        'gibberish',
      ];
      const invalid = value.filter(v => !validStatuses.includes(v));
      if (invalid.length > 0) {
        throw new ValidationError(`Invalid status values: ${invalid.join(', ')}`, 'status');
      }
      return value;
    }

    case 'codes':
      if (!Array.isArray(value)) {
        throw new ValidationError('Codes filter must be an array', 'codes');
      }
      value.forEach(code => {
        if (typeof code !== 'string' || code.length === 0) {
          throw new ValidationError('Invalid code name', 'codes');
        }
        if (code.length > 200) {
          throw new ValidationError('Code name too long (max 200 chars)', 'codes');
        }
      });
      return value;

    default:
      return value;
  }
}
