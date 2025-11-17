/**
 * Hook for managing code suggestions using CodeSuggestionEngine
 * Handles initialization, loading, and state management
 */

import { useEffect, useState } from 'react';
import { CodeSuggestionEngine, type CodeSuggestion } from '../lib/codeSuggestionEngine';
import { simpleLogger } from '../utils/logger';

export function useCodeSuggestions(
  categoryId?: number,
  answerText?: string,
  enabled: boolean = true
) {
  const [engine] = useState(() => CodeSuggestionEngine.create());
  const [suggestions, setSuggestions] = useState<CodeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !categoryId || !answerText) {
      setSuggestions([]);
      return;
    }

    const loadSuggestions = async () => {
      setLoading(true);
      try {
        // Initialize engine with category
        await engine.initialize(categoryId);

        // Get suggestions for answer
        const results = await engine.getSuggestions(answerText);

        simpleLogger.info('💡 Code suggestions loaded:', results.length);
        setSuggestions(results);
      } catch (error) {
        simpleLogger.error('❌ Error loading code suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    loadSuggestions();
  }, [categoryId, answerText, enabled, engine]);

  return {
    suggestions,
    loading,
    engine,
  };
}

