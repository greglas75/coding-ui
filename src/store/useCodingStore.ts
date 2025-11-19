// ═══════════════════════════════════════════════════════════════
// 🎯 Coding Store - Global state management for coding/categorization
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Answer } from '../schemas/answerSchema';
import type { Category } from '../schemas/categorySchema';
import type { Code } from '../schemas/codeSchema';
import { simpleLogger } from '../utils/logger';

// ───────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────

interface CodingState {
  // Data
  answers: Answer[];
  codes: Code[];
  categories: Category[];
  currentCategory: Category | null;
  selectedAnswer: Answer | null;

  // Filters
  filters: {
    search: string;
    status: string[];
    codes: string[];
    language: string;
    country: string;
    minLength: number;
    maxLength: number;
  };

  // Loading states
  isLoadingAnswers: boolean;
  isLoadingCodes: boolean;
  isLoadingCategories: boolean;
  isSaving: boolean;
  isCategorizing: boolean;

  // Error states
  error: string | null;

  // Statistics
  stats: {
    totalAnswers: number;
    categorized: number;
    uncategorized: number;
    whitelisted: number;
    blacklisted: number;
  };

  // Actions
  fetchAnswers: (categoryId?: number) => Promise<void>;
  fetchCodes: (categoryId?: number) => Promise<void>;
  fetchCategories: () => Promise<void>;
  setCurrentCategory: (category: Category | null) => void;
  setSelectedAnswer: (answer: Answer | null) => void;

  // Coding actions
  assignCode: (answerId: number, codeId: number) => Promise<void>;
  assignCodes: (answerId: number, codeIds: number[]) => Promise<void>;
  updateAnswerStatus: (answerId: number, status: string) => Promise<void>;
  categorizeAnswer: (answerId: number) => Promise<void>;

  // Batch actions
  batchAssignCode: (answerIds: number[], codeId: number) => Promise<void>;
  batchUpdateStatus: (answerIds: number[], status: string) => Promise<void>;

  // Filters
  setFilter: (key: string, value: unknown) => void;
  resetFilters: () => void;

  // Utility
  clearError: () => void;
  refreshStats: () => void;
}

const DEFAULT_FILTERS = {
  search: '',
  status: [],
  codes: [],
  language: '',
  country: '',
  minLength: 0,
  maxLength: 0,
};

// ───────────────────────────────────────────────────────────────
// Store
// ───────────────────────────────────────────────────────────────

export const useCodingStore = create<CodingState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        answers: [],
        codes: [],
        categories: [],
        currentCategory: null,
        selectedAnswer: null,
        filters: DEFAULT_FILTERS,
        isLoadingAnswers: false,
        isLoadingCodes: false,
        isLoadingCategories: false,
        isSaving: false,
        isCategorizing: false,
        error: null,
        stats: {
          totalAnswers: 0,
          categorized: 0,
          uncategorized: 0,
          whitelisted: 0,
          blacklisted: 0,
        },

        // Fetch answers
        fetchAnswers: async (_categoryId) => {
          set({ isLoadingAnswers: true, error: null }, false, 'coding/fetchAnswers');

          try {
            // TODO: Replace with actual API call using apiClient + Zod validation
            // const response = await apiClient.post<Answer[]>('/api/answers/filter', {
            //   categoryId: _categoryId,
            //   ...get().filters
            // }, {
            //   schema: z.array(AnswerSchema)
            // });

            const answers: Answer[] = [];

            set({
              answers,
              isLoadingAnswers: false
            }, false, 'coding/fetchAnswers/success');

            get().refreshStats();
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch answers';
            set({
              error: errorMessage,
              isLoadingAnswers: false
            }, false, 'coding/fetchAnswers/error');
            simpleLogger.error('❌ Failed to fetch answers:', error);
          }
        },

        // Fetch codes
        fetchCodes: async (_categoryId) => {
          set({ isLoadingCodes: true, error: null }, false, 'coding/fetchCodes');

          try {
            // TODO: Replace with actual API call
            // const response = await apiClient.get<Code[]>('/api/codes', {
            //   params: { categoryId: _categoryId },
            //   schema: z.array(CodeSchema)
            // });

            const codes: Code[] = [];

            set({
              codes,
              isLoadingCodes: false
            }, false, 'coding/fetchCodes/success');
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch codes';
            set({
              error: errorMessage,
              isLoadingCodes: false
            }, false, 'coding/fetchCodes/error');
            simpleLogger.error('❌ Failed to fetch codes:', error);
          }
        },

        // Fetch categories
        fetchCategories: async () => {
          set({ isLoadingCategories: true, error: null }, false, 'coding/fetchCategories');

          try {
            // TODO: Replace with actual API call
            // const response = await apiClient.get<Category[]>('/api/categories', {
            //   schema: z.array(CategorySchema)
            // });

            const categories: Category[] = [];

            set({
              categories,
              isLoadingCategories: false
            }, false, 'coding/fetchCategories/success');
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch categories';
            set({
              error: errorMessage,
              isLoadingCategories: false
            }, false, 'coding/fetchCategories/error');
            simpleLogger.error('❌ Failed to fetch categories:', error);
          }
        },

        // Set current category
        setCurrentCategory: (category) => {
          set({ currentCategory: category }, false, 'coding/setCurrentCategory');
          if (category) {
            get().fetchAnswers(category.id);
            get().fetchCodes(category.id);
          }
        },

        // Set selected answer
        setSelectedAnswer: (answer) => {
          set({ selectedAnswer: answer }, false, 'coding/setSelectedAnswer');
        },

        // Assign single code
        assignCode: async (answerId, codeId) => {
          set({ isSaving: true, error: null }, false, 'coding/assignCode');

          try {
            // TODO: Replace with actual API call
            // await apiClient.post(`/api/answers/${answerId}/codes`, { codeId });

            // Optimistic update
            set(state => ({
              answers: state.answers.map(a =>
                a.id === answerId
                  ? { ...a, selected_code: state.codes.find(c => c.id === codeId)?.name || null }
                  : a
              ),
              isSaving: false
            }), false, 'coding/assignCode/success');

            simpleLogger.info('✅ Code assigned:', { answerId, codeId });
            get().refreshStats();
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to assign code';
            set({
              error: errorMessage,
              isSaving: false
            }, false, 'coding/assignCode/error');
            simpleLogger.error('❌ Failed to assign code:', error);
          }
        },

        // Assign multiple codes
        assignCodes: async (answerId, codeIds) => {
          set({ isSaving: true, error: null }, false, 'coding/assignCodes');

          try {
            // TODO: Replace with actual API call
            // await apiClient.post(`/api/answers/${answerId}/codes/batch`, { codeIds });

            const codeNames = get().codes
              .filter(c => codeIds.includes(c.id))
              .map(c => c.name)
              .join(', ');

            set(state => ({
              answers: state.answers.map(a =>
                a.id === answerId
                  ? { ...a, selected_code: codeNames }
                  : a
              ),
              isSaving: false
            }), false, 'coding/assignCodes/success');

            simpleLogger.info('✅ Codes assigned:', { answerId, codeIds });
            get().refreshStats();
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to assign codes';
            set({
              error: errorMessage,
              isSaving: false
            }, false, 'coding/assignCodes/error');
            simpleLogger.error('❌ Failed to assign codes:', error);
          }
        },

        // Update answer status
        updateAnswerStatus: async (answerId, status) => {
          set({ isSaving: true, error: null }, false, 'coding/updateAnswerStatus');

          try {
            // TODO: Replace with actual API call
            // await apiClient.patch(`/api/answers/${answerId}`, { general_status: status });

            set(state => ({
              answers: state.answers.map(a =>
                a.id === answerId
                  ? { ...a, general_status: status }
                  : a
              ),
              isSaving: false
            }), false, 'coding/updateAnswerStatus/success');

            simpleLogger.info('✅ Status updated:', { answerId, status });
            get().refreshStats();
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update status';
            set({
              error: errorMessage,
              isSaving: false
            }, false, 'coding/updateAnswerStatus/error');
            simpleLogger.error('❌ Failed to update status:', error);
          }
        },

        // Categorize answer with AI
        categorizeAnswer: async (answerId) => {
          set({ isCategorizing: true, error: null }, false, 'coding/categorizeAnswer');

          try {
            // TODO: Replace with actual API call
            // const response = await apiClient.post<Answer>(`/api/answers/${answerId}/categorize`);

            simpleLogger.info('✅ Answer categorized:', answerId);

            set({ isCategorizing: false }, false, 'coding/categorizeAnswer/success');
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to categorize answer';
            set({
              error: errorMessage,
              isCategorizing: false
            }, false, 'coding/categorizeAnswer/error');
            simpleLogger.error('❌ Failed to categorize answer:', error);
          }
        },

        // Batch assign code
        batchAssignCode: async (answerIds, codeId) => {
          set({ isSaving: true, error: null }, false, 'coding/batchAssignCode');

          try {
            // TODO: Replace with actual API call
            // await apiClient.post('/api/answers/batch/assign-code', { answerIds, codeId });

            const codeName = get().codes.find(c => c.id === codeId)?.name || null;

            set(state => ({
              answers: state.answers.map(a =>
                answerIds.includes(a.id)
                  ? { ...a, selected_code: codeName }
                  : a
              ),
              isSaving: false
            }), false, 'coding/batchAssignCode/success');

            simpleLogger.info('✅ Batch code assigned:', { answerIds, codeId });
            get().refreshStats();
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to batch assign code';
            set({
              error: errorMessage,
              isSaving: false
            }, false, 'coding/batchAssignCode/error');
            simpleLogger.error('❌ Failed to batch assign code:', error);
          }
        },

        // Batch update status
        batchUpdateStatus: async (answerIds, status) => {
          set({ isSaving: true, error: null }, false, 'coding/batchUpdateStatus');

          try {
            // TODO: Replace with actual API call
            // await apiClient.post('/api/answers/batch/update-status', { answerIds, status });

            set(state => ({
              answers: state.answers.map(a =>
                answerIds.includes(a.id)
                  ? { ...a, general_status: status }
                  : a
              ),
              isSaving: false
            }), false, 'coding/batchUpdateStatus/success');

            simpleLogger.info('✅ Batch status updated:', { answerIds, status });
            get().refreshStats();
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to batch update status';
            set({
              error: errorMessage,
              isSaving: false
            }, false, 'coding/batchUpdateStatus/error');
            simpleLogger.error('❌ Failed to batch update status:', error);
          }
        },

        // Set filter
        setFilter: (key, value) => {
          set(state => ({
            filters: {
              ...state.filters,
              [key]: value
            }
          }), false, 'coding/setFilter');
        },

        // Reset filters
        resetFilters: () => {
          set({ filters: DEFAULT_FILTERS }, false, 'coding/resetFilters');
        },

        // Clear error
        clearError: () => {
          set({ error: null }, false, 'coding/clearError');
        },

        // Refresh statistics
        refreshStats: () => {
          const answers = get().answers;
          const stats = {
            totalAnswers: answers.length,
            categorized: answers.filter(a => a.general_status === 'categorized').length,
            uncategorized: answers.filter(a => a.general_status === 'uncategorized').length,
            whitelisted: answers.filter(a => a.general_status === 'whitelist').length,
            blacklisted: answers.filter(a => a.general_status === 'blacklist').length,
          };
          set({ stats }, false, 'coding/refreshStats');
        },
      }),
      {
        name: 'coding-storage',
        partialize: (state) => ({
          currentCategory: state.currentCategory,
          filters: state.filters,
          // Don't persist answers, codes, loading/error states
        }),
      }
    ),
    { name: 'CodingStore' }
  )
);

// ───────────────────────────────────────────────────────────────
// Selectors (for optimized component re-renders)
// ───────────────────────────────────────────────────────────────

export const selectAnswers = (state: CodingState) => state.answers;
export const selectCodes = (state: CodingState) => state.codes;
export const selectCodingCategories = (state: CodingState) => state.categories;
export const selectCodingCurrentCategory = (state: CodingState) => state.currentCategory;
export const selectSelectedAnswer = (state: CodingState) => state.selectedAnswer;
export const selectCodingFilters = (state: CodingState) => state.filters;
export const selectCodingStats = (state: CodingState) => state.stats;
export const selectCodingIsLoading = (state: CodingState) =>
  state.isLoadingAnswers || state.isLoadingCodes || state.isLoadingCategories;

