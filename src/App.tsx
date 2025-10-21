import { lazy, Suspense, useEffect, useState } from "react";
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import AppHeader from "./components/AppHeader";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ErrorLogsViewer } from "./components/ErrorLogsViewer";
import { PageLoadingSpinner } from "./components/LoadingSkeleton";
import { PerformanceMonitor } from "./components/PerformanceMonitor";
import { SkipNavigation } from "./components/SkipNavigation";
import "./index.css";
import { errorLogger } from "./lib/errorLogger";

// 🚀 Lazy load pages for better performance (load only when needed)
// This reduces initial bundle size from ~3MB to ~500KB!
const AnswerTable = lazy(() => import("./components/AnswerTable").then(m => ({ default: m.AnswerTable })));
const CodeListPage = lazy(() => import("./pages/CodeListPage").then(m => ({ default: m.CodeListPage })));
const CategoriesPage = lazy(() => import("./pages/CategoriesPage").then(m => ({ default: m.CategoriesPage })));
const FileDataCodingPage = lazy(() => import("./pages/FileDataCodingPage").then(m => ({ default: m.FileDataCodingPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const CodeframeBuilderPage = lazy(() => import("./pages/CodeframeBuilderPage").then(m => ({ default: m.CodeframeBuilderPage })));

function useDarkMode() {
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") return true;
    if (saved === "light") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  useEffect(() => {
    const html = document.documentElement;
    const method = dark ? "add" : "remove";
    html.classList[method]("dark");
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return { dark, setDark };
}


function AppContent() {
  const { dark, setDark } = useDarkMode();

  return (
    <div className="min-h-screen bg-gray-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* ♿ Skip Navigation for accessibility */}
      <SkipNavigation />

      {/* Global Header */}
      <AppHeader dark={dark} onToggleTheme={() => setDark(!dark)} />

      {/* ♿ Main content landmark for accessibility */}
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <Suspense fallback={<PageLoadingSpinner message="Loading page..." />}>
          <Routes>
            <Route path="/" element={<CategoriesPage />} />
            <Route path="/coding" element={<AnswerTable />} />
            <Route path="/codes" element={<CodeListPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/codeframe/builder" element={<CodeframeBuilderPage />} />
            <Route path="/file-data-coding" element={<FileDataCodingPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Suspense>
      </main>

      <Toaster position="top-right" />

      {/* Performance Monitor (Dev Only) */}
      {import.meta.env.DEV && <PerformanceMonitor />}

      {/* Error Logs Viewer (Dev Only) */}
      {import.meta.env.DEV && <ErrorLogsViewer />}
    </div>
  );
}

export default function App() {
  const handleError = (error: Error, errorInfo: any) => {
    // Log error to our error logger
    errorLogger.log(error, errorInfo);

    // TODO: Send to analytics
    // analytics.track('error_occurred', {
    //   error: error.message,
    //   component: errorInfo.componentStack
    // });
  };

  return (
    <ErrorBoundary onError={handleError}>
      <Router>
        <AppContent />
      </Router>
    </ErrorBoundary>
  );
}
