// ═══════════════════════════════════════════════════════════════
// 🔧 MSW Server Setup - Mock Service Worker for Node.js tests
// ═══════════════════════════════════════════════════════════════

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Setup MSW server for Node.js environment (Vitest)
export const server = setupServer(...handlers);

// Log handler information in development
if (process.env.NODE_ENV !== 'production') {
  console.log('🎭 MSW Handlers loaded:', handlers.length);
}
