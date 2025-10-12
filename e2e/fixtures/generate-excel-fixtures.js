/**
 * Script to generate Excel fixture files for E2E tests
 * Run with: node e2e/fixtures/generate-excel-fixtures.js
 */

import ExcelJS from 'exceljs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateValidCodesExcel() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Codes');

  // Add headers
  worksheet.columns = [
    { header: 'code_name', key: 'code_name', width: 20 },
    { header: 'category', key: 'category', width: 20 },
    { header: 'is_whitelisted', key: 'is_whitelisted', width: 15 }
  ];

  // Add data rows
  const data = [
    { code_name: 'Nike', category: 'Sports Brands', is_whitelisted: true },
    { code_name: 'Adidas', category: 'Sports Brands', is_whitelisted: true },
    { code_name: 'Puma', category: 'Sports Brands', is_whitelisted: false },
    { code_name: 'Chanel', category: 'Fashion Brands', is_whitelisted: true },
    { code_name: 'Dior', category: 'Fashion Brands', is_whitelisted: true },
    { code_name: 'Gucci', category: 'Fashion Brands', is_whitelisted: false },
    { code_name: 'Apple', category: 'Tech Brands', is_whitelisted: true },
    { code_name: 'Samsung', category: 'Tech Brands', is_whitelisted: false },
    { code_name: 'Sony', category: 'Tech Brands', is_whitelisted: true },
    { code_name: 'Tesla', category: 'Automotive', is_whitelisted: true }
  ];

  worksheet.addRows(data);

  // Save file
  await workbook.xlsx.writeFile(join(__dirname, 'valid-codes.xlsx'));
  console.log('✅ Created valid-codes.xlsx');
}

async function generateLargeDatasetExcel() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Large Dataset');

  worksheet.columns = [
    { header: 'code_name', key: 'code_name', width: 20 },
    { header: 'category', key: 'category', width: 20 },
    { header: 'is_whitelisted', key: 'is_whitelisted', width: 15 }
  ];

  // Generate 1000 rows
  const categories = ['Tech', 'Fashion', 'Sports', 'Automotive', 'Food', 'Beauty', 'Home', 'Travel'];
  const data = [];

  for (let i = 1; i <= 1000; i++) {
    data.push({
      code_name: `Test Code ${i}`,
      category: categories[i % categories.length],
      is_whitelisted: i % 3 === 0
    });
  }

  worksheet.addRows(data);

  await workbook.xlsx.writeFile(join(__dirname, 'large-dataset.xlsx'));
  console.log('✅ Created large-dataset.xlsx (1000 rows)');
}

async function generateMalformedDataExcel() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Malformed');

  // Add headers with wrong column names
  worksheet.columns = [
    { header: 'wrong_column', key: 'wrong_column', width: 20 },
    { header: 'another_wrong', key: 'another_wrong', width: 20 },
    { header: 'invalid_type', key: 'invalid_type', width: 15 }
  ];

  // Add malformed data
  const data = [
    { wrong_column: 'Test', another_wrong: 123, invalid_type: 'not_boolean' },
    { wrong_column: null, another_wrong: undefined, invalid_type: 'string' },
    { wrong_column: '', another_wrong: '', invalid_type: '' }
  ];

  worksheet.addRows(data);

  await workbook.xlsx.writeFile(join(__dirname, 'malformed-data.xlsx'));
  console.log('✅ Created malformed-data.xlsx');
}

async function generateEmptyExcel() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Empty');

  // Add only headers, no data
  worksheet.columns = [
    { header: 'code_name', key: 'code_name', width: 20 },
    { header: 'category', key: 'category', width: 20 },
    { header: 'is_whitelisted', key: 'is_whitelisted', width: 15 }
  ];

  await workbook.xlsx.writeFile(join(__dirname, 'empty-file.xlsx'));
  console.log('✅ Created empty-file.xlsx');
}

// Run all generators
async function main() {
  console.log('🚀 Generating Excel fixture files...\n');

  try {
    await generateValidCodesExcel();
    await generateLargeDatasetExcel();
    await generateMalformedDataExcel();
    await generateEmptyExcel();

    console.log('\n✨ All Excel fixtures generated successfully!');
  } catch (error) {
    console.error('❌ Error generating fixtures:', error);
    process.exit(1);
  }
}

main();

