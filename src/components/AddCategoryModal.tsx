import { useState } from 'react';
import { toast } from 'sonner';
import { RATE_LIMITS, containsSuspiciousContent, logSecurityEvent, rateLimiter, validateCategoryName } from '../lib/validation';
import { simpleLogger } from '../utils/logger';
import { FormModal } from './BaseModal';

interface AddCategoryModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}

export function AddCategoryModal({ open, onClose, onSave }: AddCategoryModalProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    // Clear previous errors
    setError(null);

    // 🔒 SECURITY: Validate input
    const validation = validateCategoryName(name);
    if (!validation.success) {
      setError(validation.error || 'Invalid category name');
      toast.error(validation.error || 'Invalid category name');
      return;
    }

    // 🔒 SECURITY: Check for suspicious content
    if (containsSuspiciousContent(name)) {
      logSecurityEvent('Suspicious content detected in category name', { input: name });
      setError('Invalid characters detected');
      toast.error('Invalid characters detected');
      return;
    }

    // 🚦 RATE LIMITING: Prevent spam
    if (!rateLimiter.check('addCategory', RATE_LIMITS.addCategory)) {
      setError('Too many requests. Please wait a minute.');
      toast.error(`Slow down! You can only add 10 categories per minute. Try again in a moment.`);
      logSecurityEvent('Rate limit exceeded', { action: 'addCategory' });
      return;
    }

    setLoading(true);

    try {
      // 🔧 FIX Bug 5: Add timeout and error handling
      const savePromise = Promise.resolve(onSave(validation.data!)); // Use validated & sanitized value
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out after 30 seconds')), 30000)
      );

      await Promise.race([savePromise, timeoutPromise]);

      // Success - reset form
      setName('');
      setLoading(false);
      toast.success('Category added successfully!');
    } catch (err: any) {
      // 🔧 FIX: Show error and stop loading
      simpleLogger.error('Error saving category:', err);
      setError(err.message || 'Failed to save category. Please check your connection and try again.');
      toast.error(err.message || 'Failed to save category');
      setLoading(false);
    }
  }

  function handleClose() {
    if (!loading) {
      setName('');
      setError(null);
      onClose();
    }
  }

  return (
    <FormModal
      open={open}
      onClose={handleClose}
      onSubmit={handleSave}
      title="Add New Category"
      loading={loading}
      submitDisabled={!name.trim()}
      size="md"
    >
      {error && (
        <div className="bg-red-100 text-red-800 p-3 rounded mb-4 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Category Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          placeholder="Enter category name (1-100 characters)..."
          className="w-full px-3 py-2 border border-zinc-300 rounded-md bg-white text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400"
          autoFocus
        />
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {name.length}/100 characters
          {name.length > 80 && (
            <span className="ml-2 text-amber-600 dark:text-amber-400">
              ({100 - name.length} remaining)
            </span>
          )}
        </div>
      </div>
    </FormModal>
  );
}
