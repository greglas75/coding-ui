/**
 * Code Actions Hook (Save, Reset, Toggle, Apply)
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { CodeSuggestionEngine } from '../../../lib/codeSuggestionEngine';
import { supabase } from '../../../lib/supabase';
import { simpleLogger } from '../../../utils/logger';

interface UseCodeActionsProps {
  selectedAnswerIds: number[];
  onSaved: (closeModal?: boolean) => void;
  categoryId?: number;
}

export function useCodeActions({ selectedAnswerIds, onSaved, categoryId }: UseCodeActionsProps) {
  const [isResetting, setIsResetting] = useState(false);
  const [suggestionEngine] = useState(() => CodeSuggestionEngine.create());

  const handleResetCodes = () => {
    setIsResetting(true);
    setTimeout(() => setIsResetting(false), 300);
  };

  const handleToggleCode = (codeName: string, selectedCodes: string[], setSelectedCodes: (codes: string[]) => void) => {
    setSelectedCodes(
      selectedCodes.includes(codeName)
        ? selectedCodes.filter(c => c !== codeName)
        : [...selectedCodes, codeName]
    );
  };

  const handleApplySuggestion = async (
    codeId: number,
    codeName: string,
    selectedCodes: string[],
    setSelectedCodes: (codes: string[]) => void
  ) => {
    simpleLogger.info(`✨ Applying suggestion: ${codeName} (ID: ${codeId})`);

    if (!selectedCodes.includes(codeName)) {
      setSelectedCodes([...selectedCodes, codeName]);
    }

    await suggestionEngine.learnFromAction(codeId);
    toast.success(`Applied: ${codeName}`);
  };

  // Helper: Copy codes to all identical answers in the same category
  async function copyCodeToIdenticalAnswers(
    sourceIds: number[],
    codesToCopy: string[],
    categoryId?: number
  ) {
    try {
      const { data: sourceAnswers, error: fetchError } = await supabase
        .from('answers')
        .select('id, answer_text, category_id')
        .in('id', sourceIds);

      if (fetchError || !sourceAnswers || sourceAnswers.length === 0) {
        return;
      }

      const { data: codeData } = await supabase
        .from('codes')
        .select('id, name')
        .in('name', codesToCopy);

      if (!codeData || codeData.length === 0) return;

      const codeIds = codeData.map(c => c.id);
      const selectedCodeString = codeData.map(c => c.name).join(', ');

      for (const source of sourceAnswers) {
        const targetCategoryId = categoryId || source.category_id;

        const { data: duplicates, error: dupError } = await supabase
          .from('answers')
          .select('id')
          .eq('category_id', targetCategoryId)
          .eq('answer_text', source.answer_text)
          .not('id', 'in', `(${sourceIds.join(',')})`)
          .is('selected_code', null);

        if (dupError || !duplicates || duplicates.length === 0) {
          continue;
        }

        const duplicateIds = duplicates.map(d => d.id);
        simpleLogger.info(
          `📋 Found ${duplicateIds.length} identical uncoded answers for "${source.answer_text}"`
        );

        await supabase.from('answer_codes').delete().in('answer_id', duplicateIds);

        const inserts = duplicateIds.flatMap(answerId =>
          codeIds.map(codeId => ({
            answer_id: answerId,
            code_id: codeId,
          }))
        );

        const { error: insertError } = await supabase.from('answer_codes').insert(inserts);

        if (insertError) {
          simpleLogger.error('Failed to insert codes for duplicates:', insertError);
          continue;
        }

        const { error: updateError } = await supabase
          .from('answers')
          .update({
            selected_code: selectedCodeString,
            general_status: 'whitelist',
            coding_date: new Date().toISOString(),
          })
          .in('id', duplicateIds);

        if (updateError) {
          simpleLogger.error('Failed to update duplicates:', updateError);
        } else {
          simpleLogger.info(`✅ Copied codes to ${duplicateIds.length} identical answers`);
        }
      }
    } catch (error) {
      simpleLogger.error('Error copying codes to identical answers:', error);
    }
  }

  const handleSave = async (selectedCodes: string[], setSelectedCodes: (codes: string[]) => void) => {
    try {
      // Delete existing codes for all selected answers
      const { error: deleteError } = await supabase
        .from('answer_codes')
        .delete()
        .in('answer_id', selectedAnswerIds);

      if (deleteError) throw deleteError;

      // Insert new codes if any selected
      if (selectedCodes.length > 0) {
        const { data: allCodes } = await supabase
          .from('codes')
          .select('id, name')
          .in('name', selectedCodes);

        if (allCodes && allCodes.length > 0) {
          // Insert codes for ALL selected answers
          const inserts = selectedAnswerIds.flatMap(answerId =>
            allCodes.map(code => ({
              answer_id: answerId,
              code_id: code.id,
            }))
          );

          const { error: insertError } = await supabase.from('answer_codes').insert(inserts);

          if (insertError) throw insertError;

          // Update selected_code column AND status in answers table
          const selectedCodeString = allCodes.map(c => c.name).join(', ');

          const { error: updateError } = await supabase
            .from('answers')
            .update({
              selected_code: selectedCodeString,
              general_status: 'whitelist',
              coding_date: new Date().toISOString(),
            })
            .in('id', selectedAnswerIds);

          if (updateError) throw updateError;
        }
      } else {
        // If no codes selected, clear the selected_code column and reset status
        const { error: clearError } = await supabase
          .from('answers')
          .update({
            selected_code: null,
            general_status: 'uncategorized',
            coding_date: null,
          })
          .in('id', selectedAnswerIds);

        if (clearError) throw clearError;
      }

      toast.success('Codes saved successfully!');
      onSaved();
    } catch (error) {
      simpleLogger.error('Save error:', error);
      toast.error('Failed to save codes');
    }
  };

  return {
    isResetting,
    handleResetCodes,
    handleToggleCode,
    handleApplySuggestion,
    handleSave,
  };
}

