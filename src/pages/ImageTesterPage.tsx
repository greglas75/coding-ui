import { Image as ImageIcon, Loader2, Search } from 'lucide-react';
import { useState } from 'react';

interface TestResult {
  model: string;
  images: Array<{
    url: string;
    title?: string;
    description?: string;
    source?: string;
  }>;
  reasoning?: string;
  duration: number;
  error?: string;
}

export default function ImageTesterPage() {
  const [prompt, setPrompt] = useState('find 3 pictures for category toothpaste, keyword: colgate');
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-pro-exp');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<TestResult | null>(null);

  // Available models for image search (same as Vision Model list)
  const models = [
    {
      id: 'gemini-2.0-pro-exp',
      name: 'Google Gemini 2.0 Pro Experimental',
      price: '$2.50/1M',
      icon: '🔮',
    },
    {
      id: 'gemini-2.0-flash-lite',
      name: 'Google Gemini 2.0 Flash Lite',
      price: '$0.05/1M',
      icon: '🔮',
    },
    { id: 'gemini-2.5-flash', name: 'Google Gemini 2.5 Flash', price: '$0.075/1M', icon: '🔮' },
    { id: 'gemini-2.0-flash', name: 'Google Gemini 2.0 Flash', price: '$0.075/1M', icon: '🔮' },
    { id: 'gemini-1.5-flash', name: 'Google Gemini 1.5 Flash', price: '$0.075/1M', icon: '🔮' },
    { id: 'gpt-4o-mini', name: 'OpenAI GPT-4o Mini', price: '$0.15/1M', icon: '🤖' },
    { id: 'claude-haiku-4.5', name: 'Anthropic Claude Haiku 4.5', price: '$1/1M', icon: '🧠' },
    { id: 'gemini-1.5-pro', name: 'Google Gemini 1.5 Pro', price: '$1.25/1M', icon: '🔮' },
    { id: 'gemini-2.5-pro', name: 'Google Gemini 2.5 Pro', price: '$2.5/1M', icon: '🔮' },
    { id: 'claude-sonnet-4.5', name: 'Anthropic Claude Sonnet 4.5', price: '$3/1M', icon: '🧠' },
    { id: 'claude-sonnet-4', name: 'Anthropic Claude Sonnet 4', price: '$3/1M', icon: '🧠' },
    { id: 'gpt-4o', name: 'OpenAI GPT-4o', price: '$5/1M', icon: '🤖' },
  ];

  const handleSearch = async () => {
    setIsSearching(true);
    setResults(null);

    const startTime = Date.now();

    try {
      // Get API keys from localStorage
      const apiKeys = {
        gemini: localStorage.getItem('google_gemini_api_key'),
        openai: localStorage.getItem('openai_api_key'),
        anthropic: localStorage.getItem('anthropic_api_key'),
      };

      // Call API to search with selected model
      const response = await fetch('/api/test-image-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: selectedModel,
          apiKeys, // Pass API keys from localStorage
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      setResults({
        model: selectedModel,
        images: data.images || [],
        reasoning: data.reasoning,
        duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setResults({
        model: selectedModel,
        images: [],
        duration,
        error: errorMessage,
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <ImageIcon className="h-10 w-10 text-purple-600 dark:text-purple-400" />
            AI Image Search Tester
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Test different AI models to search for images using natural language prompts
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
          {/* Prompt Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Search Prompt
            </label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Example: find 3 pictures for category toothpaste, keyword: colgate"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          {/* Model Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              AI Model
            </label>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {models.map(model => (
                <option key={model.id} value={model.id}>
                  {model.icon} {model.name} - {model.price}
                </option>
              ))}
            </select>
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={isSearching || !prompt.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
          >
            {isSearching ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-5 w-5" />
                Search Images
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        {results && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
            {/* Results Header */}
            <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Results</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Model: {models.find(m => m.id === results.model)?.name}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Duration</div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {(results.duration / 1000).toFixed(2)}s
                  </div>
                </div>
              </div>
            </div>

            {/* Error */}
            {results.error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                <div className="text-red-800 dark:text-red-200 font-semibold mb-1">Error</div>
                <div className="text-red-700 dark:text-red-300 text-sm">{results.error}</div>
              </div>
            )}

            {/* Reasoning */}
            {results.reasoning && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <div className="text-blue-800 dark:text-blue-200 font-semibold mb-2">
                  AI Reasoning
                </div>
                <div className="text-blue-700 dark:text-blue-300 text-sm whitespace-pre-wrap">
                  {results.reasoning}
                </div>
              </div>
            )}

            {/* Images */}
            {results.images.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Found {results.images.length} Image(s)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.images.map((image, idx) => (
                    <a
                      key={idx}
                      href={image.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative aspect-square overflow-hidden rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-400 transition-all"
                    >
                      <img
                        src={image.url}
                        alt={image.title || `Image ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        onError={e => {
                          (e.target as HTMLImageElement).src =
                            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
                        }}
                      />
                      {image.source && (
                        <div className="absolute top-2 left-2 bg-blue-500/90 text-white text-xs px-2 py-1 rounded-full font-medium">
                          {image.source}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/70 transition-colors flex flex-col items-center justify-center p-4">
                        {image.title && (
                          <p className="text-white text-sm text-center font-semibold opacity-0 group-hover:opacity-100 transition-opacity mb-2">
                            {image.title}
                          </p>
                        )}
                        {image.description && (
                          <p className="text-white/80 text-xs text-center opacity-0 group-hover:opacity-100 transition-opacity">
                            {image.description}
                          </p>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {!results.error && results.images.length === 0 && (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                No images found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
