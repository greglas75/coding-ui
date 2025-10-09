// TODO: Install @sentry/react to enable error tracking
// import * as Sentry from '@sentry/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initPerformanceMonitoring } from './lib/performanceMonitor'
import { queryClient } from './lib/queryClient'

// ═══════════════════════════════════════════════════════════════
// 📊 SENTRY INITIALIZATION (DISABLED - TODO: npm install @sentry/react)
// ═══════════════════════════════════════════════════════════════

// Disabled until @sentry/react is installed
// if (import.meta.env.PROD) {
//   Sentry.init({
//     dsn: import.meta.env.VITE_SENTRY_DSN,
//     environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'production',
//     release: `coding-ui@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
//     integrations: [
//       Sentry.browserTracingIntegration(),
//       Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
//     ],
//     tracesSampleRate: 0.1,
//     replaysSessionSampleRate: 0.1,
//     replaysOnErrorSampleRate: 1.0,
//     ignoreErrors: [
//       'ResizeObserver loop limit exceeded',
//       'Non-Error promise rejection',
//       'Chrome extension',
//       'webkit-masked-url',
//     ],
//     beforeSend(event) {
//       if (event.request?.headers) {
//         delete event.request.headers['Authorization'];
//         delete event.request.headers['Cookie'];
//       }
//       return event;
//     },
//   });
//   (window as any).Sentry = Sentry;
// }

// ═══════════════════════════════════════════════════════════════
// 🏁 APP INITIALIZATION
// ═══════════════════════════════════════════════════════════════

// Initialize performance monitoring
initPerformanceMonitoring()

// Render app
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
)
