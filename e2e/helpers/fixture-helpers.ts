import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the absolute path to a fixture file
 */
export function getFixturePath(filename: string): string {
  return path.join(__dirname, '../fixtures', filename);
}

/**
 * Get path to valid Excel file
 */
export function getValidExcelPath(): string {
  return getFixturePath('valid-codes.xlsx');
}

/**
 * Get path to valid CSV file
 */
export function getValidCsvPath(): string {
  return getFixturePath('valid-codes.csv');
}

/**
 * Get path to large dataset Excel file
 */
export function getLargeDatasetPath(): string {
  return getFixturePath('large-dataset.xlsx');
}

/**
 * Get path to malformed data Excel file
 */
export function getMalformedDataPath(): string {
  return getFixturePath('malformed-data.xlsx');
}

/**
 * Get path to empty Excel file
 */
export function getEmptyFilePath(): string {
  return getFixturePath('empty-file.xlsx');
}

/**
 * Get path to invalid file (text file)
 */
export function getInvalidFilePath(): string {
  return getFixturePath('invalid.txt');
}

/**
 * Get path to CSV with invalid encoding
 */
export function getInvalidEncodingCsvPath(): string {
  return getFixturePath('invalid-encoding.csv');
}

/**
 * Get path to API test data JSON
 */
export function getApiTestDataPath(): string {
  return getFixturePath('api-test-data.json');
}

/**
 * Load JSON fixture data
 */
export async function loadJsonFixture(filename: string): Promise<any> {
  const fs = await import('fs/promises');
  const filePath = getFixturePath(filename);
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Get test data from JSON fixture
 */
export async function getApiTestData(): Promise<any> {
  return await loadJsonFixture('api-test-data.json');
}

