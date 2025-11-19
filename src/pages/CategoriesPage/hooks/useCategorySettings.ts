/**
 * Hook for saving category settings
 */

import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import type { Category } from '../../../types';
import { simpleLogger } from '../../../utils/logger';
import type { CategoryWithStats } from '../types';

interface UseCategorySettingsProps {
  categories: CategoryWithStats[];
  setCategories: (categories: CategoryWithStats[]) => void;
  activeCategory: Category | null;
  setActiveCategory: (category: Category | null) => void;
}

export function useCategorySettings({
  categories,
  setCategories,
  activeCategory,
  setActiveCategory,
}: UseCategorySettingsProps) {
  interface CategoryFormData {
    name: string;
    googleName?: string;
    description?: string;
    template?: string;
    preset?: string;
    model?: string;
    visionModel?: string;
    [key: string]: unknown;
  }

  async function saveCategorySettings(
    editingCategory: Category,
    data: CategoryFormData,
    onSuccess?: () => void
  ) {
    try {
      // Build safe payload - remove empty fields to avoid 400 errors
      const updatePayload: Record<string, unknown> = {
        name: data.name,
      };

      // Optional fields - only add if present and valid
      if (data.googleName && data.googleName.trim()) {
        updatePayload.google_name = data.googleName;
      }

      if (data.description && data.description.trim()) {
        updatePayload.description = data.description;
      }

      // Template - only set if not empty
      if (data.template && data.template.trim()) {
        updatePayload.template = data.template;
      }

      // Preset - ensure it has a value
      if (data.preset) {
        updatePayload.preset = data.preset;
        updatePayload.llm_preset = data.preset;
      } else {
        updatePayload.preset = 'LLM Proper Name';
        updatePayload.llm_preset = 'LLM Proper Name';
      }

      // Unified model - auto-detect provider and save to correct column
      if (data.model) {
        const modelId = data.model;
        updatePayload.model = modelId;

        if (modelId.startsWith('gpt-') || modelId.startsWith('o1-')) {
          updatePayload.openai_model = modelId;
        } else if (modelId.startsWith('claude-')) {
          updatePayload.claude_model = modelId;
        } else if (modelId.startsWith('gemini-')) {
          updatePayload.gemini_model = modelId;
        }
      }

      // Vision model for image analysis
      if (data.visionModel) {
        updatePayload.vision_model = data.visionModel;
      }

      // Template - save to both old 'template' and new 'gpt_template'
      if (data.template && data.template.trim()) {
        updatePayload.gpt_template = data.template;
      }

      if (data.brandsSorting) {
        updatePayload.brands_sorting = data.brandsSorting;
      }

      if (data.minLength !== undefined && data.minLength !== null) {
        updatePayload.min_length = data.minLength;
      }

      if (data.maxLength !== undefined && data.maxLength !== null) {
        updatePayload.max_length = data.maxLength;
      }

      // Web context setting
      if (data.useWebContext !== undefined) {
        updatePayload.use_web_context = data.useWebContext;
      }

      // Sentiment analysis settings
      if (data.sentimentEnabled !== undefined) {
        updatePayload.sentiment_enabled = data.sentimentEnabled;
      }

      if (data.sentimentMode) {
        updatePayload.sentiment_mode = data.sentimentMode;
      }

      simpleLogger.info('📤 Saving category payload:', updatePayload);
      simpleLogger.info('🔍 Editing category ID:', editingCategory.id);

      const { data: updateResult, error } = await supabase
        .from('categories')
        .update(updatePayload)
        .eq('id', editingCategory.id)
        .select();

      if (error) {
        simpleLogger.error('❌ Supabase error:', error);
        toast.error(`Failed to update category: ${error.message}`);
        return;
      }

      simpleLogger.info('✅ Update successful:', updateResult);

      toast.success('✅ Category settings updated successfully');

      // Update local state with all changed fields
      setCategories(prev =>
        prev.map(cat =>
          cat.id === editingCategory.id
            ? {
                ...cat,
                name: data.name,
                google_name: data.googleName,
                description: data.description,
                template: data.template,
                gpt_template: data.template,
                preset: data.preset,
                llm_preset: data.preset,
                model: data.model,
                openai_model:
                  data.model?.startsWith('gpt-') || data.model?.startsWith('o1-')
                    ? data.model
                    : cat.openai_model,
                claude_model: data.model?.startsWith('claude-') ? data.model : cat.claude_model,
                gemini_model: data.model?.startsWith('gemini-') ? data.model : cat.gemini_model,
                vision_model: data.visionModel,
                use_web_context: data.useWebContext,
                sentiment_enabled: data.sentimentEnabled,
                sentiment_mode: data.sentimentMode,
                brands_sorting: data.brandsSorting,
                min_length: data.minLength,
                max_length: data.maxLength,
              }
            : cat
        )
      );

      // Update active category if it's the one being edited
      if (activeCategory?.id === editingCategory.id) {
        setActiveCategory(prev => (prev ? { ...prev, name: data.name } : null));
      }

      onSuccess?.();
    } catch (error) {
      simpleLogger.error('❌ Unexpected error saving category settings:', error);
      toast.error('Failed to save category settings');
    }
  }

  return { saveCategorySettings };
}

