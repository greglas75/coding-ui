import { RotateCcw, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CodeSuggestionEngine, type CodeSuggestion } from "../lib/codeSuggestionEngine";
import { supabase } from "../lib/supabase";
import type { Answer } from "../types";
import { QuickStatusButtons } from "./CodingGrid/cells/QuickStatusButtons";
import { Tooltip } from "./shared/Tooltip";

interface SelectCodeModalProps {
  open: boolean;
  onClose: () => void;
  selectedAnswerIds: number[];
  allAnswers: Answer[];          // ADD: full answer objects for navigation
  currentAnswerIndex: number;     // ADD: current position in the list
  preselectedCodes?: string[];
  onSaved: () => void;
  onNavigate: (newIndex: number) => void;  // ADD: callback for navigation
  mode: "overwrite" | "additional";
  categoryId?: number;
  selectedAnswer?: string;
  translation?: string;
  aiSuggestions?: {
    suggestions: Array<{
      code_id: string;
      code_name: string;
      confidence: number;
      reasoning: string;
    }>;
    timestamp?: string;
    model?: string;
  };
  onGenerateAISuggestions?: (answerId: number) => void;
}

export function SelectCodeModal({
  open,
  onClose,
  selectedAnswerIds,
  allAnswers,
  currentAnswerIndex,
  preselectedCodes = [],
  onSaved,
  onNavigate,
  mode: _mode,
  categoryId: _categoryId,
  selectedAnswer: _selectedAnswer,
  translation,
  aiSuggestions,
  onGenerateAISuggestions,
}: SelectCodeModalProps) {
  const [codes, setCodes] = useState<{ id: number; name: string }[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  // Code suggestions state
  const [suggestionEngine] = useState(() => CodeSuggestionEngine.create());
  const [suggestions, setSuggestions] = useState<CodeSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // 🔹 Reset state when modal opens with new answer
  useEffect(() => {
    if (open) {
      // Reset selected codes to preselected or empty
      setSelectedCodes(preselectedCodes);
      // Clear search term
      setSearchTerm("");
      console.log('🔄 SelectCodeModal reset: preselectedCodes =', preselectedCodes);
    }
  }, [open, selectedAnswerIds.join(','), preselectedCodes.join(',')]);

  // 🔹 Fetch codes (filtered by category if provided)
  useEffect(() => {
    if (!open) return;
    const fetchCodes = async () => {
      console.log('🔍 SelectCodeModal fetching codes with categoryId:', _categoryId);

      if (_categoryId) {
        // Filter by category using codes_categories table
        console.log('🔍 Filtering codes by category ID:', _categoryId);

        const { data, error } = await supabase
          .from('codes_categories')
          .select(`
            codes (
              id,
              name
            )
          `)
          .eq('category_id', _categoryId);

        if (!error && data) {
          const codes = data.map(item => item.codes).filter(Boolean).flat() as { id: number; name: string }[];
          console.log('🔍 Fetched codes for category:', codes.length, 'codes');
          console.log('🔍 Codes data:', codes);

          const sorted = codes.sort((a, b) => a.name.localeCompare(b.name));
          setCodes(sorted);
        } else {
          console.error('🔍 Error fetching codes for category:', error);
        }
      } else {
        // Show all codes if no category filter
        console.log('🔍 No category filter - showing all codes');

        const { data, error } = await supabase
          .from("codes")
          .select('id, name')
          .order('name');

        if (!error && data) {
          console.log('🔍 Fetched all codes:', data.length, 'codes');
          setCodes(data);
        } else {
          console.error('🔍 Error fetching all codes:', error);
        }
      }
    };
    fetchCodes();
  }, [open, _categoryId]);

  // 🔹 Initialize suggestion engine and load suggestions
  useEffect(() => {
    if (!open || !_categoryId || !_selectedAnswer) return;

    const loadSuggestions = async () => {
      setLoadingSuggestions(true);
      try {
        // Initialize engine with category history
        await suggestionEngine.initialize(_categoryId);

        // Get current code ID (if any)
        const currentCodeId = selectedCodes.length > 0
          ? codes.find(c => c.name === selectedCodes[0])?.id || null
          : null;

          const suggestions = await suggestionEngine.getSuggestions(
            _selectedAnswer,
            currentCodeId,
            _categoryId,
            translation || null,
            null
          );

        setSuggestions(suggestions);
        console.log(`💡 Loaded ${suggestions.length} code suggestions`);
      } catch (error) {
        console.error('❌ Error loading suggestions:', error);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    loadSuggestions();
  }, [open, _categoryId, _selectedAnswer, codes]);

  // 🔹 Update quick status
  const handleQuickStatus = async (answer: Answer, status: string) => {
    // Map short codes to full status names
    const statusMap: Record<string, string> = {
      'Oth': 'Other',
      'Ign': 'Ignore',
      'gBL': 'Global Blacklist',
      'BL': 'Blacklist',
      'C': 'Confirmed'
    };

    const fullStatus = statusMap[status] || status;

    // Prevent 'C' (Confirmed) if no AI suggestion available
    if (status === 'C') {
      const firstSuggestion = answer.ai_suggestions?.suggestions?.[0];
      if (!firstSuggestion || !firstSuggestion.code_name) {
        toast.error('Cannot confirm: No AI suggestion available');
        return;
      }
    }

    const update: any = {
      quick_status: fullStatus,
      general_status: fullStatus,
    };

    // Special handling for 'C' (Confirmed)
    if (status === 'C') {
      update.general_status = 'whitelist';
      update.coding_date = new Date().toISOString();

      // Auto-accept ALL AI suggestions if available
      const suggestions = answer.ai_suggestions?.suggestions;
      if (suggestions && suggestions.length > 0) {
        const allCodes = suggestions
          .filter(s => s.code_name)
          .map(s => s.code_name)
          .join(', ');
        update.selected_code = allCodes;
        console.log(`✅ Auto-accepting ${suggestions.length} AI suggestion(s): ${allCodes}`);
        toast.success(`Status: Whitelist | Codes: ${allCodes}`);
      }
    } else {
      update.coding_date = null;
      toast.success(`Status: ${fullStatus}`);
    }

    const { error } = await supabase
      .from('answers')
      .update(update)
      .eq('id', answer.id);

    if (error) {
      toast.error('Failed to update status');
      console.error('Status update error:', error);
    } else {
      onSaved(); // Refresh parent
    }
  };

  // 🔹 Keyboard navigation and shortcuts (ESC to close, arrows to navigate, quick status)
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement) return;

      if (e.key === "Escape") {
        onClose();
      }

      // Arrow key navigation
      if (e.key === "ArrowLeft" && currentAnswerIndex > 0) {
        e.preventDefault();
        onNavigate(currentAnswerIndex - 1);
      }
      if (e.key === "ArrowRight" && currentAnswerIndex < allAnswers.length - 1) {
        e.preventDefault();
        onNavigate(currentAnswerIndex + 1);
      }

      // Quick Status shortcuts
      const currentAnswer = allAnswers[currentAnswerIndex];

      if (e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        handleQuickStatus(currentAnswer, 'Oth');
      }
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        handleQuickStatus(currentAnswer, 'Ign');
      }
      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        handleQuickStatus(currentAnswer, 'gBL');
      }
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        handleQuickStatus(currentAnswer, 'BL');
      }
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleQuickStatus(currentAnswer, 'C');
      }

      // AI Categorization shortcut
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        if (selectedAnswerIds.length > 0 && onGenerateAISuggestions) {
          const answerId = selectedAnswerIds[0]; // Use first selected answer
          console.log('🤖 Generating AI suggestions for answer:', answerId);
          toast.info('🤖 Generating AI suggestions...');
          onGenerateAISuggestions(answerId);
        } else {
          toast.error('Unable to generate AI suggestions');
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, currentAnswerIndex, allAnswers, onNavigate, handleQuickStatus, selectedAnswerIds, onGenerateAISuggestions]);

  // 🔹 Reset all selected codes with animation
  const handleResetCodes = () => {
    setIsResetting(true);
    setSelectedCodes([]);
    toast.success("All selected codes have been cleared.");
    setTimeout(() => setIsResetting(false), 300);
  };

  // 🔹 Toggle code selection
  const handleToggleCode = (codeName: string) => {
    setSelectedCodes((prev) =>
      prev.includes(codeName)
        ? prev.filter((c) => c !== codeName)
        : [...prev, codeName]
    );
  };

  // 🔹 Apply code suggestion
  const handleApplySuggestion = async (codeId: number, codeName: string) => {
    console.log(`✨ Applying suggestion: ${codeName} (ID: ${codeId})`);

    // Add code to selected codes
    setSelectedCodes((prev) => {
      if (prev.includes(codeName)) {
        return prev; // Already selected
      }
      return [...prev, codeName];
    });

    // Learn from this action
    await suggestionEngine.learnFromAction(codeId);

    toast.success(`Applied: ${codeName}`);
  };

  // 🔹 Save selected codes
  const handleSave = async () => {
    try {
      // Delete existing codes for all selected answers
      const { error: deleteError } = await supabase
        .from("answer_codes")
        .delete()
        .in("answer_id", selectedAnswerIds);

      if (deleteError) throw deleteError;

      // Insert new codes if any selected
      if (selectedCodes.length > 0) {
        const { data: allCodes } = await supabase
          .from("codes")
          .select("id, name")
          .in("name", selectedCodes);

        if (allCodes && allCodes.length > 0) {
          // Insert codes for ALL selected answers (not just the first one)
          const inserts = selectedAnswerIds.flatMap(answerId =>
            allCodes.map(code => ({
              answer_id: answerId,
              code_id: code.id,
            }))
          );

          const { error: insertError } = await supabase
            .from("answer_codes")
            .insert(inserts);

          if (insertError) throw insertError;

          // Update selected_code column AND status in answers table for immediate display
          const selectedCodeString = allCodes.map(c => c.name).join(', ');

          const { error: updateError } = await supabase
            .from("answers")
            .update({
              selected_code: selectedCodeString,
              general_status: 'whitelist',
              coding_date: new Date().toISOString()
            })
            .in("id", selectedAnswerIds);

          if (updateError) throw updateError;
        }
      } else {
        // If no codes selected, clear the selected_code column and reset status
        const { error: clearError } = await supabase
          .from("answers")
          .update({
            selected_code: null,
            general_status: 'uncategorized',
            coding_date: null
          })
          .in("id", selectedAnswerIds);

        if (clearError) throw clearError;
      }

      toast.success(`Codes saved successfully for ${selectedAnswerIds.length} answer(s)!`);
      onSaved();
      onClose();
    } catch (err) {
      console.error("Error saving codes:", err);
      toast.error("Error saving codes");
    }
  };

  // 🔹 Confirm and go to next answer
  const handleConfirmAndNext = async () => {
    await handleSave();
    // After saving, navigate to next if available
    if (currentAnswerIndex < allAnswers.length - 1) {
      onNavigate(currentAnswerIndex + 1);
    } else {
      // If this was the last answer, close modal
      onClose();
    }
  };

  const filteredCodes = codes.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-5xl w-full h-[80vh] max-h-[600px] shadow-lg border border-gray-200 dark:border-neutral-700 flex flex-col"
        role="dialog"
      >
        {/* Header */}
        <div className="flex-shrink-0 mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Select or Create Code
          </h2>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-hidden">
          {/* Lewa kolumna – lista kodów */}
          <div className="md:col-span-1 border-r border-gray-200 dark:border-neutral-700 pr-4 flex flex-col">
            <div className="mb-3 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Type to search codes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() =>
                    setCodes((prev) =>
                      [...prev].sort((a, b) => a.name.localeCompare(b.name))
                    )
                  }
                  className="w-full rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="overflow-y-auto max-h-[400px] space-y-1 flex-1 pr-2">
              {filteredCodes.map((code) => (
                <label
                  key={code.id}
                  className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedCodes.includes(code.name)}
                    onChange={() => handleToggleCode(code.name)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-800 dark:text-gray-100">{code.name}</span>
                </label>
              ))}
              {filteredCodes.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {searchTerm ? "No codes found matching your search" : "No codes available"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Prawa kolumna – szczegóły */}
          <div className="md:col-span-2 flex flex-col overflow-y-auto">
            <div className="space-y-6">
              {/* Two-column Answer Display */}
              {(_selectedAnswer || translation) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Original Answer */}
                  <div className="flex flex-col">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Answer
                    </h3>
                    <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/10 flex-1">
                      <p className="text-sm text-gray-900 dark:text-gray-100" dir="auto">
                        {_selectedAnswer || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Right: Translation */}
                  <div className="flex flex-col">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Translation
                    </h3>
                    <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/10 flex-1">
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {translation || '—'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Suggestions & Smart Suggestions - Equal Fixed Heights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: AI Suggestions */}
                <div className="flex flex-col">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="text-purple-600 dark:text-purple-400">✨</span>
                      AI Suggestions
                      <span className="text-xs text-gray-500">(Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">A</kbd>)</span>
                    </span>
                    <button
                      onClick={() => {
                        // Generate AI suggestions for the selected answer
                        if (selectedAnswerIds.length > 0 && onGenerateAISuggestions) {
                          const answerId = selectedAnswerIds[0]; // Use first selected answer
                          console.log('🤖 Generating AI suggestions for answer:', answerId);
                          toast.info('🤖 Generating AI suggestions...');
                          onGenerateAISuggestions(answerId);
                        } else {
                          toast.error('Unable to generate AI suggestions');
                        }
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/20 cursor-pointer"
                      title="Generate AI suggestions"
                    >
                      <span className="text-xl">✨</span>
                    </button>
                  </h3>
                  <div className="border border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-purple-50 dark:bg-purple-900/10 h-[180px] flex flex-col overflow-y-auto">
                    {aiSuggestions && aiSuggestions.suggestions && aiSuggestions.suggestions.length > 0 ? (
                      <div className="w-full space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {aiSuggestions.suggestions.map((suggestion, idx) => {
                            const confidence = Math.round(suggestion.confidence * 100);
                            const colorClass = confidence >= 90
                              ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-200'
                              : confidence >= 70
                              ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200'
                              : 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-200';

                            const getConfidenceLabel = (conf: number): string => {
                              if (conf >= 90) return 'Very High';
                              if (conf >= 70) return 'High';
                              if (conf >= 50) return 'Medium';
                              return 'Low';
                            };

                            return (
                              <Tooltip
                                key={idx}
                                content={
                                  <div className="space-y-1">
                                    <div className="font-semibold">
                                      {getConfidenceLabel(confidence)} ({confidence}%)
                                    </div>
                                    <div className="text-xs">{suggestion.reasoning}</div>
                                    {aiSuggestions.model && (
                                      <div className="text-xs text-gray-400 border-t border-gray-700 pt-1 mt-1">
                                        Model: {aiSuggestions.model}
                                      </div>
                                    )}
                                  </div>
                                }
                              >
                                <button
                                  onClick={() => {
                                    const codeId = parseInt(suggestion.code_id);
                                    handleApplySuggestion(codeId, suggestion.code_name);
                                  }}
                                  className={`px-3 py-1.5 rounded-md border text-sm font-medium hover:opacity-80 transition-all ${colorClass}`}
                                >
                                  <span className="flex items-center gap-1">
                                    <span>✨</span>
                                    <span>{suggestion.code_name}</span>
                                    <span className="text-xs opacity-70">{confidence}%</span>
                                  </span>
                                </button>
                              </Tooltip>
                            );
                          })}
                        </div>
                        {aiSuggestions.timestamp && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Generated {new Date(aiSuggestions.timestamp).toLocaleString()}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-center text-gray-500 dark:text-gray-400 italic text-sm">
                        <div>
                          <span className="block mb-2 text-2xl">✨</span>
                          <p>No AI suggestions available yet.</p>
                          <p className="text-xs mt-1">Click the ✨ button above to generate.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Smart Suggestions */}
                <div className="flex flex-col">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <span className="text-blue-600 dark:text-blue-400">⚡</span>
                    Smart Suggestions
                  </h3>
                  <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/10 h-[180px] flex flex-col overflow-y-auto">
                    {loadingSuggestions ? (
                      <div className="flex-1 flex items-center justify-center">
                        <span className="h-5 w-5 animate-spin">⏳</span>
                        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading...</span>
                      </div>
                    ) : suggestions && suggestions.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((suggestion, idx) => (
                          <Tooltip
                            key={idx}
                            content={
                              <div className="space-y-1">
                                <div className="font-semibold">
                                  {suggestion.codeName}
                                </div>
                                <div className="text-xs">{suggestion.reason}</div>
                                {suggestion.frequency && suggestion.frequency > 0 && (
                                  <div className="text-xs text-gray-400 border-t border-gray-700 pt-1 mt-1">
                                    Used {suggestion.frequency}× before
                                  </div>
                                )}
                              </div>
                            }
                          >
                            <button
                              onClick={() => handleApplySuggestion(suggestion.codeId, suggestion.codeName)}
                              className="px-3 py-1.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 rounded-md border border-blue-300 dark:border-blue-700 text-sm hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                            >
                              {suggestion.codeName}
                              {suggestion.confidence && (
                                <span className="text-xs opacity-70 ml-1">
                                  ({Math.round(suggestion.confidence * 100)}%)
                                </span>
                              )}
                            </button>
                          </Tooltip>
                        ))}
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-center text-gray-500 dark:text-gray-400 italic text-sm">
                        <div>
                          <span className="block mb-2 text-2xl">⚡</span>
                          <p>No suggestions available yet.</p>
                          <p className="text-xs mt-1">Code more answers to build history!</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Selected Codes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Codes
                  </h3>
                  {selectedCodes.length > 0 && (
                    <button
                      onClick={handleResetCodes}
                      className={`text-orange-500 hover:text-orange-600 transition-all flex items-center gap-1 text-sm ${
                        isResetting ? 'animate-pulse' : ''
                      }`}
                      title="Reset selected codes"
                    >
                      <RotateCcw size={16} className={isResetting ? 'animate-spin' : ''} />
                      Reset
                    </button>
                  )}
                </div>
                <div className="border border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50 dark:bg-green-900/10 min-h-[80px]">
                  {selectedCodes.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedCodes.map((code) => (
                        <span
                          key={code}
                          className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200 rounded-full text-sm flex items-center gap-1"
                        >
                          {code}
                          <button
                            onClick={() => handleToggleCode(code)}
                            className="text-green-600 hover:text-green-800 dark:text-green-300 dark:hover:text-green-100"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="italic text-sm text-gray-400">No codes selected yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons - outside grid, always visible */}
        <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-200 dark:border-neutral-700 flex-shrink-0">
          {/* Left: Cancel */}
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white transition-colors"
            title="Cancel without saving (ESC)"
          >
            Cancel
          </button>

          {/* Center: Quick Status + Action buttons */}
          <div className="flex items-center gap-4">
            {/* Quick Status Block */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Quick Status:</span>
              <div className="flex items-center gap-1">
                <QuickStatusButtons
                  answer={allAnswers[currentAnswerIndex]}
                  onStatusChange={async (answer, status) => {
                    // Map short codes to full status names
                    const statusMap: Record<string, string> = {
                      'Oth': 'Other',
                      'Ign': 'Ignore',
                      'gBL': 'Global Blacklist',
                      'BL': 'Blacklist',
                      'C': 'Confirmed'
                    };

                    const fullStatus = statusMap[status] || status;

                    // Prevent 'C' (Confirmed) if no AI suggestion available
                    if (status === 'C') {
                      const firstSuggestion = answer.ai_suggestions?.suggestions?.[0];
                      if (!firstSuggestion || !firstSuggestion.code_name) {
                        toast.error('Cannot confirm: No AI suggestion available');
                        return;
                      }
                    }

                    const update: any = {
                      quick_status: fullStatus,
                      general_status: fullStatus,
                    };

                    // Special handling for 'C' (Confirmed)
                    if (status === 'C') {
                      update.general_status = 'whitelist';
                      update.coding_date = new Date().toISOString();

                      // Auto-accept ALL AI suggestions
                      const suggestions = answer.ai_suggestions?.suggestions;
                      if (suggestions && suggestions.length > 0) {
                        const allCodes = suggestions
                          .filter(s => s.code_name)
                          .map(s => s.code_name)
                          .join(', ');
                        update.selected_code = allCodes;
                      }
                    } else {
                      update.coding_date = null;
                    }

                    // Update answer status in database
                    const { error } = await supabase
                      .from('answers')
                      .update(update)
                      .eq('id', answer.id);

                    if (error) {
                      toast.error('Failed to update status');
                      console.error('Status update error:', error);
                    } else {
                      toast.success(`Status updated to ${fullStatus}`);
                      // Trigger refresh of parent component
                      onSaved();
                    }
                  }}
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={selectedCodes.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={selectedCodes.length > 0 ? `Confirm ${selectedCodes.length} code(s) and close` : 'Select at least one code'}
              >
                Confirm Answer
              </button>

              {currentAnswerIndex < allAnswers.length - 1 && (
                <button
                  onClick={handleConfirmAndNext}
                  disabled={selectedCodes.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  title={selectedCodes.length > 0 ? `Confirm and move to next answer` : 'Select at least one code'}
                >
                  Confirm & Next <span>→</span>
                </button>
              )}
            </div>
          </div>

          {/* Right: Navigation Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate(currentAnswerIndex - 1)}
              disabled={currentAnswerIndex === 0}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              title="Previous answer (←)"
            >
              <span>←</span> Previous
            </button>

            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              {currentAnswerIndex + 1} / {allAnswers.length}
            </span>

            <button
              onClick={() => onNavigate(currentAnswerIndex + 1)}
              disabled={currentAnswerIndex >= allAnswers.length - 1}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              title="Next answer (→)"
            >
              Next <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
