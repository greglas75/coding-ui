import { Info, Save, Settings, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { AutoConfirmEngine, type AutoConfirmSettings as SettingsType } from '../lib/autoConfirmEngine';

interface Props {
  engine: AutoConfirmEngine;
  onClose: () => void;
}

export function AutoConfirmSettings({ engine, onClose }: Props) {
  const [settings, setSettings] = useState<SettingsType>(engine.getSettings());

  const handleSave = () => {
    engine.updateSettings(settings);
    toast.success('Auto-confirm settings saved!');
    onClose();
  };

  const handleReset = () => {
    engine.resetSettings();
    setSettings(engine.getSettings());
    toast.success('Settings reset to defaults');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Auto-Confirm Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Info Banner */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Info size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-700 dark:text-blue-400">
                Auto-confirm automatically applies AI suggestions with high confidence scores,
                saving you time while maintaining quality control.
              </div>
            </div>
          </div>

          {/* Enable/Disable */}
          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Enable Auto-Confirm
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Automatically apply high-confidence AI suggestions
              </div>
            </div>
          </label>

          {/* High Confidence Threshold */}
          <div className={settings.enabled ? '' : 'opacity-50 pointer-events-none'}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              High Confidence Threshold
            </label>
            <input
              type="range"
              min="80"
              max="98"
              value={settings.highConfidenceThreshold}
              onChange={(e) => setSettings({ ...settings, highConfidenceThreshold: parseInt(e.target.value) })}
              className="w-full accent-green-600"
              disabled={!settings.enabled}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>80%</span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                ≥ {settings.highConfidenceThreshold}% = Auto-Confirm
              </span>
              <span>98%</span>
            </div>
            <div className="mt-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <p className="text-xs text-green-700 dark:text-green-400">
                ✅ Codes with {settings.highConfidenceThreshold}%+ confidence will be automatically applied
              </p>
            </div>
          </div>

          {/* Medium Confidence Threshold */}
          <div className={settings.enabled ? '' : 'opacity-50 pointer-events-none'}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Medium Confidence Threshold
            </label>
            <input
              type="range"
              min="50"
              max="80"
              value={settings.mediumConfidenceThreshold}
              onChange={(e) => setSettings({ ...settings, mediumConfidenceThreshold: parseInt(e.target.value) })}
              className="w-full accent-yellow-600"
              disabled={!settings.enabled}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>50%</span>
              <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                {settings.mediumConfidenceThreshold}%-{settings.highConfidenceThreshold}% = Review
              </span>
              <span>80%</span>
            </div>
            <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                ⚠️ Codes between {settings.mediumConfidenceThreshold}%-{settings.highConfidenceThreshold}% will need manual review
              </p>
            </div>
          </div>

          {/* Low Confidence (calculated) */}
          <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
            <p className="text-xs text-red-700 dark:text-red-400">
              ❌ Codes below {settings.mediumConfidenceThreshold}% will be automatically rejected
            </p>
          </div>

          {/* Additional Options */}
          <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-neutral-800">
            <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoConfirmHighConfidence}
                onChange={(e) => setSettings({ ...settings, autoConfirmHighConfidence: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                disabled={!settings.enabled}
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Auto-confirm high confidence codes
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Apply codes automatically without review
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.requireReviewMediumConfidence}
                onChange={(e) => setSettings({ ...settings, requireReviewMediumConfidence: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                disabled={!settings.enabled}
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Require review for medium confidence
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Queue medium confidence codes for manual review
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.trackRejections}
                onChange={(e) => setSettings({ ...settings, trackRejections: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                disabled={!settings.enabled}
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Track rejected suggestions
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Log low-confidence rejections for AI improvement
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-800 px-6 py-4 flex justify-between">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors text-sm"
          >
            Reset to Defaults
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Save size={16} />
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
