import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

// ═══════════════════════════════════════════════════════════════
// 🎯 TYPES
// ═══════════════════════════════════════════════════════════════

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: ReactNode;
}

interface MainLayoutProps {
  title?: string;
  breadcrumbs?: BreadcrumbItem[];
  children: ReactNode;
  maxWidth?: 'default' | 'wide' | 'full';
  noPadding?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// 🧩 COMPONENT
// ═══════════════════════════════════════════════════════════════

export function MainLayout({
  title,
  breadcrumbs,
  children,
  maxWidth = 'default',
  noPadding = false
}: MainLayoutProps) {

  // Max width classes based on prop
  const maxWidthClasses = {
    default: 'max-w-[1400px]',
    wide: 'max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px]',
    full: 'max-w-full'
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-zinc-950">
      {/* Main Content Container */}
      <main className={`flex-1 ${noPadding ? '' : 'px-4 sm:px-6 lg:px-8 py-6'}`}>
        <div className={`${maxWidthClasses[maxWidth]} mx-auto`}>
          {/* Breadcrumbs Navigation */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav
              className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2 flex-wrap"
              aria-label="Breadcrumb"
            >
              {breadcrumbs.map((crumb, index) => (
                <span key={index} className="flex items-center gap-2">
                  {crumb.href ? (
                    <Link
                      to={crumb.href}
                      className="hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1 transition-colors"
                    >
                      {crumb.icon}
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={`inline-flex items-center gap-1 ${
                      index === breadcrumbs.length - 1
                        ? 'text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-gray-700 dark:text-gray-200'
                    }`}>
                      {crumb.icon}
                      {crumb.label}
                    </span>
                  )}
                  {index < breadcrumbs.length - 1 && (
                    <ChevronRight size={14} className="text-gray-400" />
                  )}
                </span>
              ))}
            </nav>
          )}

          {/* Page Title */}
          {title && (
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              {title}
            </h1>
          )}

          {/* Page Content */}
          <div className="w-full">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 mt-auto">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>TGM Coding Suite © 2025</span>
            <span className="hidden sm:inline">Made with React + Supabase + Tailwind</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🎯 HELPER: Generate breadcrumbs from pathname
// ═══════════════════════════════════════════════════════════════

export function generateBreadcrumbs(
  pathname: string,
  customLabels?: Record<string, string>
): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', href: '/' }
  ];

  let currentPath = '';
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;

    // Use custom label if provided, otherwise capitalize segment
    const label = customLabels?.[segment] ||
                  segment.charAt(0).toUpperCase() + segment.slice(1);

    breadcrumbs.push({
      label,
      href: isLast ? undefined : currentPath
    });
  });

  return breadcrumbs;
}

// ═══════════════════════════════════════════════════════════════
// 🎯 EXAMPLE USAGE
// ═══════════════════════════════════════════════════════════════

/*
// Basic usage:
<MainLayout title="Categories">
  <CategoriesList />
</MainLayout>

// With breadcrumbs:
import { Home } from 'lucide-react';

<MainLayout
  title="Code List"
  breadcrumbs={[
    { label: 'Home', href: '/', icon: <Home size={14} /> },
    { label: 'Codes' }
  ]}
>
  <CodeListTable />
</MainLayout>

// With custom max width:
<MainLayout
  title="Dashboard"
  maxWidth="wide"
  breadcrumbs={[
    { label: 'Home', href: '/' },
    { label: 'Dashboard' }
  ]}
>
  <DashboardContent />
</MainLayout>

// Auto-generate breadcrumbs from URL:
import { useLocation } from 'react-router-dom';
const location = useLocation();
const breadcrumbs = generateBreadcrumbs(location.pathname);

<MainLayout breadcrumbs={breadcrumbs}>
  <Content />
</MainLayout>
*/
