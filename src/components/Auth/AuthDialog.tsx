/**
 * Auth Dialog - Login & Register
 * Modal dialog for user authentication
 */

import { useState } from 'react';
import { X, Mail, Lock, Chrome } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthDialog({ isOpen, onClose }: AuthDialogProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(`Login failed: ${error.message}`);
        } else {
          toast.success('Logged in successfully!');
          onClose();
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          toast.error(`Registration failed: ${error.message}`);
        } else {
          toast.success('Account created! Check your email to verify.');
          setMode('login');
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error(`Google sign-in failed: ${error.message}`);
      }
    } catch (error) {
      toast.error('Google sign-in error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-neutral-800 rounded-lg p-6 w-full max-w-md relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-200"
        >
          <X size={20} />
        </button>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-100 mb-6">
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </h2>

        {/* Google OAuth */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-white text-gray-900 font-medium py-2 px-4 rounded-lg hover:bg-gray-100 transition disabled:opacity-50 mb-4"
        >
          <Chrome size={20} />
          Continue with Google
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-neutral-800 text-gray-400">Or with email</span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Toggle mode */}
        <p className="mt-4 text-center text-sm text-gray-400">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-blue-400 hover:text-blue-300 font-medium"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>

        {/* Info */}
        <p className="mt-4 text-xs text-gray-500 text-center">
          By signing in, your API keys will be securely synced across browsers using AES-256 encryption.
        </p>
      </div>
    </div>
  );
}
