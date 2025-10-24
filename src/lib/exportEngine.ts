import * as XLSX from 'xlsx';
import { getSupabaseClient } from './supabase';
import { simpleLogger } from '../utils/logger';

const supabase = getSupabaseClient();

export type ExportFormat = 'excel' | 'csv' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  includeCodes: boolean;
  includeCategories: boolean;
  includeAnswers: boolean;
  includeCodedAnswers: boolean;
  categoryId?: number;
}

export class ExportEngine {
  async export(options: ExportOptions) {
    const data: any = {};

    simpleLogger.info('📦 Starting export with options:', options);

    try {
      // Export Categories
      if (options.includeCategories) {
        const { data: categories, error } = await supabase
          .from('categories')
          .select('*')
          .order('name');

        if (error) throw error;
        data.categories = categories || [];
        simpleLogger.info(`✅ Exported ${data.categories.length} categories`);
      }

      // Export Codes
      if (options.includeCodes) {
        let query = supabase
          .from('codes')
          .select('id, name, category_id, created_at');

        if (options.categoryId) {
          // Get codes for specific category via codes_categories
          const { data: codeCategories, error: ccError } = await supabase
            .from('codes_categories')
            .select('code_id, codes(id, name, created_at)')
            .eq('category_id', options.categoryId);

          if (ccError) throw ccError;

          const codes = codeCategories
            ?.map(cc => cc.codes)
            .filter(Boolean)
            .flat() as any[];

          data.codes = codes || [];
        } else {
          const { data: codes, error } = await query;
          if (error) throw error;
          data.codes = codes || [];
        }

        simpleLogger.info(`✅ Exported ${data.codes.length} codes`);
      }

      // Export Answers
      if (options.includeAnswers) {
        let query = supabase
          .from('answers')
          .select('id, answer_text, translation_en, category_id, general_status, selected_code, coding_date, created_at');

        if (options.categoryId) {
          query = query.eq('category_id', options.categoryId);
        }

        const { data: answers, error } = await query.limit(1000);
        if (error) throw error;
        data.answers = answers || [];
        simpleLogger.info(`✅ Exported ${data.answers.length} answers`);
      }

      // Export Coded Answers (answer-code relationships)
      if (options.includeCodedAnswers) {
        let query = supabase
          .from('answers')
          .select('id, answer_text, selected_code, category_id, coding_date')
          .not('selected_code', 'is', null);

        if (options.categoryId) {
          query = query.eq('category_id', options.categoryId);
        }

        const { data: codedAnswers, error } = await query.limit(1000);
        if (error) throw error;
        data.codedAnswers = codedAnswers || [];
        simpleLogger.info(`✅ Exported ${data.codedAnswers.length} coded answers`);
      }

      // Generate file based on format
      switch (options.format) {
        case 'excel':
          return this.generateExcel(data);
        case 'csv':
          return this.generateCSV(data);
        case 'json':
          return this.generateJSON(data);
      }
    } catch (error) {
      simpleLogger.error('❌ Export error:', error);
      throw error;
    }
  }

  private generateExcel(data: any) {
    const workbook = XLSX.utils.book_new();

    // Categories sheet
    if (data.categories && data.categories.length > 0) {
      const categoriesFormatted = data.categories.map((cat: any) => ({
        ID: cat.id,
        Name: cat.name,
        Description: cat.description || '',
        'Created At': new Date(cat.created_at).toLocaleString()
      }));
      const ws = XLSX.utils.json_to_sheet(categoriesFormatted);
      XLSX.utils.book_append_sheet(workbook, ws, 'Categories');
    }

    // Codes sheet
    if (data.codes && data.codes.length > 0) {
      const codesFormatted = data.codes.map((code: any) => ({
        ID: code.id,
        Name: code.name,
        'Category ID': code.category_id || '',
        'Created At': new Date(code.created_at).toLocaleString()
      }));
      const ws = XLSX.utils.json_to_sheet(codesFormatted);
      XLSX.utils.book_append_sheet(workbook, ws, 'Codes');
    }

    // Answers sheet
    if (data.answers && data.answers.length > 0) {
      const answersFormatted = data.answers.map((answer: any) => ({
        ID: answer.id,
        'Answer Text': answer.answer_text,
        'Translation': answer.translation_en || '',
        'Category ID': answer.category_id,
        'General Status': answer.general_status,
        'Selected Code': answer.selected_code || '',
        'Coding Date': answer.coding_date ? new Date(answer.coding_date).toLocaleString() : '',
        'Created At': new Date(answer.created_at).toLocaleString()
      }));
      const ws = XLSX.utils.json_to_sheet(answersFormatted);
      XLSX.utils.book_append_sheet(workbook, ws, 'Answers');
    }

    // Coded Answers sheet
    if (data.codedAnswers && data.codedAnswers.length > 0) {
      const formatted = data.codedAnswers.map((answer: any) => ({
        'Answer ID': answer.id,
        'Answer Text': answer.answer_text?.substring(0, 100) + (answer.answer_text?.length > 100 ? '...' : ''),
        'Selected Code': answer.selected_code,
        'Category ID': answer.category_id,
        'Coding Date': answer.coding_date ? new Date(answer.coding_date).toLocaleString() : ''
      }));
      const ws = XLSX.utils.json_to_sheet(formatted);
      XLSX.utils.book_append_sheet(workbook, ws, 'Coded Answers');
    }

    // Generate file
    const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `coding-export-${timestamp}.xlsx`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    simpleLogger.info(`✅ Excel export complete: ${filename}`);
    return { success: true, filename };
  }

  private generateCSV(data: any) {
    // For CSV, we'll export codes only (most common use case)
    if (!data.codes || data.codes.length === 0) {
      throw new Error('No codes to export');
    }

    const codesFormatted = data.codes.map((code: any) => ({
      Name: code.name,
      'Category ID': code.category_id || '',
      ID: code.id,
      'Created At': new Date(code.created_at).toLocaleString()
    }));

    const ws = XLSX.utils.json_to_sheet(codesFormatted);
    const csv = XLSX.utils.sheet_to_csv(ws);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `codes-export-${timestamp}.csv`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    simpleLogger.info(`✅ CSV export complete: ${filename}`);
    return { success: true, filename };
  }

  private generateJSON(data: any) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `coding-export-${timestamp}.json`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    simpleLogger.info(`✅ JSON export complete: ${filename}`);
    return { success: true, filename };
  }
}
