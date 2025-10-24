import axios from 'axios';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardPaste,
  Loader2,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { Category } from '../types';
import { simpleLogger } from '../utils/logger';

interface CodeframeBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category;
  onCodesCreated: () => void;
}

type TabType = 'manual' | 'ai' | 'paste';
type VerificationStep = 'idle' | 'discovering' | 'verifying' | 'done';

interface DiscoveredCode {
  name: string;
  frequency?: number;
  type?: string;
  verified?: boolean;
  confidence?: number;
  official_name?: string;
  website?: string;
}

export function CodeframeBuilderModal({
  isOpen,
  onClose,
  category,
  onCodesCreated,
}: CodeframeBuilderModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('manual');
  const [loading, setLoading] = useState(false);

  // Manual entry state
  const [manualCodeName, setManualCodeName] = useState('');
  const [manualCodes, setManualCodes] = useState<string[]>([]);

  // AI Discovery state
  const [aiLimit, setAiLimit] = useState(100);
  const [aiMinFrequency, setAiMinFrequency] = useState(2);
  const [discoveredCodes, setDiscoveredCodes] = useState<DiscoveredCode[]>([]);
  const [rejectedCodes, setRejectedCodes] = useState<DiscoveredCode[]>([]);
  const [verificationStep, setVerificationStep] = useState<VerificationStep>('idle');
  const [verificationProgress, setVerificationProgress] = useState({ current: 0, total: 0 });

  // Paste from Excel state
  const [pasteText, setPasteText] = useState('');
  const [parsedCodes, setParsedCodes] = useState<string[]>([]);

  if (!isOpen) return null;

  // Manual Entry handlers
  const handleAddManualCode = () => {
    const trimmed = manualCodeName.trim();
    if (!trimmed) {
      toast.error('Please enter a code name');
      return;
    }
    if (manualCodes.includes(trimmed)) {
      toast.error('Code already added');
      return;
    }
    setManualCodes([...manualCodes, trimmed]);
    setManualCodeName('');
    toast.success(`Added: ${trimmed}`);
  };

  const handleRemoveManualCode = (code: string) => {
    setManualCodes(manualCodes.filter(c => c !== code));
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddManualCode();
    }
  };

  const handleSaveManualCodes = async () => {
    if (manualCodes.length === 0) {
      toast.error('No codes to save');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/v1/codes/bulk-create', {
        category_id: category.id,
        code_names: manualCodes,
      });

      toast.success(`Created ${manualCodes.length} codes!`);
      setManualCodes([]);
      setManualCodeName('');
      onCodesCreated();
      onClose();
    } catch (error: any) {
      toast.error(`Failed to create codes: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // AI Discovery handlers - Two-step process
  const handleDiscoverCodes = async () => {
    setLoading(true);
    setDiscoveredCodes([]);
    setVerificationStep('discovering');

    try {
      // STEP 1: Claude Haiku discovers brands from answers
      toast.info('Step 1/2: AI scanning answers for brands...');

      const discoverResponse = await axios.post('/api/v1/codes/ai-discover', {
        category_id: category.id,
        limit: aiLimit,
        min_frequency: aiMinFrequency,
      });

      const discoveredBrands = discoverResponse.data.discovered_codes || [];

      if (discoveredBrands.length === 0) {
        toast.info('No brands discovered. Try adjusting settings or analyzing more answers.');
        setVerificationStep('idle');
        setLoading(false);
        return;
      }

      simpleLogger.info(
        `[AI Discovery] Found ${discoveredBrands.length} brands:`,
        discoveredBrands
      );

      // STEP 2: Verify brands with Google
      setVerificationStep('verifying');
      setVerificationProgress({ current: 0, total: discoveredBrands.length });
      toast.info(`Step 2/2: Verifying ${discoveredBrands.length} brands with Google...`);

      const verifyResponse = await axios.post('/api/v1/codes/verify-brands', {
        codes: discoveredBrands,
      });

      const verifiedBrands = verifyResponse.data.verified || [];
      const rejectedBrands = verifyResponse.data.rejected || [];

      simpleLogger.info(
        `[Google Verification] Verified: ${verifiedBrands.length}, Rejected: ${rejectedBrands.length}`
      );

      setDiscoveredCodes(verifiedBrands);
      setRejectedCodes(rejectedBrands);
      setVerificationStep('done');

      if (verifiedBrands.length > 0) {
        toast.success(
          `✅ Verified ${verifiedBrands.length}/${discoveredBrands.length} brands!\n` +
            (rejectedBrands.length > 0 ? `${rejectedBrands.length} rejected (low confidence)` : '')
        );
      } else {
        toast.warning('No brands could be verified. Try different search terms.');
      }
    } catch (error: any) {
      simpleLogger.error('[AI Discovery] Error:', error);
      toast.error(`Discovery failed: ${error.response?.data?.message || error.message}`);
      setVerificationStep('idle');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDiscoveredCodes = async () => {
    if (discoveredCodes.length === 0) {
      toast.error('No codes to save');
      return;
    }

    setLoading(true);
    try {
      // Extract names (use official_name if verified, otherwise name)
      const codeNames = discoveredCodes.map(c => c.official_name || c.name);

      await axios.post('/api/v1/codes/bulk-create', {
        category_id: category.id,
        code_names: codeNames,
      });

      toast.success(`Created ${discoveredCodes.length} verified brand codes!`);
      setDiscoveredCodes([]);
      setVerificationStep('idle');
      onCodesCreated();
      onClose();
    } catch (error: any) {
      toast.error(`Failed to create codes: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Paste from Excel handlers
  const handleParsePaste = () => {
    if (!pasteText.trim()) {
      toast.error('Please paste some text first');
      return;
    }

    // Split by newlines, tabs, or commas
    const lines = pasteText.split(/[\n\t,]+/);
    const codes = lines
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter((code, index, self) => self.indexOf(code) === index); // Remove duplicates

    if (codes.length === 0) {
      toast.error('No valid codes found in pasted text');
      return;
    }

    setParsedCodes(codes);
    toast.success(`Parsed ${codes.length} unique codes`);
  };

  const handleSaveParsedCodes = async () => {
    if (parsedCodes.length === 0) {
      toast.error('No codes to save');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/v1/codes/bulk-create', {
        category_id: category.id,
        code_names: parsedCodes,
      });

      toast.success(`Created ${parsedCodes.length} codes!`);
      setPasteText('');
      setParsedCodes([]);
      onCodesCreated();
      onClose();
    } catch (error: any) {
      toast.error(`Failed to create codes: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-zinc-200 dark:border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Manage Codes</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{category.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
          >
            <X size={20} className="text-zinc-600 dark:text-zinc-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-6">
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === 'manual'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Plus size={16} />
              Manual Entry
            </div>
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === 'ai'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles size={16} />
              AI Discovery
            </div>
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === 'paste'
                ? 'border-green-600 text-green-600 dark:text-green-400'
                : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <ClipboardPaste size={16} />
              Paste from Excel
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Manual Entry Tab */}
          {activeTab === 'manual' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Add codes one by one
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualCodeName}
                    onChange={e => setManualCodeName(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type code name and press Enter"
                    className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddManualCode}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-2 transition"
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Press Enter or click Add to add the code to the list below
                </p>
              </div>

              {manualCodes.length > 0 && (
                <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      Codes to create ({manualCodes.length})
                    </h3>
                    <button
                      onClick={() => setManualCodes([])}
                      className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {manualCodes.map((code, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                      >
                        {code}
                        <button
                          onClick={() => handleRemoveManualCode(code)}
                          className="hover:text-red-600 dark:hover:text-red-400"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {manualCodes.length === 0 && (
                <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                  <Plus size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No codes added yet</p>
                  <p className="text-xs mt-1">Type a code name above and press Enter to add</p>
                </div>
              )}
            </div>
          )}

          {/* AI Discovery Tab */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              {verificationStep === 'idle' && (
                <>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">✨🔍</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                          AI Discovery + Google Verification
                        </h3>
                        <p className="text-sm text-blue-800 dark:text-blue-300 mb-4">
                          Our AI will scan your answers to find brands, then verify each one using
                          Google Search to ensure accuracy.
                        </p>

                        <div className="bg-white dark:bg-zinc-800 rounded p-3 mb-4 border border-blue-200 dark:border-blue-700">
                          <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                            What we verify:
                          </p>
                          <ul className="text-xs space-y-1 text-zinc-700 dark:text-zinc-300">
                            <li className="flex items-center gap-2">
                              <CheckCircle2 size={12} className="text-green-600" />
                              Official brand website exists
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle2 size={12} className="text-green-600" />
                              Brand logo found on Google Images
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle2 size={12} className="text-green-600" />
                              Wikipedia page exists (if available)
                            </li>
                            <li className="flex items-center gap-2">
                              <AlertCircle size={12} className="text-red-600" />
                              Not a generic category or theme
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {verificationStep === 'idle' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Answers to scan
                      </label>
                      <input
                        type="number"
                        value={aiLimit}
                        onChange={e => setAiLimit(parseInt(e.target.value) || 100)}
                        min={10}
                        max={1000}
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        Scan first {aiLimit} answers
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Min frequency
                      </label>
                      <input
                        type="number"
                        value={aiMinFrequency}
                        onChange={e => setAiMinFrequency(parseInt(e.target.value) || 2)}
                        min={1}
                        max={50}
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        Brand must appear at least {aiMinFrequency}x
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleDiscoverCodes}
                    disabled={loading}
                    className="w-full py-6 text-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md flex items-center justify-center gap-2 transition font-medium"
                  >
                    <Sparkles size={20} />
                    Discover & Verify Brands
                  </button>
                </>
              )}

              {verificationStep === 'discovering' && (
                <div className="text-center py-12">
                  <Loader2 size={48} className="mx-auto mb-4 text-purple-600 animate-spin" />
                  <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                    Step 1/2: AI Scanning Answers...
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Claude Haiku is analyzing text to find brand mentions
                  </p>
                </div>
              )}

              {verificationStep === 'verifying' && (
                <div className="text-center py-12">
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    <Loader2 size={96} className="text-blue-600 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-900 dark:text-blue-100">
                        {verificationProgress.current}/{verificationProgress.total}
                      </span>
                    </div>
                  </div>
                  <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                    Step 2/2: Verifying Brands...
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                    Checking with Google Search and Images
                  </p>
                  <div className="w-64 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full mx-auto overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{
                        width: `${(verificationProgress.current / verificationProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {verificationStep === 'done' && discoveredCodes.length > 0 && (
                <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
                  {/* Statistics Grid */}
                  <div className="mb-4">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                      Verification Results
                    </h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {discoveredCodes.length}
                        </div>
                        <div className="text-xs text-green-800 dark:text-green-300">
                          Verified Brands
                        </div>
                      </div>
                      <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {rejectedCodes.length}
                        </div>
                        <div className="text-xs text-red-800 dark:text-red-300">Rejected</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {Math.round(
                            (discoveredCodes.length /
                              (discoveredCodes.length + rejectedCodes.length)) *
                              100
                          )}
                          %
                        </div>
                        <div className="text-xs text-blue-800 dark:text-blue-300">Accuracy</div>
                      </div>
                    </div>
                  </div>

                  {/* Verified brands with logos */}
                  <div className="space-y-2 mb-4">
                    <h4 className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                      Verified Brands:
                    </h4>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {discoveredCodes.map((code, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                        >
                          {code.logo_url && (
                            <img
                              src={code.logo_url}
                              alt={code.official_name || code.name}
                              className="w-10 h-10 object-contain flex-shrink-0"
                              onError={e => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-zinc-900 dark:text-zinc-100">
                              {code.official_name || code.name}
                            </div>
                            <div className="text-xs text-zinc-600 dark:text-zinc-400">
                              {code.frequency && `${code.frequency} mentions • `}
                              {code.verification_source}
                            </div>
                          </div>
                          <span className="text-green-600 dark:text-green-400 text-xs font-medium flex-shrink-0">
                            ✓ {Math.round((code.confidence || 0) * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rejected codes collapsible */}
                  {rejectedCodes.length > 0 && (
                    <details className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
                      <summary className="text-sm cursor-pointer text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium">
                        Show {rejectedCodes.length} rejected codes
                      </summary>
                      <div className="mt-3 space-y-1.5">
                        {rejectedCodes.map((code, index) => (
                          <div
                            key={index}
                            className="text-xs p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded"
                          >
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                              {code.name}
                            </span>
                            <span className="text-zinc-600 dark:text-zinc-400">
                              {' '}
                              - {code.reason}
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}

              {verificationStep === 'done' && discoveredCodes.length === 0 && (
                <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                  <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No verified brands found</p>
                  <p className="text-xs mt-1">Try adjusting settings and scanning again</p>
                </div>
              )}
            </div>
          )}

          {/* Paste from Excel Tab */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-green-900 dark:text-green-200 mb-2 flex items-center gap-2">
                  <ClipboardPaste size={16} />
                  Bulk Import from Excel/CSV
                </h3>
                <p className="text-xs text-green-800 dark:text-green-300">
                  Copy codes from Excel (one per line, column, or comma-separated) and paste below.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Paste your codes here
                </label>
                <textarea
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  placeholder="Paste from Excel or CSV here...&#10;&#10;Examples:&#10;Code 1&#10;Code 2&#10;Code 3&#10;&#10;Or: Code 1, Code 2, Code 3&#10;Or: Code 1	Code 2	Code 3"
                  rows={10}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Supports newlines, tabs, or commas as separators
                </p>
              </div>

              <button
                onClick={handleParsePaste}
                disabled={!pasteText.trim()}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-md flex items-center justify-center gap-2 transition"
              >
                <ClipboardPaste size={16} />
                Parse Codes
              </button>

              {parsedCodes.length > 0 && (
                <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3">
                    Parsed codes ({parsedCodes.length})
                  </h3>
                  <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                    {parsedCodes.map((code, index) => (
                      <div
                        key={index}
                        className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full text-sm"
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {parsedCodes.length === 0 && (
                <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                  <ClipboardPaste size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No codes parsed yet</p>
                  <p className="text-xs mt-1">Paste text above and click "Parse Codes"</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
          >
            Cancel
          </button>

          {activeTab === 'manual' && manualCodes.length > 0 && (
            <button
              onClick={handleSaveManualCodes}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md transition"
            >
              {loading ? 'Creating...' : `Create ${manualCodes.length} Codes`}
            </button>
          )}

          {activeTab === 'ai' && verificationStep === 'done' && discoveredCodes.length > 0 && (
            <button
              onClick={handleSaveDiscoveredCodes}
              disabled={loading}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-md transition font-medium"
            >
              {loading ? 'Creating...' : `Create ${discoveredCodes.length} Verified Brands`}
            </button>
          )}

          {activeTab === 'paste' && parsedCodes.length > 0 && (
            <button
              onClick={handleSaveParsedCodes}
              disabled={loading}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-md transition"
            >
              {loading ? 'Creating...' : `Create ${parsedCodes.length} Codes`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
