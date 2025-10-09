import { Settings, X } from "lucide-react";
import { useEffect, useState } from "react";
import { TestPromptModal } from "./TestPromptModal";

interface EditCategoryModalProps {
  category: {
    id: number;
    name: string;
    google_name?: string;
    description?: string;
    template?: string;
  };
  onClose: () => void;
  onSave: (data: {
    name: string;
    googleName: string;
    description: string;
    preset: string;
    model: string;
    template: string;
    brandsSorting: string;
    minLength: number;
    maxLength: number;
  }) => Promise<void>;
}

export function EditCategoryModal({ category, onClose, onSave }: EditCategoryModalProps) {
  const [fade, setFade] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);

  useEffect(() => {
    setTimeout(() => setFade(true), 50);
    return () => setFade(false);
  }, []);

  // 🔧 FIX: Close modal with ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const [form, setForm] = useState({
    name: category.name || "",
    googleName: category.google_name || "",
    description: category.description || "",
    preset: "LLM Proper Name",
    model: "gpt-4.1-nano",
    template: category.template || "",
    brandsSorting: "Alphanumerical",
    minLength: 0,
    maxLength: 0,
  });

  const gptModels = [
    "gpt-4.1-nano",
    "gpt-4.1-mini",
    "gpt-4o-mini",
    "gpt-4o",
    "gpt-4.1",
    "gpt-5",
    "gpt-5-mini",
    "gpt-5-nano",
    "o3",
    "o4-mini"
  ];

  const handleSave = async (closeAfter = false) => {
    console.log("Saving:", form);
    await onSave(form);
    if (closeAfter) onClose();
  };

  return (
    <>
      <div className={`fixed inset-0 bg-black/40 flex items-center justify-center z-50 transition-opacity duration-300 ${
        fade ? "opacity-100" : "opacity-0"
      }`}>
        <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 w-full max-w-4xl shadow-lg transform transition-all scale-100">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Settings size={20} />
              Edit Category Settings
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={20} />
            </button>
          </div>

          {/* 2-Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column (2/3 width) */}
            <div className="col-span-1 md:col-span-2 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  GPT Template
                </label>
                <textarea
                  rows={8}
                  value={form.template}
                  onChange={(e) => setForm({ ...form, template: e.target.value })}
                  className="w-full font-mono border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Enter GPT system prompt template..."
                />
                <button
                  onClick={() => setTestModalOpen(true)}
                  className="mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium flex items-center gap-2"
                  type="button"
                >
                  🧪 Test Prompt
                </button>
              </div>
            </div>

            {/* Right Column (1/3 width) */}
            <div className="col-span-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Google Search Name
                </label>
                <input
                  type="text"
                  value={form.googleName}
                  onChange={(e) => setForm({ ...form, googleName: e.target.value })}
                  className="w-full border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Categorization Preset
                </label>
                <select
                  value={form.preset}
                  onChange={(e) => setForm({ ...form, preset: e.target.value })}
                  className="w-full border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option>LLM Proper Name</option>
                  <option>Keyword Match</option>
                  <option>Generic Brand Detection</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  GPT Model
                </label>
                <select
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  className="w-full border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {gptModels.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Brands Sorting
                </label>
                <select
                  value={form.brandsSorting}
                  onChange={(e) => setForm({ ...form, brandsSorting: e.target.value })}
                  className="w-full border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option>Alphanumerical</option>
                  <option>Creation</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Minimum Length of Answer
                </label>
                <input
                  type="number"
                  value={form.minLength}
                  onChange={(e) => setForm({ ...form, minLength: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  title="Shorter and longer answers would be marked as Gibberish. Set 0 or empty to skip validation."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Maximum Length of Answer
                </label>
                <input
                  type="number"
                  value={form.maxLength}
                  onChange={(e) => setForm({ ...form, maxLength: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  title="Shorter and longer answers would be marked as Gibberish. Set 0 or empty to skip validation."
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => handleSave(false)}
              className="px-4 py-2 bg-gray-200 dark:bg-neutral-700 hover:bg-gray-300 dark:hover:bg-neutral-600 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium transition-colors"
            >
              Save Changes
            </button>
            <button
              onClick={() => handleSave(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              Save & Close
            </button>
          </div>
        </div>
      </div>

      {/* Test Prompt Modal */}
      <TestPromptModal
        open={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        template={form.template}
        model={form.model}
      />
    </>
  );
}
