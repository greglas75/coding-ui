import * as XLSX from 'xlsx';
import { getSupabaseClient } from './supabase';
import { simpleLogger } from '../utils/logger';

const supabase = getSupabaseClient();

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}

export class ImportEngine {
  async importCodes(
    file: File,
    strategy: 'merge' | 'replace',
    categoryId?: number
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    try {
      simpleLogger.info(`📥 Starting import with strategy: ${strategy}`);

      // Read file
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);

      // Get first sheet (or "Codes" sheet if exists)
      let sheet = workbook.Sheets['Codes'] || workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet);

      simpleLogger.info(`📄 Read ${data.length} rows from file`);

      if (data.length === 0) {
        result.errors.push({ row: 0, error: 'File is empty or has no data' });
        return result;
      }

      // If replace strategy, delete existing codes for category
      if (strategy === 'replace' && categoryId) {
        simpleLogger.info(`🗑️  Deleting existing codes for category ${categoryId}`);

        // Get code IDs from codes_categories
        const { data: codeCategories } = await supabase
          .from('codes_categories')
          .select('code_id')
          .eq('category_id', categoryId);

        if (codeCategories && codeCategories.length > 0) {
          const codeIds = codeCategories.map(cc => cc.code_id);

          // Delete from codes_categories first
          await supabase
            .from('codes_categories')
            .delete()
            .eq('category_id', categoryId);

          // Then delete codes (if not used by other categories)
          for (const codeId of codeIds) {
            const { data: otherUsage } = await supabase
              .from('codes_categories')
              .select('id')
              .eq('code_id', codeId)
              .limit(1);

            if (!otherUsage || otherUsage.length === 0) {
              await supabase
                .from('codes')
                .delete()
                .eq('id', codeId);
            }
          }

          simpleLogger.info(`✅ Deleted ${codeIds.length} codes`);
        }
      }

      // Import each row
      for (let i = 0; i < data.length; i++) {
        const row: any = data[i];

        try {
          // Validation - check for Name field (case insensitive)
          const nameField = row.Name || row.name || row.NAME || row['Code Name'] || row['code name'];

          if (!nameField || !nameField.toString().trim()) {
            result.errors.push({
              row: i + 2, // +2 because Excel is 1-indexed and has header
              error: 'Name is required'
            });
            result.failed++;
            continue;
          }

          const codeName = nameField.toString().trim();

          // Check if code exists (by name)
          const { data: existingCode } = await supabase
            .from('codes')
            .select('id')
            .eq('name', codeName)
            .limit(1)
            .single();

          if (existingCode && strategy === 'merge') {
            // Check if already linked to category
            if (categoryId) {
              const { data: existingLink } = await supabase
                .from('codes_categories')
                .select('id')
                .eq('code_id', existingCode.id)
                .eq('category_id', categoryId)
                .limit(1)
                .single();

              if (existingLink) {
                simpleLogger.info(`⏭️  Skipping existing code: ${codeName}`);
                result.skipped++;
                continue; // Skip existing
              } else {
                // Code exists but not linked to this category - link it
                await supabase
                  .from('codes_categories')
                  .insert({
                    code_id: existingCode.id,
                    category_id: categoryId
                  });

                simpleLogger.info(`🔗 Linked existing code to category: ${codeName}`);
                result.imported++;
                continue;
              }
            } else {
              result.skipped++;
              continue;
            }
          }

          // Insert new code
          const { data: newCode, error: insertError } = await supabase
            .from('codes')
            .insert({
              name: codeName
            })
            .select('id')
            .single();

          if (insertError) throw insertError;

          // Link to category if provided
          if (categoryId && newCode) {
            const { error: linkError } = await supabase
              .from('codes_categories')
              .insert({
                code_id: newCode.id,
                category_id: categoryId
              });

            if (linkError) throw linkError;
          }

          simpleLogger.info(`✅ Imported code: ${codeName}`);
          result.imported++;
        } catch (error: any) {
          simpleLogger.error(`❌ Error importing row ${i + 2}:`, error);
          result.errors.push({
            row: i + 2,
            error: error.message || 'Unknown error'
          });
          result.failed++;
        }
      }

      result.success = result.imported > 0;
      simpleLogger.info(`📊 Import complete: ${result.imported} imported, ${result.failed} failed, ${result.skipped} skipped`);

      return result;
    } catch (error: any) {
      simpleLogger.error('❌ Import failed:', error);
      return {
        ...result,
        success: false,
        errors: [{ row: 0, error: `File error: ${error.message}` }]
      };
    }
  }

  /**
   * Validate import file structure
   */
  async validateFile(file: File): Promise<{ valid: boolean; error?: string }> {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);

      if (workbook.SheetNames.length === 0) {
        return { valid: false, error: 'File has no sheets' };
      }

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet);

      if (data.length === 0) {
        return { valid: false, error: 'File has no data rows' };
      }

      // Check if first row has Name field
      const firstRow: any = data[0];
      const hasName = 'Name' in firstRow || 'name' in firstRow || 'NAME' in firstRow;

      if (!hasName) {
        return { valid: false, error: 'File must have a "Name" column' };
      }

      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }
}
