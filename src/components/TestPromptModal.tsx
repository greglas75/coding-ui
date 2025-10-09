import { Code2, Play, X } from "lucide-react";
import { useEffect, useState } from "react";

interface TestPromptModalProps {
  open: boolean;
  onClose: () => void;
  template: string;
  model: string;
}

export function TestPromptModal({ open, onClose, template, model }: TestPromptModalProps) {
  const [userMessage, setUserMessage] = useState("");
  const [language, setLanguage] = useState("English");
  const [country, setCountry] = useState("Poland");
  const [activeTab, setActiveTab] = useState<"request" | "response">("response");
  const [requestJson, setRequestJson] = useState("");
  const [responseJson, setResponseJson] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<{ time?: string; tokens?: string }>({});

  // ✅ ESC to close modal
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, isLoading]);

  if (!open) return null;

  async function runTest() {
    const payload = {
      model,
      messages: [
        { role: "system", content: template },
        { role: "user", content: userMessage }
      ],
      max_completion_tokens: 500,
      temperature: 0,
      top_p: 0.1
    };

    setRequestJson(JSON.stringify(payload, null, 2));
    setActiveTab("response");
    setIsLoading(true);

    const start = performance.now();
    try {
      const res = await fetch("http://localhost:3001/api/gpt-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      const end = performance.now();
      setStats({
        time: ((end - start) / 1000).toFixed(1),
        tokens: data?.usage?.total_tokens ?? "-"
      });
      setResponseJson(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setResponseJson(JSON.stringify({ error: err.message }, null, 2));
      setStats({ time: "-", tokens: "-" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 max-w-4xl w-full shadow-2xl border border-gray-200 dark:border-neutral-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Code2 size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                GPT Template Testing
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Model: <span className="font-mono font-medium">{model}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
            title="Close (ESC)"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              GPT Template:
            </label>
            <textarea
              rows={5}
              value={template}
              readOnly
              className="w-full text-xs font-mono border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 rounded-md px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Language:</label>
              <input
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Country:</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 rounded-md px-3 py-2 text-sm"
              >
                <option>Poland</option>
                <option>Vietnam</option>
                <option>Philippines</option>
                <option>Indonesia</option>
                <option>USA</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              User's message to test:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isLoading && userMessage.trim()) {
                    runTest();
                  }
                }}
                placeholder="Enter a sample answer to test (e.g., 'Nike shoes are great')"
                className="flex-grow border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                autoFocus
              />
              <button
                onClick={runTest}
                disabled={isLoading || !userMessage.trim()}
                className={`px-4 py-2 rounded-md text-white font-medium transition-colors flex items-center gap-2 ${
                  isLoading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }`}
                title="Run GPT test (Enter)"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Running...
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    Run Test
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-neutral-700 mb-3">
          <button
            onClick={() => setActiveTab("request")}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === "request"
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Request
            {activeTab === "request" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("response")}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === "response"
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Response
            {activeTab === "response" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
            )}
          </button>
        </div>

        {/* JSON Display */}
        <div className="bg-gray-900 dark:bg-black rounded-lg p-4 h-80 overflow-auto border border-gray-700">
          <pre className="text-xs font-mono text-green-400">
            {activeTab === "request"
              ? (requestJson || '// Click "Run Test" to see the request JSON')
              : (responseJson || '// Response will appear here after running the test')}
          </pre>
        </div>

        {/* Stats Footer */}
        <div className="mt-4 flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-neutral-800 rounded-md border border-gray-200 dark:border-neutral-700">
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Time:</span>
              <span className="ml-2 font-mono font-medium text-gray-900 dark:text-gray-100">
                {stats.time || "-"}s
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Tokens:</span>
              <span className="ml-2 font-mono font-medium text-gray-900 dark:text-gray-100">
                {stats.tokens || "-"}
              </span>
            </div>
          </div>
          {stats.time && (
            <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
              ✓ Test completed successfully
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
