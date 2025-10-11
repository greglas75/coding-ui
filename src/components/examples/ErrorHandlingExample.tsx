// ═══════════════════════════════════════════════════════════════
// 📚 Error Handling Example - How to use ErrorBoundary and useErrorHandler
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { ErrorBoundary } from '../ErrorBoundary';

/**
 * Example 1: useErrorHandler for async operations
 */
export function AsyncErrorExample() {
  const [data, setData] = useState<string | null>(null);
  const { handleError, wrapAsync, lastError, clearError } = useErrorHandler({
    context: 'AsyncErrorExample',
    tags: { component: 'example' },
  });

  // Wrap async function with automatic error handling
  const fetchData = wrapAsync(async () => {
    const response = await fetch('/api/data');
    if (!response.ok) throw new Error('Failed to fetch');
    const json = await response.json();
    setData(json);
  }, 'fetchData');

  // Manual error handling
  const manualFetch = async () => {
    try {
      const response = await fetch('/api/data');
      if (!response.ok) throw new Error('Failed to fetch');
      setData(await response.json());
    } catch (error) {
      handleError(error, 'manualFetch');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">Async Error Handling</h3>

      {/* Error display */}
      {lastError && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <p className="text-red-800 text-sm">{lastError.message}</p>
          <button
            onClick={clearError}
            className="mt-2 text-xs text-red-600 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={fetchData}
          className="px-3 py-2 bg-blue-600 text-white rounded"
        >
          Fetch with wrapAsync
        </button>

        <button
          onClick={manualFetch}
          className="px-3 py-2 bg-green-600 text-white rounded"
        >
          Manual Error Handling
        </button>
      </div>

      {data && <p className="text-sm">Data: {data}</p>}
    </div>
  );
}

/**
 * Example 2: ErrorBoundary usage
 */
function ProblematicComponent() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error('Component crashed!');
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Problematic Component</h3>
      <button
        onClick={() => setShouldThrow(true)}
        className="px-3 py-2 bg-red-600 text-white rounded"
      >
        Trigger Error
      </button>
    </div>
  );
}

export function ErrorBoundaryExample() {
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">ErrorBoundary Example</h2>

      <ErrorBoundary
        onError={(error, errorInfo) => {
          console.log('Custom error handler:', error, errorInfo);
        }}
        onReport={async (error, errorInfo) => {
          console.log('Custom report handler:', error, errorInfo);
          // Could send to custom analytics service
        }}
        showReloadButton={true}
        showReportButton={true}
      >
        <ProblematicComponent />
      </ErrorBoundary>
    </div>
  );
}

/**
 * Example 3: Combined error handling
 */
export function CombinedErrorExample() {
  const { handleError, errorCount } = useErrorHandler({
    context: 'CombinedExample',
    reportToSentry: true,
    tags: {
      feature: 'example',
      severity: 'low',
    },
  });

  const [items, setItems] = useState<string[]>([]);

  const addItem = async () => {
    try {
      // Simulate API call
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() > 0.7) {
            reject(new Error('Random API failure'));
          } else {
            resolve(true);
          }
        }, 500);
      });

      setItems([...items, `Item ${items.length + 1}`]);
    } catch (error) {
      handleError(error, 'addItem');
      // Error is handled, component continues working
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">Combined Error Handling</h3>

      {/* Error count indicator */}
      {errorCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
          <p className="text-yellow-800 text-sm">
            {errorCount} error{errorCount > 1 ? 's' : ''} occurred
          </p>
        </div>
      )}

      {/* Actions */}
      <button
        onClick={addItem}
        className="px-3 py-2 bg-purple-600 text-white rounded"
      >
        Add Item (may fail)
      </button>

      {/* Items list */}
      <ul className="list-disc list-inside">
        {items.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Example 4: Form with error handling
 */
export function FormErrorExample() {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const { handleError: _handleError, wrapAsync, lastError, clearError } = useErrorHandler({
    context: 'FormSubmission',
    fallbackMessage: 'Failed to submit form',
  });

  const handleSubmit = wrapAsync(async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!formData.name || !formData.email) {
      throw new Error('Name and email are required');
    }

    if (!formData.email.includes('@')) {
      throw new Error('Invalid email format');
    }

    // Submit (simulated)
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.5) {
          reject(new Error('Server error'));
        } else {
          resolve(true);
        }
      }, 1000);
    });

    toast.success('Form submitted successfully!');
    setFormData({ name: '', email: '' });
  }, 'handleSubmit');

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">Form with Error Handling</h3>

      {lastError && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <p className="text-red-800 text-sm font-medium">Error:</p>
          <p className="text-red-700 text-sm">{lastError.message}</p>
          <button
            onClick={clearError}
            className="mt-2 text-xs text-red-600 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="text"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Submit
        </button>
      </form>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// All Examples Combined
// ═══════════════════════════════════════════════════════════════

import { toast } from 'sonner';

export function AllErrorExamples() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Error Handling Examples</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <AsyncErrorExample />
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <CombinedErrorExample />
        </div>

        <div className="border border-gray-200 rounded-lg p-4 col-span-2">
          <FormErrorExample />
        </div>

        <div className="border border-gray-200 rounded-lg p-4 col-span-2">
          <ErrorBoundaryExample />
        </div>
      </div>
    </div>
  );
}

